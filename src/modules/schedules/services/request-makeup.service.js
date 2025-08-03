const LessonRequest = require("../models/lesson-request.model");
const Lesson = require("../models/lesson.model");
const Class = require("../../classes/models/class.model");
const Subject = require("../../subjects/models/subject.model");
const User = require("../../auth/models/user.model");
const AcademicYear = require("../models/academic-year.model");
const TimeSlot = require("../models/time-slot.model");
const lessonReferenceSwapper = require("./lesson-reference-swapper.service");
const notificationService = require("../../notification/services/notification.service");

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

  // Tạo yêu cầu dạy bù
  async createMakeupRequest(data) {
    try {
      console.log(`🔄 Creating makeup request for teacher ${data.teacherId}`);

      // Kiểm tra originalLesson tồn tại và thuộc về giáo viên
      const originalLesson = await Lesson.findById(data.originalLessonId)
        .populate("class", "className gradeLevel")
        .populate("subject", "subjectName subjectCode")
        .populate("academicYear", "name startDate endDate")
        .populate("timeSlot", "period startTime endTime");

      // Kiểm tra replacementLesson tồn tại và là tiết trống
      const replacementLesson = await Lesson.findById(data.replacementLessonId)
        .populate("class", "className gradeLevel")
        .populate("timeSlot", "period startTime endTime");

      // Kiểm tra cùng tuần
      const originalWeek = this.getWeekRange(originalLesson.scheduledDate);
      const replacementWeek = this.getWeekRange(
        replacementLesson.scheduledDate
      );

      // Tạo lesson request với thông tin tuần tự động tính toán
      const lessonRequestData = {
        requestType: "makeup",
        requestingTeacher: data.teacherId,
        originalLesson: data.originalLessonId,
        replacementLesson: data.replacementLessonId,
        reason: data.reason,
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
        .populate("requestingTeacher", "name email fullName");

      // Gửi notification cho manager
      await notificationService.createNotification({
        type: "activity",
        title: `Yêu cầu dạy bù mới`,
        content: `Giáo viên ${
          populatedRequest.requestingTeacher.fullName ||
          populatedRequest.requestingTeacher.name
        } đã tạo yêu cầu dạy bù. Lý do: ${populatedRequest.reason}`,
        sender: data.teacherId,
        receiverScope: {
          type: "user",
          ids: (await User.find({ role: "manager" }, "_id")).map((u) => u._id),
        },
        relatedObject: {
          id: populatedRequest._id,
          requestType: "makeup_request",
        },
      });

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

  // Hàm generic để swap lesson fields cho makeup (chuyển từ tiết gốc sang tiết trống)
  async swapLessonFieldsForMakeup(
    originalLesson,
    replacementLesson,
    processedBy
  ) {
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

    // Lưu dữ liệu từ tiết gốc
    const originalData = {};
    lessonFields.forEach((field) => {
      originalData[field] = originalLesson[field];
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

    // Cập nhật replacement lesson thành lesson chính (chuyển từ tiết trống thành tiết makeup)
    lessonFields.forEach((field) => {
      replacementLesson[field] = originalData[field];
    });
    replacementLesson.lastModifiedBy = processedBy;

    // Cập nhật original lesson - nếu là absent thì chuyển thành scheduled
    originalLesson.teacher = undefined;
    originalLesson.subject = undefined;
    originalLesson.substituteTeacher = undefined;
    originalLesson.topic = undefined;
    originalLesson.description = undefined;
    originalLesson.type = "empty";

    // Nếu lesson gốc là absent, chuyển thành scheduled (để giáo viên dạy)
    if (originalLesson.status === "absent") {
      originalLesson.status = "scheduled";
      console.log(
        `✅ Original lesson ${originalLesson.lessonId} status changed from absent to scheduled`
      );
    } else {
      originalLesson.status = "scheduled";
    }

    originalLesson.lastModifiedBy = processedBy;

    // Lưu lessons mà không trigger pre-save hook để tránh tạo lại lessonId
    await originalLesson.save({ validateBeforeSave: false });
    await replacementLesson.save({ validateBeforeSave: false });

    console.log(
      `🔄 Swapped lessons: ${originalLesson.lessonId} ↔ ${replacementLesson.lessonId}`
    );
  }

  // Xử lý approval cho makeup request - hoán đổi như swap
  async processMakeupApproval(
    lessonRequest,
    originalLesson,
    replacementLesson,
    processedBy
  ) {
    // Sử dụng hàm generic để swap lesson fields
    await this.swapLessonFieldsForMakeup(
      originalLesson,
      replacementLesson,
      processedBy
    );
  }

  // Duyệt yêu cầu dạy bù
  async approveMakeupRequest(requestId, managerId) {
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
        .populate("requestingTeacher", "name email fullName");

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
        replacementLesson,
        managerId
      );

      // Cập nhật trạng thái request
      lessonRequest.status = "approved";
      lessonRequest.processedBy = managerId;

      await lessonRequest.save();

      // Xóa trường candidateTeachers khỏi document
      await LessonRequest.findByIdAndUpdate(lessonRequest._id, {
        $unset: { candidateTeachers: "" },
      });

      // Gửi notification cho giáo viên
      await notificationService.createNotification({
        type: "activity",
        title: `Yêu cầu dạy bù đã được duyệt`,
        content: `Yêu cầu dạy bù của bạn đã được duyệt.`,
        sender: managerId,
        receiverScope: {
          type: "user",
          ids: [lessonRequest.requestingTeacher._id],
        },
        relatedObject: { id: lessonRequest._id, requestType: "makeup_request" },
      });
      // Gửi notification cho học sinh trong lớp
      const classId = originalLesson.class;
      const students = await User.find(
        { role: "student", class_id: classId },
        "_id"
      );
      if (students.length > 0) {
        await notificationService.createNotification({
          type: "activity",
          title: `Thông báo dạy bù lớp`,
          content: `Lớp sẽ có tiết dạy bù vào ngày ${new Date(
            replacementLesson.scheduledDate
          ).toLocaleDateString("vi-VN")}.`,
          sender: managerId,
          receiverScope: { type: "user", ids: students.map((s) => s._id) },
          relatedObject: {
            id: lessonRequest._id,
            requestType: "makeup_request",
          },
        });
      }

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

  // Từ chối yêu cầu dạy bù
  async rejectMakeupRequest(requestId, managerId) {
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
        .populate("requestingTeacher", "name email fullName");

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

      await lessonRequest.save();

      // Xóa trường candidateTeachers khỏi document
      await LessonRequest.findByIdAndUpdate(lessonRequest._id, {
        $unset: { candidateTeachers: "" },
      });

      // Gửi notification cho giáo viên
      await notificationService.createNotification({
        type: "activity",
        title: `Yêu cầu dạy bù đã bị từ chối`,
        content: `Yêu cầu dạy bù của bạn đã bị từ chối.`,
        sender: managerId,
        receiverScope: {
          type: "user",
          ids: [lessonRequest.requestingTeacher._id],
        },
        relatedObject: { id: lessonRequest._id, requestType: "makeup_request" },
      });

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

  // Huỷ yêu cầu dạy bù (makeup) - chỉ giáo viên tạo request được huỷ
  async cancelMakeupRequest(requestId, teacherId) {
    try {
      const lessonRequest = await LessonRequest.findById(requestId).populate(
        "requestingTeacher",
        "_id name email fullName"
      );

      if (!lessonRequest) {
        throw new Error("Makeup request not found");
      }
      if (lessonRequest.requestType !== "makeup") {
        throw new Error("Not a makeup request");
      }
      if (lessonRequest.status !== "pending") {
        throw new Error("Only pending requests can be cancelled");
      }
      if (
        lessonRequest.requestingTeacher._id.toString() !== teacherId.toString()
      ) {
        throw new Error("Only the requesting teacher can cancel this request");
      }

      lessonRequest.status = "cancelled";
      await lessonRequest.save();

      // Xóa trường candidateTeachers khỏi document
      await LessonRequest.findByIdAndUpdate(lessonRequest._id, {
        $unset: { candidateTeachers: "" },
      });

      // Gửi notification cho manager về việc huỷ yêu cầu
      const managers = await User.find({ role: "manager" }, "_id");
      await notificationService.createNotification({
        type: "activity",
        title: `Yêu cầu dạy bù đã bị huỷ`,
        content: `Yêu cầu dạy bù đã bị huỷ bởi giáo viên.`,
        sender: teacherId,
        receiverScope: { type: "user", ids: managers.map((m) => m._id) },
        relatedObject: { id: lessonRequest._id, requestType: "makeup_request" },
      });

      return {
        success: true,
        message: "Makeup request cancelled successfully",
        request: lessonRequest,
      };
    } catch (error) {
      console.error("Error cancelling makeup request:", error);
      throw new Error(error.message || "Failed to cancel makeup request");
    }
  }

  // Xử lý khi giáo viên đánh giá tiết makeup completed
  async handleMakeupLessonCompleted(makeupLessonId) {
    try {
      console.log(`🎯 Handling makeup lesson completed: ${makeupLessonId}`);

      // Tìm makeup lesson
      const makeupLesson = await Lesson.findById(makeupLessonId);
      if (!makeupLesson) {
        return; // Không tìm thấy lesson
      }

      // Với logic hoán đổi mới, không cần tracking makeupInfo nữa
      // Lesson đã được hoán đổi trực tiếp
      console.log(
        `✅ Makeup lesson ${makeupLesson.lessonId} completed successfully`
      );
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
