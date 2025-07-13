const LessonRequest = require("../models/lesson-request.model");
const Lesson = require("../models/lesson.model");
const Class = require("../../classes/models/class.model");
const Subject = require("../../subjects/models/subject.model");
const User = require("../../auth/models/user.model");
const AcademicYear = require("../models/academic-year.model");
const TimeSlot = require("../models/time-slot.model");
const emailService = require("../../auth/services/email.service");
const lessonReferenceSwapper = require("./lesson-reference-swapper.service");

class SwapRequestService {
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

  // Tạo yêu cầu đổi tiết
  async createSwapRequest(data) {
    try {
      console.log(`🔄 Creating swap request for teacher ${data.teacherId}`);

      // Kiểm tra originalLesson tồn tại và thuộc về giáo viên
      const originalLesson = await Lesson.findById(data.originalLessonId)
        .populate("class", "className gradeLevel")
        .populate("subject", "subjectName subjectCode")
        .populate("academicYear", "name startDate endDate")
        .populate("timeSlot", "period startTime endTime");

      // Kiểm tra replacementLesson tồn tại và có giáo viên dạy
      const replacementLesson = await Lesson.findById(data.replacementLessonId)
        .populate("class", "className gradeLevel")
        .populate("subject", "subjectName subjectCode")
        .populate("teacher", "name email fullName")
        .populate("timeSlot", "period startTime endTime");

      // Kiểm tra cùng tuần
      const originalWeek = this.getWeekRange(originalLesson.scheduledDate);
      const replacementWeek = this.getWeekRange(
        replacementLesson.scheduledDate
      );

      // Tạo lesson request với thông tin tuần tự động tính toán
      const lessonRequestData = {
        requestType: "swap",
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
        swapInfo: {
          replacementTeacher: replacementLesson.teacher._id,
          hasConflict: false, // Sẽ được check sau
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
        .populate("swapInfo.replacementTeacher", "name email fullName")
        .populate("additionalInfo.classInfo", "className gradeLevel")
        .populate("additionalInfo.subjectInfo", "subjectName subjectCode")
        .populate("additionalInfo.academicYear", "name startDate endDate");

      // Gửi email thông báo cho manager và giáo viên replacement
      const managerEmails = await this.sendNewSwapRequestToManager(
        populatedRequest
      );
      const replacementTeacherEmail =
        await this.sendNewSwapRequestToReplacementTeacher(populatedRequest);

      // Cập nhật emailsSent với danh sách email thực tế
      const allRecipients = [...managerEmails];
      if (replacementTeacherEmail) {
        allRecipients.push(replacementTeacherEmail);
      }

      if (allRecipients.length > 0) {
        await LessonRequest.findByIdAndUpdate(lessonRequest._id, {
          $push: {
            emailsSent: {
              type: "request",
              recipients: allRecipients,
              sentAt: new Date(),
              subject: `Yêu cầu đổi tiết mới - ${lessonRequest.requestId}`,
            },
          },
        });
      }

      console.log(`✅ Created swap request: ${lessonRequest.requestId}`);

      return {
        success: true,
        message: "Swap request created successfully",
        request: populatedRequest,
      };
    } catch (error) {
      console.error("❌ Error creating swap request:", error.message);
      throw new Error(`Failed to create swap request: ${error.message}`);
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

  // Gửi email thông báo yêu cầu đổi tiết mới cho giáo viên của tiết replacement
  async sendNewSwapRequestToReplacementTeacher(lessonRequest) {
    try {
      // Sử dụng thông tin từ swapInfo nếu có, nếu không thì query lại
      let teacher = lessonRequest.swapInfo?.replacementTeacher;

      if (!teacher) {
        // Fallback: query lại từ replacement lesson
        const replacementLesson = await Lesson.findById(
          lessonRequest.replacementLesson
        )
          .populate("teacher", "name email fullName")
          .lean();

        if (!replacementLesson || !replacementLesson.teacher) {
          console.log("⚠️ No replacement teacher found");
          return null;
        }
        teacher = replacementLesson.teacher;
      }

      if (!teacher.email) {
        console.log("⚠️ Replacement teacher has no email");
        return null;
      }

      // Tạo email content
      const subject = `Yêu cầu đổi tiết - Thông báo cho giáo viên - ${lessonRequest.requestId}`;

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e67e22;">Thông báo yêu cầu đổi tiết</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #34495e; margin-top: 0;">Thông tin yêu cầu</h3>
            <p><strong>Mã yêu cầu:</strong> ${lessonRequest.requestId}</p>
            <p><strong>Loại yêu cầu:</strong> Đổi tiết</p>
            <p><strong>Giáo viên yêu cầu:</strong> ${
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
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">⚠️ Tiết học của bạn sẽ bị ảnh hưởng</h3>
            <p><strong>Tiết hiện tại của bạn:</strong></p>
            <p>Ngày: ${new Date(
              lessonRequest.replacementLesson.scheduledDate
            ).toLocaleDateString("vi-VN")}</p>
            <p>${this.formatLessonInfo(lessonRequest.replacementLesson)}</p>
            <p><strong>Chủ đề:</strong> ${
              lessonRequest.replacementLesson.topic || "Chưa có"
            }</p>
          </div>
          
          <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2980b9; margin-top: 0;">Thông tin tiết sẽ đổi</h3>
            <p><strong>Tiết sẽ đổi với:</strong></p>
            <p>Ngày: ${new Date(
              lessonRequest.originalLesson.scheduledDate
            ).toLocaleDateString("vi-VN")}</p>
            <p>${this.formatLessonInfo(lessonRequest.originalLesson)}</p>
            <p><strong>Chủ đề:</strong> ${
              lessonRequest.originalLesson.topic || "Chưa có"
            }</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #7f8c8d;">Yêu cầu này đang chờ phê duyệt từ quản lý. Bạn sẽ được thông báo khi có kết quả.</p>
          </div>
          
          <div style="border-top: 1px solid #bdc3c7; padding-top: 20px; text-align: center; color: #95a5a6; font-size: 12px;">
            <p>Email này được gửi tự động từ hệ thống quản lý lịch học DigiSchool.</p>
          </div>
        </div>
      `;

      // Gửi email cho giáo viên replacement
      await emailService.sendEmail(teacher.email, subject, emailContent);

      console.log(
        `📧 Sent swap request notification to replacement teacher: ${teacher.email}`
      );

      return teacher.email;
    } catch (error) {
      console.error(
        "❌ Error sending email to replacement teacher:",
        error.message
      );
      // Không throw error để không làm gián đoạn flow chính
      return null;
    }
  }

  // Gửi email thông báo yêu cầu đổi tiết mới cho manager
  async sendNewSwapRequestToManager(lessonRequest) {
    try {
      // Tìm managers và admins
      const managers = await User.find({
        role: { $in: ["manager", "admin"] },
      }).select("email");

      if (managers.length === 0) {
        console.log("⚠️ No managers found to send notification");
        return;
      }

      const managerEmails = managers.map((m) => m.email);

      // Tạo email content
      const subject = `Yêu cầu đổi tiết mới - ${lessonRequest.requestId}`;

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Yêu cầu đổi tiết mới</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #34495e; margin-top: 0;">Thông tin yêu cầu</h3>
            <p><strong>Mã yêu cầu:</strong> ${lessonRequest.requestId}</p>
            <p><strong>Loại yêu cầu:</strong> Đổi tiết</p>
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
            <p>Email này được gửi tự động từ hệ thống quản lý lịch học DigiSchool.</p>
          </div>
        </div>
      `;

      // Gửi email cho tất cả managers
      await Promise.all(
        managerEmails.map((email) =>
          emailService.sendEmail(email, subject, emailContent)
        )
      );

      console.log(
        `📧 Sent swap request notification to ${managerEmails.length} managers`
      );

      return managerEmails;
    } catch (error) {
      console.error("❌ Error sending email notification:", error.message);
      // Không throw error để không làm gián đoạn flow chính
      return [];
    }
  }

  // Hàm generic để swap tất cả các trường của Lesson model
  async swapLessonFields(originalLesson, replacementLesson, processedBy) {
    // Lấy tất cả các trường của Lesson model (trừ _id, __v, timestamps, lessonId)
    const lessonFields = Object.keys(originalLesson.toObject()).filter(
      (field) =>
        !["_id", "__v", "createdAt", "updatedAt", "lessonId", "class", "academicYear", "timeSlot", "scheduledDate", "createdBy"].includes(field)
    );

    // Tạo data objects với tất cả các trường
    const originalData = {};
    const replacementData = {};

    lessonFields.forEach((field) => {
      originalData[field] = originalLesson[field];
      replacementData[field] = replacementLesson[field];
    });

    // Sử dụng generic lesson reference swapper
    console.log(`🔄 Starting generic lesson reference swap...`);
    const swapResult = await lessonReferenceSwapper.swapLessonReferences(
      originalLesson._id,
      replacementLesson._id,
      processedBy
    );

    if (!swapResult.success) {
      console.error("❌ Lesson reference swap failed:", swapResult.errors);
      throw new Error("Failed to swap lesson references");
    }

    console.log(
      `✅ Swapped ${swapResult.totalSwapped} references across ${swapResult.swappedCollections.length} collections`
    );

    // Cập nhật replacement lesson với tất cả trường từ original
    lessonFields.forEach((field) => {
      replacementLesson[field] = originalData[field];
    });
    replacementLesson.lastModifiedBy = processedBy;

    // Cập nhật original lesson với tất cả trường từ replacement
    lessonFields.forEach((field) => {
      originalLesson[field] = replacementData[field];
    });
    originalLesson.lastModifiedBy = processedBy;

    // Lưu lessons mà không trigger pre-save hook để tránh tạo lại lessonId
    await originalLesson.save({ validateBeforeSave: false });
    await replacementLesson.save({ validateBeforeSave: false });

    console.log(
      `🔄 Swapped lessons: ${originalLesson.lessonId} ↔ ${replacementLesson.lessonId}`
    );
  }

  // Xử lý approval cho swap request
  async processSwapApproval(lessonRequest, originalLesson, replacementLesson) {
    // Sử dụng hàm generic để swap tất cả trường
    await this.swapLessonFields(
      originalLesson,
      replacementLesson,
      lessonRequest.processedBy
    );
  }

  // Duyệt yêu cầu đổi tiết bởi giáo viên replacement
  async approveSwapRequestByReplacementTeacher(
    requestId,
    replacementTeacherId
  ) {
    try {
      console.log(`✅ Approving swap request: ${requestId}`);

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
        .populate("swapInfo.replacementTeacher", "name email fullName")
        .populate("additionalInfo.classInfo", "className gradeLevel")
        .populate("additionalInfo.subjectInfo", "subjectName subjectCode");

      if (!lessonRequest) {
        throw new Error("Swap request not found");
      }

      if (lessonRequest.requestType !== "swap") {
        throw new Error("Not a swap request");
      }

      if (lessonRequest.status !== "pending") {
        throw new Error("Request has already been processed");
      }

      // Kiểm tra xem giáo viên có phải là replacement teacher không
      if (
        lessonRequest.swapInfo.replacementTeacher._id.toString() !==
        replacementTeacherId.toString()
      ) {
        throw new Error(
          "Only the replacement teacher can approve this swap request"
        );
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
        replacementLesson.type === "empty" ||
        replacementLesson.status !== "scheduled"
      ) {
        throw new Error("Replacement lesson is no longer available");
      }

      // Xử lý đổi tiết
      await this.processSwapApproval(
        lessonRequest,
        originalLesson,
        replacementLesson
      );

      // Cập nhật trạng thái request
      lessonRequest.status = "approved";
      lessonRequest.processedBy = replacementTeacherId;
      lessonRequest.processedAt = new Date();
      lessonRequest.lastModifiedBy = replacementTeacherId;

      // Cập nhật trạng thái phản hồi của replacement teacher
      lessonRequest.swapInfo.replacementTeacherResponse = {
        status: "approved",
        responseDate: new Date(),
      };

      await lessonRequest.save();

      // Gửi email thông báo cho giáo viên
      const teacherRecipients = await this.sendSwapRequestNotifications(
        lessonRequest,
        "approved"
      );

      // Gửi email thông báo cho học sinh
      await this.sendStudentNotifications(lessonRequest, "approved");

      // Cập nhật emailsSent với danh sách email thực tế
      const allRecipients = [...teacherRecipients];

      await LessonRequest.findByIdAndUpdate(lessonRequest._id, {
        $push: {
          emailsSent: {
            type: "approval",
            recipients: allRecipients,
            sentAt: new Date(),
            subject: `Yêu cầu đổi tiết đã được duyệt - ${lessonRequest.requestId}`,
          },
        },
      });

      console.log(`✅ Approved swap request: ${requestId}`);

      return {
        success: true,
        message: "Swap request approved successfully",
        request: lessonRequest,
      };
    } catch (error) {
      console.error("❌ Error approving swap request:", error.message);
      throw new Error(`Failed to approve swap request: ${error.message}`);
    }
  }

  // Từ chối yêu cầu đổi tiết bởi giáo viên replacement
  async rejectSwapRequestByReplacementTeacher(requestId, replacementTeacherId) {
    try {
      console.log(`❌ Rejecting swap request: ${requestId}`);

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
        throw new Error("Swap request not found");
      }

      if (lessonRequest.requestType !== "swap") {
        throw new Error("Not a swap request");
      }

      if (lessonRequest.status !== "pending") {
        throw new Error("Request has already been processed");
      }

      // Kiểm tra xem giáo viên có phải là replacement teacher không
      if (
        lessonRequest.swapInfo.replacementTeacher.toString() !==
        replacementTeacherId.toString()
      ) {
        throw new Error(
          "Only the replacement teacher can reject this swap request"
        );
      }

      // Cập nhật trạng thái request
      lessonRequest.status = "rejected";
      lessonRequest.processedBy = replacementTeacherId;
      lessonRequest.processedAt = new Date();
      lessonRequest.lastModifiedBy = replacementTeacherId;

      // Cập nhật trạng thái phản hồi của replacement teacher
      lessonRequest.swapInfo.replacementTeacherResponse = {
        status: "rejected",
        responseDate: new Date(),
      };

      await lessonRequest.save();

      // Gửi email thông báo
      const teacherRecipients = await this.sendSwapRequestNotifications(
        lessonRequest,
        "rejected"
      );

      // Cập nhật emailsSent với danh sách email thực tế
      await LessonRequest.findByIdAndUpdate(lessonRequest._id, {
        $push: {
          emailsSent: {
            type: "rejection",
            recipients: teacherRecipients,
            sentAt: new Date(),
            subject: `Yêu cầu đổi tiết đã bị từ chối - ${lessonRequest.requestId}`,
          },
        },
      });

      console.log(`❌ Rejected swap request: ${requestId}`);

      return {
        success: true,
        message: "Swap request rejected",
        request: lessonRequest,
      };
    } catch (error) {
      console.error("❌ Error rejecting swap request:", error.message);
      throw new Error(`Failed to reject swap request: ${error.message}`);
    }
  }

  // Gửi email thông báo kết quả xử lý đổi tiết
  async sendSwapRequestNotifications(lessonRequest, status) {
    try {
      let statusText, statusColor;
      switch (status) {
        case "approved":
          statusText = "đã được duyệt";
          statusColor = "#27ae60";
          break;
        case "rejected":
          statusText = "đã bị từ chối";
          statusColor = "#e74c3c";
          break;
        case "cancelled":
          statusText = "đã được hủy";
          statusColor = "#95a5a6";
          break;
        default:
          statusText = "đã được xử lý";
          statusColor = "#2c3e50";
      }

      const subject = `Yêu cầu đổi tiết ${statusText} - ${lessonRequest.requestId}`;

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusColor};">Yêu cầu đổi tiết ${statusText}</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #34495e; margin-top: 0;">Thông tin yêu cầu</h3>
            <p><strong>Mã yêu cầu:</strong> ${lessonRequest.requestId}</p>
            <p><strong>Loại yêu cầu:</strong> Đổi tiết</p>
            <p><strong>Lớp:</strong> ${
              lessonRequest.additionalInfo.classInfo.className
            }</p>
            <p><strong>Môn học:</strong> ${
              lessonRequest.additionalInfo.subjectInfo.subjectName
            }</p>
            <p><strong>Trạng thái:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText.toUpperCase()}</span></p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #7f8c8d;">Vui lòng đăng nhập vào hệ thống để xem chi tiết.</p>
          </div>
          
          <div style="border-top: 1px solid #bdc3c7; padding-top: 20px; text-align: center; color: #95a5a6; font-size: 12px;">
            <p>Email này được gửi tự động từ hệ thống quản lý lịch học DigiSchool.</p>
          </div>
        </div>
      `;

      // Gửi email cho giáo viên yêu cầu
      await emailService.sendEmail(
        lessonRequest.requestingTeacher.email,
        subject,
        emailContent
      );

      // Gửi email cho giáo viên replacement
      let replacementTeacher = lessonRequest.swapInfo?.replacementTeacher;

      if (!replacementTeacher) {
        // Fallback: query lại từ replacement lesson
        const replacementLesson = await Lesson.findById(
          lessonRequest.replacementLesson
        )
          .populate("teacher", "name email fullName")
          .lean();
        replacementTeacher = replacementLesson?.teacher;
      }

      const allRecipients = [lessonRequest.requestingTeacher.email];

      if (replacementTeacher && replacementTeacher.email) {
        const replacementSubject = `Yêu cầu đổi tiết ${statusText} - Thông báo cho giáo viên - ${lessonRequest.requestId}`;

        const replacementEmailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${statusColor};">Yêu cầu đổi tiết ${statusText}</h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #34495e; margin-top: 0;">Thông tin yêu cầu</h3>
              <p><strong>Mã yêu cầu:</strong> ${lessonRequest.requestId}</p>
              <p><strong>Loại yêu cầu:</strong> Đổi tiết</p>
              <p><strong>Giáo viên yêu cầu:</strong> ${
                lessonRequest.requestingTeacher.fullName ||
                lessonRequest.requestingTeacher.name
              }</p>
              <p><strong>Lớp:</strong> ${
                lessonRequest.additionalInfo.classInfo.className
              }</p>
              <p><strong>Môn học:</strong> ${
                lessonRequest.additionalInfo.subjectInfo.subjectName
              }</p>
              <p><strong>Trạng thái:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText.toUpperCase()}</span></p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #7f8c8d;">Vui lòng đăng nhập vào hệ thống để xem chi tiết.</p>
            </div>
            
            <div style="border-top: 1px solid #bdc3c7; padding-top: 20px; text-align: center; color: #95a5a6; font-size: 12px;">
              <p>Email này được gửi tự động từ hệ thống quản lý lịch học DigiSchool.</p>
            </div>
          </div>
        `;

        await emailService.sendEmail(
          replacementTeacher.email,
          replacementSubject,
          replacementEmailContent
        );

        allRecipients.push(replacementTeacher.email);
        console.log(
          `📧 Sent swap ${status} notification to replacement teacher`
        );
      }

      console.log(`📧 Sent swap ${status} notification to teachers`);

      return allRecipients;
    } catch (error) {
      console.error("❌ Error sending notification email:", error.message);
      // Không throw error để không làm gián đoạn flow chính
    }
  }

  // Gửi email thông báo cho học sinh khi yêu cầu đổi tiết được approve
  async sendStudentNotifications(lessonRequest, status) {
    try {
      console.log(`📧 Sending student notifications for swap ${status}`);

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

      const subject = `Thông báo đổi tiết - ${lessonRequest.additionalInfo.classInfo.className}`;

      // Tạo email content cho thông báo đổi tiết
      const emailContent = this.createSwapNotificationEmail(lessonRequest);

      // Gửi email cho từng học sinh
      for (const student of students) {
        await emailService.sendEmail(student.email, subject, emailContent);
      }

      console.log(`📧 Sent swap notification to ${students.length} students`);
    } catch (error) {
      console.error("❌ Error sending student notifications:", error.message);
      // Không throw error để không làm gián đoạn flow chính
    }
  }

  // Lấy danh sách swap requests của giáo viên (cả requesting và replacement)
  async getTeacherSwapRequests(teacherId, status = null) {
    try {
      const query = {
        requestType: "swap",
        $or: [
          { requestingTeacher: teacherId },
          { "swapInfo.replacementTeacher": teacherId },
        ],
      };

      if (status) query.status = status;

      const requests = await LessonRequest.find(query)
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
        .populate("swapInfo.replacementTeacher", "name email fullName")
        .populate("processedBy", "name email fullName")
        .populate("additionalInfo.classInfo", "className gradeLevel")
        .populate("additionalInfo.subjectInfo", "subjectName subjectCode")
        .populate("additionalInfo.academicYear", "name startDate endDate")
        .sort({ createdAt: -1 });

      return requests;
    } catch (error) {
      console.error("❌ Error getting teacher swap requests:", error.message);
      throw new Error(`Failed to get teacher swap requests: ${error.message}`);
    }
  }

  // Hủy yêu cầu đổi tiết bởi giáo viên yêu cầu
  async cancelSwapRequest(requestId, requestingTeacherId) {
    try {
      console.log(`❌ Cancelling swap request: ${requestId}`);

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
        .populate("swapInfo.replacementTeacher", "name email fullName")
        .populate("additionalInfo.classInfo", "className gradeLevel")
        .populate("additionalInfo.subjectInfo", "subjectName subjectCode");

      if (!lessonRequest) {
        throw new Error("Swap request not found");
      }

      if (lessonRequest.requestType !== "swap") {
        throw new Error("Not a swap request");
      }

      if (lessonRequest.status !== "pending") {
        throw new Error("Request has already been processed");
      }

      // Kiểm tra xem giáo viên có phải là requesting teacher không
      if (
        lessonRequest.requestingTeacher._id.toString() !==
        requestingTeacherId.toString()
      ) {
        throw new Error(
          "Only the requesting teacher can cancel this swap request"
        );
      }

      // Cập nhật trạng thái request
      lessonRequest.status = "cancelled";
      lessonRequest.processedBy = requestingTeacherId;
      lessonRequest.processedAt = new Date();
      lessonRequest.lastModifiedBy = requestingTeacherId;

      await lessonRequest.save();

      // Gửi email thông báo hủy
      const teacherRecipients = await this.sendSwapRequestNotifications(
        lessonRequest,
        "cancelled"
      );

      // Cập nhật emailsSent với danh sách email thực tế
      await LessonRequest.findByIdAndUpdate(lessonRequest._id, {
        $push: {
          emailsSent: {
            type: "cancellation",
            recipients: teacherRecipients,
            sentAt: new Date(),
            subject: `Yêu cầu đổi tiết đã được hủy - ${lessonRequest.requestId}`,
          },
        },
      });

      console.log(`❌ Cancelled swap request: ${requestId}`);

      return {
        success: true,
        message: "Swap request cancelled successfully",
        request: lessonRequest,
      };
    } catch (error) {
      console.error("❌ Error cancelling swap request:", error.message);
      throw new Error(`Failed to cancel swap request: ${error.message}`);
    }
  }

  // Tạo email content cho thông báo đổi tiết
  createSwapNotificationEmail(lessonRequest) {
    const originalLesson = lessonRequest.originalLesson;
    const replacementLesson = lessonRequest.replacementLesson;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">Thông báo đổi tiết - ${
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
          <p>Thông báo này được gửi tự động từ hệ thống quản lý lịch học DigiSchool.</p>
        </div>
      </div>
    `;
  }
}

module.exports = new SwapRequestService();
