const LessonSwap = require('../models/lesson-swap.model');
const Lesson = require('../models/lesson.model');
const Class = require('../../classes/models/class.model');
const Subject = require('../../subjects/models/subject.model');
const User = require('../../auth/models/user.model');
const AcademicYear = require('../models/academic-year.model');
const TimeSlot = require('../models/time-slot.model');
const emailService = require('../../auth/services/email.service');

class LessonSwapService {
  
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
  
  // Lấy các tiết học của giáo viên theo tuần
  async getTeacherLessonsForWeek(teacherId, academicYear, startOfWeek, endOfWeek) {
    try {
      console.log(`🔍 Getting teacher lessons for swap - Teacher: ${teacherId}, Week: ${startOfWeek} to ${endOfWeek}`);
      
      const startDate = new Date(startOfWeek);
      const endDate = new Date(endOfWeek);
      endDate.setHours(23, 59, 59, 999);
      
      // Tìm tất cả tiết học của giáo viên trong tuần đó với status = 'scheduled'
      const lessons = await Lesson.find({
        teacher: teacherId,
        scheduledDate: {
          $gte: startDate,
          $lte: endDate
        },
        status: 'scheduled',
        type: { $in: ['regular', 'makeup'] } // Chỉ lấy tiết học thường và tiết bù
      })
      .populate('class', 'className gradeLevel')
      .populate('subject', 'subjectName subjectCode')
      .populate('timeSlot', 'period startTime endTime')
      .populate('academicYear', 'name startDate endDate')
      .sort({ scheduledDate: 1, 'timeSlot.period': 1 })
      .lean();
      
      console.log(`📚 Found ${lessons.length} scheduled lessons for teacher`);
      
      return {
        success: true,
        lessons: lessons,
        count: lessons.length
      };
      
    } catch (error) {
      console.error('❌ Error getting teacher lessons for swap:', error.message);
      throw new Error(`Failed to get teacher lessons: ${error.message}`);
    }
  }
  
  // Lấy các tiết trống có thể đổi
  async getAvailableLessonsForSwap(classId, academicYear, startOfWeek, endOfWeek, subjectId) {
    try {
      console.log(`🔍 Getting available lessons for swap - Class: ${classId}, Subject: ${subjectId}`);
      
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
      console.error('❌ Error getting available lessons for swap:', error.message);
      throw new Error(`Failed to get available lessons: ${error.message}`);
    }
  }
  
