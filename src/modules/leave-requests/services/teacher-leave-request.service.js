const TeacherLeaveRequest = require('../models/teacher-leave-request.model');
const Lesson = require('../../schedules/models/lesson.model');
const Class = require('../../classes/models/class.model');
const Subject = require('../../subjects/models/subject.model');
const User = require('../../auth/models/user.model');
const mongoose = require('mongoose');

class TeacherLeaveRequestService {
  
  // Tạo đơn xin nghỉ cho nhiều tiết học của giáo viên
  async createMultipleTeacherLeaveRequests(data, teacherId) {
    try {
      const { lessonIds, reason, emergencyContact } = data;
      
      if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
        throw new Error('Lesson IDs are required and must be an array');
      }
      
      if (!reason || !emergencyContact?.phone) {
        throw new Error('Reason and emergency contact phone are required');
      }
      
      console.log(`📝 Teacher ${teacherId} creating leave requests for ${lessonIds.length} lessons`);
      
      // Validate teacher exists
      const teacher = await User.findById(teacherId);
      if (!teacher || !teacher.role.includes('teacher')) {
        throw new Error('Teacher not found');
      }
      
      console.log(`👨‍🏫 Teacher ${teacher.name} requesting leave for ${lessonIds.length} lessons`);
      
      const results = [];
      const errors = [];
      
      // Process each lesson
      for (const lessonId of lessonIds) {
        try {
          // Get lesson details
          const lesson = await Lesson.findById(lessonId)
            .populate('class', 'className')
            .populate('subject', 'subjectName subjectCode')
            .populate('teacher', 'name email')
            .populate('timeSlot', 'period startTime endTime');
          
          if (!lesson) {
            errors.push(`Lesson ${lessonId} not found`);
            continue;
          }
          
          // CRITICAL VALIDATION: Teacher can only request leave for their own lessons
          if (lesson.teacher._id.toString() !== teacherId.toString()) {
            errors.push(`Access denied: You can only request leave for lessons you are teaching. Lesson ${lessonId} is taught by ${lesson.teacher.name}`);
            console.log(`🚫 SECURITY: Teacher ${teacher.name} tried to request leave for lesson taught by ${lesson.teacher.name}`);
            continue;
          }
          
          console.log(`✅ Validation passed: Teacher ${teacher.name} requesting leave for ${lesson.subject.subjectName} in class ${lesson.class.className}`);
          
          // Check if lesson is in the future
          const lessonDate = new Date(lesson.scheduledDate);
          const now = new Date();
          // if (lessonDate <= now) {
          //   errors.push(`Cannot request leave for past lesson: ${lesson.subject.subjectName} on ${lessonDate.toLocaleDateString()}`);
          //   continue;
          // }
          
          // Check if lesson status is 'scheduled' (only scheduled lessons can be requested for leave)
          if (lesson.status !== 'scheduled') {
            errors.push(`Cannot request leave for lesson with status '${lesson.status}': ${lesson.subject.subjectName} on ${lessonDate.toLocaleDateString()}. Only scheduled lessons can be requested for leave.`);
            continue;
          }
          
          // Check if leave request already exists for this lesson
          const existingRequest = await TeacherLeaveRequest.findOne({
            teacherId,
            lessonId: lesson._id
          });
          
          if (existingRequest) {
            errors.push(`Leave request already exists for ${lesson.subject.subjectName} on ${lessonDate.toLocaleDateString()}`);
            continue;
          }
          
          // Get period from timeSlot (populated) or lesson directly
          const period = lesson.timeSlot?.period || lesson.period || 1;
          
          // Count students in the class
          const studentsCount = await User.countDocuments({
            class_id: lesson.class._id,
            role: 'student'
          });
          
          // Create teacher leave request
          const teacherLeaveRequest = new TeacherLeaveRequest({
            teacherId,
            lessonId: lesson._id,
            classId: lesson.class._id,
            subjectId: lesson.subject._id,
            date: lesson.scheduledDate,
            period: period,
            reason: reason.trim(),
            emergencyContact: {
              phone: emergencyContact.phone.trim(),
              relationship: emergencyContact.relationship?.trim() || ''
            },
            studentImpact: {
              totalStudents: studentsCount
            }
          });
          
          await teacherLeaveRequest.save();
          
          // Populate for response
          await teacherLeaveRequest.populate([
            { path: 'teacherId', select: 'name email fullName' },
            { path: 'lessonId', select: 'lessonId type topic scheduledDate' },
            { path: 'subjectId', select: 'subjectName subjectCode' },
            { path: 'classId', select: 'className' }
          ]);
          
          results.push(teacherLeaveRequest);
          
          console.log(`✅ Created teacher leave request for ${lesson.subject.subjectName} - Period ${period}`);
          
          // Gửi email thông báo cho manager (async, không chờ kết quả)
          this.sendNewTeacherLeaveRequestNotificationToManager(teacherLeaveRequest)
            .then(() => {
              console.log(`📧 Email notification sent to managers for teacher leave request ${teacherLeaveRequest._id}`);
            })
            .catch(error => {
              console.error(`❌ Failed to send email notification to managers for teacher leave request ${teacherLeaveRequest._id}:`, error.message);
            });
          
        } catch (lessonError) {
          console.error(`❌ Error processing lesson ${lessonId}:`, lessonError.message);
          errors.push(`Error processing lesson ${lessonId}: ${lessonError.message}`);
        }
      }
      
      console.log(`📊 Teacher leave request creation summary: ${results.length} created, ${errors.length} errors`);
      
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
      console.error('❌ Error in createMultipleTeacherLeaveRequests:', error.message);
      throw new Error(`Failed to create teacher leave requests: ${error.message}`);
    }
  }
  
  // Lấy danh sách đơn xin nghỉ của giáo viên
  async getTeacherLeaveRequests(teacherId, filters = {}) {
    try {
      const { status, startDate, endDate, page = 1, limit = 20 } = filters;
      
      const options = {};
      if (status) options.status = status;
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);
      
      const skip = (page - 1) * limit;
      
      const requests = await TeacherLeaveRequest.findByTeacher(teacherId, options)
        .skip(skip)
        .limit(limit);
      
      const total = await TeacherLeaveRequest.countDocuments({
        teacherId,
        ...(status && { status }),
        ...(startDate && { date: { $gte: new Date(startDate) } }),
        ...(endDate && { date: { $lte: new Date(endDate) } })
      });
      
      // Group by status for summary
      const statusSummary = await TeacherLeaveRequest.aggregate([
        { $match: { teacherId: new mongoose.Types.ObjectId(teacherId) } },
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
      throw new Error(`Failed to get teacher leave requests: ${error.message}`);
    }
  }
  
  // Lấy danh sách đơn cần duyệt cho manager
  async getPendingTeacherLeaveRequests(filters = {}) {
    try {
      const { startDate, endDate, page = 1, limit = 50 } = filters;
      
      const options = {};
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);
      
      const skip = (page - 1) * limit;
      
      const requests = await TeacherLeaveRequest.findPendingForManager(options)
        .skip(skip)
        .limit(limit);
      
      const total = await TeacherLeaveRequest.countDocuments({
        status: 'pending',
        ...(startDate && { date: { $gte: new Date(startDate) } }),
        ...(endDate && { date: { $lte: new Date(endDate) } })
      });
      
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
      throw new Error(`Failed to get pending teacher leave requests: ${error.message}`);
    }
  }
  
  // Duyệt đơn xin nghỉ của giáo viên (chỉ manager)
  async approveTeacherLeaveRequest(requestId, managerId, comment = '') {
    try {
      const request = await TeacherLeaveRequest.findById(requestId)
        .populate('teacherId', 'name email fullName')
        .populate('lessonId', 'lessonId topic scheduledDate')
        .populate('subjectId', 'subjectName')
        .populate('classId', 'className');
      
      if (!request) {
        const error = new Error('Teacher leave request not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check if request has already been processed
      if (request.status !== 'pending') {
        const error = new Error(`Request has already been ${request.status}`);
        error.statusCode = 400;
        throw error;
      }
      
      // Update request
      request.status = 'approved';
      request.managerComment = comment;
      request.managerId = managerId;
      request.processedAt = new Date();
      await request.save();
      
      console.log(`✅ Teacher leave request approved by manager ${managerId} for teacher ${request.teacherId.name}`);
      
      // Gửi email thông báo cho giáo viên
      try {
        await this.sendTeacherLeaveRequestNotification(request, 'approved', comment);
      } catch (emailError) {
        console.error('❌ Failed to send email notification to teacher:', emailError.message);
      }
      
      // Gửi email thông báo cho học sinh và cập nhật lesson status
      try {
        await this.notifyStudentsAndUpdateLesson(request);
      } catch (notifyError) {
        console.error('❌ Failed to notify students or update lesson:', notifyError.message);
      }
      
      return {
        success: true,
        message: 'Teacher leave request approved successfully',
        request
      };
      
    } catch (error) {
      console.error('❌ Error approving teacher leave request:', error.message);
      
      if (error.statusCode) {
        const customError = new Error(error.message);
        customError.statusCode = error.statusCode;
        throw customError;
      }
      
      throw new Error(`Failed to approve teacher leave request: ${error.message}`);
    }
  }
  
  // Từ chối đơn xin nghỉ của giáo viên (chỉ manager)
  async rejectTeacherLeaveRequest(requestId, managerId, comment) {
    try {
      if (!comment || !comment.trim()) {
        const error = new Error('Comment is required when rejecting a teacher leave request');
        error.statusCode = 400;
        throw error;
      }
      
      const request = await TeacherLeaveRequest.findById(requestId)
        .populate('teacherId', 'name email fullName')
        .populate('lessonId', 'lessonId topic scheduledDate')
        .populate('subjectId', 'subjectName')
        .populate('classId', 'className');
      
      if (!request) {
        const error = new Error('Teacher leave request not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check if request has already been processed
      if (request.status !== 'pending') {
        const error = new Error(`Request has already been ${request.status}`);
        error.statusCode = 400;
        throw error;
      }
      
      // Update request
      request.status = 'rejected';
      request.managerComment = comment;
      request.managerId = managerId;
      request.processedAt = new Date();
      await request.save();
      
      console.log(`❌ Teacher leave request rejected by manager ${managerId} for teacher ${request.teacherId.name}`);
      
      // Gửi email thông báo cho giáo viên
      try {
        await this.sendTeacherLeaveRequestNotification(request, 'rejected', comment);
      } catch (emailError) {
        console.error('❌ Failed to send email notification to teacher:', emailError.message);
      }
      
      return {
        success: true,
        message: 'Teacher leave request rejected successfully',
        request
      };
      
    } catch (error) {
      console.error('❌ Error rejecting teacher leave request:', error.message);
      
      if (error.statusCode) {
        const customError = new Error(error.message);
        customError.statusCode = error.statusCode;
        throw customError;
      }
      
      throw new Error(`Failed to reject teacher leave request: ${error.message}`);
    }
  }
  
  // Xóa đơn xin nghỉ (chỉ khi pending và là của teacher đó)
  async deleteTeacherLeaveRequest(requestId, teacherId) {
    try {
      const request = await TeacherLeaveRequest.findById(requestId);
      
      if (!request) {
        const error = new Error('Teacher leave request not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check if teacher owns this request
      if (request.teacherId.toString() !== teacherId.toString()) {
        const error = new Error('You can only delete your own leave requests');
        error.statusCode = 403;
        throw error;
      }
      
      // Check if request is still pending
      if (request.status !== 'pending') {
        const error = new Error(`Cannot delete ${request.status} request`);
        error.statusCode = 400;
        throw error;
      }
      
      await TeacherLeaveRequest.findByIdAndDelete(requestId);
      
      console.log(`🗑️ Teacher leave request deleted by teacher ${teacherId}`);
      
      return {
        success: true,
        message: 'Teacher leave request deleted successfully'
      };
      
    } catch (error) {
      console.error('❌ Error deleting teacher leave request:', error.message);
      
      if (error.statusCode) {
        const customError = new Error(error.message);
        customError.statusCode = error.statusCode;
        throw customError;
      }
      
      throw new Error(`Failed to delete teacher leave request: ${error.message}`);
    }
  }
  
  // Lấy lessons mà giáo viên có thể xin nghỉ
  async getAvailableLessonsForTeacher(teacherId, startDate, endDate) {
    try {
      const teacher = await User.findById(teacherId);
      if (!teacher || !teacher.role.includes('teacher')) {
        throw new Error('Teacher not found');
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      const now = new Date();
      
      console.log(`🔍 Getting available lessons for teacher ${teacher.name}`);
      
      // Get future lessons taught by this teacher (only scheduled lessons)
      const lessons = await Lesson.find({
        teacher: teacherId,
        scheduledDate: {
          $gte: Math.max(start, now), // Only future lessons
          $lte: end
        },
        status: 'scheduled' // Only scheduled lessons can be requested for leave
      })
      .populate('subject', 'subjectName subjectCode')
      .populate('class', 'className')
      .populate('timeSlot', 'period startTime endTime')
      .sort({ scheduledDate: 1, 'timeSlot.period': 1 });
      
      console.log(`📚 Found ${lessons.length} lessons for teacher ${teacher.name}`);
      
      // Get existing leave requests for this period
      const existingRequests = await TeacherLeaveRequest.find({
        teacherId,
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
        class: {
          _id: lesson.class._id,
          name: lesson.class.className
        },
        type: lesson.type,
        topic: lesson.topic || ''
      }));
      
    } catch (error) {
      throw new Error(`Failed to get available lessons for teacher: ${error.message}`);
    }
  }
  
  // Gửi email thông báo cho manager khi có đơn xin nghỉ mới của giáo viên
  async sendNewTeacherLeaveRequestNotificationToManager(request) {
    try {
      const emailService = require('../../auth/services/email.service');
      
      // Get all managers
      const managers = await User.find({
        $or: [
          { role: 'manager' },
          { role: 'admin' }
        ]
      }).select('name email');
      
      if (managers.length === 0) {
        console.log('⚠️ No managers found to notify');
        return;
      }
      
      const teacherName = request.teacherId.fullName || request.teacherId.name;
      const subjectName = request.subjectId.subjectName;
      const className = request.classId.className;
      const lessonDate = new Date(request.date).toLocaleDateString('vi-VN');
      const period = request.period;
      
      const subject = `🏫 Đơn xin nghỉ của giáo viên cần duyệt - ${subjectName}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🏫 EcoSchool</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Hệ thống quản lý học tập</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #fd7e14; margin-top: 0; text-align: center;">
                👨‍🏫 Đơn xin nghỉ của giáo viên cần duyệt
              </h2>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #856404; margin-top: 0;">👨‍🏫 Thông tin giáo viên:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #856404; width: 120px;"><strong>Giáo viên:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${teacherName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #856404;"><strong>Liên hệ khẩn cấp:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${request.emergencyContact.phone}</td>
                  </tr>
                  ${request.emergencyContact.relationship ? `
                  <tr>
                    <td style="padding: 8px 0; color: #856404;"><strong>Mối quan hệ:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${request.emergencyContact.relationship}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <div style="background: #f1f3f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">📚 Thông tin tiết học:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; width: 120px;"><strong>Môn học:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${subjectName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;"><strong>Lớp:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${className}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;"><strong>Ngày dạy:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${lessonDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;"><strong>Tiết:</strong></td>
                    <td style="padding: 8px 0; color: #333;">Tiết ${period}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;"><strong>Số học sinh:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${request.studentImpact.totalStudents} học sinh</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #e7f3ff; border: 1px solid #b3d9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #0056b3; margin-top: 0;">💬 Lý do xin nghỉ:</h3>
                <p style="margin-bottom: 0; font-style: italic; color: #333; background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #0056b3;">
                  "${request.reason}"
                </p>
              </div>
              
              <div style="background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #0c5460;">⏰ Hành động cần thực hiện:</h4>
                <ul style="margin-bottom: 0; padding-left: 20px;">
                  <li>Vui lòng đăng nhập vào hệ thống để xem chi tiết đơn xin nghỉ</li>
                  <li>Chấp thuận hoặc từ chối đơn xin nghỉ với lý do rõ ràng</li>
                  <li>Nếu chấp thuận: Hệ thống sẽ tự động thông báo cho học sinh</li>
                  <li>Nếu từ chối: Đơn sẽ được xóa và thông báo cho giáo viên</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #dc3545; color: white; padding: 12px 24px; border-radius: 25px; display: inline-block; font-weight: bold;">
                  🔔 Đơn xin nghỉ đang chờ duyệt
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 14px;">
              <p>📧 Email này được gửi tự động từ hệ thống EcoSchool</p>
              <p>🕒 Thời gian: ${new Date().toLocaleString('vi-VN')}</p>
            </div>
          </div>
        </div>
      `;
      
      // Send email to all managers
      const emailPromises = managers.map(manager => 
        emailService.sendEmail(manager.email, subject, html)
      );
      
      await Promise.allSettled(emailPromises);
      
      console.log(`📧 New teacher leave request notification sent to ${managers.length} managers`);
      
    } catch (error) {
      console.error('❌ Error sending new teacher leave request notification to managers:', error.message);
      // Không throw error để không làm gián đoạn flow tạo đơn xin nghỉ
    }
  }
  
  // Gửi email thông báo kết quả cho giáo viên
  async sendTeacherLeaveRequestNotification(request, status, comment) {
    try {
      const emailService = require('../../auth/services/email.service');
      
      const teacherEmail = request.teacherId.email;
      const teacherName = request.teacherId.fullName || request.teacherId.name;
      const subjectName = request.subjectId.subjectName;
      const className = request.classId.className;
      const lessonDate = new Date(request.date).toLocaleDateString('vi-VN');
      const period = request.period;
      
      const statusText = status === 'approved' ? 'được chấp thuận' : 'bị từ chối';
      const statusIcon = status === 'approved' ? '✅' : '❌';
      const statusColor = status === 'approved' ? '#28a745' : '#dc3545';
      
      const subject = `${statusIcon} Thông báo kết quả đơn xin nghỉ - ${subjectName}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🏫 EcoSchool</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Hệ thống quản lý học tập</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: ${statusColor}; margin-top: 0; text-align: center;">
                ${statusIcon} Đơn xin nghỉ của bạn đã ${statusText}
              </h2>
              
              <div style="background: #f1f3f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">📋 Thông tin đơn xin nghỉ:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; width: 120px;"><strong>Giáo viên:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${teacherName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;"><strong>Môn học:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${subjectName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;"><strong>Lớp:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${className}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;"><strong>Ngày dạy:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${lessonDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;"><strong>Tiết:</strong></td>
                    <td style="padding: 8px 0; color: #333;">Tiết ${period}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;"><strong>Lý do xin nghỉ:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${request.reason}</td>
                  </tr>
                </table>
              </div>
              
              ${comment ? `
                <div style="background: ${status === 'approved' ? '#d4edda' : '#f8d7da'}; 
                           border: 1px solid ${status === 'approved' ? '#c3e6cb' : '#f5c6cb'}; 
                           color: ${status === 'approved' ? '#155724' : '#721c24'}; 
                           padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h4 style="margin-top: 0; color: ${status === 'approved' ? '#155724' : '#721c24'};">
                    💬 Nhận xét của quản lý:
                  </h4>
                  <p style="margin-bottom: 0; font-style: italic;">"${comment}"</p>
                </div>
              ` : ''}
              
              ${status === 'approved' ? `
                <div style="background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h4 style="margin-top: 0; color: #0c5460;">📝 Lưu ý quan trọng:</h4>
                  <ul style="margin-bottom: 0; padding-left: 20px;">
                    <li>Đơn xin nghỉ của bạn đã được chấp thuận</li>
                    <li>Học sinh trong lớp sẽ được thông báo về việc nghỉ học</li>
                    <li>Tiết học sẽ được đánh dấu là vắng mặt</li>
                    <li>Vui lòng sắp xếp bài học bù nếu cần thiết</li>
                  </ul>
                </div>
              ` : `
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h4 style="margin-top: 0; color: #721c24;">📝 Lưu ý quan trọng:</h4>
                  <ul style="margin-bottom: 0; padding-left: 20px;">
                    <li>Đơn xin nghỉ của bạn đã bị từ chối</li>
                    <li>Bạn cần có mặt đầy đủ trong tiết dạy này</li>
                    <li>Nếu có thắc mắc, vui lòng liên hệ với quản lý</li>
                  </ul>
                </div>
              `}
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 14px;">
              <p>📧 Email này được gửi tự động từ hệ thống EcoSchool</p>
              <p>🕒 Thời gian: ${new Date().toLocaleString('vi-VN')}</p>
            </div>
          </div>
        </div>
      `;
      
      await emailService.sendEmail(teacherEmail, subject, html);
      
      console.log(`📧 Email notification sent to ${teacherEmail} for ${status} teacher leave request`);
      
    } catch (error) {
      console.error('❌ Error sending teacher leave request notification:', error.message);
      throw error;
    }
  }
  
  // Thông báo cho học sinh và cập nhật lesson status khi approve
  async notifyStudentsAndUpdateLesson(request) {
    try {
      const emailService = require('../../auth/services/email.service');
      
      // Get students in the class
      const students = await User.find({
        class_id: request.classId._id,
        role: 'student'
      }).select('name email');
      
      if (students.length === 0) {
        console.log('⚠️ No students found in class to notify');
        return;
      }
      
      const subjectName = request.subjectId.subjectName;
      const className = request.classId.className;
      const lessonDate = new Date(request.date).toLocaleDateString('vi-VN');
      const period = request.period;
      const teacherName = request.teacherId.fullName || request.teacherId.name;
      
      const subject = `📢 Thông báo nghỉ học - ${subjectName}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🏫 EcoSchool</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Hệ thống quản lý học tập</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #fd7e14; margin-top: 0; text-align: center;">
                📢 Thông báo nghỉ học
              </h2>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #856404; margin-top: 0;">📚 Thông tin tiết học:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #856404; width: 120px;"><strong>Môn học:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${subjectName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #856404;"><strong>Lớp:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${className}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #856404;"><strong>Giáo viên:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${teacherName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #856404;"><strong>Ngày học:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${lessonDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #856404;"><strong>Tiết:</strong></td>
                    <td style="padding: 8px 0; color: #333;">Tiết ${period}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #721c24;">📝 Thông báo quan trọng:</h4>
                <ul style="margin-bottom: 0; padding-left: 20px;">
                  <li>Giáo viên ${teacherName} xin phép nghỉ tiết học này</li>
                  <li>Tiết học sẽ được hủy và không có giáo viên thay thế</li>
                  <li>Các em có thể nghỉ học hoặc tự học tại lớp</li>
                  <li>Bài học sẽ được bù vào thời gian khác (nếu có)</li>
                </ul>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 14px;">
              <p>📧 Email này được gửi tự động từ hệ thống EcoSchool</p>
              <p>🕒 Thời gian: ${new Date().toLocaleString('vi-VN')}</p>
            </div>
          </div>
        </div>
      `;
      
      // Send email to all students
      const emailPromises = students.map(student => 
        emailService.sendEmail(student.email, subject, html)
      );
      
      await Promise.allSettled(emailPromises);
      
      // Update lesson status to absent
      await Lesson.findByIdAndUpdate(request.lessonId._id, {
        status: 'absent',
        updatedAt: new Date()
      });
      
      // Update request notification status
      request.studentImpact.notificationSent = true;
      request.studentImpact.notificationSentAt = new Date();
      await request.save();
      
      console.log(`📧 Notification sent to ${students.length} students and lesson status updated to absent`);
      
    } catch (error) {
      console.error('❌ Error notifying students and updating lesson:', error.message);
      throw error;
    }
  }
}

module.exports = new TeacherLeaveRequestService(); 