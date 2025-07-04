const LessonRequest = require('../models/lesson-request.model');
const Lesson = require('../models/lesson.model');
const Class = require('../../classes/models/class.model');
const Subject = require('../../subjects/models/subject.model');
const User = require('../../auth/models/user.model');
const AcademicYear = require('../models/academic-year.model');
const TimeSlot = require('../models/time-slot.model');
const emailService = require('../../auth/services/email.service');

class LessonRequestService {
  
  // Helper function to calculate week range from a date
  getWeekRange(date) {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ...
    
    // Calculate start of week (Monday)
    const startOfWeek = new Date(targetDate);
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 6 days from Monday
    startOfWeek.setDate(targetDate.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Calculate end of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return {
      startOfWeek: startOfWeek,
      endOfWeek: endOfWeek
    };
  }
  
  // Lấy các tiết học của giáo viên theo tuần (cho cả swap và makeup)
  async getTeacherLessonsForWeek(teacherId, academicYear, startOfWeek, endOfWeek, requestType = 'swap') {
    try {
      console.log(`🔍 Getting teacher lessons for ${requestType} - Teacher: ${teacherId}, Week: ${startOfWeek} to ${endOfWeek}`);
      
      const startDate = new Date(startOfWeek);
      const endDate = new Date(endOfWeek);
      endDate.setHours(23, 59, 59, 999);
      
      let statusFilter;
      if (requestType === 'swap') {
        // Với swap: chỉ lấy tiết 'scheduled'
        statusFilter = 'scheduled';
      } else if (requestType === 'makeup') {
        // Với makeup: chỉ lấy tiết 'absent'
        statusFilter = 'absent';
      }
      
      // Tìm tất cả tiết học của giáo viên trong tuần đó
      const lessons = await Lesson.find({
        teacher: teacherId,
        scheduledDate: {
          $gte: startDate,
          $lte: endDate
        },
        status: statusFilter,
        type: { $in: ['regular', 'makeup'] } // Chỉ lấy tiết học thường và tiết bù
      })
      .populate('class', 'className gradeLevel')
      .populate('subject', 'subjectName subjectCode')
      .populate('timeSlot', 'period startTime endTime')
      .populate('academicYear', 'name startDate endDate')
      .sort({ scheduledDate: 1, 'timeSlot.period': 1 })
      .lean();
      
      console.log(`📚 Found ${lessons.length} ${statusFilter} lessons for teacher`);
      
      return {
        success: true,
        lessons: lessons,
        count: lessons.length,
        requestType: requestType
      };
      
    } catch (error) {
      console.error('❌ Error getting teacher lessons:', error.message);
      throw new Error(`Failed to get teacher lessons: ${error.message}`);
    }
  }
  
  // Lấy các tiết trống có thể đổi/dạy bù
  async getAvailableLessonsForRequest(classId, academicYear, startOfWeek, endOfWeek, subjectId) {
    try {
      console.log(`🔍 Getting available lessons for request - Class: ${classId}, Subject: ${subjectId}`);
      
      const startDate = new Date(startOfWeek);
      const endDate = new Date(endOfWeek);
      endDate.setHours(23, 59, 59, 999);
      
      // Tìm các tiết trống (empty) trong lớp đó trong tuần
      const availableLessons = await Lesson.find({
        class: classId,
        scheduledDate: {
          $gte: startDate,
          $lte: endDate
        },
        type: 'empty',
        status: 'scheduled'
      })
      .populate('class', 'className gradeLevel')
      .populate('timeSlot', 'period startTime endTime')
      .populate('academicYear', 'name startDate endDate')
      .sort({ scheduledDate: 1, 'timeSlot.period': 1 })
      .lean();
      
      console.log(`📚 Found ${availableLessons.length} available empty lessons`);
      
      // Lấy thông tin subject để hiển thị
      const subjectInfo = await Subject.findById(subjectId).lean();
      
      return {
        success: true,
        availableLessons: availableLessons,
        subjectInfo: subjectInfo,
        count: availableLessons.length
      };
      
    } catch (error) {
      console.error('❌ Error getting available lessons:', error.message);
      throw new Error(`Failed to get available lessons: ${error.message}`);
    }
  }
  
  // Tạo yêu cầu đổi tiết hoặc dạy bù
  async createLessonRequest(data) {
    try {
      console.log(`🔄 Creating lesson ${data.requestType} request for teacher ${data.teacherId}`);
      
      // Validate dữ liệu đầu vào
      if (!data.teacherId || !data.originalLessonId || !data.replacementLessonId || !data.reason || !data.requestType) {
        throw new Error('Missing required fields for lesson request');
      }
      
      if (!['swap', 'makeup'].includes(data.requestType)) {
        throw new Error('Invalid request type. Must be swap or makeup');
      }
      
      // Kiểm tra originalLesson tồn tại và thuộc về giáo viên
      const originalLesson = await Lesson.findById(data.originalLessonId)
        .populate('class', 'className gradeLevel')
        .populate('subject', 'subjectName subjectCode')
        .populate('academicYear', 'name startDate endDate')
        .populate('timeSlot', 'period startTime endTime');
      
      if (!originalLesson) {
        throw new Error('Original lesson not found');
      }
      
      if (originalLesson.teacher.toString() !== data.teacherId) {
        throw new Error('Original lesson does not belong to this teacher');
      }
      
      // Validate status dựa trên requestType
      if (data.requestType === 'swap' && originalLesson.status !== 'scheduled') {
        throw new Error('Original lesson must be scheduled for swap request');
      }
      
      if (data.requestType === 'makeup' && originalLesson.status !== 'absent') {
        throw new Error('Original lesson must be absent for makeup request');
      }
      
      // Kiểm tra replacementLesson tồn tại và là tiết trống
      const replacementLesson = await Lesson.findById(data.replacementLessonId)
        .populate('class', 'className gradeLevel')
        .populate('timeSlot', 'period startTime endTime');
      
      if (!replacementLesson) {
        throw new Error('Replacement lesson not found');
      }
      
      if (replacementLesson.type !== 'empty') {
        throw new Error('Replacement lesson must be empty');
      }
      
      if (replacementLesson.status !== 'scheduled') {
        throw new Error('Replacement lesson must be scheduled');
      }
      
      // Kiểm tra cùng lớp
      if (originalLesson.class._id.toString() !== replacementLesson.class._id.toString()) {
        throw new Error('Original and replacement lessons must be in the same class');
      }
      
      // Kiểm tra cùng tuần
      const originalWeek = this.getWeekRange(originalLesson.scheduledDate);
      const replacementWeek = this.getWeekRange(replacementLesson.scheduledDate);
      
      if (originalWeek.startOfWeek.getTime() !== replacementWeek.startOfWeek.getTime()) {
        throw new Error('Original and replacement lessons must be in the same week');
      }
      
      // Kiểm tra không có request đang pending cho lesson này
      const existingRequest = await LessonRequest.findOne({
        originalLesson: data.originalLessonId,
        status: 'pending'
      });
      
      if (existingRequest) {
        throw new Error('There is already a pending request for this lesson');
      }
      
      // Tạo lesson request với thông tin tuần tự động tính toán
      const lessonRequestData = {
        requestType: data.requestType,
        requestingTeacher: data.teacherId,
        originalLesson: data.originalLessonId,
        replacementLesson: data.replacementLessonId,
        reason: data.reason,
        additionalInfo: {
          classInfo: originalLesson.class._id,
          subjectInfo: originalLesson.subject._id,
          academicYear: originalLesson.academicYear._id,
          weekInfo: {
            startOfWeek: originalWeek.startOfWeek,
            endOfWeek: originalWeek.endOfWeek
          }
        },
        createdBy: data.teacherId
      };
      
      // Thêm thông tin đặc biệt cho makeup request
      if (data.requestType === 'makeup') {
        lessonRequestData.makeupInfo = {
          originalDate: originalLesson.scheduledDate,
          absentReason: data.reason || 'Not specified'
        };
      }
      
      // Tạo request
      const lessonRequest = new LessonRequest(lessonRequestData);
      await lessonRequest.save();
      
      // Populate thông tin chi tiết
      const populatedRequest = await LessonRequest.findById(lessonRequest._id)
        .populate({
          path: 'originalLesson',
          select: 'lessonId scheduledDate timeSlot topic status type',
          populate: {
            path: 'timeSlot',
            select: 'period name startTime endTime'
          }
        })
        .populate({
          path: 'replacementLesson',
          select: 'lessonId scheduledDate timeSlot topic status type',
          populate: {
            path: 'timeSlot',
            select: 'period name startTime endTime'
          }
        })
        .populate('requestingTeacher', 'name email fullName')
        .populate('additionalInfo.classInfo', 'className gradeLevel')
        .populate('additionalInfo.subjectInfo', 'subjectName subjectCode')
        .populate('additionalInfo.academicYear', 'name startDate endDate');
      
      // Gửi email thông báo cho manager
      await this.sendNewLessonRequestToManager(populatedRequest);
      
      console.log(`✅ Created lesson ${data.requestType} request: ${lessonRequest.requestId}`);
      
      return {
        success: true,
        message: `Lesson ${data.requestType} request created successfully`,
        request: populatedRequest
      };
      
    } catch (error) {
      console.error('❌ Error creating lesson request:', error.message);
      throw new Error(`Failed to create lesson request: ${error.message}`);
    }
  }
  
  // Helper function để format thông tin tiết học
  formatLessonInfo(lesson) {
    const timeSlot = lesson.timeSlot;
    let periodText = `Tiết ${timeSlot?.period || 'N/A'}`;
    
    if (timeSlot?.startTime && timeSlot?.endTime) {
      periodText += ` (${timeSlot.startTime}-${timeSlot.endTime})`;
    }
    
    return periodText;
  }

  // Gửi email thông báo yêu cầu mới cho manager
  async sendNewLessonRequestToManager(lessonRequest) {
    try {
      // Tìm managers
      const managers = await User.find({ role: 'manager' }).lean();
      
      if (managers.length === 0) {
        console.log('⚠️ No managers found to send notification');
        return;
      }
      
      const requestTypeText = lessonRequest.requestType === 'swap' ? 'đổi tiết' : 'dạy bù';
      
      // Tạo email content
      const subject = `Yêu cầu ${requestTypeText} mới - ${lessonRequest.requestId}`;
      
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Yêu cầu ${requestTypeText} mới</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #34495e; margin-top: 0;">Thông tin yêu cầu</h3>
            <p><strong>Mã yêu cầu:</strong> ${lessonRequest.requestId}</p>
            <p><strong>Loại yêu cầu:</strong> ${requestTypeText}</p>
            <p><strong>Giáo viên:</strong> ${lessonRequest.requestingTeacher.fullName || lessonRequest.requestingTeacher.name}</p>
            <p><strong>Lớp:</strong> ${lessonRequest.additionalInfo.classInfo.className}</p>
            <p><strong>Môn học:</strong> ${lessonRequest.additionalInfo.subjectInfo.subjectName}</p>
            <p><strong>Lý do:</strong> ${lessonRequest.reason}</p>
          </div>
          
          <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2980b9; margin-top: 0;">Thông tin tiết học</h3>
            <div style="display: flex; justify-content: space-between;">
              <div style="flex: 1; margin-right: 20px;">
                <h4 style="color: #e74c3c;">Tiết gốc:</h4>
                <p>Ngày: ${new Date(lessonRequest.originalLesson.scheduledDate).toLocaleDateString('vi-VN')}</p>
                <p>${this.formatLessonInfo(lessonRequest.originalLesson)}</p>
                <p>Trạng thái: ${lessonRequest.originalLesson.status}</p>
              </div>
              <div style="flex: 1;">
                <h4 style="color: #27ae60;">Tiết thay thế:</h4>
                <p>Ngày: ${new Date(lessonRequest.replacementLesson.scheduledDate).toLocaleDateString('vi-VN')}</p>
                <p>${this.formatLessonInfo(lessonRequest.replacementLesson)}</p>
                <p>Trạng thái: ${lessonRequest.replacementLesson.status}</p>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #7f8c8d;">Vui lòng đăng nhập vào hệ thống để xem chi tiết và xử lý yêu cầu này.</p>
          </div>
          
          <div style="border-top: 1px solid #bdc3c7; padding-top: 20px; text-align: center; color: #95a5a6; font-size: 12px;">
            <p>Email này được gửi tự động từ hệ thống quản lý lịch học EcoSchool.</p>
          </div>
        </div>
      `;
      
      // Gửi email cho từng manager
      for (const manager of managers) {
        await emailService.sendEmail(manager.email, subject, emailContent);
      }
      
      console.log(`📧 Sent ${requestTypeText} request notification to ${managers.length} managers`);
      
    } catch (error) {
      console.error('❌ Error sending email notification:', error.message);
      // Không throw error để không làm gián đoạn flow chính
    }
  }
  
  // Duyệt yêu cầu (cả swap và makeup)
  async approveRequest(requestId, managerId, comment = '') {
    try {
      console.log(`✅ Approving lesson request: ${requestId}`);
      
      // Tìm request
      const lessonRequest = await LessonRequest.findById(requestId)
        .populate({
          path: 'originalLesson',
          populate: {
            path: 'timeSlot',
            select: 'period name startTime endTime'
          }
        })
        .populate({
          path: 'replacementLesson',
          populate: {
            path: 'timeSlot',
            select: 'period name startTime endTime'
          }
        })
        .populate('requestingTeacher', 'name email fullName')
        .populate('additionalInfo.classInfo', 'className gradeLevel')
        .populate('additionalInfo.subjectInfo', 'subjectName subjectCode');
      
      if (!lessonRequest) {
        throw new Error('Lesson request not found');
      }
      
      if (lessonRequest.status !== 'pending') {
        throw new Error('Request has already been processed');
      }
      
      // Kiểm tra lessons vẫn còn valid
      const originalLesson = await Lesson.findById(lessonRequest.originalLesson._id);
      const replacementLesson = await Lesson.findById(lessonRequest.replacementLesson._id);
      
      if (!originalLesson || !replacementLesson) {
        throw new Error('One or both lessons no longer exist');
      }
      
      if (replacementLesson.type !== 'empty' || replacementLesson.status !== 'scheduled') {
        throw new Error('Replacement lesson is no longer available');
      }
      
      // Xử lý dựa trên loại request
      if (lessonRequest.requestType === 'swap') {
        await this.processSwapApproval(lessonRequest, originalLesson, replacementLesson);
      } else if (lessonRequest.requestType === 'makeup') {
        await this.processMakeupApproval(lessonRequest, originalLesson, replacementLesson);
      }
      
      // Cập nhật trạng thái request
      lessonRequest.status = 'approved';
      lessonRequest.processedBy = managerId;
      lessonRequest.processedAt = new Date();
      lessonRequest.managerComment = comment;
      lessonRequest.lastModifiedBy = managerId;
      
      await lessonRequest.save();
      
      // Gửi email thông báo cho giáo viên
      await this.sendRequestNotifications(lessonRequest, 'approved', comment);
      
      // Gửi email thông báo cho học sinh
      await this.sendStudentNotifications(lessonRequest, 'approved');
      
      console.log(`✅ Approved lesson ${lessonRequest.requestType} request: ${requestId}`);
      
      return {
        success: true,
        message: `Lesson ${lessonRequest.requestType} request approved successfully`,
        request: lessonRequest
      };
      
    } catch (error) {
      console.error('❌ Error approving lesson request:', error.message);
      throw new Error(`Failed to approve lesson request: ${error.message}`);
    }
  }
  
  // Xử lý approval cho swap request
  async processSwapApproval(lessonRequest, originalLesson, replacementLesson) {
    // Hoán đổi thông tin giữa 2 tiết
    const originalData = {
      teacher: originalLesson.teacher,
      subject: originalLesson.subject,
      topic: originalLesson.topic,
      notes: originalLesson.notes,
      type: originalLesson.type
    };
    
    // Cập nhật replacement lesson thành lesson chính
    replacementLesson.teacher = originalData.teacher;
    replacementLesson.subject = originalData.subject;
    replacementLesson.topic = originalData.topic;
    replacementLesson.notes = originalData.notes;
    replacementLesson.type = originalData.type;
    replacementLesson.lastModifiedBy = lessonRequest.processedBy;
    
    // Cập nhật original lesson thành empty
    originalLesson.teacher = undefined;
    originalLesson.subject = undefined;
    originalLesson.topic = undefined;
    originalLesson.notes = undefined;
    originalLesson.type = 'empty';
    originalLesson.lastModifiedBy = lessonRequest.processedBy;
    
    await originalLesson.save();
    await replacementLesson.save();
    
    console.log(`🔄 Swapped lessons: ${originalLesson.lessonId} ↔ ${replacementLesson.lessonId}`);
  }
  
  // Xử lý approval cho makeup request
  async processMakeupApproval(lessonRequest, originalLesson, replacementLesson) {
    // Tạo tiết makeup từ replacement lesson
    replacementLesson.teacher = originalLesson.teacher;
    replacementLesson.subject = originalLesson.subject;
    replacementLesson.topic = originalLesson.topic || `Makeup for ${new Date(originalLesson.scheduledDate).toLocaleDateString('vi-VN')}`;
    replacementLesson.notes = `Makeup lesson for absent lesson on ${new Date(originalLesson.scheduledDate).toLocaleDateString('vi-VN')}`;
    replacementLesson.type = 'makeup';
    
    // QUAN TRỌNG: Tạo liên kết với tiết absent thay vì copy lessonId
    // (không thể copy lessonId vì vi phạm unique constraint)
    replacementLesson.makeupInfo = {
      originalLesson: originalLesson._id,
      originalLessonId: originalLesson.lessonId, // Lưu reference để tracking
      reason: lessonRequest.reason,
      originalDate: originalLesson.scheduledDate
    };
    replacementLesson.lastModifiedBy = lessonRequest.processedBy;
    
    // Save makeup lesson với lessonId riêng (do pre-save middleware tự tạo)
    await replacementLesson.save();
    
    // Lưu thông tin makeup lesson vào request
    lessonRequest.makeupInfo.createdMakeupLesson = replacementLesson._id;
    
    console.log(`📚 Created makeup lesson: ${replacementLesson.lessonId} for absent lesson: ${originalLesson.lessonId}`);
  }
  
  // Từ chối yêu cầu
  async rejectRequest(requestId, managerId, comment = '') {
    try {
      console.log(`❌ Rejecting lesson request: ${requestId}`);
      
      // Tìm request
      const lessonRequest = await LessonRequest.findById(requestId)
        .populate({
          path: 'originalLesson',
          select: 'lessonId scheduledDate timeSlot topic status type',
          populate: {
            path: 'timeSlot',
            select: 'period name startTime endTime'
          }
        })
        .populate({
          path: 'replacementLesson',
          select: 'lessonId scheduledDate timeSlot topic status type',
          populate: {
            path: 'timeSlot',
            select: 'period name startTime endTime'
          }
        })
        .populate('requestingTeacher', 'name email fullName')
        .populate('additionalInfo.classInfo', 'className gradeLevel')
        .populate('additionalInfo.subjectInfo', 'subjectName subjectCode');
      
      if (!lessonRequest) {
        throw new Error('Lesson request not found');
      }
      
      if (lessonRequest.status !== 'pending') {
        throw new Error('Request has already been processed');
      }
      
      // Cập nhật trạng thái request
      lessonRequest.status = 'rejected';
      lessonRequest.processedBy = managerId;
      lessonRequest.processedAt = new Date();
      lessonRequest.managerComment = comment;
      lessonRequest.lastModifiedBy = managerId;
      
      await lessonRequest.save();
      
      // Gửi email thông báo
      await this.sendRequestNotifications(lessonRequest, 'rejected', comment);
      
      console.log(`❌ Rejected lesson ${lessonRequest.requestType} request: ${requestId}`);
      
      return {
        success: true,
        message: `Lesson ${lessonRequest.requestType} request rejected`,
        request: lessonRequest
      };
      
    } catch (error) {
      console.error('❌ Error rejecting lesson request:', error.message);
      throw new Error(`Failed to reject lesson request: ${error.message}`);
    }
  }
  
  // Gửi email thông báo kết quả xử lý
  async sendRequestNotifications(lessonRequest, status, comment) {
    try {
      const requestTypeText = lessonRequest.requestType === 'swap' ? 'đổi tiết' : 'dạy bù';
      const statusText = status === 'approved' ? 'đã được duyệt' : 'đã bị từ chối';
      const statusColor = status === 'approved' ? '#27ae60' : '#e74c3c';
      
      const subject = `Yêu cầu ${requestTypeText} ${statusText} - ${lessonRequest.requestId}`;
      
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusColor};">Yêu cầu ${requestTypeText} ${statusText}</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #34495e; margin-top: 0;">Thông tin yêu cầu</h3>
            <p><strong>Mã yêu cầu:</strong> ${lessonRequest.requestId}</p>
            <p><strong>Loại yêu cầu:</strong> ${requestTypeText}</p>
            <p><strong>Lớp:</strong> ${lessonRequest.additionalInfo.classInfo.className}</p>
            <p><strong>Môn học:</strong> ${lessonRequest.additionalInfo.subjectInfo.subjectName}</p>
            <p><strong>Trạng thái:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText.toUpperCase()}</span></p>
          </div>
          
          ${comment ? `
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">Nhận xét từ quản lý</h3>
            <p style="color: #856404;">${comment}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #7f8c8d;">Vui lòng đăng nhập vào hệ thống để xem chi tiết.</p>
          </div>
          
          <div style="border-top: 1px solid #bdc3c7; padding-top: 20px; text-align: center; color: #95a5a6; font-size: 12px;">
            <p>Email này được gửi tự động từ hệ thống quản lý lịch học EcoSchool.</p>
          </div>
        </div>
      `;
      
      // Gửi email cho giáo viên
      await emailService.sendEmail(lessonRequest.requestingTeacher.email, subject, emailContent);
      
      console.log(`📧 Sent ${requestTypeText} ${status} notification to teacher`);
      
    } catch (error) {
      console.error('❌ Error sending notification email:', error.message);
      // Không throw error để không làm gián đoạn flow chính
    }
  }
  
  // Gửi email thông báo cho học sinh khi yêu cầu được approve
  async sendStudentNotifications(lessonRequest, status) {
    try {
      console.log(`📧 Sending student notifications for ${lessonRequest.requestType} ${status}`);
      
      // Lấy danh sách học sinh trong lớp
      const students = await User.find({ 
        role: 'student',
        class_id: lessonRequest.additionalInfo.classInfo._id
      }).select('email name fullName class_id').lean();
      
      if (students.length === 0) {
        console.log('⚠️ No students found in class');
        return;
      }
      
      const requestTypeText = lessonRequest.requestType === 'swap' ? 'đổi tiết' : 'dạy bù';
      const subject = `Thông báo ${requestTypeText} - ${lessonRequest.additionalInfo.classInfo.className}`;
      
      // Tạo email content dựa trên loại request
      let emailContent;
      if (lessonRequest.requestType === 'swap') {
        emailContent = this.createSwapNotificationEmail(lessonRequest, requestTypeText);
      } else {
        emailContent = this.createMakeupNotificationEmail(lessonRequest, requestTypeText);
      }
      
      // Gửi email cho từng học sinh
      for (const student of students) {
        await emailService.sendEmail(student.email, subject, emailContent);
      }
      
      console.log(`📧 Sent ${requestTypeText} notification to ${students.length} students`);
      
    } catch (error) {
      console.error('❌ Error sending student notifications:', error.message);
      // Không throw error để không làm gián đoạn flow chính
    }
  }
  
  // Tạo email content cho thông báo swap
  createSwapNotificationEmail(lessonRequest, requestTypeText) {
    const originalLesson = lessonRequest.originalLesson;
    const replacementLesson = lessonRequest.replacementLesson;
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">Thông báo ${requestTypeText} - ${lessonRequest.additionalInfo.classInfo.className}</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #34495e; margin-top: 0;">Thông tin môn học</h3>
          <p><strong>Môn học:</strong> ${lessonRequest.additionalInfo.subjectInfo.subjectName}</p>
          <p><strong>Giáo viên:</strong> ${lessonRequest.requestingTeacher.fullName || lessonRequest.requestingTeacher.name}</p>
          <p><strong>Lớp:</strong> ${lessonRequest.additionalInfo.classInfo.className}</p>
        </div>
        
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">📅 Thay đổi lịch học</h3>
          
          <div style="display: flex; justify-content: space-between; margin: 20px 0;">
            <div style="flex: 1; margin-right: 20px; padding: 15px; background-color: #f8d7da; border-radius: 5px;">
              <h4 style="color: #721c24; margin-top: 0;">❌ Tiết bị hủy:</h4>
              <p><strong>Ngày:</strong> ${new Date(originalLesson.scheduledDate).toLocaleDateString('vi-VN')}</p>
              <p><strong>Tiết:</strong> ${this.formatLessonInfo(originalLesson)}</p>
              <p><strong>Chủ đề:</strong> ${originalLesson.topic || 'Chưa có'}</p>
            </div>
            <div style="flex: 1; padding: 15px; background-color: #d4edda; border-radius: 5px;">
              <h4 style="color: #155724; margin-top: 0;">✅ Tiết mới:</h4>
              <p><strong>Ngày:</strong> ${new Date(replacementLesson.scheduledDate).toLocaleDateString('vi-VN')}</p>
              <p><strong>Tiết:</strong> ${this.formatLessonInfo(replacementLesson)}</p>
              <p><strong>Chủ đề:</strong> ${replacementLesson.topic || originalLesson.topic || 'Chưa có'}</p>
            </div>
          </div>
        </div>
        
        <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2980b9; margin-top: 0;">📝 Lý do thay đổi</h3>
          <p style="color: #2c3e50;">${lessonRequest.reason}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #e74c3c; font-weight: bold;">⚠️ Vui lòng ghi nhớ thời gian học mới để không bị vắng mặt!</p>
        </div>
        
        <div style="border-top: 1px solid #bdc3c7; padding-top: 20px; text-align: center; color: #95a5a6; font-size: 12px;">
          <p>Thông báo này được gửi tự động từ hệ thống quản lý lịch học EcoSchool.</p>
        </div>
      </div>
    `;
  }
  
  // Tạo email content cho thông báo makeup
  createMakeupNotificationEmail(lessonRequest, requestTypeText) {
    const originalLesson = lessonRequest.originalLesson;
    const replacementLesson = lessonRequest.replacementLesson;
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Thông báo ${requestTypeText} - ${lessonRequest.additionalInfo.classInfo.className}</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #34495e; margin-top: 0;">Thông tin môn học</h3>
          <p><strong>Môn học:</strong> ${lessonRequest.additionalInfo.subjectInfo.subjectName}</p>
          <p><strong>Giáo viên:</strong> ${lessonRequest.requestingTeacher.fullName || lessonRequest.requestingTeacher.name}</p>
          <p><strong>Lớp:</strong> ${lessonRequest.additionalInfo.classInfo.className}</p>
        </div>
        
        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <h3 style="color: #0c5460; margin-top: 0;">📚 Thông tin tiết dạy bù</h3>
          
          <div style="margin: 20px 0;">
            <div style="padding: 15px; background-color: #f8d7da; border-radius: 5px; margin-bottom: 15px;">
              <h4 style="color: #721c24; margin-top: 0;">📅 Tiết học bị vắng:</h4>
              <p><strong>Ngày:</strong> ${new Date(originalLesson.scheduledDate).toLocaleDateString('vi-VN')}</p>
              <p><strong>Tiết:</strong> ${this.formatLessonInfo(originalLesson)}</p>
              <p><strong>Chủ đề:</strong> ${originalLesson.topic || 'Chưa có'}</p>
              <p><strong>Lý do vắng:</strong> ${lessonRequest.makeupInfo?.absentReason || 'Không rõ'}</p>
            </div>
            
            <div style="padding: 15px; background-color: #d4edda; border-radius: 5px;">
              <h4 style="color: #155724; margin-top: 0;">✅ Tiết dạy bù:</h4>
              <p><strong>Ngày:</strong> ${new Date(replacementLesson.scheduledDate).toLocaleDateString('vi-VN')}</p>
              <p><strong>Tiết:</strong> ${this.formatLessonInfo(replacementLesson)}</p>
              <p><strong>Nội dung:</strong> Dạy bù tiết học ngày ${new Date(originalLesson.scheduledDate).toLocaleDateString('vi-VN')}</p>
            </div>
          </div>
        </div>
        
        <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2980b9; margin-top: 0;">📝 Lý do dạy bù</h3>
          <p style="color: #2c3e50;">${lessonRequest.reason}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #27ae60; font-weight: bold;">📚 Vui lòng tham gia đầy đủ tiết dạy bù để không bị thiếu kiến thức!</p>
        </div>
        
        <div style="border-top: 1px solid #bdc3c7; padding-top: 20px; text-align: center; color: #95a5a6; font-size: 12px;">
          <p>Thông báo này được gửi tự động từ hệ thống quản lý lịch học EcoSchool.</p>
        </div>
      </div>
    `;
  }

  // Xử lý khi giáo viên đánh giá tiết makeup completed
  async handleMakeupLessonCompleted(makeupLessonId) {
    try {
      console.log(`🎯 Handling makeup lesson completed: ${makeupLessonId}`);
      
      // Tìm makeup lesson
      const makeupLesson = await Lesson.findById(makeupLessonId);
      if (!makeupLesson || makeupLesson.type !== 'makeup') {
        return; // Không phải makeup lesson
      }
      
      // Tìm original lesson từ makeupInfo
      if (makeupLesson.makeupInfo && makeupLesson.makeupInfo.originalLesson) {
        const originalLesson = await Lesson.findById(makeupLesson.makeupInfo.originalLesson);
        
        if (originalLesson && originalLesson.status === 'absent') {
          // Cập nhật original lesson thành completed
          originalLesson.status = 'completed';
          originalLesson.actualDate = makeupLesson.actualDate || new Date();
          originalLesson.lastModifiedBy = makeupLesson.lastModifiedBy;
          
          await originalLesson.save();
          
          console.log(`✅ Updated original absent lesson ${originalLesson.lessonId} to completed`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error handling makeup lesson completion:', error.message);
      // Không throw error để không làm gián đoạn flow chính
    }
  }
}

module.exports = LessonRequestService; 