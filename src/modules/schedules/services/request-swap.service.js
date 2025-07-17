const LessonRequest = require("../models/lesson-request.model");
const Lesson = require("../models/lesson.model");
const Class = require("../../classes/models/class.model");
const Subject = require("../../subjects/models/subject.model");
const User = require("../../auth/models/user.model");
const AcademicYear = require("../models/academic-year.model");
const TimeSlot = require("../models/time-slot.model");
const emailService = require("../../auth/services/email.service");
const lessonReferenceSwapper = require("./lesson-reference-swapper.service");
const notificationService = require("../../notification/services/notification.service");

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

      // ==== Gửi notification thay cho email ====
      // Gửi notification cho manager
      const managers = await User.find({ role: { $in: ["manager", "admin"] } });
      const managerIds = managers.map((m) => m._id.toString());
      await notificationService.createNotification({
        type: "activity",
        title: "Yêu cầu đổi tiết mới",
        content: `Có yêu cầu đổi tiết mới từ giáo viên ${
          populatedRequest.requestingTeacher.fullName ||
          populatedRequest.requestingTeacher.name
        } cho lớp ${populatedRequest.additionalInfo.classInfo.className}, môn ${
          populatedRequest.additionalInfo.subjectInfo.subjectName
        }.`,
        sender: data.teacherId,
        receiverScope: {
          type: "user",
          ids: managerIds,
        },
        relatedObject: {
          id: populatedRequest._id,
          requestType: "swap_request",
        },
      });
      // Gửi notification cho giáo viên replacement
      await notificationService.createNotification({
        type: "activity",
        title: "Bạn nhận được yêu cầu đổi tiết",
        content: `Bạn được đề xuất đổi tiết với giáo viên ${
          populatedRequest.requestingTeacher.fullName ||
          populatedRequest.requestingTeacher.name
        } cho lớp ${populatedRequest.additionalInfo.classInfo.className}, môn ${
          populatedRequest.additionalInfo.subjectInfo.subjectName
        }.`,
        sender: data.teacherId,
        receiverScope: {
          type: "user",
          ids: [populatedRequest.swapInfo.replacementTeacher._id.toString()],
        },
        relatedObject: {
          id: populatedRequest._id,
          requestType: "swap_request",
        },
      });
      // =========================================

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

  // Hàm generic để swap tất cả các trường của Lesson model
  async swapLessonFields(originalLesson, replacementLesson, processedBy) {
    // Lấy tất cả các trường của Lesson model (trừ _id, __v, timestamps, lessonId)
    const lessonFields = Object.keys(originalLesson.toObject()).filter(
      (field) =>
        ![
          "_id",
          "__v",
          "createdAt",
          "updatedAt",
          "lessonId",
          "class",
          "academicYear",
          "timeSlot",
          "scheduledDate",
          "createdBy",
        ].includes(field)
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
      lessonRequest.swapInfo.replacementTeacherResponse = {
        status: "approved",
        responseDate: new Date(),
      };
      await lessonRequest.save();

      // ==== Gửi notification thay cho email ====
      // 1. Gửi notification cho giáo viên yêu cầu
      await notificationService.createNotification({
        type: "activity",
        title: "Yêu cầu đổi tiết đã được chấp nhận",
        content: `Yêu cầu đổi tiết của bạn đã được giáo viên ${
          lessonRequest.swapInfo.replacementTeacher.fullName ||
          lessonRequest.swapInfo.replacementTeacher.name
        } chấp nhận.`,
        sender: replacementTeacherId,
        receiverScope: {
          type: "user",
          ids: [lessonRequest.requestingTeacher._id.toString()],
        },
        relatedObject: { id: lessonRequest._id, requestType: "swap_request" },
      });
      // 2. Gửi notification cho giáo viên replacement
      await notificationService.createNotification({
        type: "activity",
        title: "Bạn đã chấp nhận đổi tiết",
        content: `Bạn đã chấp nhận đổi tiết với giáo viên ${
          lessonRequest.requestingTeacher.fullName ||
          lessonRequest.requestingTeacher.name
        }.`,
        sender: replacementTeacherId,
        receiverScope: {
          type: "user",
          ids: [replacementTeacherId.toString()],
        },
        relatedObject: { id: lessonRequest._id, requestType: "swap_request" },
      });
      // 3. Gửi notification cho học sinh lớp đó
      const students = await User.find({
        role: "student",
        class_id: lessonRequest.additionalInfo.classInfo._id,
      }).select("_id");
      if (students.length > 0) {
        await notificationService.createNotification({
          type: "activity",
          title: "Thông báo đổi tiết",
          content: `Lịch học lớp ${lessonRequest.additionalInfo.classInfo.className} đã được đổi tiết theo yêu cầu. Vui lòng kiểm tra lại lịch học mới.`,
          sender: replacementTeacherId,
          receiverScope: {
            type: "user",
            ids: students.map((s) => s._id.toString()),
          },
          relatedObject: { id: lessonRequest._id, requestType: "swap_request" },
        });
      }
      // =========================================

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
      lessonRequest.swapInfo.replacementTeacherResponse = {
        status: "rejected",
        responseDate: new Date(),
      };
      await lessonRequest.save();

      // ==== Gửi notification thay cho email ====
      // 1. Gửi notification cho giáo viên yêu cầu
      await notificationService.createNotification({
        type: "activity",
        title: "Yêu cầu đổi tiết bị từ chối",
        content: `Yêu cầu đổi tiết của bạn đã bị giáo viên ${await User.findById(
          lessonRequest.swapInfo.replacementTeacher
        ).then((user) => user.name)} từ chối.`,
        sender: replacementTeacherId,
        receiverScope: {
          type: "user",
          ids: [lessonRequest.requestingTeacher._id.toString()],
        },
        relatedObject: { id: lessonRequest._id, requestType: "swap_request" },
      });
      // 2. Gửi notification cho giáo viên replacement
      await notificationService.createNotification({
        type: "activity",
        title: "Bạn đã từ chối đổi tiết",
        content: `Bạn đã từ chối đổi tiết với giáo viên ${await User.findById(
          lessonRequest.requestingTeacher
        ).then((user) => user.name)}.`,
        sender: replacementTeacherId,
        receiverScope: {
          type: "user",
          ids: [replacementTeacherId.toString()],
        },
        relatedObject: { id: lessonRequest._id, requestType: "swap_request" },
      });
      // =========================================

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

      // ==== Gửi notification thay cho email ====
      // 1. Gửi notification cho giáo viên replacement
      await notificationService.createNotification({
        type: "activity",
        title: "Yêu cầu đổi tiết đã bị hủy",
        content: `Yêu cầu đổi tiết với giáo viên ${
          lessonRequest.swapInfo.replacementTeacher.fullName ||
          lessonRequest.swapInfo.replacementTeacher.name
        } đã bị hủy bởi giáo viên yêu cầu.`,
        sender: requestingTeacherId,
        receiverScope: {
          type: "user",
          ids: [lessonRequest.swapInfo.replacementTeacher._id.toString()],
        },
        relatedObject: { id: lessonRequest._id, requestType: "swap_request" },
      });
      // 2. Gửi notification cho giáo viên yêu cầu
      await notificationService.createNotification({
        type: "activity",
        title: "Bạn đã hủy yêu cầu đổi tiết",
        content: `Bạn đã hủy yêu cầu đổi tiết với giáo viên ${
          lessonRequest.swapInfo.replacementTeacher.fullName ||
          lessonRequest.swapInfo.replacementTeacher.name
        }.`,
        sender: requestingTeacherId,
        receiverScope: {
          type: "user",
          ids: [requestingTeacherId.toString()],
        },
        relatedObject: { id: lessonRequest._id, requestType: "swap_request" },
      });
      // =========================================

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
