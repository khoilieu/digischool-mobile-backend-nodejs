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
const parentNotificationService = require("../../notification/services/parent-notification.service");

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
        replacementTeacher: replacementLesson.teacher._id,
        createdBy: data.teacherId,
      };

      // Tạo request
      const lessonRequest = new LessonRequest(lessonRequestData);
      await lessonRequest.save();

      // Xóa trường candidateTeachers khỏi document
      await LessonRequest.findByIdAndUpdate(lessonRequest._id, {
        $unset: { candidateTeachers: "" },
      });

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
        .populate("replacementTeacher", "name email fullName");

      // ==== Gửi notification thay cho email ====
      // Gửi notification cho giáo viên replacement
      await notificationService.createNotification({
        type: "activity",
        title: "Bạn nhận được yêu cầu đổi tiết",
        content: `Bạn được đề xuất đổi tiết với giáo viên ${
          populatedRequest.requestingTeacher.fullName ||
          populatedRequest.requestingTeacher.name
        } cho lớp ${originalLesson.class.className}, môn ${
          originalLesson.subject.subjectName
        }.`,
        sender: data.teacherId,
        receiverScope: {
          type: "user",
          ids: [populatedRequest.replacementTeacher._id.toString()],
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
      lessonRequest.requestingTeacher
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
        .populate("replacementTeacher", "name email fullName");

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
        lessonRequest.replacementTeacher._id.toString() !==
        replacementTeacherId.toString()
      ) {
        throw new Error(
          "Only the replacement teacher can approve this swap request"
        );
      }

      // Cập nhật trạng thái phê duyệt của giáo viên
      lessonRequest.teacherApproved = true;
      lessonRequest.processedBy = replacementTeacherId;
      await lessonRequest.save();

      // ==== Gửi notification thay cho email ====
      // 1. Gửi notification cho giáo viên yêu cầu
      await notificationService.createNotification({
        type: "activity",
        title: "Yêu cầu đổi tiết đã được giáo viên chấp nhận",
        content: `Yêu cầu đổi tiết của bạn đã được giáo viên ${
          lessonRequest.replacementTeacher.fullName ||
          lessonRequest.replacementTeacher.name
        } chấp nhận. Đang chờ quản lý phê duyệt.`,
        sender: replacementTeacherId,
        receiverScope: {
          type: "user",
          ids: [lessonRequest.requestingTeacher._id.toString()],
        },
        relatedObject: { id: lessonRequest._id, requestType: "swap_request" },
      });

      // 2. Gửi notification cho manager để phê duyệt lần 2
      const managers = await User.find({ role: { $in: ["manager", "admin"] } });
      const managerIds = managers.map((m) => m._id.toString());
      
      await notificationService.createNotification({
        type: "activity",
        title: "Yêu cầu đổi tiết cần phê duyệt",
        content: `Yêu cầu đổi tiết từ giáo viên ${
          lessonRequest.requestingTeacher.fullName ||
          lessonRequest.requestingTeacher.name
        } đã được giáo viên ${
          lessonRequest.replacementTeacher.fullName ||
          lessonRequest.replacementTeacher.name
        } chấp nhận. Vui lòng phê duyệt để hoàn tất yêu cầu.`,
        sender: replacementTeacherId,
        receiverScope: {
          type: "user",
          ids: managerIds,
        },
        relatedObject: { id: lessonRequest._id, requestType: "swap_request" },
      });

      console.log(`✅ Swap request approved by teacher, waiting for manager approval: ${lessonRequest.requestId}`);

      return {
        success: true,
        message: "Swap request approved by teacher, waiting for manager approval",
        request: lessonRequest,
      };
    } catch (error) {
      console.error("❌ Error approving swap request:", error.message);
      throw new Error(`Failed to approve swap request: ${error.message}`);
    }
  }

  // Duyệt yêu cầu đổi tiết bởi manager (giai đoạn 2)
  async approveSwapRequestByManager(requestId, managerId) {
    try {
      console.log(`✅ Approving swap request by manager: ${requestId}`);

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
        .populate("replacementTeacher", "name email fullName");

      if (!lessonRequest) {
        throw new Error("Swap request not found");
      }

      if (lessonRequest.requestType !== "swap") {
        throw new Error("Not a swap request");
      }

      if (!lessonRequest.teacherApproved) {
        throw new Error("Teacher has not approved this request yet");
      }

      if (lessonRequest.managerApproved) {
        throw new Error("Request has already been approved by manager");
      }

      if (lessonRequest.status !== "pending") {
        throw new Error("Request is no longer pending");
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
      lessonRequest.managerApproved = true;
      lessonRequest.status = "approved";
      lessonRequest.processedBy = managerId;
      await lessonRequest.save();

      // Xóa trường candidateTeachers khỏi document
      await LessonRequest.findByIdAndUpdate(lessonRequest._id, {
        $unset: { candidateTeachers: "" },
      });

      // ==== Gửi notification thay cho email ====
      // 1. Gửi notification cho giáo viên yêu cầu
      await notificationService.createNotification({
        type: "activity",
        title: "Yêu cầu đổi tiết đã được phê duyệt hoàn toàn",
        content: `Yêu cầu đổi tiết của bạn đã được quản lý phê duyệt. Yêu cầu đã hoàn tất.`,
        sender: managerId,
        receiverScope: {
          type: "user",
          ids: [lessonRequest.requestingTeacher._id.toString()],
        },
        relatedObject: { id: lessonRequest._id, requestType: "swap_request" },
      });

      // 2. Gửi notification cho replacement teacher
      await notificationService.createNotification({
        type: "activity",
        title: "Yêu cầu đổi tiết đã được phê duyệt hoàn toàn",
        content: `Yêu cầu đổi tiết đã được quản lý phê duyệt. Yêu cầu đã hoàn tất.`,
        sender: managerId,
        receiverScope: {
          type: "user",
          ids: [lessonRequest.replacementTeacher._id.toString()],
        },
        relatedObject: { id: lessonRequest._id, requestType: "swap_request" },
      });

      // 3. Gửi notification cho học sinh lớp đó
      const students = await User.find({
        role: "student",
        class_id: originalLesson.class._id,
      }).select("_id");
      if (students.length > 0) {
        await notificationService.createNotification({
          type: "activity",
          title: "Thông báo đổi tiết",
          content: `Lịch học lớp ${originalLesson.class.className} đã được đổi tiết theo yêu cầu. Vui lòng kiểm tra lại lịch học mới.`,
          sender: managerId,
          receiverScope: {
            type: "user",
            ids: students.map((s) => s._id.toString()),
          },
          relatedObject: { id: lessonRequest._id, requestType: "swap_request" },
        });
      }

      // Gửi notification cho phụ huynh
      await parentNotificationService.notifySwapApproved(
        lessonRequest.originalLesson._id,
        lessonRequest.replacementLesson._id,
        lessonRequest.requestingTeacher._id,
        lessonRequest.replacementTeacher._id
      );

      console.log(`✅ Swap request approved by manager successfully: ${lessonRequest.requestId}`);

      return {
        success: true,
        message: "Swap request approved by manager successfully",
        request: lessonRequest,
      };
    } catch (error) {
      console.error("❌ Error approving swap request by manager:", error.message);
      throw new Error(`Failed to approve swap request by manager: ${error.message}`);
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
        .populate("replacementTeacher", "name email fullName");

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
        lessonRequest.replacementTeacher._id.toString() !==
        replacementTeacherId.toString()
      ) {
        throw new Error(
          "Only the replacement teacher can reject this swap request"
        );
      }

      // Cập nhật trạng thái request
      lessonRequest.status = "rejected";
      lessonRequest.processedBy = replacementTeacherId;
      await lessonRequest.save();

      // Xóa trường candidateTeachers khỏi document
      await LessonRequest.findByIdAndUpdate(lessonRequest._id, {
        $unset: { candidateTeachers: "" },
      });

      // 1. Gửi notification cho giáo viên yêu cầu
      await notificationService.createNotification({
        type: "activity",
        title: "Yêu cầu đổi tiết bị từ chối",
        content: `Yêu cầu đổi tiết của bạn đã bị giáo viên ${
          lessonRequest.replacementTeacher.fullName ||
          lessonRequest.replacementTeacher.name
        } từ chối.`,
        sender: replacementTeacherId,
        receiverScope: {
          type: "user",
          ids: [lessonRequest.requestingTeacher._id.toString()],
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
        .populate("replacementTeacher", "name email fullName");

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
      await lessonRequest.save();

      // Xóa trường candidateTeachers khỏi document
      await LessonRequest.findByIdAndUpdate(lessonRequest._id, {
        $unset: { candidateTeachers: "" },
      });

      // ==== Gửi notification thay cho email ====
      // 1. Gửi notification cho giáo viên replacement
      await notificationService.createNotification({
        type: "activity",
        title: "Yêu cầu đổi tiết đã bị hủy",
        content: `Yêu cầu đổi tiết với giáo viên ${
          lessonRequest.replacementTeacher.fullName ||
          lessonRequest.replacementTeacher.name
        } đã bị hủy`,
        sender: requestingTeacherId,
        receiverScope: {
          type: "user",
          ids: [lessonRequest.replacementTeacher._id.toString()],
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
}

module.exports = new SwapRequestService();
