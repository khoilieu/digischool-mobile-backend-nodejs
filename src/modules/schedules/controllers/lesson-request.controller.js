const lessonRequestService = require("../services/lesson-request.service");
const { validationResult } = require("express-validator");

class LessonRequestController {
  // Lấy các tiết học của giáo viên để tạo request (swap/makeup)
  async getTeacherLessonsForRequest(req, res) {
    try {
      const {
        teacherId,
        academicYear,
        startOfWeek,
        endOfWeek,
        requestType = "swap",
      } = req.query;

      // Validate required parameters
      if (!teacherId || !academicYear || !startOfWeek || !endOfWeek) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required parameters: teacherId, academicYear, startOfWeek, endOfWeek",
        });
      }

      // Validate requestType
      if (!["swap", "makeup"].includes(requestType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid requestType. Must be swap or makeup",
        });
      }

      // Validate teacher authorization (teacher can only see their own lessons)
      if (req.user.role === "teacher" && req.user.id !== teacherId) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own lessons",
        });
      }

      const result = await lessonRequestService.getTeacherLessonsForWeek(
        teacherId,
        academicYear,
        startOfWeek,
        endOfWeek,
        requestType
      );

      res.json(result);
    } catch (error) {
      console.error("❌ Error in getTeacherLessonsForRequest:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy các tiết trống có thể dùng cho request
  async getAvailableLessonsForRequest(req, res) {
    try {
      const { classId, academicYear, startOfWeek, endOfWeek, subjectId } =
        req.query;

      // Validate required parameters
      if (
        !classId ||
        !academicYear ||
        !startOfWeek ||
        !endOfWeek ||
        !subjectId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required parameters: classId, academicYear, startOfWeek, endOfWeek, subjectId",
        });
      }

      const result = await lessonRequestService.getAvailableLessonsForRequest(
        classId,
        academicYear,
        startOfWeek,
        endOfWeek,
        subjectId
      );

      res.json(result);
    } catch (error) {
      console.error(
        "❌ Error in getAvailableLessonsForRequest:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Tạo yêu cầu đổi tiết hoặc dạy bù
  async createLessonRequest(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        originalLessonId,
        replacementLessonId,
        reason,
        requestType,
        absentReason,
      } = req.body;

      const requestData = {
        teacherId: req.user.id,
        originalLessonId,
        replacementLessonId,
        reason,
        requestType,
        absentReason, // Chỉ dùng cho makeup request
      };

      const result = await lessonRequestService.createLessonRequest(
        requestData
      );

      res.status(201).json(result);
    } catch (error) {
      console.error("❌ Error in createLessonRequest:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy danh sách yêu cầu của giáo viên
  async getTeacherRequests(req, res) {
    try {
      const teacherId =
        req.user.role === "teacher" ? req.user.id : req.query.teacherId;

      if (!teacherId) {
        return res.status(400).json({
          success: false,
          message: "Teacher ID is required",
        });
      }

      // Validate teacher authorization
      if (req.user.role === "teacher" && req.user.id !== teacherId) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own requests",
        });
      }

      const options = {};
      if (req.query.status) options.status = req.query.status;
      if (req.query.requestType) options.requestType = req.query.requestType;
      if (req.query.startDate)
        options.startDate = new Date(req.query.startDate);
      if (req.query.endDate) options.endDate = new Date(req.query.endDate);

      // Use static method from model
      const LessonRequest = require("../models/lesson-request.model");
      const requests = await LessonRequest.findByTeacher(teacherId, options);

      res.json({
        success: true,
        requests: requests,
        count: requests.length,
      });
    } catch (error) {
      console.error("❌ Error in getTeacherRequests:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy danh sách yêu cầu đang chờ duyệt (cho manager)
  async getPendingRequests(req, res) {
    try {
      const options = {};
      if (req.query.academicYear) options.academicYear = req.query.academicYear;
      if (req.query.classId) options.classId = req.query.classId;
      if (req.query.requestType) options.requestType = req.query.requestType;

      // Use static method from model
      const LessonRequest = require("../models/lesson-request.model");
      const pendingRequests = await LessonRequest.findPendingRequests(options);

      res.json({
        success: true,
        pendingRequests: pendingRequests,
        count: pendingRequests.length,
      });
    } catch (error) {
      console.error("❌ Error in getPendingRequests:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Duyệt yêu cầu
  async approveRequest(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { requestId } = req.params;
      const { comment = "" } = req.body;

      const result = await lessonRequestService.approveRequest(
        requestId,
        req.user.id,
        comment
      );

      res.json(result);
    } catch (error) {
      console.error("❌ Error in approveRequest:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Từ chối yêu cầu
  async rejectRequest(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { requestId } = req.params;
      const { comment = "" } = req.body;

      const result = await lessonRequestService.rejectRequest(
        requestId,
        req.user.id,
        comment
      );

      res.json(result);
    } catch (error) {
      console.error("❌ Error in rejectRequest:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy chi tiết yêu cầu
  async getRequestDetails(req, res) {
    try {
      const { requestId } = req.params;

      const LessonRequest = require("../models/lesson-request.model");
      const request = await LessonRequest.findById(requestId)
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
        .populate("processedBy", "name email fullName")
        .populate("additionalInfo.classInfo", "className gradeLevel")
        .populate("additionalInfo.subjectInfo", "subjectName subjectCode")
        .populate("additionalInfo.academicYear", "name startDate endDate")
        .populate(
          "makeupInfo.createdMakeupLesson",
          "lessonId scheduledDate timeSlot status"
        );

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Request not found",
        });
      }

      // Check authorization
      if (
        req.user.role === "teacher" &&
        req.user.id !== request.requestingTeacher._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own requests",
        });
      }

      res.json({
        success: true,
        request: request,
      });
    } catch (error) {
      console.error("❌ Error in getRequestDetails:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Đảm bảo các hàm controller substitute đều gọi đúng service đã chuẩn hóa (LessonRequest)
  async createRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { lessonId, candidateTeachers, reason } = req.body;
      const requestingTeacherId = req.user._id;

      const request = await lessonRequestService.createSubstituteRequest(
        lessonId,
        requestingTeacherId,
        candidateTeachers,
        reason
      );

      res.status(201).json({
        success: true,
        message: "Substitute request created successfully",
        data: request,
      });
    } catch (error) {
      console.error("Error in createRequest:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create substitute request",
      });
    }
  }

  async getAvailableTeachers(req, res) {
    try {
      const { lessonId } = req.params;

      const teachers = await lessonRequestService.getAvailableTeachers(
        lessonId
      );

      res.json({
        success: true,
        message: "Available teachers retrieved successfully",
        data: teachers,
      });
    } catch (error) {
      console.error("Error in getAvailableTeachers:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to get available teachers",
      });
    }
  }

  async getTeacherRequests(req, res) {
    try {
      const teacherId = req.user._id;
      const { status } = req.query;

      const requests = await lessonRequestService.getTeacherRequests(
        teacherId,
        status
      );

      res.json({
        success: true,
        message: "Teacher requests retrieved successfully",
        data: requests,
      });
    } catch (error) {
      console.error("Error in getTeacherRequests:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get teacher requests",
      });
    }
  }

  async getRequestById(req, res) {
    try {
      const { requestId } = req.params;

      const request = await lessonRequestService.getSubstituteRequestById(
        requestId
      );

      // Check if user has permission to view this request
      const userId = req.user._id.toString();
      const hasPermission =
        request.requestingTeacher._id.toString() === userId ||
        request.candidateTeachers.some(
          (c) => c.teacher._id.toString() === userId
        ) ||
        req.user.role.includes("manager") ||
        req.user.role.includes("admin");

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      res.json({
        success: true,
        message: "Request retrieved successfully",
        data: request,
      });
    } catch (error) {
      console.error("Error in getRequestById:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to get request",
      });
    }
  }

  async approveRequest(req, res) {
    try {
      const { requestId } = req.params;
      const teacherId = req.user._id;

      const request = await lessonRequestService.approveRequest(
        requestId,
        teacherId
      );

      res.json({
        success: true,
        message: "Request approved successfully",
        data: request,
      });
    } catch (error) {
      console.error("Error in approveRequest:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to approve request",
      });
    }
  }

  async rejectRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { requestId } = req.params;
      const { reason } = req.body;
      const teacherId = req.user._id;

      const request = await lessonRequestService.rejectRequest(
        requestId,
        teacherId,
        reason
      );

      res.json({
        success: true,
        message: "Request rejected successfully",
        data: request,
      });
    } catch (error) {
      console.error("Error in rejectRequest:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to reject request",
      });
    }
  }

  async cancelRequest(req, res) {
    try {
      const { requestId } = req.params;
      const teacherId = req.user._id;

      const request = await lessonRequestService.cancelRequest(
        requestId,
        teacherId
      );

      res.json({
        success: true,
        message: "Request cancelled successfully",
        data: request,
      });
    } catch (error) {
      console.error("Error in cancelRequest:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to cancel request",
      });
    }
  }

  async getAllRequests(req, res) {
    try {
      // Check if user is admin or manager
      if (
        !req.user.role.includes("manager") &&
        !req.user.role.includes("admin")
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin or manager role required.",
        });
      }

      const { status, page = 1, limit = 20 } = req.query;

      const result = await lessonRequestService.getAllRequests(
        status,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        message: "All requests retrieved successfully",
        data: result.requests,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Error in getAllRequests:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get all requests",
      });
    }
  }

  async getRequestStats(req, res) {
    try {
      // Check if user is admin or manager
      if (
        !req.user.role.includes("manager") &&
        !req.user.role.includes("admin")
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin or manager role required.",
        });
      }
      const LessonRequest = require("../models/lesson-request.model");
      const stats = await Promise.all([
        LessonRequest.countDocuments({
          requestType: "substitute",
          status: "pending",
        }),
        LessonRequest.countDocuments({
          requestType: "substitute",
          status: "approved",
        }),
        LessonRequest.countDocuments({
          requestType: "substitute",
          status: "rejected",
        }),
        LessonRequest.countDocuments({
          requestType: "substitute",
          status: "cancelled",
        }),
        LessonRequest.countDocuments({
          requestType: "substitute",
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        }),
      ]);
      const [pending, approved, rejected, cancelled, lastMonth] = stats;
      res.json({
        success: true,
        message: "Request statistics retrieved successfully",
        data: {
          pending,
          approved,
          rejected,
          cancelled,
          total: pending + approved + rejected + cancelled,
          lastMonth,
        },
      });
    } catch (error) {
      console.error("Error in getRequestStats:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get request statistics",
      });
    }
  }
}

module.exports = new LessonRequestController();