  // Tạo yêu cầu đổi tiết
  async createLessonSwapRequest(data) {
    try {
      console.log(`🔄 Creating lesson swap request for teacher ${data.teacherId}`);
      
      // Validate dữ liệu đầu vào
      if (!data.teacherId || !data.originalLessonId || !data.replacementLessonId || !data.reason) {
        throw new Error('Missing required fields for lesson swap request');
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
      
      if (originalLesson.status !== 'scheduled') {
        throw new Error('Original lesson must be scheduled to swap');
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
      const existingRequest = await LessonSwap.findOne({
        originalLesson: data.originalLessonId,
        status: 'pending'
      });
      
      if (existingRequest) {
        throw new Error('There is already a pending swap request for this lesson');
      }
      
      // Tạo unique swapId
      const generateSwapId = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `SWAP_${timestamp}_${random}`.toUpperCase();
      };
      
      // Tạo lesson swap request với thông tin tuần tự động tính toán
      const lessonSwapData = {
        swapId: generateSwapId(),
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
      
      const lessonSwap = new LessonSwap(lessonSwapData);
      await lessonSwap.save();
      
      // Populate thông tin đầy đủ để gửi email
      const populatedSwap = await LessonSwap.findById(lessonSwap._id)
        .populate('requestingTeacher', 'name email fullName')
        .populate({
          path: 'originalLesson',
          select: 'lessonId scheduledDate timeSlot topic',
          populate: {
            path: 'timeSlot',
            select: 'period startTime endTime'
          }
        })
        .populate({
          path: 'replacementLesson',
          select: 'lessonId scheduledDate timeSlot',
          populate: {
            path: 'timeSlot',
            select: 'period startTime endTime'
          }
        })
        .populate('additionalInfo.classInfo', 'className gradeLevel')
        .populate('additionalInfo.subjectInfo', 'subjectName subjectCode')
        .populate('additionalInfo.academicYear', 'name startDate endDate');
      
      console.log(`✅ Lesson swap request created successfully: ${lessonSwap.swapId}`);
      
      // Gửi email thông báo cho manager (async)
      this.sendNewLessonSwapRequestToManager(populatedSwap)
        .then(() => {
          console.log(`📧 Email notification sent to managers for lesson swap request ${lessonSwap.swapId}`);
        })
        .catch(error => {
          console.error(`❌ Failed to send email notification to managers for lesson swap request ${lessonSwap.swapId}:`, error.message);
        });
      
      return {
        success: true,
        message: 'Lesson swap request created successfully. Managers will be notified via email.',
        swapRequest: populatedSwap
      };
      
    } catch (error) {
      console.error('❌ Error creating lesson swap request:', error.message);
      throw new Error(`Failed to create lesson swap request: ${error.message}`);
    }
  }
  
  // Gửi email thông báo cho manager khi có yêu cầu đổi tiết mới
  async sendNewLessonSwapRequestToManager(swapRequest) {
    try {
      // Debug logging
      console.log('🔍 Debugging swap request data:');
      console.log('Original lesson:', JSON.stringify(swapRequest.originalLesson, null, 2));
      console.log('Replacement lesson:', JSON.stringify(swapRequest.replacementLesson, null, 2));
      
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
      
      const teacherName = swapRequest.requestingTeacher.fullName || swapRequest.requestingTeacher.name;
      const subjectName = swapRequest.additionalInfo.subjectInfo.subjectName;
      const className = swapRequest.additionalInfo.classInfo.className;
      
      const originalDate = new Date(swapRequest.originalLesson.scheduledDate).toLocaleDateString('vi-VN');
      const replacementDate = new Date(swapRequest.replacementLesson.scheduledDate).toLocaleDateString('vi-VN');
      
      // Safe access to timeSlot period
      const originalPeriod = swapRequest.originalLesson.timeSlot?.period || 'N/A';
      const replacementPeriod = swapRequest.replacementLesson.timeSlot?.period || 'N/A';
      
      const subject = `🔄 Yêu cầu đổi tiết cần duyệt - ${subjectName} - Lớp ${className}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🏫 EcoSchool</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Hệ thống quản lý học tập</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #fd7e14; margin-top: 0; text-align: center;">
                🔄 Yêu cầu đổi tiết cần duyệt
              </h2>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #856404; margin-top: 0;">👨‍🏫 Thông tin giáo viên:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #856404; width: 120px;"><strong>Giáo viên:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${teacherName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #856404;"><strong>Môn học:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${subjectName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #856404;"><strong>Lớp:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${className}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #e7f3ff; border: 1px solid #b3d9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #0056b3; margin-top: 0;">🔄 Chi tiết đổi tiết:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #0056b3; width: 120px;"><strong>Tiết cần đổi:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${originalDate} - Tiết ${originalPeriod}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #0056b3;"><strong>Đổi thành:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${replacementDate} - Tiết ${replacementPeriod}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #721c24; margin-top: 0;">💬 Lý do đổi tiết:</h3>
                <p style="margin-bottom: 0; font-style: italic; color: #333; background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #721c24;">
                  "${swapRequest.reason}"
                </p>
              </div>
              
              <div style="background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #0c5460;">⏰ Hành động cần thực hiện:</h4>
                <ul style="margin-bottom: 0; padding-left: 20px;">
                  <li>Vui lòng đăng nhập vào hệ thống để xem chi tiết yêu cầu</li>
                  <li>Chấp thuận hoặc từ chối yêu cầu đổi tiết với lý do rõ ràng</li>
                  <li>Nếu chấp thuận: Hệ thống sẽ tự động thực hiện đổi tiết và thông báo cho học sinh</li>
                  <li>Nếu từ chối: Yêu cầu sẽ bị từ chối và thông báo cho giáo viên</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #dc3545; color: white; padding: 12px 24px; border-radius: 25px; display: inline-block; font-weight: bold;">
                  🔔 Yêu cầu đổi tiết đang chờ duyệt
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
      
      console.log(`📧 New lesson swap request notification sent to ${managers.length} managers`);
      
    } catch (error) {
      console.error('❌ Error sending new lesson swap request notification to managers:', error.message);
      // Không throw error để không làm gián đoạn flow tạo yêu cầu
    }
  }
  
  // Duyệt yêu cầu đổi tiết
  async approveSwapRequest(requestId, managerId, comment = '') {
    try {
      console.log(`✅ Approving swap request ${requestId} by manager ${managerId}`);
      
      const swapRequest = await LessonSwap.findById(requestId)
        .populate('requestingTeacher', 'name email fullName')
        .populate({
          path: 'originalLesson',
          select: 'lessonId scheduledDate timeSlot topic',
          populate: {
            path: 'timeSlot',
            select: 'period startTime endTime'
          }
        })
        .populate({
          path: 'replacementLesson',
          select: 'lessonId scheduledDate timeSlot',
          populate: {
            path: 'timeSlot',
            select: 'period startTime endTime'
          }
        })
        .populate('additionalInfo.classInfo', 'className gradeLevel')
        .populate('additionalInfo.subjectInfo', 'subjectName subjectCode')
        .populate('additionalInfo.academicYear', 'name startDate endDate');
      
      if (!swapRequest) {
        throw new Error('Swap request not found');
      }
      
      if (swapRequest.status !== 'pending') {
        throw new Error(`Swap request has already been ${swapRequest.status}`);
      }
      
      // Kiểm tra lessons vẫn còn valid
      const originalLesson = await Lesson.findById(swapRequest.originalLesson._id);
      const replacementLesson = await Lesson.findById(swapRequest.replacementLesson._id);
      
      if (!originalLesson || originalLesson.status !== 'scheduled') {
        throw new Error('Original lesson is no longer available for swap');
      }
      
      if (!replacementLesson || replacementLesson.type !== 'empty' || replacementLesson.status !== 'scheduled') {
        throw new Error('Replacement lesson is no longer available for swap');
      }
      
      // Thực hiện đổi tiết
      // 1. Cập nhật replacement lesson với thông tin từ original lesson
      await Lesson.findByIdAndUpdate(replacementLesson._id, {
        subject: originalLesson.subject,
        teacher: originalLesson.teacher,
        type: originalLesson.type,
        topic: originalLesson.topic,
        notes: originalLesson.notes,
        lastModifiedBy: managerId
      });
      
      // 2. Xóa thông tin từ original lesson (chuyển thành empty)
      await Lesson.findByIdAndUpdate(originalLesson._id, {
        $unset: {
          subject: 1,
          teacher: 1,
          topic: 1,
          notes: 1
        },
        type: 'empty',
        lastModifiedBy: managerId
      });
      
      // 3. Cập nhật swap request
      swapRequest.status = 'approved';
      swapRequest.processedBy = managerId;
      swapRequest.managerComment = comment;
      swapRequest.processedAt = new Date();
      swapRequest.lastModifiedBy = managerId;
      await swapRequest.save();
      
      console.log(`✅ Swap request approved successfully: ${swapRequest.swapId}`);
      
      // Gửi email thông báo
      this.sendSwapNotifications(swapRequest, 'approved', comment);
      
      return {
        success: true,
        message: 'Lesson swap request approved successfully. Teacher and students will be notified via email.',
        swapRequest: swapRequest
      };
      
    } catch (error) {
      console.error('❌ Error approving swap request:', error.message);
      throw new Error(`Failed to approve swap request: ${error.message}`);
    }
  }
  
  // Từ chối yêu cầu đổi tiết
  async rejectSwapRequest(requestId, managerId, comment = '') {
    try {
      console.log(`❌ Rejecting swap request ${requestId} by manager ${managerId}`);
      
      const swapRequest = await LessonSwap.findById(requestId)
        .populate('requestingTeacher', 'name email fullName')
        .populate({
          path: 'originalLesson',
          select: 'lessonId scheduledDate timeSlot topic',
          populate: {
            path: 'timeSlot',
            select: 'period startTime endTime'
          }
        })
        .populate({
          path: 'replacementLesson',
          select: 'lessonId scheduledDate timeSlot',
          populate: {
            path: 'timeSlot',
            select: 'period startTime endTime'
          }
        })
        .populate('additionalInfo.classInfo', 'className gradeLevel')
        .populate('additionalInfo.subjectInfo', 'subjectName subjectCode')
        .populate('additionalInfo.academicYear', 'name startDate endDate');
      
      if (!swapRequest) {
        throw new Error('Swap request not found');
      }
      
      if (swapRequest.status !== 'pending') {
        throw new Error(`Swap request has already been ${swapRequest.status}`);
      }
      
      // Cập nhật swap request
      swapRequest.status = 'rejected';
      swapRequest.processedBy = managerId;
      swapRequest.managerComment = comment;
      swapRequest.processedAt = new Date();
      swapRequest.lastModifiedBy = managerId;
      await swapRequest.save();
      
      console.log(`❌ Swap request rejected: ${swapRequest.swapId}`);
      
      // Gửi email thông báo
      this.sendSwapNotifications(swapRequest, 'rejected', comment);
      
      return {
        success: true,
        message: 'Lesson swap request rejected successfully. Teacher will be notified via email.',
        swapRequest: swapRequest
      };
      
    } catch (error) {
      console.error('❌ Error rejecting swap request:', error.message);
      throw new Error(`Failed to reject swap request: ${error.message}`);
    }
  }
  
  // Gửi thông báo email
  async sendSwapNotifications(swapRequest, status, comment) {
    try {
      // Gửi email cho giáo viên
      await this.sendSwapRequestNotification(swapRequest, status, comment);
      
      // Nếu approved, gửi email cho học sinh
      if (status === 'approved') {
        await this.notifyStudentsAboutLessonSwap(swapRequest);
      }
      
    } catch (error) {
      console.error('❌ Error sending swap notifications:', error.message);
    }
  }
  
  // Gửi email thông báo kết quả cho giáo viên
  async sendSwapRequestNotification(swapRequest, status, comment) {
    try {
      const teacherEmail = swapRequest.requestingTeacher.email;
      const teacherName = swapRequest.requestingTeacher.fullName || swapRequest.requestingTeacher.name;
      const subjectName = swapRequest.additionalInfo.subjectInfo.subjectName;
      const className = swapRequest.additionalInfo.classInfo.className;
      
      const originalDate = new Date(swapRequest.originalLesson.scheduledDate).toLocaleDateString('vi-VN');
      const replacementDate = new Date(swapRequest.replacementLesson.scheduledDate).toLocaleDateString('vi-VN');
      
      const subject = status === 'approved' ? 
        `✅ Yêu cầu đổi tiết được chấp thuận - ${subjectName}` : 
        `❌ Yêu cầu đổi tiết bị từ chối - ${subjectName}`;
      
      const statusColor = status === 'approved' ? '#28a745' : '#dc3545';
      const statusIcon = status === 'approved' ? '✅' : '❌';
      const statusText = status === 'approved' ? 'ĐƯỢC CHẤP THUẬN' : 'BỊ TỪ CHỐI';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🏫 EcoSchool</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Hệ thống quản lý học tập</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: ${statusColor}; margin-top: 0; text-align: center;">
                ${statusIcon} Yêu cầu đổi tiết ${statusText}
              </h2>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #856404; margin-top: 0;">👨‍🏫 Thông tin yêu cầu:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #856404; width: 120px;"><strong>Giáo viên:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${teacherName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #856404;"><strong>Môn học:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${subjectName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #856404;"><strong>Lớp:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${className}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #856404;"><strong>Tiết cần đổi:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${originalDate} - Tiết ${swapRequest.originalLesson.timeSlot?.period || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #856404;"><strong>Đổi thành:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${replacementDate} - Tiết ${swapRequest.replacementLesson.timeSlot?.period || 'N/A'}</td>
                  </tr>
                </table>
              </div>
              
              ${comment ? `
                <div style="background: #e7f3ff; border: 1px solid #b3d9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #0056b3; margin-top: 0;">💬 Nhận xét của quản lý:</h3>
                  <p style="margin-bottom: 0; font-style: italic; color: #333; background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #0056b3;">
                    "${comment}"
                  </p>
                </div>
              ` : ''}
              
              ${status === 'approved' ? `
                <div style="background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h4 style="margin-top: 0; color: #0c5460;">📝 Lưu ý quan trọng:</h4>
                  <ul style="margin-bottom: 0; padding-left: 20px;">
                    <li>Yêu cầu đổi tiết của bạn đã được chấp thuận</li>
                    <li>Hệ thống đã tự động thực hiện đổi tiết trong lịch học</li>
                    <li>Học sinh trong lớp sẽ được thông báo về sự thay đổi</li>
                    <li>Vui lòng chuẩn bị bài giảng cho tiết học mới</li>
                  </ul>
                </div>
              ` : `
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h4 style="margin-top: 0; color: #721c24;">📝 Lưu ý quan trọng:</h4>
                  <ul style="margin-bottom: 0; padding-left: 20px;">
                    <li>Yêu cầu đổi tiết của bạn đã bị từ chối</li>
                    <li>Lịch học sẽ giữ nguyên như ban đầu</li>
                    <li>Bạn cần có mặt đầy đủ trong tiết dạy gốc</li>
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
      
      console.log(`📧 Email notification sent to ${teacherEmail} for ${status} lesson swap request`);
      
    } catch (error) {
      console.error('❌ Error sending lesson swap request notification:', error.message);
      throw error;
    }
  }
  
  // Gửi email thông báo cho học sinh về việc đổi tiết
  async notifyStudentsAboutLessonSwap(swapRequest) {
    try {
      console.log('📧 Starting to notify students about lesson swap...');
      console.log('Class ID:', swapRequest.additionalInfo.classInfo._id);
      
      // Lấy danh sách học sinh trong lớp
      const students = await User.find({
        class_id: swapRequest.additionalInfo.classInfo._id,
        role: 'student'
      }).select('name email');
      
      console.log(`📊 Found ${students.length} students in class`);
      
      if (students.length === 0) {
        console.log('⚠️ No students found in class to notify');
        return;
      }
      
      const teacherName = swapRequest.requestingTeacher.fullName || swapRequest.requestingTeacher.name;
      const subjectName = swapRequest.additionalInfo.subjectInfo.subjectName;
      const className = swapRequest.additionalInfo.classInfo.className;
      
      const originalDate = new Date(swapRequest.originalLesson.scheduledDate).toLocaleDateString('vi-VN');
      const replacementDate = new Date(swapRequest.replacementLesson.scheduledDate).toLocaleDateString('vi-VN');
      
      const subject = `📅 Thông báo đổi tiết - ${subjectName} - Lớp ${className}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🏫 EcoSchool</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Hệ thống quản lý học tập</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #fd7e14; margin-top: 0; text-align: center;">
                📅 Thông báo đổi tiết học
              </h2>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #856404; margin-top: 0;">📚 Thông tin tiết học:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #856404; width: 120px;"><strong>Môn học:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${subjectName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #856404;"><strong>Giáo viên:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${teacherName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #856404;"><strong>Lớp:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${className}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #e7f3ff; border: 1px solid #b3d9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #0056b3; margin-top: 0;">🔄 Chi tiết thay đổi:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #0056b3; width: 120px;"><strong>Tiết cũ:</strong></td>
                    <td style="padding: 8px 0; color: #333; text-decoration: line-through;">${originalDate} - Tiết ${swapRequest.originalLesson.timeSlot?.period || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #0056b3;"><strong>Tiết mới:</strong></td>
                    <td style="padding: 8px 0; color: #28a745; font-weight: bold;">${replacementDate} - Tiết ${swapRequest.replacementLesson.timeSlot?.period || 'N/A'}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #0c5460;">📝 Lưu ý quan trọng:</h4>
                <ul style="margin-bottom: 0; padding-left: 20px;">
                  <li>Tiết học ${subjectName} đã được đổi từ ${originalDate} sang ${replacementDate}</li>
                  <li>Vui lòng cập nhật lịch học cá nhân</li>
                  <li>Chuẩn bị bài học và tài liệu theo thời gian mới</li>
                  <li>Có mặt đúng giờ trong tiết học mới</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #17a2b8; color: white; padding: 12px 24px; border-radius: 25px; display: inline-block; font-weight: bold;">
                  📅 Lịch học đã được cập nhật
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
      
      // Send email to all students
      const emailPromises = students.map(student => 
        emailService.sendEmail(student.email, subject, html)
      );
      
      const results = await Promise.allSettled(emailPromises);
      
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failureCount = results.filter(result => result.status === 'rejected').length;
      
      console.log(`📧 Lesson swap notification sent to ${successCount} students successfully`);
      if (failureCount > 0) {
        console.log(`⚠️ Failed to send to ${failureCount} students`);
      }
      
    } catch (error) {
      console.error('❌ Error sending lesson swap notification to students:', error.message);
      // Không throw error để không làm gián đoạn flow
    }
  }
}

module.exports = LessonSwapService; 