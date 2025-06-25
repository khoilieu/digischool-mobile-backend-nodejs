const LeaveRequest = require('../models/leave-request.model');
const Lesson = require('../../schedules/models/lesson.model');
const Class = require('../../classes/models/class.model');
const Subject = require('../../subjects/models/subject.model');
const User = require('../../auth/models/user.model');
const mongoose = require('mongoose');

class LeaveRequestService {
  
  // Tạo đơn xin vắng cho nhiều tiết cùng lúc
  async createMultipleLeaveRequests(data, studentId) {
    try {
      const { lessonIds, phoneNumber, reason } = data;
      
      if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
        throw new Error('Lesson IDs are required and must be an array');
      }
      
      if (!phoneNumber || !reason) {
        throw new Error('Phone number and reason are required');
      }
      
      console.log(`📝 Creating leave requests for ${lessonIds.length} lessons by student ${studentId}`);
      
      // Validate student exists and has a class
      const student = await User.findById(studentId).populate('class_id', 'className');
      if (!student || !student.role.includes('student')) {
        throw new Error('Student not found');
      }
      
      if (!student.class_id) {
        throw new Error('Student is not assigned to any class');
      }
      
      console.log(`👨‍🎓 Student ${student.name} from class ${student.class_id.className} requesting leave for ${lessonIds.length} lessons`);
      
      const results = [];
      const errors = [];
      
      // Process each lesson
      for (const lessonId of lessonIds) {
        try {
          // Get lesson details
          const lesson = await Lesson.findById(lessonId)
            .populate('class', 'className')
            .populate('subject', 'subjectName subjectCode')
            .populate('teacher', 'name email');
          
          if (!lesson) {
            errors.push(`Lesson ${lessonId} not found`);
            continue;
          }
          
          // Check if student belongs to this class (CRITICAL VALIDATION)
          if (lesson.class._id.toString() !== student.class_id._id.toString()) {
            errors.push(`Access denied: Student from class ${student.class_id.className} cannot request leave for lesson in class ${lesson.class.className}`);
            console.log(`🚫 SECURITY: Student ${student.name} (${student.class_id.className}) tried to access lesson for class ${lesson.class.className}`);
            continue;
          }
          
          console.log(`✅ Validation passed: Student ${student.name} requesting leave for ${lesson.subject.subjectName} in their class ${lesson.class.className}`);
          
          // Check if lesson is in the future
          const lessonDate = new Date(lesson.scheduledDate);
          const now = new Date();
          // if (lessonDate <= now) {
          //   errors.push(`Cannot request leave for past lesson: ${lesson.subject.subjectName} on ${lessonDate.toLocaleDateString()}`);
          //   continue;
          // }
          
          // Check if leave request already exists for this lesson
          const existingRequest = await LeaveRequest.findOne({
            studentId,
            lessonId: lesson._id
          });
          
          if (existingRequest) {
            errors.push(`Leave request already exists for ${lesson.subject.subjectName} on ${lessonDate.toLocaleDateString()}`);
            continue;
          }
          
          // Get period from timeSlot
          const period = lesson.timeSlot?.period || 1;
          
          // Create leave request
          const leaveRequest = new LeaveRequest({
            studentId,
            lessonId: lesson._id,
            classId: lesson.class._id,
            subjectId: lesson.subject._id,
            teacherId: lesson.teacher._id,
            date: lesson.scheduledDate,
            period: period,
            phoneNumber: phoneNumber.trim(),
            reason: reason.trim()
          });
          
          await leaveRequest.save();
          
          // Populate for response
          await leaveRequest.populate([
            { path: 'lessonId', select: 'lessonId type topic scheduledDate' },
            { path: 'subjectId', select: 'subjectName subjectCode' },
            { path: 'teacherId', select: 'name email' },
            { path: 'classId', select: 'className' }
          ]);
          
          results.push(leaveRequest);
          
          console.log(`✅ Created leave request for ${lesson.subject.subjectName} - Period ${period}`);
          
        } catch (lessonError) {
          console.error(`❌ Error processing lesson ${lessonId}:`, lessonError.message);
          errors.push(`Error processing lesson ${lessonId}: ${lessonError.message}`);
        }
      }
      
      console.log(`📊 Leave request creation summary: ${results.length} created, ${errors.length} errors`);
      
      return {
        success: results.length > 0,
        created: results,
        errors: errors,
        summary: {
          totalRequested: lessonIds.length,
          created: results.length,
          failed: errors.length
        }
      };
      
    } catch (error) {
      console.error('❌ Error in createMultipleLeaveRequests:', error.message);
      throw new Error(`Failed to create leave requests: ${error.message}`);
    }
  }
  
  // Lấy danh sách đơn xin vắng của học sinh
  async getStudentLeaveRequests(studentId, filters = {}) {
    try {
      const { status, startDate, endDate, page = 1, limit = 20 } = filters;
      
      const options = {};
      if (status) options.status = status;
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);
      
      const skip = (page - 1) * limit;
      
      const requests = await LeaveRequest.findByStudent(studentId, options)
        .skip(skip)
        .limit(limit);
      
      const total = await LeaveRequest.countDocuments({
        studentId,
        ...(status && { status }),
        ...(startDate && { date: { $gte: new Date(startDate) } }),
        ...(endDate && { date: { $lte: new Date(endDate) } })
      });
      
      // Group by status for summary
      const statusSummary = await LeaveRequest.aggregate([
        { $match: { studentId: new mongoose.Types.ObjectId(studentId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const summary = statusSummary.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, { pending: 0, approved: 0, rejected: 0 });
      
      return {
        requests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary
      };
      
    } catch (error) {
      throw new Error(`Failed to get student leave requests: ${error.message}`);
    }
  }
  
  // Lấy danh sách đơn xin vắng cần duyệt của giáo viên
  async getTeacherPendingRequests(teacherId, filters = {}) {
    try {
      const { startDate, endDate, page = 1, limit = 50 } = filters;
      
      let query = { teacherId, status: 'pending' };
      
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }
      
      const skip = (page - 1) * limit;
      
      const requests = await LeaveRequest.find(query)
        .populate('studentId', 'name email')
        .populate('lessonId', 'lessonId type topic scheduledDate')
        .populate('subjectId', 'subjectName subjectCode')
        .populate('classId', 'className')
        .sort({ date: 1, period: 1 }) // Sort by date and period
        .skip(skip)
        .limit(limit);
      
      const total = await LeaveRequest.countDocuments(query);
      
      // Group by date for better organization
      const requestsByDate = {};
      requests.forEach(request => {
        const dateKey = request.date.toISOString().split('T')[0];
        if (!requestsByDate[dateKey]) {
          requestsByDate[dateKey] = [];
        }
        requestsByDate[dateKey].push(request);
      });
      
      return {
        requests,
        requestsByDate,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to get teacher pending requests: ${error.message}`);
    }
  }
  
  // Lấy tất cả đơn xin vắng của giáo viên (đã xử lý)
  async getTeacherLeaveRequests(teacherId, filters = {}) {
    try {
      const { status, startDate, endDate, page = 1, limit = 20 } = filters;
      
      const options = {};
      if (status) options.status = status;
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);
      
      const skip = (page - 1) * limit;
      
      const requests = await LeaveRequest.findByTeacher(teacherId, options)
        .skip(skip)
        .limit(limit);
      
      const total = await LeaveRequest.countDocuments({
        teacherId,
        ...(status && { status }),
        ...(startDate && { date: { $gte: new Date(startDate) } }),
        ...(endDate && { date: { $lte: new Date(endDate) } })
      });
      
      return {
        requests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to get teacher leave requests: ${error.message}`);
    }
  }
  
  // Duyệt đơn xin vắng
  async approveLeaveRequest(requestId, teacherId, comment = '') {
    try {
      const request = await LeaveRequest.findById(requestId)
        .populate('studentId', 'name email')
        .populate('lessonId', 'lessonId topic scheduledDate')
        .populate('subjectId', 'subjectName');
      
      if (!request) {
        throw new Error('Leave request not found');
      }
      
      if (!request.canBeProcessedBy(teacherId)) {
        throw new Error('You are not authorized to process this request or it has already been processed');
      }
      
      await request.approve(teacherId, comment);
      
      console.log(`✅ Leave request approved by teacher ${teacherId} for student ${request.studentId.name}`);
      
      return {
        success: true,
        message: 'Leave request approved successfully',
        request
      };
      
    } catch (error) {
      console.error('❌ Error approving leave request:', error.message);
      throw new Error(`Failed to approve leave request: ${error.message}`);
    }
  }
  
  // Từ chối đơn xin vắng
  async rejectLeaveRequest(requestId, teacherId, comment) {
    try {
      if (!comment || !comment.trim()) {
        throw new Error('Comment is required when rejecting a leave request');
      }
      
      const request = await LeaveRequest.findById(requestId)
        .populate('studentId', 'name email')
        .populate('lessonId', 'lessonId topic scheduledDate')
        .populate('subjectId', 'subjectName');
      
      if (!request) {
        throw new Error('Leave request not found');
      }
      
      if (!request.canBeProcessedBy(teacherId)) {
        throw new Error('You are not authorized to process this request or it has already been processed');
      }
      
      await request.reject(teacherId, comment);
      
      console.log(`❌ Leave request rejected by teacher ${teacherId} for student ${request.studentId.name}`);
      
      return {
        success: true,
        message: 'Leave request rejected successfully',
        request
      };
      
    } catch (error) {
      console.error('❌ Error rejecting leave request:', error.message);
      throw new Error(`Failed to reject leave request: ${error.message}`);
    }
  }
  
  // Lấy chi tiết đơn xin vắng
  async getLeaveRequestDetail(requestId, userId, userRole) {
    try {
      const request = await LeaveRequest.findById(requestId)
        .populate('studentId', 'name email')
        .populate('lessonId', 'lessonId type topic scheduledDate')
        .populate('subjectId', 'subjectName subjectCode')
        .populate('teacherId', 'name email')
        .populate('classId', 'className')
        .populate('approvedBy', 'name email');
      
      if (!request) {
        throw new Error('Leave request not found');
      }
      
      // Check authorization
      const canView = this.canUserViewRequest(request, userId, userRole);
      if (!canView.allowed) {
        throw new Error(canView.reason);
      }
      
      return request;
      
    } catch (error) {
      throw new Error(`Failed to get leave request detail: ${error.message}`);
    }
  }
  
  // Kiểm tra quyền xem đơn xin vắng
  canUserViewRequest(request, userId, userRole) {
    // Admin/Manager can view all
    if (userRole.includes('admin') || userRole.includes('manager')) {
      return { allowed: true, reason: 'Admin/Manager access' };
    }
    
    // Student can view their own requests
    if (userRole.includes('student') && request.studentId._id.toString() === userId.toString()) {
      return { allowed: true, reason: 'Student owns this request' };
    }
    
    // Teacher can view requests for their lessons
    if (userRole.includes('teacher') && request.teacherId._id.toString() === userId.toString()) {
      return { allowed: true, reason: 'Teacher owns this lesson' };
    }
    
    return { allowed: false, reason: 'Access denied' };
  }
  
  // Hủy đơn xin vắng (chỉ khi pending)
  async cancelLeaveRequest(requestId, studentId) {
    try {
      const request = await LeaveRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Leave request not found');
      }
      
      if (request.studentId.toString() !== studentId.toString()) {
        throw new Error('You can only cancel your own requests');
      }
      
      if (request.status !== 'pending') {
        throw new Error('Can only cancel pending requests');
      }
      
      // Check if lesson is still in the future
      const lessonDate = new Date(request.date);
      const now = new Date();
      if (lessonDate <= now) {
        throw new Error('Cannot cancel request for past lessons');
      }
      
      await LeaveRequest.findByIdAndDelete(requestId);
      
      console.log(`🗑️ Leave request cancelled by student ${studentId}`);
      
      return {
        success: true,
        message: 'Leave request cancelled successfully'
      };
      
    } catch (error) {
      throw new Error(`Failed to cancel leave request: ${error.message}`);
    }
  }
  
  // Thống kê đơn xin vắng
  async getLeaveRequestStats(filters = {}) {
    try {
      const { teacherId, studentId, classId, startDate, endDate } = filters;
      
      let matchStage = {};
      
      if (teacherId) matchStage.teacherId = new mongoose.Types.ObjectId(teacherId);
      if (studentId) matchStage.studentId = new mongoose.Types.ObjectId(studentId);
      if (classId) matchStage.classId = new mongoose.Types.ObjectId(classId);
      if (startDate || endDate) {
        matchStage.date = {};
        if (startDate) matchStage.date.$gte = new Date(startDate);
        if (endDate) matchStage.date.$lte = new Date(endDate);
      }
      
      const stats = await LeaveRequest.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
          }
        }
      ]);
      
      const result = stats[0] || { total: 0, pending: 0, approved: 0, rejected: 0 };
      
      // Calculate rates
      result.approvalRate = result.total > 0 ? ((result.approved / result.total) * 100).toFixed(2) : 0;
      result.rejectionRate = result.total > 0 ? ((result.rejected / result.total) * 100).toFixed(2) : 0;
      
      return result;
      
    } catch (error) {
      throw new Error(`Failed to get leave request stats: ${error.message}`);
    }
  }
  
  // Lấy lessons có thể xin vắng của học sinh (CHỈ CỦA LỚP MÌNH)
  async getAvailableLessonsForLeave(studentId, startDate, endDate) {
    try {
      const student = await User.findById(studentId).populate('class_id', 'className');
      if (!student || !student.class_id) {
        throw new Error('Student or class not found');
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      const now = new Date();
      
      console.log(`🔍 Getting available lessons for student ${student.name} from class ${student.class_id.className}`);
      
      // Get future lessons for student's class ONLY
      const lessons = await Lesson.find({
        class: student.class_id._id, // Use class_id instead of classId
        scheduledDate: {
          $gte: Math.max(start, now), // Only future lessons
          $lte: end
        },
        status: 'scheduled'
      })
      .populate('subject', 'subjectName subjectCode')
      .populate('teacher', 'name email')
      .populate('timeSlot', 'period startTime endTime')
      .sort({ scheduledDate: 1, 'timeSlot.period': 1 });
      
      console.log(`📚 Found ${lessons.length} lessons for class ${student.class_id.className}`);
      
      // Get existing leave requests for this period
      const existingRequests = await LeaveRequest.find({
        studentId,
        date: { $gte: start, $lte: end }
      }).select('lessonId');
      
      const requestedLessonIds = existingRequests.map(req => req.lessonId.toString());
      
      // Filter out lessons already requested
      const availableLessons = lessons.filter(lesson => 
        !requestedLessonIds.includes(lesson._id.toString())
      );
      
      return availableLessons.map(lesson => ({
        _id: lesson._id,
        lessonId: lesson.lessonId,
        date: lesson.scheduledDate,
        period: lesson.timeSlot?.period || 0,
        timeSlot: {
          startTime: lesson.timeSlot?.startTime || '',
          endTime: lesson.timeSlot?.endTime || ''
        },
        subject: {
          _id: lesson.subject._id,
          name: lesson.subject.subjectName,
          code: lesson.subject.subjectCode
        },
        teacher: {
          _id: lesson.teacher._id,
          name: lesson.teacher.name
        },
        type: lesson.type,
        topic: lesson.topic || ''
      }));
      
    } catch (error) {
      throw new Error(`Failed to get available lessons: ${error.message}`);
    }
  }
}

module.exports = new LeaveRequestService(); 