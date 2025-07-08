const LessonRequest = require("../models/lesson-request.model");
const Lesson = require("../models/lesson.model");
const Class = require("../../classes/models/class.model");
const Subject = require("../../subjects/models/subject.model");
const User = require("../../auth/models/user.model");
const AcademicYear = require("../models/academic-year.model");
const TimeSlot = require("../models/time-slot.model");
const emailService = require("../../auth/services/email.service");

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
      endOfWeek: endOfWeek,
    };
  }

  // Lấy các tiết học của giáo viên theo tuần (cho cả swap và makeup)
  async getTeacherLessonsForWeek(
    teacherId,
    academicYear,
    startOfWeek,
    endOfWeek,
    requestType = "swap"
  ) {
    try {
      console.log(
        `🔍 Getting teacher lessons for ${requestType} - Teacher: ${teacherId}, Week: ${startOfWeek} to ${endOfWeek}`
      );

      const startDate = new Date(startOfWeek);
      const endDate = new Date(endOfWeek);
      endDate.setHours(23, 59, 59, 999);

      let statusFilter;
      if (requestType === "swap") {
        // Với swap: chỉ lấy tiết 'scheduled'
        statusFilter = "scheduled";
      } else if (requestType === "makeup") {
        // Với makeup: chỉ lấy tiết 'absent'
        statusFilter = "absent";
      }

      // Tìm tất cả tiết học của giáo viên trong tuần đó
      const lessons = await Lesson.find({
        teacher: teacherId,
        scheduledDate: {
          $gte: startDate,
          $lte: endDate,
        },
        status: statusFilter,
        type: { $in: ["regular", "makeup"] }, // Chỉ lấy tiết học thường và tiết bù
      })
        .populate("class", "className gradeLevel")
        .populate("subject", "subjectName subjectCode")
        .populate("timeSlot", "period startTime endTime")
        .populate("academicYear", "name startDate endDate")
        .sort({ scheduledDate: 1, "timeSlot.period": 1 })
        .lean();

      console.log(
        `📚 Found ${lessons.length} ${statusFilter} lessons for teacher`
      );

      return {
        success: true,
        lessons: lessons,
        count: lessons.length,
        requestType: requestType,
      };
    } catch (error) {
      console.error("❌ Error getting teacher lessons:", error.message);
      throw new Error(`Failed to get teacher lessons: ${error.message}`);
    }
  }

  // Lấy các tiết trống có thể đổi/dạy bù
  async getAvailableLessonsForRequest(
    classId,
    academicYear,
    startOfWeek,
    endOfWeek,
    subjectId
  ) {
    try {
      console.log(
        `🔍 Getting available lessons for request - Class: ${classId}, Subject: ${subjectId}`
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
        type: "empty",
        status: "scheduled",
      })
        .populate("class", "className gradeLevel")
        .populate("timeSlot", "period startTime endTime")
        .populate("academicYear", "name startDate endDate")
        .sort({ scheduledDate: 1, "timeSlot.period": 1 })
        .lean();

      console.log(
        `📚 Found ${availableLessons.length} available empty lessons`
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
      console.error("❌ Error getting available lessons:", error.message);
      throw new Error(`Failed to get available lessons: ${error.message}`);
    }
  }

  // Tạo yêu cầu đổi tiết hoặc dạy bù
  async createLessonRequest(data) {
    try {
      console.log(
        `🔄 Creating lesson ${data.requestType} request for teacher ${data.teacherId}`
      );

      // Validate dữ liệu đầu vào
      if (
        !data.teacherId ||
        !data.originalLessonId ||
        !data.replacementLessonId ||
        !data.reason ||
        !data.requestType
      ) {
        throw new Error("Missing required fields for lesson request");
      }

      if (!["swap", "makeup"].includes(data.requestType)) {
        throw new Error("Invalid request type. Must be swap or makeup");
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

      // Validate status dựa trên requestType
      if (
        data.requestType === "swap" &&
        originalLesson.status !== "scheduled"
      ) {
        throw new Error("Original lesson must be scheduled for swap request");
      }

      if (data.requestType === "makeup" && originalLesson.status !== "absent") {
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
        throw new Error("Replacement lesson must be empty");
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
      });

      if (existingRequest) {
        throw new Error("There is already a pending request for this lesson");
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
            endOfWeek: originalWeek.endOfWeek,
          },
        },
        createdBy: data.teacherId,
      };

      // Thêm thông tin đặc biệt cho makeup request
      if (data.requestType === "makeup") {
        lessonRequestData.makeupInfo = {
          originalDate: originalLesson.scheduledDate,
          absentReason: data.reason || "Not specified",
        };
      }

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
      await this.sendNewLessonRequestToManager(populatedRequest);

      console.log(
        `✅ Created lesson ${data.requestType} request: ${lessonRequest.requestId}`
      );

      return {
        success: true,
        message: `Lesson ${data.requestType} request created successfully`,
        request: populatedRequest,
      };
    } catch (error) {
      console.error("❌ Error creating lesson request:", error.message);
      throw new Error(`Failed to create lesson request: ${error.message}`);
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

  // Gửi email thông báo yêu cầu mới cho manager
  async sendNewLessonRequestToManager(lessonRequest) {
    try {
      // Tìm managers
      const managers = await User.find({ role: "manager" }).lean();

      if (managers.length === 0) {
        console.log("⚠️ No managers found to send notification");
        return;
      }

      const requestTypeText =
        lessonRequest.requestType === "swap" ? "đổi tiết" : "dạy bù";

      // Tạo email content
      const subject = `Yêu cầu ${requestTypeText} mới - ${lessonRequest.requestId}`;

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Yêu cầu ${requestTypeText} mới</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #34495e; margin-top: 0;">Thông tin yêu cầu</h3>
            <p><strong>Mã yêu cầu:</strong> ${lessonRequest.requestId}</p>
            <p><strong>Loại yêu cầu:</strong> ${requestTypeText}</p>
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
          </div>
          
          <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2980b9; margin-top: 0;">Thông tin tiết học</h3>
            <div style="display: flex; justify-content: space-between;">
              <div style="flex: 1; margin-right: 20px;">
                <h4 style="color: #e74c3c;">Tiết gốc:</h4>
                <p>Ngày: ${new Date(
                  lessonRequest.originalLesson.scheduledDate
                ).toLocaleDateString("vi-VN")}</p>
                <p>${this.formatLessonInfo(lessonRequest.originalLesson)}</p>
                <p>Trạng thái: ${lessonRequest.originalLesson.status}</p>
              </div>
              <div style="flex: 1;">
                <h4 style="color: #27ae60;">Tiết thay thế:</h4>
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
        `📧 Sent ${requestTypeText} request notification to ${managers.length} managers`
      );
    } catch (error) {
      console.error("❌ Error sending email notification:", error.message);
      // Không throw error để không làm gián đoạn flow chính
    }
  }

  // Duyệt yêu cầu (cả swap và makeup)
  async approveRequest(requestId, managerId, comment = "") {
    try {
      console.log(`✅ Approving lesson request: ${requestId}`);

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
        throw new Error("Lesson request not found");
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

      // Xử lý dựa trên loại request
      if (lessonRequest.requestType === "swap") {
        await this.processSwapApproval(
          lessonRequest,
          originalLesson,
          replacementLesson
        );
      } else if (lessonRequest.requestType === "makeup") {
        await this.processMakeupApproval(
          lessonRequest,
          originalLesson,
          replacementLesson
        );
      }

      // Cập nhật trạng thái request
      lessonRequest.status = "approved";
      lessonRequest.processedBy = managerId;
      lessonRequest.processedAt = new Date();
      lessonRequest.managerComment = comment;
      lessonRequest.lastModifiedBy = managerId;

      await lessonRequest.save();

      // Gửi email thông báo cho giáo viên
      await this.sendRequestNotifications(lessonRequest, "approved", comment);

      // Gửi email thông báo cho học sinh
      await this.sendStudentNotifications(lessonRequest, "approved");

      console.log(
        `✅ Approved lesson ${lessonRequest.requestType} request: ${requestId}`
      );

      return {
        success: true,
        message: `Lesson ${lessonRequest.requestType} request approved successfully`,
        request: lessonRequest,
      };
    } catch (error) {
      console.error("❌ Error approving lesson request:", error.message);
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
      type: originalLesson.type,
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
    originalLesson.type = "empty";
    originalLesson.lastModifiedBy = lessonRequest.processedBy;

    await originalLesson.save();
    await replacementLesson.save();

    console.log(
      `🔄 Swapped lessons: ${originalLesson.lessonId} ↔ ${replacementLesson.lessonId}`
    );
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

  // Từ chối yêu cầu
  async rejectRequest(requestId, managerId, comment = "") {
    try {
      console.log(`❌ Rejecting lesson request: ${requestId}`);

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
        throw new Error("Lesson request not found");
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
      await this.sendRequestNotifications(lessonRequest, "rejected", comment);

      console.log(
        `❌ Rejected lesson ${lessonRequest.requestType} request: ${requestId}`
      );

      return {
        success: true,
        message: `Lesson ${lessonRequest.requestType} request rejected`,
        request: lessonRequest,
      };
    } catch (error) {
      console.error("❌ Error rejecting lesson request:", error.message);
      throw new Error(`Failed to reject lesson request: ${error.message}`);
    }
  }

  // Gửi email thông báo kết quả xử lý
  async sendRequestNotifications(lessonRequest, status, comment) {
    try {
      const requestTypeText =
        lessonRequest.requestType === "swap" ? "đổi tiết" : "dạy bù";
      const statusText =
        status === "approved" ? "đã được duyệt" : "đã bị từ chối";
      const statusColor = status === "approved" ? "#27ae60" : "#e74c3c";

      const subject = `Yêu cầu ${requestTypeText} ${statusText} - ${lessonRequest.requestId}`;

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusColor};">Yêu cầu ${requestTypeText} ${statusText}</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #34495e; margin-top: 0;">Thông tin yêu cầu</h3>
            <p><strong>Mã yêu cầu:</strong> ${lessonRequest.requestId}</p>
            <p><strong>Loại yêu cầu:</strong> ${requestTypeText}</p>
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

      console.log(
        `📧 Sent ${requestTypeText} ${status} notification to teacher`
      );
    } catch (error) {
      console.error("❌ Error sending notification email:", error.message);
      // Không throw error để không làm gián đoạn flow chính
    }
  }

  // Gửi email thông báo cho học sinh khi yêu cầu được approve
  async sendStudentNotifications(lessonRequest, status) {
    try {
      console.log(
        `📧 Sending student notifications for ${lessonRequest.requestType} ${status}`
      );

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

      const requestTypeText =
        lessonRequest.requestType === "swap" ? "đổi tiết" : "dạy bù";
      const subject = `Thông báo ${requestTypeText} - ${lessonRequest.additionalInfo.classInfo.className}`;

      // Tạo email content dựa trên loại request
      let emailContent;
      if (lessonRequest.requestType === "swap") {
        emailContent = this.createSwapNotificationEmail(
          lessonRequest,
          requestTypeText
        );
      } else {
        emailContent = this.createMakeupNotificationEmail(
          lessonRequest,
          requestTypeText
        );
      }

      // Gửi email cho từng học sinh
      for (const student of students) {
        await emailService.sendEmail(student.email, subject, emailContent);
      }

      console.log(
        `📧 Sent ${requestTypeText} notification to ${students.length} students`
      );
    } catch (error) {
      console.error("❌ Error sending student notifications:", error.message);
      // Không throw error để không làm gián đoạn flow chính
    }
  }

  // Tạo email content cho thông báo swap
  createSwapNotificationEmail(lessonRequest, requestTypeText) {
    const originalLesson = lessonRequest.originalLesson;
    const replacementLesson = lessonRequest.replacementLesson;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">Thông báo ${requestTypeText} - ${
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
        
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">📅 Thay đổi lịch học</h3>
          
          <div style="display: flex; justify-content: space-between; margin: 20px 0;">
            <div style="flex: 1; margin-right: 20px; padding: 15px; background-color: #f8d7da; border-radius: 5px;">
              <h4 style="color: #721c24; margin-top: 0;">❌ Tiết bị hủy:</h4>
              <p><strong>Ngày:</strong> ${new Date(
                originalLesson.scheduledDate
              ).toLocaleDateString("vi-VN")}</p>
              <p><strong>Tiết:</strong> ${this.formatLessonInfo(
                originalLesson
              )}</p>
              <p><strong>Chủ đề:</strong> ${
                originalLesson.topic || "Chưa có"
              }</p>
            </div>
            <div style="flex: 1; padding: 15px; background-color: #d4edda; border-radius: 5px;">
              <h4 style="color: #155724; margin-top: 0;">✅ Tiết mới:</h4>
              <p><strong>Ngày:</strong> ${new Date(
                replacementLesson.scheduledDate
              ).toLocaleDateString("vi-VN")}</p>
              <p><strong>Tiết:</strong> ${this.formatLessonInfo(
                replacementLesson
              )}</p>
              <p><strong>Chủ đề:</strong> ${
                replacementLesson.topic || originalLesson.topic || "Chưa có"
              }</p>
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
        <h2 style="color: #27ae60;">Thông báo ${requestTypeText} - ${
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

  // Create a new substitute request
  async createSubstituteRequest(
    lessonId,
    requestingTeacherId,
    candidateTeacherIds,
    reason
  ) {
    try {
      // Validate lesson exists and is in scheduled status
      const lesson = await Lesson.findById(lessonId)
        .populate("class", "className")
        .populate("subject", "subjectName")
        .populate("timeSlot", "period startTime endTime")
        .populate("teacher", "name email");

      if (!lesson) {
        throw new Error("Lesson not found");
      }

      if (lesson.status !== "scheduled") {
        throw new Error(
          "Can only create substitute requests for scheduled lessons"
        );
      }

      if (lesson.teacher._id.toString() !== requestingTeacherId.toString()) {
        throw new Error("Only the assigned teacher can request substitution");
      }

      // Validate candidate teachers
      const candidateTeachers = await User.find({
        _id: { $in: candidateTeacherIds },
        role: { $in: ["teacher"] },
      });

      if (candidateTeachers.length !== candidateTeacherIds.length) {
        throw new Error(
          "Some candidate teachers not found or not valid teachers"
        );
      }

      // Không kiểm tra xung đột thời gian - cho phép tất cả giáo viên cùng bộ môn
      // Thông tin xung đột sẽ được hiển thị trong API getAvailableTeachers

      // Create substitute request
      const substituteRequest = new LessonRequest({
        requestType: "substitute",
        lesson: lessonId,
        requestingTeacher: requestingTeacherId,
        candidateTeachers: candidateTeacherIds.map((id) => ({
          teacher: id,
          status: "pending",
        })),
        reason: reason,
        createdBy: requestingTeacherId,
      });

      await substituteRequest.save();

      // Send email notifications
      await this.sendRequestEmails(substituteRequest._id);

      return await this.getSubstituteRequestById(substituteRequest._id);
    } catch (error) {
      console.error("Error creating substitute request:", error);
      throw error;
    }
  }

  // Get substitute request by ID
  async getSubstituteRequestById(requestId) {
    const request = await LessonRequest.findOne({
      _id: requestId,
      requestType: "substitute",
    })
      .populate({
        path: "lesson",
        populate: [
          { path: "class", select: "className" },
          { path: "subject", select: "subjectName" },
          { path: "timeSlot", select: "period startTime endTime" },
          { path: "teacher", select: "name email" },
        ],
      })
      .populate("requestingTeacher", "name email")
      .populate("candidateTeachers.teacher", "name email")
      .populate("approvedTeacher", "name email");

    if (!request) {
      throw new Error("Substitute request not found");
    }

    return request;
  }

  // Get teacher's substitute requests
  async getTeacherRequests(teacherId, status = null) {
    const query = {
      requestType: "substitute",
      $or: [
        { requestingTeacher: teacherId },
        { "candidateTeachers.teacher": teacherId },
      ],
    };
    if (status) query.status = status;
    return await LessonRequest.find(query)
      .populate({
        path: "lesson",
        select: "lessonId scheduledDate topic status",
        populate: [
          { path: "class", select: "className" },
          { path: "subject", select: "subjectName" },
          { path: "timeSlot", select: "period startTime endTime" },
        ],
      })
      .populate("requestingTeacher", "name email")
      .populate("candidateTeachers.teacher", "name email")
      .populate("approvedTeacher", "name email")
      .sort({ createdAt: -1 });
  }

  // Approve substitute request by teacher
  async approveRequest(requestId, teacherId) {
    try {
      const request = await this.getSubstituteRequestById(requestId);
      // Check if teacher is in candidate list
      const teacherIdStr = teacherId._id
        ? teacherId._id.toString()
        : teacherId.toString();
      const isCandidate = request.candidateTeachers.some((c) => {
        const candidateId = c.teacher._id
          ? c.teacher._id.toString()
          : c.teacher.toString();
        return candidateId === teacherIdStr;
      });
      if (!isCandidate) {
        throw new Error("Teacher not authorized to approve this request");
      }
      // Approve the request
      await request.approveByTeacher(teacherId);
      // Update the lesson with substitute teacher (không thay thế giáo viên gốc)
      await Lesson.findByIdAndUpdate(request.lesson._id, {
        substituteTeacher: teacherId,
      });
      // Cancel other pending requests from this teacher
      await this.cancelOtherTeacherRequests(teacherId, requestId);
      // Send approval emails
      await this.sendApprovalEmails(requestId);
      // Send notification to students about teacher change
      await this.sendStudentNotificationEmails(requestId);
      return await this.getSubstituteRequestById(requestId);
    } catch (error) {
      console.error("Error approving substitute request:", error);
      throw error;
    }
  }

  // Reject substitute request by teacher
  async rejectRequest(requestId, teacherId, reason) {
    try {
      const request = await this.getSubstituteRequestById(requestId);
      // Check if teacher is in candidate list
      const isCandidate = request.candidateTeachers.some(
        (c) => c.teacher._id.toString() === teacherId.toString()
      );
      if (!isCandidate) {
        throw new Error("Teacher not authorized to reject this request");
      }
      // Reject the request
      await request.rejectByTeacher(teacherId, reason);
      // Send rejection emails
      await this.sendRejectionEmails(requestId, teacherId, reason);
      return await this.getSubstituteRequestById(requestId);
    } catch (error) {
      console.error("Error rejecting substitute request:", error);
      throw error;
    }
  }

  // Cancel substitute request
  async cancelRequest(requestId, teacherId) {
    try {
      const request = await this.getSubstituteRequestById(requestId);
      // Check if teacher is the requesting teacher
      if (request.requestingTeacher._id.toString() !== teacherId.toString()) {
        throw new Error("Only the requesting teacher can cancel this request");
      }
      await request.cancel();
      return await this.getSubstituteRequestById(requestId);
    } catch (error) {
      console.error("Error cancelling substitute request:", error);
      throw error;
    }
  }

  // Get available substitute teachers for a lesson
  async getAvailableTeachers(lessonId) {
    // Sử dụng static của LessonRequest
    return await LessonRequest.findAvailableTeachers(lessonId);
  }

  // Cancel other pending requests from the same teacher (when they approve one request)
  async cancelOtherTeacherRequests(teacherId, excludeRequestId) {
    try {
      // Find all pending requests where this teacher is a candidate
      const otherRequests = await LessonRequest.find({
        _id: { $ne: excludeRequestId },
        requestType: "substitute",
        status: "pending",
        "candidateTeachers.teacher": teacherId,
        "candidateTeachers.status": "pending",
      });

      // Update each request to remove this teacher from candidates or cancel if no other candidates
      for (const request of otherRequests) {
        // Remove this teacher from candidate list
        request.candidateTeachers = request.candidateTeachers.filter(
          (c) => c.teacher.toString() !== teacherId.toString()
        );

        // If no candidates left, cancel the request
        if (request.candidateTeachers.length === 0) {
          request.status = "cancelled";
          request.notes = "Automatically cancelled - no available candidates";
        }

        await request.save();
      }

      console.log(
        `Cancelled/updated ${otherRequests.length} other requests for teacher ${teacherId}`
      );
    } catch (error) {
      console.error("Error cancelling other teacher requests:", error);
      // Don't throw error to avoid breaking the main approve flow
    }
  }

  // Send initial request emails
  async sendRequestEmails(requestId) {
    try {
      const request = await this.getSubstituteRequestById(requestId);

      // Get manager emails
      const managers = await User.find({
        role: { $in: ["manager", "admin"] },
      }).select("email");

      const managerEmails = managers.map((m) => m.email);

      // Email to candidate teachers
      const candidateEmails = request.candidateTeachers.map(
        (c) => c.teacher.email
      );

      const lessonDate = new Date(
        request.lesson.scheduledDate
      ).toLocaleDateString("vi-VN");
      const lessonTime = `${request.lesson.timeSlot.startTime} - ${request.lesson.timeSlot.endTime}`;

      const candidateEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Yêu cầu dạy bù - EcoSchool</h2>
          <p>Xin chào,</p>
          <p>Bạn đã được đề xuất để dạy bù cho tiết học sau:</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #e74c3c; margin-top: 0;">Thông tin tiết học</h3>
            <p><strong>Môn học:</strong> ${request.lesson.subject.subjectName}</p>
            <p><strong>Lớp:</strong> ${request.lesson.class.className}</p>
            <p><strong>Ngày:</strong> ${lessonDate}</p>
            <p><strong>Tiết:</strong> ${request.lesson.timeSlot.period}</p>
            <p><strong>Thời gian:</strong> ${lessonTime}</p>
            <p><strong>Giáo viên yêu cầu:</strong> ${request.requestingTeacher.name}</p>
            <p><strong>Lý do:</strong> ${request.reason}</p>
          </div>
          <p>Vui lòng phản hồi yêu cầu này bằng cách truy cập hệ thống EcoSchool.</p>
          <p><strong>Lưu ý:</strong> Bạn sẽ cùng với giáo viên chính dạy tiết học này để hỗ trợ học sinh.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">Email này được gửi tự động từ hệ thống EcoSchool.</p>
        </div>
      `;

      // Email to managers
      const managerEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Thông báo yêu cầu dạy bù - EcoSchool</h2>
          <p>Có yêu cầu dạy bù mới từ giáo viên:</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #e74c3c; margin-top: 0;">Thông tin yêu cầu</h3>
            <p><strong>Mã yêu cầu:</strong> ${request.requestId}</p>
            <p><strong>Giáo viên yêu cầu:</strong> ${
              request.requestingTeacher.name
            }</p>
            <p><strong>Môn học:</strong> ${
              request.lesson.subject.subjectName
            }</p>
            <p><strong>Lớp:</strong> ${request.lesson.class.className}</p>
            <p><strong>Ngày:</strong> ${lessonDate}</p>
            <p><strong>Tiết:</strong> ${request.lesson.timeSlot.period}</p>
            <p><strong>Thời gian:</strong> ${lessonTime}</p>
            <p><strong>Lý do:</strong> ${request.reason}</p>
            <p><strong>Giáo viên được đề xuất:</strong> ${request.candidateTeachers
              .map((c) => c.teacher.name)
              .join(", ")}</p>
          </div>
          <hr style="margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">Email này được gửi tự động từ hệ thống EcoSchool.</p>
        </div>
      `;

      // Send emails
      await Promise.all([
        ...candidateEmails.map((email) =>
          emailService.sendEmail(
            email,
            "Yêu cầu dạy bù - EcoSchool",
            candidateEmailHtml
          )
        ),
        ...managerEmails.map((email) =>
          emailService.sendEmail(
            email,
            "Thông báo yêu cầu dạy bù - EcoSchool",
            managerEmailHtml
          )
        ),
      ]);

      // Record sent emails
      await LessonRequest.findByIdAndUpdate(requestId, {
        $push: {
          emailsSent: {
            type: "request",
            recipients: [...candidateEmails, ...managerEmails],
            subject: "Yêu cầu dạy bù - EcoSchool",
          },
        },
      });
    } catch (error) {
      console.error("Error sending request emails:", error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  // Send approval emails
  async sendApprovalEmails(requestId) {
    try {
      const request = await this.getSubstituteRequestById(requestId);

      // Get manager emails
      const managers = await User.find({
        role: { $in: ["manager", "admin"] },
      }).select("email");

      const managerEmails = managers.map((m) => m.email);

      const lessonDate = new Date(
        request.lesson.scheduledDate
      ).toLocaleDateString("vi-VN");
      const lessonTime = `${request.lesson.timeSlot.startTime} - ${request.lesson.timeSlot.endTime}`;

      // Email to requesting teacher
      const requestingTeacherEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #27ae60;">Yêu cầu dạy bù đã được chấp nhận - EcoSchool</h2>
          <p>Xin chào ${request.requestingTeacher.name},</p>
          <p>Yêu cầu dạy bù của bạn đã được chấp nhận:</p>
          <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #27ae60;">
            <h3 style="color: #155724; margin-top: 0;">Thông tin tiết học</h3>
            <p><strong>Môn học:</strong> ${request.lesson.subject.subjectName}</p>
            <p><strong>Lớp:</strong> ${request.lesson.class.className}</p>
            <p><strong>Ngày:</strong> ${lessonDate}</p>
            <p><strong>Tiết:</strong> ${request.lesson.timeSlot.period}</p>
            <p><strong>Thời gian:</strong> ${lessonTime}</p>
            <p><strong>Giáo viên dạy bù:</strong> ${request.approvedTeacher.name}</p>
            <p><strong>Lưu ý:</strong> Bạn vẫn là giáo viên chính, ${request.approvedTeacher.name} sẽ hỗ trợ dạy bù.</p>
          </div>
          <hr style="margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">Email này được gửi tự động từ hệ thống EcoSchool.</p>
        </div>
      `;

      // Email to managers and remaining candidates
      const otherCandidates = request.candidateTeachers.filter(
        (c) =>
          c.teacher._id.toString() !== request.approvedTeacher._id.toString()
      );

      const notificationEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Thông báo yêu cầu dạy bù đã được chấp nhận - EcoSchool</h2>
          <p>Yêu cầu dạy bù sau đã được chấp nhận:</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #e74c3c; margin-top: 0;">Thông tin</h3>
            <p><strong>Mã yêu cầu:</strong> ${request.requestId}</p>
            <p><strong>Giáo viên yêu cầu:</strong> ${request.requestingTeacher.name}</p>
            <p><strong>Môn học:</strong> ${request.lesson.subject.subjectName}</p>
            <p><strong>Lớp:</strong> ${request.lesson.class.className}</p>
            <p><strong>Ngày:</strong> ${lessonDate}</p>
            <p><strong>Tiết:</strong> ${request.lesson.timeSlot.period}</p>
            <p><strong>Giáo viên dạy bù:</strong> ${request.approvedTeacher.name}</p>
            <p><strong>Lưu ý:</strong> Giáo viên ${request.requestingTeacher.name} vẫn là giáo viên chính, ${request.approvedTeacher.name} sẽ hỗ trợ dạy bù.</p>
          </div>
          <hr style="margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">Email này được gửi tự động từ hệ thống EcoSchool.</p>
        </div>
      `;

      // Send emails
      const allRecipients = [
        request.requestingTeacher.email,
        ...managerEmails,
        ...otherCandidates.map((c) => c.teacher.email),
      ];

      await Promise.all(
        allRecipients.map((email) =>
          emailService.sendEmail(
            email,
            "Yêu cầu dạy bù đã được chấp nhận - EcoSchool",
            email === request.requestingTeacher.email
              ? requestingTeacherEmailHtml
              : notificationEmailHtml
          )
        )
      );

      // Record sent emails
      await LessonRequest.findByIdAndUpdate(requestId, {
        $push: {
          emailsSent: {
            type: "approval",
            recipients: allRecipients,
            subject: "Yêu cầu dạy bù đã được chấp nhận - EcoSchool",
          },
        },
      });
    } catch (error) {
      console.error("Error sending approval emails:", error);
    }
  }

  // Send rejection emails
  async sendRejectionEmails(requestId, rejectingTeacherId, reason) {
    try {
      const request = await this.getSubstituteRequestById(requestId);
      const rejectingTeacher = await User.findById(rejectingTeacherId).select(
        "name"
      );

      const lessonDate = new Date(
        request.lesson.scheduledDate
      ).toLocaleDateString("vi-VN");
      const lessonTime = `${request.lesson.timeSlot.startTime} - ${request.lesson.timeSlot.endTime}`;

      // Email to requesting teacher
      const rejectionEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c;">Yêu cầu dạy bù bị từ chối - EcoSchool</h2>
          <p>Xin chào ${request.requestingTeacher.name},</p>
          <p>Giáo viên ${
            rejectingTeacher.name
          } đã từ chối yêu cầu dạy bù của bạn:</p>
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e74c3c;">
            <h3 style="color: #721c24; margin-top: 0;">Thông tin tiết học</h3>
            <p><strong>Môn học:</strong> ${
              request.lesson.subject.subjectName
            }</p>
            <p><strong>Lớp:</strong> ${request.lesson.class.className}</p>
            <p><strong>Ngày:</strong> ${lessonDate}</p>
            <p><strong>Tiết:</strong> ${request.lesson.timeSlot.period}</p>
            <p><strong>Thời gian:</strong> ${lessonTime}</p>
            <p><strong>Lý do từ chối:</strong> ${
              reason || "Không có lý do cụ thể"
            }</p>
          </div>
          ${
            request.status === "pending"
              ? "<p>Yêu cầu vẫn đang chờ phản hồi từ các giáo viên khác.</p>"
              : "<p><strong>Lưu ý:</strong> Tất cả giáo viên đều đã từ chối yêu cầu này.</p>"
          }
          <hr style="margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">Email này được gửi tự động từ hệ thống EcoSchool.</p>
        </div>
      `;

      await emailService.sendEmail(
        request.requestingTeacher.email,
        "Yêu cầu dạy thay bị từ chối - EcoSchool",
        rejectionEmailHtml
      );

      // Record sent email
      await LessonRequest.findByIdAndUpdate(requestId, {
        $push: {
          emailsSent: {
            type: "rejection",
            recipients: [request.requestingTeacher.email],
            subject: "Yêu cầu dạy thay bị từ chối - EcoSchool",
          },
        },
      });
    } catch (error) {
      console.error("Error sending rejection emails:", error);
    }
  }

  // Send notification emails to students about teacher change
  async sendStudentNotificationEmails(requestId) {
    try {
      const request = await this.getSubstituteRequestById(requestId);

      // Get students in the class
      const Class = require("../../classes/models/class.model");
      const classInfo = await Class.findById(request.lesson.class._id);

      if (!classInfo) {
        console.log("Class not found");
        return;
      }

      // Get students using the class method
      const students = await classInfo.getStudents();

      if (!students || students.length === 0) {
        console.log("No students found for class");
        return;
      }

      const studentEmails = students
        .filter((student) => student.email)
        .map((student) => student.email);

      if (studentEmails.length === 0) {
        console.log("No student emails found");
        return;
      }

      const lessonDate = new Date(
        request.lesson.scheduledDate
      ).toLocaleDateString("vi-VN");
      const lessonTime = `${request.lesson.timeSlot.startTime} - ${request.lesson.timeSlot.endTime}`;

      const studentEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Thông báo có giáo viên dạy bù - EcoSchool</h2>
          <p>Xin chào các em học sinh lớp ${request.lesson.class.className},</p>
          <p>Có giáo viên dạy bù cho tiết học sau:</p>
          <div style="background-color: #e8f4fd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
            <h3 style="color: #2980b9; margin-top: 0;">Thông tin tiết học</h3>
            <p><strong>Môn học:</strong> ${request.lesson.subject.subjectName}</p>
            <p><strong>Lớp:</strong> ${request.lesson.class.className}</p>
            <p><strong>Ngày:</strong> ${lessonDate}</p>
            <p><strong>Tiết:</strong> ${request.lesson.timeSlot.period}</p>
            <p><strong>Thời gian:</strong> ${lessonTime}</p>
            <p><strong>Giáo viên chính:</strong> ${request.requestingTeacher.name}</p>
            <p><strong>Giáo viên dạy bù:</strong> ${request.approvedTeacher.name}</p>
          </div>
          <p>Các em vui lòng chuẩn bị bài học và đến lớp đúng giờ như thường lệ.</p>
          <p><strong>Lưu ý:</strong> Cả hai giáo viên sẽ cùng tham gia tiết học này để hỗ trợ các em học tập tốt hơn.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">Email này được gửi tự động từ hệ thống EcoSchool.</p>
        </div>
      `;

      // Send emails to all students
      await Promise.all(
        studentEmails.map((email) =>
          emailService.sendEmail(
            email,
            "Thông báo thay đổi giáo viên - EcoSchool",
            studentEmailHtml
          )
        )
      );

      // Record sent emails
      await LessonRequest.findByIdAndUpdate(requestId, {
        $push: {
          emailsSent: {
            type: "notification",
            recipients: studentEmails,
            subject: "Thông báo thay đổi giáo viên - EcoSchool",
          },
        },
      });

      console.log(
        `Sent teacher change notification to ${studentEmails.length} students`
      );
    } catch (error) {
      console.error("Error sending student notification emails:", error);
      // Don't throw error to avoid breaking the main approve flow
    }
  }

  // Get all substitute requests for admin/manager
  async getAllRequests(status = null, page = 1, limit = 20) {
    const query = { requestType: "substitute" };
    if (status) query.status = status;
    const skip = (page - 1) * limit;

    const requests = await LessonRequest.find(query)
      .populate({
        path: "lesson",
        populate: [
          { path: "class", select: "className" },
          { path: "subject", select: "subjectName" },
          { path: "timeSlot", select: "period startTime endTime" },
        ],
      })
      .populate("requestingTeacher", "name email")
      .populate("candidateTeachers.teacher", "name email")
      .populate("approvedTeacher", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await LessonRequest.countDocuments(query);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new LessonRequestService();
