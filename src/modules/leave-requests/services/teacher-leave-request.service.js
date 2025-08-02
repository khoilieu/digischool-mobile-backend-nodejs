const TeacherLeaveRequest = require("../models/teacher-leave-request.model");
const Lesson = require("../../schedules/models/lesson.model");
const Class = require("../../classes/models/class.model");
const Subject = require("../../subjects/models/subject.model");
const User = require("../../auth/models/user.model");
const mongoose = require("mongoose");
const notificationService = require("../../notification/services/notification.service");

class TeacherLeaveRequestService {
  // Tạo đơn xin nghỉ cho nhiều tiết học của giáo viên
  async createMultipleTeacherLeaveRequests(data, teacherId) {
    try {
      const { lessonIds, reason } = data;

      if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
        throw new Error("Lesson IDs are required and must be an array");
      }

      if (!reason) {
        throw new Error("Reason is required");
      }

      console.log(
        `📝 Teacher ${teacherId} creating leave requests for ${lessonIds.length} lessons`
      );

      // Validate teacher exists
      const teacher = await User.findById(teacherId);
      if (!teacher || !teacher.role.includes("teacher")) {
        throw new Error("Teacher not found");
      }

      console.log(
        `👨‍🏫 Teacher ${teacher.name} requesting leave for ${lessonIds.length} lessons`
      );

      const results = [];
      const errors = [];

      // Process each lesson
      for (const lessonId of lessonIds) {
        try {
          // Get lesson details
          const lesson = await Lesson.findById(lessonId)
            .populate("class", "className")
            .populate("subject", "subjectName subjectCode")
            .populate("teacher", "name email")
            .populate("timeSlot", "period startTime endTime");

          if (!lesson) {
            errors.push(`Lesson ${lessonId} not found`);
            continue;
          }

          // CRITICAL VALIDATION: Teacher can only request leave for their own lessons
          if (lesson.teacher._id.toString() !== teacherId.toString()) {
            errors.push(
              `Access denied: You can only request leave for lessons you are teaching. Lesson ${lessonId} is taught by ${lesson.teacher.name}`
            );
            console.log(
              `🚫 SECURITY: Teacher ${teacher.name} tried to request leave for lesson taught by ${lesson.teacher.name}`
            );
            continue;
          }

          console.log(
            `✅ Validation passed: Teacher ${teacher.name} requesting leave for ${lesson.subject.subjectName} in class ${lesson.class.className}`
          );

          // Check if lesson status is 'scheduled' (only scheduled lessons can be requested for leave)
          if (lesson.status !== "scheduled") {
            errors.push(
              `Cannot request leave for lesson with status '${
                lesson.status
              }': ${lesson.subject.subjectName} on ${new Date(
                lesson.scheduledDate
              ).toLocaleDateString()}. Only scheduled lessons can be requested for leave.`
            );
            continue;
          }

          // Check if leave request already exists for this lesson (only pending and approved are considered existing)
          const existingRequest = await TeacherLeaveRequest.findOne({
            teacherId,
            lessonId: lesson._id,
            status: { $in: ["pending", "approved"] }, // Only pending and approved requests block new requests
          });

          if (existingRequest) {
            errors.push(
              `Leave request already exists for ${
                lesson.subject.subjectName
              } on ${new Date(lesson.scheduledDate).toLocaleDateString()}`
            );
            continue;
          }

          // Get period from timeSlot (populated) or lesson directly
          const period = lesson.timeSlot?.period || lesson.period || 1;

          // Create teacher leave request
          const teacherLeaveRequest = new TeacherLeaveRequest({
            teacherId,
            lessonId: lesson._id,
            classId: lesson.class._id,
            subjectId: lesson.subject._id,
            date: lesson.scheduledDate,
            period: period,
            reason: reason.trim(),
          });

          await teacherLeaveRequest.save();

          // Populate for response
          await teacherLeaveRequest.populate([
            { path: "teacherId", select: "name email fullName" },
            { path: "lessonId", select: "lessonId type topic scheduledDate" },
            { path: "subjectId", select: "subjectName subjectCode" },
            { path: "classId", select: "className" },
          ]);

          results.push(teacherLeaveRequest);

          console.log(
            `✅ Created teacher leave request for ${lesson.subject.subjectName} - Period ${period}`
          );

          // Gửi notification cho manager (role: manager hoặc admin)
          const managers = await User.find(
            { role: { $in: ["manager", "admin"] } },
            "_id"
          );
          await notificationService.createNotification({
            type: "activity",
            title: `Đơn xin nghỉ mới từ giáo viên - ${teacher.name}`,
            content: `Giáo viên ${teacher.name} xin nghỉ tiết ${
              lesson.subject.subjectName
            } lớp ${lesson.class.className} ngày ${new Date(
              lesson.scheduledDate
            ).toLocaleDateString("vi-VN")}. Lý do: ${reason}`,
            sender: teacherId,
            receiverScope: { type: "user", ids: managers.map((m) => m._id) },
            relatedObject: {
              id: teacherLeaveRequest._id,
              requestType: "teacher_leave_request",
            },
          });
        } catch (lessonError) {
          console.error(
            `❌ Error processing lesson ${lessonId}:`,
            lessonError.message
          );
          errors.push(
            `Error processing lesson ${lessonId}: ${lessonError.message}`
          );
        }
      }

      console.log(
        `📊 Teacher leave request creation summary: ${results.length} created, ${errors.length} errors`
      );

      return {
        success: results.length > 0,
        created: results,
        errors: errors,
        summary: {
          totalRequested: lessonIds.length,
          created: results.length,
          failed: errors.length,
        },
      };
    } catch (error) {
      console.error(
        "❌ Error in createMultipleTeacherLeaveRequests:",
        error.message
      );
      throw new Error(
        `Failed to create teacher leave requests: ${error.message}`
      );
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

      const requests = await TeacherLeaveRequest.findByTeacher(
        teacherId,
        options
      )
        .skip(skip)
        .limit(limit);

      const total = await TeacherLeaveRequest.countDocuments({
        teacherId,
        ...(status && { status }),
        ...(startDate && { date: { $gte: new Date(startDate) } }),
        ...(endDate && { date: { $lte: new Date(endDate) } }),
      });

      // Group by status for summary
      const statusSummary = await TeacherLeaveRequest.aggregate([
        { $match: { teacherId: new mongoose.Types.ObjectId(teacherId) } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const summary = statusSummary.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        { pending: 0, approved: 0, rejected: 0, cancelled: 0 }
      );

      return {
        requests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary,
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

      const requests = await TeacherLeaveRequest.findPendingByManager(options)
        .skip(skip)
        .limit(limit);

      const total = await TeacherLeaveRequest.countDocuments({
        status: "pending",
        ...(startDate && { date: { $gte: new Date(startDate) } }),
        ...(endDate && { date: { $lte: new Date(endDate) } }),
      });

      return {
        requests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get pending teacher leave requests: ${error.message}`
      );
    }
  }

  // Duyệt đơn xin nghỉ của giáo viên (chỉ manager)
  async approveTeacherLeaveRequest(requestId, managerId) {
    try {
      const request = await TeacherLeaveRequest.findById(requestId)
        .populate("teacherId", "name email fullName")
        .populate("lessonId", "lessonId topic scheduledDate")
        .populate("subjectId", "subjectName")
        .populate("classId", "className");

      if (!request) {
        const error = new Error("Teacher leave request not found");
        error.statusCode = 404;
        throw error;
      }

      // Check if request has already been processed
      if (request.status !== "pending") {
        const error = new Error(`Request has already been ${request.status}`);
        error.statusCode = 400;
        throw error;
      }

      // Update request
      await request.approve(managerId);

      console.log(
        `✅ Teacher leave request approved by manager ${managerId} for teacher ${request.teacherId.name}`
      );

      // Gửi notification cho giáo viên
      await notificationService.createNotification({
        type: "activity",
        title: `Đơn xin nghỉ đã được duyệt - ${request.subjectId.subjectName}`,
        content: `Đơn xin nghỉ của bạn cho tiết ${
          request.subjectId.subjectName
        } lớp ${request.classId.className} ngày ${new Date(
          request.lessonId.scheduledDate
        ).toLocaleDateString("vi-VN")} đã được duyệt.`,
        sender: managerId,
        receiverScope: { type: "user", ids: [request.teacherId._id] },
        relatedObject: {
          id: request._id,
          requestType: "teacher_leave_request",
        },
      });

      // Cập nhật lesson status thành absent
      try {
        await Lesson.findByIdAndUpdate(request.lessonId._id, {
          status: "absent",
          updatedAt: new Date(),
        });

        console.log(
          `📝 Lesson ${request.lessonId.lessonId} status updated to absent`
        );
      } catch (lessonError) {
        console.error(
          "❌ Failed to update lesson status:",
          lessonError.message
        );
      }

      return {
        success: true,
        message: "Teacher leave request approved successfully",
        request,
      };
    } catch (error) {
      console.error("❌ Error approving teacher leave request:", error.message);

      if (error.statusCode) {
        const customError = new Error(error.message);
        customError.statusCode = error.statusCode;
        throw customError;
      }

      throw new Error(
        `Failed to approve teacher leave request: ${error.message}`
      );
    }
  }

  // Từ chối đơn xin nghỉ của giáo viên (chỉ manager)
  async rejectTeacherLeaveRequest(requestId, managerId) {
    try {
      const request = await TeacherLeaveRequest.findById(requestId)
        .populate("teacherId", "name email fullName")
        .populate("lessonId", "lessonId topic scheduledDate")
        .populate("subjectId", "subjectName")
        .populate("classId", "className");

      if (!request) {
        const error = new Error("Teacher leave request not found");
        error.statusCode = 404;
        throw error;
      }

      // Check if request has already been processed
      if (request.status !== "pending") {
        const error = new Error(`Request has already been ${request.status}`);
        error.statusCode = 400;
        throw error;
      }

      // Update request
      await request.reject(managerId);

      console.log(
        `❌ Teacher leave request rejected by manager ${managerId} for teacher ${request.teacherId.name}`
      );

      // Gửi notification cho giáo viên
      await notificationService.createNotification({
        type: "activity",
        title: `Đơn xin nghỉ đã bị từ chối - ${request.subjectId.subjectName}`,
        content: `Đơn xin nghỉ của bạn cho tiết ${
          request.subjectId.subjectName
        } lớp ${request.classId.className} ngày ${new Date(
          request.lessonId.scheduledDate
        ).toLocaleDateString("vi-VN")} đã bị từ chối.`,
        sender: managerId,
        receiverScope: { type: "user", ids: [request.teacherId._id] },
        relatedObject: {
          id: request._id,
          requestType: "teacher_leave_request",
        },
      });

      return {
        success: true,
        message: "Teacher leave request rejected successfully",
        request,
      };
    } catch (error) {
      console.error("❌ Error rejecting teacher leave request:", error.message);

      if (error.statusCode) {
        const customError = new Error(error.message);
        customError.statusCode = error.statusCode;
        throw customError;
      }

      throw new Error(
        `Failed to reject teacher leave request: ${error.message}`
      );
    }
  }

  // Hủy đơn xin nghỉ (chỉ khi pending và là của teacher đó)
  async cancelTeacherLeaveRequest(requestId, teacherId) {
    try {
      const request = await TeacherLeaveRequest.findById(requestId);

      if (!request) {
        const error = new Error("Teacher leave request not found");
        error.statusCode = 404;
        throw error;
      }

      // Check if teacher owns this request
      if (request.teacherId.toString() !== teacherId.toString()) {
        const error = new Error("You can only cancel your own leave requests");
        error.statusCode = 403;
        throw error;
      }

      // Check if request is still pending
      if (request.status !== "pending") {
        const error = new Error(`Cannot cancel ${request.status} request`);
        error.statusCode = 400;
        throw error;
      }

      // Use the cancel method instead of deleting
      await request.cancel(teacherId);

      console.log(`🗑️ Teacher leave request cancelled by teacher ${teacherId}`);

      return {
        success: true,
        message: "Teacher leave request cancelled successfully",
      };
    } catch (error) {
      console.error("❌ Error cancelling teacher leave request:", error.message);

      if (error.statusCode) {
        const customError = new Error(error.message);
        customError.statusCode = error.statusCode;
        throw customError;
      }

      throw new Error(
        `Failed to cancel teacher leave request: ${error.message}`
      );
    }
  }

  // Lấy lessons mà giáo viên có thể xin nghỉ
  async getAvailableLessonsForTeacher(teacherId, startDate, endDate) {
    try {
      const teacher = await User.findById(teacherId);
      if (!teacher || !teacher.role.includes("teacher")) {
        throw new Error("Teacher not found");
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
          $lte: end,
        },
        status: "scheduled", // Only scheduled lessons can be requested for leave
      })
        .populate("subject", "subjectName subjectCode")
        .populate("class", "className")
        .populate("timeSlot", "period startTime endTime")
        .sort({ scheduledDate: 1, "timeSlot.period": 1 });

      // Filter out lessons that already have leave requests (only pending and approved block new requests)
      const lessonsWithRequests = await TeacherLeaveRequest.find({
        teacherId,
        lessonId: { $in: lessons.map((l) => l._id) },
        status: { $in: ["pending", "approved"] }, // Only pending and approved requests block new requests
      }).select("lessonId");

      const requestedLessonIds = lessonsWithRequests.map((r) =>
        r.lessonId.toString()
      );
      const availableLessons = lessons.filter(
        (lesson) => !requestedLessonIds.includes(lesson._id.toString())
      );

      console.log(
        `📊 Found ${availableLessons.length} available lessons out of ${lessons.length} total lessons`
      );

      return {
        lessons: availableLessons,
        summary: {
          total: lessons.length,
          available: availableLessons.length,
          alreadyRequested: lessons.length - availableLessons.length,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get available lessons for teacher: ${error.message}`
      );
    }
  }

  // Lấy chi tiết đơn xin nghỉ của giáo viên
  async getTeacherLeaveRequestDetail(requestId, userId, userRole) {
    try {
      const request = await TeacherLeaveRequest.findById(requestId)
        .populate("teacherId", "name email fullName")
        .populate("lessonId", "lessonId type topic scheduledDate")
        .populate("subjectId", "subjectName subjectCode")
        .populate("classId", "className")
        .populate("managerId", "name email fullName");

      if (!request) {
        return null;
      }

      // Check authorization
      const canView = this.canUserViewTeacherRequest(request, userId, userRole);
      if (!canView.allowed) {
        return null;
      }

      return request;
    } catch (error) {
      console.error(
        "❌ Error getting teacher leave request detail:",
        error.message
      );
      throw error;
    }
  }

  // Kiểm tra quyền xem đơn xin nghỉ của giáo viên
  canUserViewTeacherRequest(request, userId, userRole) {
    // Admin/Manager can view all
    if (userRole.includes("admin") || userRole.includes("manager")) {
      return { allowed: true, reason: "Admin/Manager access" };
    }

    // Teacher can view their own requests
    if (
      userRole.includes("teacher") &&
      request.teacherId._id.toString() === userId.toString()
    ) {
      return { allowed: true, reason: "Teacher owns this request" };
    }

    return { allowed: false, reason: "Access denied" };
  }
}

module.exports = new TeacherLeaveRequestService();
