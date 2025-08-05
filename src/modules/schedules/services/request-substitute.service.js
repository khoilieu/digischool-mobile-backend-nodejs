const mongoose = require("mongoose");
const LessonRequest = require("../models/lesson-request.model");
const Lesson = require("../models/lesson.model");
const Class = require("../../classes/models/class.model");
const Subject = require("../../subjects/models/subject.model");
const User = require("../../auth/models/user.model");
const AcademicYear = require("../models/academic-year.model");
const TimeSlot = require("../models/time-slot.model");
// const emailService = require("../../auth/services/email.service");
const notificationService = require("../../notification/services/notification.service");
const parentNotificationService = require("../../notification/services/parent-notification.service");

class SubstituteRequestService {
  // Create a new substitute request
  async createSubstituteRequest(
    lessonId,
    requestingTeacherId,
    candidateTeacherIds,
    reason
  ) {
    try {
      // Get lesson information
      const lesson = await Lesson.findById(lessonId)
        .populate("class", "className")
        .populate("subject", "subjectName")
        .populate("timeSlot", "period startTime endTime")
        .populate("teacher", "name email");

      // Get candidate teachers information
      const candidateTeachers = await User.find({
        _id: { $in: candidateTeacherIds },
        role: { $in: ["teacher"] },
      });

      // Create substitute request
      const lessonRequest = new LessonRequest({
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

      await lessonRequest.save();

      // ==== Tạo notification thay cho gửi email ====
      // Lấy danh sách manager
      const managers = await User.find({ role: { $in: ["manager", "admin"] } });
      const managerIds = managers.map((m) => m._id);
      // Gửi notification cho candidate teachers
      await notificationService.createNotification({
        type: "activity",
        title: "Yêu cầu dạy thay mới",
        content:
          `Bạn đã được đề xuất dạy thay cho tiết ${
            lesson.subject.subjectName
          } lớp ${lesson.class.className} vào ngày ${new Date(
            lesson.scheduledDate
          ).toLocaleDateString("vi-VN")} (Tiết ${lesson.timeSlot.period})` +
          (reason ? ` \n Lý do: ${reason}` : ""),
        sender: requestingTeacherId,
        receiverScope: {
          type: "user",
          ids: candidateTeacherIds.map((id) => id.toString()),
        },
        relatedObject: {
          id: lessonRequest._id,
          requestType: "substitute_request",
        },
      });
      // Gửi notification cho managers
      await notificationService.createNotification({
        type: "activity",
        title: "Thông báo yêu cầu dạy thay mới",
        content:
          `Có yêu cầu dạy thay mới từ giáo viên ${
            lesson.teacher.name
          } cho tiết ${lesson.subject.subjectName} lớp ${
            lesson.class.className
          } vào ngày ${new Date(lesson.scheduledDate).toLocaleDateString(
            "vi-VN"
          )} (Tiết ${lesson.timeSlot.period})` +
          (reason ? `\nLý do: ${reason}` : ""),
        sender: requestingTeacherId,
        receiverScope: {
          type: "user",
          ids: managerIds.map((id) => id.toString()),
        },
        relatedObject: {
          id: lessonRequest._id,
          requestType: "substitute_request",
        },
      });
      // ============================================

      // Không gửi email nữa
      // await this.sendRequestEmails(lessonRequest._id);

      return await this.getSubstituteRequestById(lessonRequest._id);
    } catch (error) {
      console.error("Error creating substitute request:", error);
      throw error;
    }
  }

  async getSubstituteRequestById(requestId) {
    const request = await LessonRequest.findById(requestId)
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
      .populate("candidateTeachers.teacher", "name email");

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
      .sort({ createdAt: -1 });
  }

  // Approve substitute request by teacher
  async approveRequest(requestId, teacherId) {
    try {
      const request = await this.getSubstituteRequestById(requestId);
      // Approve the request
      await request.approveByTeacher(teacherId);
      // Lưu người xử lý
      request.processedBy = teacherId;
      await request.save();
      // Update the lesson by replacing the original teacher with substitute teacher
      await Lesson.findByIdAndUpdate(request.lesson._id, {
        teacher: teacherId, // Thay thế giáo viên gốc
        substituteTeacher: request.lesson.teacher, // Lưu giáo viên gốc vào substituteTeacher để backup
      });

      // Gửi notification cho phụ huynh
      await parentNotificationService.notifySubstituteApproved(
        request.lesson._id,
        teacherId,
        request.lesson.teacher
      );
      // Cancel other pending requests from this teacher
      await this.cancelOtherTeacherRequests(teacherId, requestId);
      // ==== Gửi notification thay cho email ====
      // 1. Gửi notification cho giáo viên yêu cầu
      await notificationService.createNotification({
        type: "activity",
        title: "Yêu cầu dạy thay đã được chấp nhận",
        content: `Yêu cầu dạy thay cho tiết ${
          request.lesson.subject.subjectName
        } lớp ${request.lesson.class.className} vào ngày ${new Date(
          request.lesson.scheduledDate
        ).toLocaleDateString("vi-VN")} (Tiết ${
          request.lesson.timeSlot.period
        }) đã được giáo viên ${
          request.candidateTeachers.find(
            (c) => c.teacher._id.toString() === teacherId.toString()
          )?.teacher.name || ""
        } chấp nhận.`,
        sender: teacherId,
        receiverScope: {
          type: "user",
          ids: [request.requestingTeacher._id.toString()],
        },
        relatedObject: { id: request._id, requestType: "substitute_request" },
      });
      // 3. Gửi notification cho các candidate còn lại (trừ người đã nhận)
      const otherCandidates = request.candidateTeachers.filter(
        (c) =>
          c.teacher._id.toString() !== teacherId.toString() &&
          c.status !== "approved"
      );
      if (otherCandidates.length > 0) {
        await notificationService.createNotification({
          type: "activity",
          title: "Yêu cầu dạy thay đã được chấp nhận bởi giáo viên khác",
          content: `Yêu cầu dạy thay cho tiết ${
            request.lesson.subject.subjectName
          } lớp ${request.lesson.class.className} vào ngày ${new Date(
            request.lesson.scheduledDate
          ).toLocaleDateString("vi-VN")} (Tiết ${
            request.lesson.timeSlot.period
          }) đã được giáo viên khác chấp nhận.`,
          sender: teacherId,
          receiverScope: {
            type: "user",
            ids: otherCandidates.map((c) => c.teacher._id.toString()),
          },
          relatedObject: { id: request._id, requestType: "substitute_request" },
        });
      }
      // 4. Gửi notification cho học sinh lớp đó
      const ClassModel = require("../../classes/models/class.model");
      const classInfo = await ClassModel.findById(request.lesson.class._id);
      if (classInfo && typeof classInfo.getStudents === "function") {
        const students = await classInfo.getStudents();
        if (students && students.length > 0) {
          await notificationService.createNotification({
            type: "activity",
            title: "Thông báo thay đổi giáo viên dạy",
            content: `Tiết ${request.lesson.subject.subjectName} lớp ${
              request.lesson.class.className
            } vào ngày ${new Date(
              request.lesson.scheduledDate
            ).toLocaleDateString("vi-VN")} (Tiết ${
              request.lesson.timeSlot.period
            }) sẽ được giáo viên ${
              request.candidateTeachers.find(
                (c) => c.teacher._id.toString() === teacherId.toString()
              )?.teacher.name || ""
            } dạy thay cho giáo viên ${request.requestingTeacher.name}.`,
            sender: teacherId,
            receiverScope: {
              type: "user",
              ids: students.map((s) => s._id.toString()),
            },
            relatedObject: {
              id: request._id,
              requestType: "substitute_request",
            },
          });
        }
      }
      // ======================================
      return await this.getSubstituteRequestById(requestId);
    } catch (error) {
      console.error("Error approving substitute request:", error);
      throw error;
    }
  }

  // Reject substitute request by teacher
  async rejectRequest(requestId, teacherId) {
    try {
      const request = await this.getSubstituteRequestById(requestId);
      // Reject the request
      await request.rejectByTeacher(teacherId);
      // Lưu người xử lý
      request.processedBy = teacherId;
      await request.save();
      // ==== Gửi notification thay cho email ====
      await notificationService.createNotification({
        type: "activity",
        title: "Yêu cầu dạy thay bị từ chối",
        content: `Giáo viên ${
          request.candidateTeachers.find(
            (c) => c.teacher._id.toString() === teacherId.toString()
          )?.teacher.name || ""
        } đã từ chối dạy thay cho tiết ${
          request.lesson.subject.subjectName
        } lớp ${request.lesson.class.className} vào ngày ${new Date(
          request.lesson.scheduledDate
        ).toLocaleDateString("vi-VN")} (Tiết ${
          request.lesson.timeSlot.period
        }).`,
        sender: teacherId,
        receiverScope: {
          type: "user",
          ids: [request.requestingTeacher._id.toString()],
        },
        relatedObject: { id: request._id, requestType: "substitute_request" },
      });
      // ======================================
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
      await request.cancel();

      // ==== Gửi notification thay cho email ====
      // Gửi notification cho các candidate teachers
      const candidateTeacherIds = request.candidateTeachers.map((c) =>
        c.teacher._id.toString()
      );

      if (candidateTeacherIds.length > 0) {
        await notificationService.createNotification({
          type: "activity",
          title: "Yêu cầu dạy thay đã bị hủy",
          content: `Yêu cầu dạy thay cho tiết ${
            request.lesson.subject.subjectName
          } lớp ${request.lesson.class.className} vào ngày ${new Date(
            request.lesson.scheduledDate
          ).toLocaleDateString("vi-VN")} (Tiết ${
            request.lesson.timeSlot.period
          }) đã bị hủy bởi giáo viên yêu cầu.`,
          sender: teacherId,
          receiverScope: {
            type: "user",
            ids: candidateTeacherIds,
          },
          relatedObject: { id: request._id, requestType: "substitute_request" },
        });
      }

      // Gửi notification cho managers
      const managers = await User.find({ role: { $in: ["manager", "admin"] } });
      const managerIds = managers.map((m) => m._id);

      if (managerIds.length > 0) {
        await notificationService.createNotification({
          type: "activity",
          title: "Thông báo hủy yêu cầu dạy thay",
          content: `Yêu cầu dạy thay cho tiết ${
            request.lesson.subject.subjectName
          } lớp ${request.lesson.class.className} vào ngày ${new Date(
            request.lesson.scheduledDate
          ).toLocaleDateString("vi-VN")} (Tiết ${
            request.lesson.timeSlot.period
          }) đã bị hủy bởi giáo viên ${request.requestingTeacher.name}.`,
          sender: teacherId,
          receiverScope: {
            type: "user",
            ids: managerIds.map((id) => id.toString()),
          },
          relatedObject: { id: request._id, requestType: "substitute_request" },
        });
      }

      return await this.getSubstituteRequestById(requestId);
    } catch (error) {
      console.error("Error cancelling substitute request:", error);
      throw error;
    }
  }

  // Get available substitute teachers for a lesson
  async getAvailableTeachers(lessonId) {
    // Sử dụng static của LessonRequest để lấy danh sách giáo viên có sẵn
    const availableTeachers = await LessonRequest.findAvailableTeachers(
      lessonId
    );

    // Bổ sung thông tin pending requests cho các giáo viên available
    for (const teacher of availableTeachers) {
      const pendingRequests = await LessonRequest.find({
        requestType: "substitute",
        status: "pending",
        "candidateTeachers.teacher": teacher._id,
        "candidateTeachers.status": "pending",
      });

      teacher.pendingRequestsCount = pendingRequests.length;
      teacher.hasPendingRequests = pendingRequests.length > 0;
    }

    // Lấy thêm thông tin về những giáo viên không có sẵn để hiển thị lý do
    const Lesson = mongoose.model("Lesson");
    const User = mongoose.model("User");

    const lesson = await Lesson.findById(lessonId)
      .populate("subject", "subjectName")
      .populate("timeSlot", "period startTime endTime");

    if (!lesson) throw new Error("Lesson not found");

    // Lấy tất cả giáo viên có thể dạy môn học này
    const allTeachers = await User.find({
      role: { $in: ["teacher"] },
      $or: [{ subject: lesson.subject._id }, { subjects: lesson.subject._id }],
      _id: { $ne: lesson.teacher },
    }).select("name email subject subjects");

    // Tìm những giáo viên không có sẵn
    const unavailableTeachers = [];

    for (const teacher of allTeachers) {
      // Kiểm tra xung đột thời gian
      const conflictLesson = await Lesson.findOne({
        teacher: teacher._id,
        scheduledDate: lesson.scheduledDate,
        timeSlot: lesson.timeSlot._id,
        status: { $nin: ["cancelled", "absent"] },
      })
        .populate("class", "className")
        .populate("subject", "subjectName");

      // Kiểm tra pending substitute requests
      const pendingRequests = await LessonRequest.find({
        requestType: "substitute",
        status: "pending",
        "candidateTeachers.teacher": teacher._id,
        "candidateTeachers.status": "pending",
      });

      // Nếu giáo viên không có trong danh sách available, thêm vào unavailable
      const isAvailable = availableTeachers.some(
        (available) => available._id.toString() === teacher._id.toString()
      );

      // Chỉ loại bỏ giáo viên khi có xung đột thời gian thực sự
      if (conflictLesson) {
        const reasons = [];
        reasons.push(
          `Xung đột thời gian với tiết ${conflictLesson.class.className} - ${conflictLesson.subject.subjectName}`
        );

        unavailableTeachers.push({
          ...teacher.toObject(),
          reasons: reasons,
          hasConflict: true,
          hasPendingRequests: pendingRequests.length > 0,
        });
      }
    }

    return {
      availableTeachers,
      unavailableTeachers,
      totalChecked: allTeachers.length,
      lessonInfo: {
        subjectName: lesson.subject.subjectName,
        scheduledDate: lesson.scheduledDate,
        timeSlot: lesson.timeSlot,
      },
    };
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

          // Gửi notification cho requesting teacher khi tự động hủy
          await notificationService.createNotification({
            type: "activity",
            title: "Yêu cầu dạy thay đã bị hủy tự động",
            content: `Yêu cầu dạy thay của bạn đã bị hủy tự động vì không còn giáo viên nào có thể dạy thay.`,
            sender: teacherId,
            receiverScope: {
              type: "user",
              ids: [request.requestingTeacher.toString()],
            },
            relatedObject: {
              id: request._id,
              requestType: "substitute_request",
            },
          });
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

module.exports = new SubstituteRequestService();
