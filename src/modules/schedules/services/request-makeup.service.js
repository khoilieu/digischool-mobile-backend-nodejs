const LessonRequest = require("../models/lesson-request.model");
const Lesson = require("../models/lesson.model");
const Class = require("../../classes/models/class.model");
const Subject = require("../../subjects/models/subject.model");
const User = require("../../auth/models/user.model");
const AcademicYear = require("../models/academic-year.model");
const TimeSlot = require("../models/time-slot.model");
const emailService = require("../../auth/services/email.service");

class MakeupRequestService {
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
      endOfWeek: endOfWeek,
    };
  }

  // Lấy các tiết absent của giáo viên để dạy bù
  async getTeacherLessonsForMakeup(
    teacherId,
    academicYear,
    startOfWeek,
    endOfWeek
  ) {
    try {
      console.log(
        `🔍 Getting teacher lessons for makeup - Teacher: ${teacherId}, Week: ${startOfWeek} to ${endOfWeek}`
      );

      const startDate = new Date(startOfWeek);
      const endDate = new Date(endOfWeek);
      endDate.setHours(23, 59, 59, 999);

      // Tìm tất cả tiết absent của giáo viên trong tuần đó
      const lessons = await Lesson.find({
        teacher: teacherId,
        scheduledDate: {
          $gte: startDate,
          $lte: endDate,
        },
        status: "absent", // Chỉ lấy tiết absent để dạy bù
        type: { $in: ["regular", "makeup"] }, // Chỉ lấy tiết học thường và tiết bù
      })
        .populate("class", "className gradeLevel")
        .populate("subject", "subjectName subjectCode")
        .populate("timeSlot", "period startTime endTime")
        .populate("academicYear", "name startDate endDate")
        .sort({ scheduledDate: 1, "timeSlot.period": 1 })
        .lean();

      console.log(`📚 Found ${lessons.length} absent lessons for teacher`);

      return {
        success: true,
        lessons: lessons,
        count: lessons.length,
        requestType: "makeup",
      };
    } catch (error) {
      console.error(
        "❌ Error getting teacher lessons for makeup:",
        error.message
      );
      throw new Error(
        `Failed to get teacher lessons for makeup: ${error.message}`
      );
    }
  }

  // Lấy các tiết trống để dạy bù
  async getAvailableLessonsForMakeup(
    classId,
    academicYear,
    startOfWeek,
    endOfWeek,
    subjectId
  ) {
    try {
      console.log(
        `🔍 Getting available lessons for makeup - Class: ${classId}, Subject: ${subjectId}`
      );

      const startDate = new Date(startOfWeek);
      const endDate = new Date(endOfWeek);
      endDate.setHours(23, 59, 59, 999);

      // Tìm các tiết trống (empty) trong lớp đó trong tuần
      const availableLessons = await Lesson.find({
        class: classId,
        scheduledDate: {
          $gte: startDate,
          $lte: endDate,
        },
        type: "empty", // Chỉ lấy tiết trống để dạy bù
        status: "scheduled",
      })
        .populate("class", "className gradeLevel")
        .populate("timeSlot", "period startTime endTime")
        .populate("academicYear", "name startDate endDate")
        .sort({ scheduledDate: 1, "timeSlot.period": 1 })
        .lean();

      console.log(
        `📚 Found ${availableLessons.length} available empty lessons for makeup`
      );

      // Lấy thông tin subject để hiển thị
      const subjectInfo = await Subject.findById(subjectId).lean();

      return {
        success: true,
        availableLessons: availableLessons,
        subjectInfo: subjectInfo,
        count: availableLessons.length,
      };
    } catch (error) {
      console.error(
        "❌ Error getting available lessons for makeup:",
        error.message
      );
      throw new Error(
        `Failed to get available lessons for makeup: ${error.message}`
      );
    }
  }

  // Tạo yêu cầu dạy bù
  async createMakeupRequest(data) {
    try {
      console.log(`🔄 Creating makeup request for teacher ${data.teacherId}`);

      // Validate dữ liệu đầu vào
      if (
        !data.teacherId ||
        !data.originalLessonId ||
        !data.replacementLessonId ||
        !data.reason
      ) {
        throw new Error("Missing required fields for makeup request");
      }

      // Kiểm tra originalLesson tồn tại và thuộc về giáo viên
      const originalLesson = await Lesson.findById(data.originalLessonId)
        .populate("class", "className gradeLevel")
        .populate("subject", "subjectName subjectCode")
        .populate("academicYear", "name startDate endDate")
        .populate("timeSlot", "period startTime endTime");

      if (!originalLesson) {
        throw new Error("Original lesson not found");
      }

      if (originalLesson.teacher.toString() !== data.teacherId) {
        throw new Error("Original lesson does not belong to this teacher");
      }

      // Validate status - phải là absent
      if (originalLesson.status !== "absent") {
        throw new Error("Original lesson must be absent for makeup request");
      }

      // Kiểm tra replacementLesson tồn tại và là tiết trống
      const replacementLesson = await Lesson.findById(data.replacementLessonId)
        .populate("class", "className gradeLevel")
        .populate("timeSlot", "period startTime endTime");

      if (!replacementLesson) {
        throw new Error("Replacement lesson not found");
      }

      if (replacementLesson.type !== "empty") {
        throw new Error("Replacement lesson must be empty for makeup request");
      }

      if (replacementLesson.status !== "scheduled") {
        throw new Error("Replacement lesson must be scheduled");
      }

      // Kiểm tra cùng lớp
      if (
        originalLesson.class._id.toString() !==
        replacementLesson.class._id.toString()
      ) {
        throw new Error(
          "Original and replacement lessons must be in the same class"
        );
      }

      // Kiểm tra cùng tuần
      const originalWeek = this.getWeekRange(originalLesson.scheduledDate);
      const replacementWeek = this.getWeekRange(
        replacementLesson.scheduledDate
      );

      if (
        originalWeek.startOfWeek.getTime() !==
        replacementWeek.startOfWeek.getTime()
      ) {
        throw new Error(
          "Original and replacement lessons must be in the same week"
        );
      }

      // Kiểm tra không có request đang pending cho lesson này
      const existingRequest = await LessonRequest.findOne({
        originalLesson: data.originalLessonId,
        status: "pending",
        requestType: "makeup",
      });

      if (existingRequest) {
        throw new Error(
          "There is already a pending makeup request for this lesson"
        );
      }

      // Tạo lesson request với thông tin tuần tự động tính toán
      const lessonRequestData = {
        requestType: "makeup",
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
            endOfWeek: originalWeek.endOfWeek,
          },
        },
        makeupInfo: {
          originalDate: originalLesson.scheduledDate,
          absentReason: data.absentReason || data.reason,
        },
        createdBy: data.teacherId,
      };

      // Tạo request
      const lessonRequest = new LessonRequest(lessonRequestData);
      await lessonRequest.save();

      // Populate thông tin chi tiết
      const populatedRequest = await LessonRequest.findById(lessonRequest._id)
        .populate({
          path: "originalLesson",
          select: "lessonId scheduledDate timeSlot topic status type",
          populate: {
            path: "timeSlot",
            select: "period name startTime endTime",
          },
        })
        .populate({
          path: "replacementLesson",
          select: "lessonId scheduledDate timeSlot topic status type",
          populate: {
            path: "timeSlot",
            select: "period name startTime endTime",
          },
        })
        .populate("requestingTeacher", "name email fullName")
        .populate("additionalInfo.classInfo", "className gradeLevel")
        .populate("additionalInfo.subjectInfo", "subjectName subjectCode")
        .populate("additionalInfo.academicYear", "name startDate endDate");

      // Gửi email thông báo cho manager
      await this.sendNewMakeupRequestToManager(populatedRequest);

      console.log(`✅ Created makeup request: ${lessonRequest.requestId}`);

      return {
        success: true,
        message: "Makeup request created successfully",
        request: populatedRequest,
      };
    } catch (error) {
      console.error("❌ Error creating makeup request:", error.message);
      throw new Error(`Failed to create makeup request: ${error.message}`);
    }
  }

  // Helper function để format thông tin tiết học
  formatLessonInfo(lesson) {
    const timeSlot = lesson.timeSlot;
    let periodText = `Tiết ${timeSlot?.period || "N/A"}`;

    if (timeSlot?.startTime && timeSlot?.endTime) {
      periodText += ` (${timeSlot.startTime}-${timeSlot.endTime})`;
    }

    return periodText;
  }

  // Gửi email thông báo yêu cầu dạy bù mới cho manager
  async sendNewMakeupRequestToManager(lessonRequest) {
    try {
      // Tìm managers
      const managers = await User.find({ role: "manager" }).lean();

      if (managers.length === 0) {
        console.log("⚠️ No managers found to send notification");
        return;
      }

      // Tạo email content
      const subject = `Yêu cầu dạy bù mới - ${lessonRequest.requestId}`;

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Yêu cầu dạy bù mới</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #34495e; margin-top: 0;">Thông tin yêu cầu</h3>
            <p><strong>Mã yêu cầu:</strong> ${lessonRequest.requestId}</p>
            <p><strong>Loại yêu cầu:</strong> Dạy bù</p>
            <p><strong>Giáo viên:</strong> ${
              lessonRequest.requestingTeacher.fullName ||
              lessonRequest.requestingTeacher.name
            }</p>
            <p><strong>Lớp:</strong> ${
              lessonRequest.additionalInfo.classInfo.className
            }</p>
            <p><strong>Môn học:</strong> ${
              lessonRequest.additionalInfo.subjectInfo.subjectName
            }</p>
            <p><strong>Lý do:</strong> ${lessonRequest.reason}</p>
            <p><strong>Lý do vắng:</strong> ${
              lessonRequest.makeupInfo.absentReason
            }</p>
          </div>
          
          <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2980b9; margin-top: 0;">Thông tin tiết học</h3>
            <div style="display: flex; justify-content: space-between;">
              <div style="flex: 1; margin-right: 20px;">
                <h4 style="color: #e74c3c;">Tiết absent:</h4>
                <p>Ngày: ${new Date(
                  lessonRequest.originalLesson.scheduledDate
                ).toLocaleDateString("vi-VN")}</p>
                <p>${this.formatLessonInfo(lessonRequest.originalLesson)}</p>
                <p>Trạng thái: ${lessonRequest.originalLesson.status}</p>
              </div>
              <div style="flex: 1;">
                <h4 style="color: #27ae60;">Tiết dạy bù:</h4>
                <p>Ngày: ${new Date(
                  lessonRequest.replacementLesson.scheduledDate
                ).toLocaleDateString("vi-VN")}</p>
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

      console.log(
        `📧 Sent makeup request notification to ${managers.length} managers`
      );
    } catch (error) {
      console.error("❌ Error sending email notification:", error.message);
      // Không throw error để không làm gián đoạn flow chính
    }
  }

  // Duyệt yêu cầu dạy bù
  async approveMakeupRequest(requestId, managerId, comment = "") {
    try {
      console.log(`✅ Approving makeup request: ${requestId}`);

      // Tìm request
      const lessonRequest = await LessonRequest.findById(requestId)
        .populate({
          path: "originalLesson",
          populate: {
            path: "timeSlot",
            select: "period name startTime endTime",
          },
        })
        .populate({
          path: "replacementLesson",
          populate: {
            path: "timeSlot",
            select: "period name startTime endTime",
          },
        })
        .populate("requestingTeacher", "name email fullName")
        .populate("additionalInfo.classInfo", "className gradeLevel")
        .populate("additionalInfo.subjectInfo", "subjectName subjectCode");

      if (!lessonRequest) {
        throw new Error("Makeup request not found");
      }

      if (lessonRequest.requestType !== "makeup") {
        throw new Error("Not a makeup request");
      }

      if (lessonRequest.status !== "pending") {
        throw new Error("Request has already been processed");
      }

      // Kiểm tra lessons vẫn còn valid
      const originalLesson = await Lesson.findById(
        lessonRequest.originalLesson._id
      );
      const replacementLesson = await Lesson.findById(
        lessonRequest.replacementLesson._id
      );

      if (!originalLesson || !replacementLesson) {
        throw new Error("One or both lessons no longer exist");
      }

      if (
        replacementLesson.type !== "empty" ||
        replacementLesson.status !== "scheduled"
      ) {
        throw new Error("Replacement lesson is no longer available");
      }

      // Xử lý dạy bù
      await this.processMakeupApproval(
        lessonRequest,
        originalLesson,
        replacementLesson
      );

      // Cập nhật trạng thái request
      lessonRequest.status = "approved";
      lessonRequest.processedBy = managerId;
      lessonRequest.processedAt = new Date();
      lessonRequest.managerComment = comment;
      lessonRequest.lastModifiedBy = managerId;

      await lessonRequest.save();

      // Gửi email thông báo cho giáo viên
      await this.sendMakeupRequestNotifications(
        lessonRequest,
        "approved",
        comment
      );

      // Gửi email thông báo cho học sinh
      await this.sendStudentNotifications(lessonRequest, "approved");

      console.log(`✅ Approved makeup request: ${requestId}`);

      return {
        success: true,
        message: "Makeup request approved successfully",
        request: lessonRequest,
      };
    } catch (error) {
      console.error("❌ Error approving makeup request:", error.message);
      throw new Error(`Failed to approve makeup request: ${error.message}`);
    }
  }

  // Xử lý approval cho makeup request
  async processMakeupApproval(
    lessonRequest,
    originalLesson,
    replacementLesson
  ) {
    // Tạo tiết makeup từ replacement lesson
    replacementLesson.teacher = originalLesson.teacher;
    replacementLesson.subject = originalLesson.subject;
    replacementLesson.topic =
      originalLesson.topic ||
      `Makeup for ${new Date(originalLesson.scheduledDate).toLocaleDateString(
        "vi-VN"
      )}`;
    replacementLesson.notes = `Makeup lesson for absent lesson on ${new Date(
      originalLesson.scheduledDate
    ).toLocaleDateString("vi-VN")}`;
    replacementLesson.type = "makeup";

    // QUAN TRỌNG: Tạo liên kết với tiết absent thay vì copy lessonId
    // (không thể copy lessonId vì vi phạm unique constraint)
    replacementLesson.makeupInfo = {
      originalLesson: originalLesson._id,
      originalLessonId: originalLesson.lessonId, // Lưu reference để tracking
      reason: lessonRequest.reason,
      originalDate: originalLesson.scheduledDate,
    };
    replacementLesson.lastModifiedBy = lessonRequest.processedBy;

    // Save makeup lesson với lessonId riêng (do pre-save middleware tự tạo)
    await replacementLesson.save();

    // Lưu thông tin makeup lesson vào request
    lessonRequest.makeupInfo.createdMakeupLesson = replacementLesson._id;

    console.log(
      `📚 Created makeup lesson: ${replacementLesson.lessonId} for absent lesson: ${originalLesson.lessonId}`
    );
  }

  // Từ chối yêu cầu dạy bù
  async rejectMakeupRequest(requestId, managerId, comment = "") {
    try {
      console.log(`❌ Rejecting makeup request: ${requestId}`);

      // Tìm request
      const lessonRequest = await LessonRequest.findById(requestId)
        .populate({
          path: "originalLesson",
          select: "lessonId scheduledDate timeSlot topic status type",
          populate: {
            path: "timeSlot",
            select: "period name startTime endTime",
          },
        })
        .populate({
          path: "replacementLesson",
          select: "lessonId scheduledDate timeSlot topic status type",
          populate: {
            path: "timeSlot",
            select: "period name startTime endTime",
          },
        })
        .populate("requestingTeacher", "name email fullName")
        .populate("additionalInfo.classInfo", "className gradeLevel")
        .populate("additionalInfo.subjectInfo", "subjectName subjectCode");

      if (!lessonRequest) {
        throw new Error("Makeup request not found");
      }

      if (lessonRequest.requestType !== "makeup") {
        throw new Error("Not a makeup request");
      }

      if (lessonRequest.status !== "pending") {
        throw new Error("Request has already been processed");
      }

      // Cập nhật trạng thái request
      lessonRequest.status = "rejected";
      lessonRequest.processedBy = managerId;
      lessonRequest.processedAt = new Date();
      lessonRequest.managerComment = comment;
      lessonRequest.lastModifiedBy = managerId;

      await lessonRequest.save();

      // Gửi email thông báo
      await this.sendMakeupRequestNotifications(
        lessonRequest,
        "rejected",
        comment
      );

      console.log(`❌ Rejected makeup request: ${requestId}`);

      return {
        success: true,
        message: "Makeup request rejected",
        request: lessonRequest,
      };
    } catch (error) {
      console.error("❌ Error rejecting makeup request:", error.message);
      throw new Error(`Failed to reject makeup request: ${error.message}`);
    }
  }

  // Gửi email thông báo kết quả xử lý dạy bù
  async sendMakeupRequestNotifications(lessonRequest, status, comment) {
    try {
      const statusText =
        status === "approved" ? "đã được duyệt" : "đã bị từ chối";
      const statusColor = status === "approved" ? "#27ae60" : "#e74c3c";

      const subject = `Yêu cầu dạy bù ${statusText} - ${lessonRequest.requestId}`;

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusColor};">Yêu cầu dạy bù ${statusText}</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #34495e; margin-top: 0;">Thông tin yêu cầu</h3>
            <p><strong>Mã yêu cầu:</strong> ${lessonRequest.requestId}</p>
            <p><strong>Loại yêu cầu:</strong> Dạy bù</p>
            <p><strong>Lớp:</strong> ${
              lessonRequest.additionalInfo.classInfo.className
            }</p>
            <p><strong>Môn học:</strong> ${
              lessonRequest.additionalInfo.subjectInfo.subjectName
            }</p>
            <p><strong>Trạng thái:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText.toUpperCase()}</span></p>
          </div>
          
          ${
            comment
              ? `
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">Nhận xét từ quản lý</h3>
            <p style="color: #856404;">${comment}</p>
          </div>
          `
              : ""
          }
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #7f8c8d;">Vui lòng đăng nhập vào hệ thống để xem chi tiết.</p>
          </div>
          
          <div style="border-top: 1px solid #bdc3c7; padding-top: 20px; text-align: center; color: #95a5a6; font-size: 12px;">
            <p>Email này được gửi tự động từ hệ thống quản lý lịch học EcoSchool.</p>
          </div>
        </div>
      `;

      // Gửi email cho giáo viên
      await emailService.sendEmail(
        lessonRequest.requestingTeacher.email,
        subject,
        emailContent
      );

      console.log(`📧 Sent makeup ${status} notification to teacher`);
    } catch (error) {
      console.error("❌ Error sending notification email:", error.message);
      // Không throw error để không làm gián đoạn flow chính
    }
  }

  // Gửi email thông báo cho học sinh khi yêu cầu dạy bù được approve
  async sendStudentNotifications(lessonRequest, status) {
    try {
      console.log(`📧 Sending student notifications for makeup ${status}`);

      // Lấy danh sách học sinh trong lớp
      const students = await User.find({
        role: "student",
        class_id: lessonRequest.additionalInfo.classInfo._id,
      })
        .select("email name fullName class_id")
        .lean();

      if (students.length === 0) {
        console.log("⚠️ No students found in class");
        return;
      }

      const subject = `Thông báo dạy bù - ${lessonRequest.additionalInfo.classInfo.className}`;

      // Tạo email content cho thông báo dạy bù
      const emailContent = this.createMakeupNotificationEmail(lessonRequest);

      // Gửi email cho từng học sinh
      for (const student of students) {
        await emailService.sendEmail(student.email, subject, emailContent);
      }

      console.log(`📧 Sent makeup notification to ${students.length} students`);
    } catch (error) {
      console.error("❌ Error sending student notifications:", error.message);
      // Không throw error để không làm gián đoạn flow chính
    }
  }

  // Tạo email content cho thông báo dạy bù
  createMakeupNotificationEmail(lessonRequest) {
    const originalLesson = lessonRequest.originalLesson;
    const replacementLesson = lessonRequest.replacementLesson;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Thông báo dạy bù - ${
          lessonRequest.additionalInfo.classInfo.className
        }</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #34495e; margin-top: 0;">Thông tin môn học</h3>
          <p><strong>Môn học:</strong> ${
            lessonRequest.additionalInfo.subjectInfo.subjectName
          }</p>
          <p><strong>Giáo viên:</strong> ${
            lessonRequest.requestingTeacher.fullName ||
            lessonRequest.requestingTeacher.name
          }</p>
          <p><strong>Lớp:</strong> ${
            lessonRequest.additionalInfo.classInfo.className
          }</p>
        </div>
        
        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <h3 style="color: #0c5460; margin-top: 0;">📚 Thông tin tiết dạy bù</h3>
          
          <div style="margin: 20px 0;">
            <div style="padding: 15px; background-color: #f8d7da; border-radius: 5px; margin-bottom: 15px;">
              <h4 style="color: #721c24; margin-top: 0;">📅 Tiết học bị vắng:</h4>
              <p><strong>Ngày:</strong> ${new Date(
                originalLesson.scheduledDate
              ).toLocaleDateString("vi-VN")}</p>
              <p><strong>Tiết:</strong> ${this.formatLessonInfo(
                originalLesson
              )}</p>
              <p><strong>Chủ đề:</strong> ${
                originalLesson.topic || "Chưa có"
              }</p>
              <p><strong>Lý do vắng:</strong> ${
                lessonRequest.makeupInfo?.absentReason || "Không rõ"
              }</p>
            </div>
            
            <div style="padding: 15px; background-color: #d4edda; border-radius: 5px;">
              <h4 style="color: #155724; margin-top: 0;">✅ Tiết dạy bù:</h4>
              <p><strong>Ngày:</strong> ${new Date(
                replacementLesson.scheduledDate
              ).toLocaleDateString("vi-VN")}</p>
              <p><strong>Tiết:</strong> ${this.formatLessonInfo(
                replacementLesson
              )}</p>
              <p><strong>Nội dung:</strong> Dạy bù tiết học ngày ${new Date(
                originalLesson.scheduledDate
              ).toLocaleDateString("vi-VN")}</p>
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
      if (!makeupLesson || makeupLesson.type !== "makeup") {
        return; // Không phải makeup lesson
      }

      // Tìm original lesson từ makeupInfo
      if (makeupLesson.makeupInfo && makeupLesson.makeupInfo.originalLesson) {
        const originalLesson = await Lesson.findById(
          makeupLesson.makeupInfo.originalLesson
        );

        if (originalLesson && originalLesson.status === "absent") {
          // Cập nhật original lesson thành completed
          originalLesson.status = "completed";
          originalLesson.actualDate = makeupLesson.actualDate || new Date();
          originalLesson.lastModifiedBy = makeupLesson.lastModifiedBy;

          await originalLesson.save();

          console.log(
            `✅ Updated original absent lesson ${originalLesson.lessonId} to completed`
          );
        }
      }
    } catch (error) {
      console.error(
        "❌ Error handling makeup lesson completion:",
        error.message
      );
      // Không throw error để không làm gián đoạn flow chính
    }
  }
}

module.exports = new MakeupRequestService();
