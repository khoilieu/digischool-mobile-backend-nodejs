const swapRequestService = require("../services/request-swap.service");
const makeupRequestService = require("../services/request-makeup.service");
const substituteRequestService = require("../services/request-substitute.service");
const { validationResult } = require("express-validator");

class LessonRequestController {
  // ================================ SWAP CONTROLLERS (ĐỔI TIẾT) ================================

  // Lấy các tiết học của giáo viên để đổi tiết
  async getTeacherLessonsForSwap(req, res) {
    try {
      const { teacherId, academicYear, startOfWeek, endOfWeek } = req.query;

      // Validate required parameters
      if (!teacherId || !academicYear || !startOfWeek || !endOfWeek) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required parameters: teacherId, academicYear, startOfWeek, endOfWeek",
        });
      }

      const result = await swapRequestService.getTeacherLessonsForSwap(
        teacherId,
        academicYear,
        startOfWeek,
        endOfWeek
      );

      res.status(200).json(result);
    } catch (error) {
      console.error("Error in getTeacherLessonsForSwap:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy các tiết có giáo viên dạy để đổi tiết
  async getAvailableLessonsForSwap(req, res) {
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

      const result = await swapRequestService.getAvailableLessonsForSwap(
        classId,
        academicYear,
        startOfWeek,
        endOfWeek,
        subjectId
      );

      res.status(200).json(result);
    } catch (error) {
      console.error("Error in getAvailableLessonsForSwap:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Tạo yêu cầu đổi tiết
  async createSwapRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const data = {
        teacherId: req.user.id,
        originalLessonId: req.body.originalLessonId,
        replacementLessonId: req.body.replacementLessonId,
        reason: req.body.reason,
      };

      const result = await swapRequestService.createSwapRequest(data);

      res.status(201).json(result);
    } catch (error) {
      console.error("Error in createSwapRequest:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ================================ MAKEUP CONTROLLERS (DẠY BÙ) ================================

  // Lấy các tiết absent của giáo viên để dạy bù
  async getTeacherLessonsForMakeup(req, res) {
    try {
      const { teacherId, academicYear, startOfWeek, endOfWeek } = req.query;

      // Validate required parameters
      if (!teacherId || !academicYear || !startOfWeek || !endOfWeek) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required parameters: teacherId, academicYear, startOfWeek, endOfWeek",
        });
      }

      const result = await makeupRequestService.getTeacherLessonsForMakeup(
        teacherId,
        academicYear,
        startOfWeek,
        endOfWeek
      );

      res.status(200).json(result);
    } catch (error) {
      console.error("Error in getTeacherLessonsForMakeup:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy các tiết trống để dạy bù
  async getAvailableLessonsForMakeup(req, res) {
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

      const result = await makeupRequestService.getAvailableLessonsForMakeup(
        classId,
        academicYear,
        startOfWeek,
        endOfWeek,
        subjectId
      );

      res.status(200).json(result);
    } catch (error) {
      console.error("Error in getAvailableLessonsForMakeup:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Tạo yêu cầu dạy bù
  async createMakeupRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const data = {
        teacherId: req.user.id,
        originalLessonId: req.body.originalLessonId,
        replacementLessonId: req.body.replacementLessonId,
        reason: req.body.reason,
      };

      const result = await makeupRequestService.createMakeupRequest(data);

      res.status(201).json(result);
    } catch (error) {
      console.error("Error in createMakeupRequest:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ================================ SUBSTITUTE CONTROLLERS (DẠY THAY) ================================

  // Tạo yêu cầu dạy thay
  async createSubstituteRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { lessonId, candidateTeacherIds, reason } = req.body;

      const result = await substituteRequestService.createSubstituteRequest(
        lessonId,
        req.user.id,
        candidateTeacherIds,
        reason
      );

      res.status(201).json({
        success: true,
        message: "Substitute request created successfully",
        request: result,
      });
    } catch (error) {
      console.error("Error in createSubstituteRequest:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy danh sách giáo viên dạy thay có sẵn
  async getAvailableTeachersForSubstitute(req, res) {
    try {
      const { lessonId } = req.params;

      const result = await substituteRequestService.getAvailableTeachers(
        lessonId
      );

      res.status(200).json({
        success: true,
        availableTeachers: result,
      });
    } catch (error) {
      console.error("Error in getAvailableTeachersForSubstitute:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ================================ COMMON CONTROLLERS ================================

  // Lấy danh sách yêu cầu của giáo viên (tất cả loại)
  async getTeacherRequests(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const teacherId = req.user.id;

      // Lấy substitute requests
      const substituteRequests =
        await substituteRequestService.getTeacherRequests(teacherId, status);

      // Lấy swap requests
      const swapRequests = await swapRequestService.getTeacherSwapRequests(
        teacherId,
        status
      );

      // Lấy makeup requests (chỉ requesting teacher)
      const LessonRequest = require("../models/lesson-request.model");
      const makeupQuery = {
        requestingTeacher: teacherId,
        requestType: "makeup",
      };
      if (status) makeupQuery.status = status;

      const makeupRequests = await LessonRequest.find(makeupQuery)
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
        .populate("additionalInfo.academicYear", "name startDate endDate")
        .sort({ createdAt: -1 });

      // Kết hợp tất cả requests
      const allRequests = [
        ...substituteRequests,
        ...swapRequests,
        ...makeupRequests,
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Phân trang
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedRequests = allRequests.slice(startIndex, endIndex);

      res.status(200).json({
        success: true,
        requests: paginatedRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: allRequests.length,
          pages: Math.ceil(allRequests.length / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Error in getTeacherRequests:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy danh sách yêu cầu đang chờ duyệt (makeup)
  async getPendingRequests(req, res) {
    try {
      const { page = 1, limit = 20, requestType } = req.query;

      // Tạo query để lấy pending requests (chỉ makeup vì swap được xử lý bởi replacement teacher)
      const query = { status: "pending" };
      if (requestType) {
        query.requestType = requestType;
      } else {
        query.requestType = "makeup"; // Chỉ lấy makeup requests
      }

      const LessonRequest = require("../models/lesson-request.model");
      const skip = (parseInt(page) - 1) * parseInt(limit);

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
        .populate("additionalInfo.classInfo", "className gradeLevel")
        .populate("additionalInfo.subjectInfo", "subjectName subjectCode")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await LessonRequest.countDocuments(query);

      res.status(200).json({
        success: true,
        requests: requests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Error in getPendingRequests:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Duyệt yêu cầu (swap & makeup)
  async approveRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { requestId } = req.params;
      const { comment } = req.body;
      const managerId = req.user.id;

      // Tìm request để xác định loại
      const LessonRequest = require("../models/lesson-request.model");
      const request = await LessonRequest.findById(requestId);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Request not found",
        });
      }

      let result;
      if (request.requestType === "makeup") {
        result = await makeupRequestService.approveMakeupRequest(
          requestId,
          managerId,
          comment
        );
      } else {
        return res.status(400).json({
          success: false,
          message:
            "This endpoint only supports makeup requests. For swap requests, use /swap/:requestId/approve",
        });
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("Error in approveRequest:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Từ chối yêu cầu (swap & makeup)
  async rejectRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { requestId } = req.params;
      const { comment } = req.body;
      const managerId = req.user.id;

      // Tìm request để xác định loại
      const LessonRequest = require("../models/lesson-request.model");
      const request = await LessonRequest.findById(requestId);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Request not found",
        });
      }

      let result;
      if (request.requestType === "makeup") {
        result = await makeupRequestService.rejectMakeupRequest(
          requestId,
          managerId,
          comment
        );
      } else {
        return res.status(400).json({
          success: false,
          message:
            "This endpoint only supports makeup requests. For swap requests, use /swap/:requestId/reject",
        });
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("Error in rejectRequest:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ================================ SWAP SPECIFIC CONTROLLERS ================================

  // Hủy yêu cầu đổi tiết bởi requesting teacher
  async cancelSwapRequest(req, res) {
    try {
      const { requestId } = req.params;
      const requestingTeacherId = req.user.id;

      const result = await swapRequestService.cancelSwapRequest(
        requestId,
        requestingTeacherId
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.request,
      });
    } catch (error) {
      console.error("❌ Error in cancelSwapRequest controller:", error.message);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Duyệt yêu cầu đổi tiết bởi giáo viên replacement
  async approveSwapRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { requestId } = req.params;
      const replacementTeacherId = req.user.id;

      const result =
        await swapRequestService.approveSwapRequestByReplacementTeacher(
          requestId,
          replacementTeacherId
        );

      res.status(200).json(result);
    } catch (error) {
      console.error("Error in approveSwapRequest:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Từ chối yêu cầu đổi tiết bởi giáo viên replacement
  async rejectSwapRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { requestId } = req.params;
      const replacementTeacherId = req.user.id;

      const result =
        await swapRequestService.rejectSwapRequestByReplacementTeacher(
          requestId,
          replacementTeacherId
        );

      res.status(200).json(result);
    } catch (error) {
      console.error("Error in rejectSwapRequest:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy danh sách swap requests của giáo viên
  async getTeacherSwapRequests(req, res) {
    try {
      const { status } = req.query;
      const teacherId = req.user.id;

      const result = await swapRequestService.getTeacherSwapRequests(
        teacherId,
        status
      );

      res.status(200).json({
        success: true,
        requests: result,
        count: result.length,
      });
    } catch (error) {
      console.error("Error in getTeacherSwapRequests:", error);
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
      const request = await LessonRequest.findById(requestId);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Request not found",
        });
      }

      // Sử dụng service tương ứng theo loại request
      let result;
      if (request.requestType === "swap") {
        result = await swapRequestService.getSwapRequestDetails(requestId);
      } else if (request.requestType === "makeup") {
        // TODO: Implement makeup service method
        result = { success: true, request: request };
      } else if (request.requestType === "substitute") {
        result = await substituteRequestService.getSubstituteRequestById(
          requestId
        );
      } else {
        // Fallback cho các loại khác
        result = { success: true, request: request };
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("Error in getRequestDetails:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ================================ SUBSTITUTE SPECIFIC CONTROLLERS ================================

  // Lấy danh sách yêu cầu dạy thay của giáo viên
  async getTeacherSubstituteRequests(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const teacherId = req.user.id;

      const result = await substituteRequestService.getTeacherRequests(
        teacherId,
        status
      );

      res.status(200).json({
        success: true,
        requests: result,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.length,
        },
      });
    } catch (error) {
      console.error("Error in getTeacherSubstituteRequests:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy tất cả yêu cầu dạy thay (admin/manager)
  async getAllSubstituteRequests(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const result = await substituteRequestService.getAllRequests(
        status,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Error in getAllSubstituteRequests:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy thống kê yêu cầu dạy thay
  async getSubstituteRequestStats(req, res) {
    try {
      const LessonRequest = require("../models/lesson-request.model");

      const stats = await LessonRequest.aggregate([
        { $match: { requestType: "substitute" } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const totalRequests = await LessonRequest.countDocuments({
        requestType: "substitute",
      });

      const statsObject = {
        total: totalRequests,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
      };

      stats.forEach((stat) => {
        statsObject[stat._id] = stat.count;
      });

      res.status(200).json({
        success: true,
        stats: statsObject,
      });
    } catch (error) {
      console.error("Error in getSubstituteRequestStats:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Phê duyệt yêu cầu dạy thay
  async approveSubstituteRequest(req, res) {
    try {
      const { requestId } = req.params;
      const teacherId = req.user.id;

      const result = await substituteRequestService.approveRequest(
        requestId,
        teacherId
      );

      res.status(200).json({
        success: true,
        message: "Substitute request approved successfully",
        request: result,
      });
    } catch (error) {
      console.error("Error in approveSubstituteRequest:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Từ chối yêu cầu dạy thay
  async rejectSubstituteRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { requestId } = req.params;
      const teacherId = req.user.id;

      const result = await substituteRequestService.rejectRequest(
        requestId,
        teacherId
      );

      res.status(200).json({
        success: true,
        message: "Substitute request rejected",
        request: result,
      });
    } catch (error) {
      console.error("Error in rejectSubstituteRequest:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Hủy yêu cầu dạy thay
  async cancelSubstituteRequest(req, res) {
    try {
      const { requestId } = req.params;
      const teacherId = req.user.id;

      const result = await substituteRequestService.cancelRequest(
        requestId,
        teacherId
      );

      res.status(200).json({
        success: true,
        message: "Substitute request cancelled",
        request: result,
      });
    } catch (error) {
      console.error("Error in cancelSubstituteRequest:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Huỷ yêu cầu dạy bù (makeup) - chỉ giáo viên tạo request được huỷ
  async cancelMakeupRequest(req, res) {
    try {
      const { requestId } = req.params;
      const teacherId = req.user.id;

      const result = await makeupRequestService.cancelMakeupRequest(
        requestId,
        teacherId
      );

      res.status(200).json({
        success: true,
        message: result.message || "Makeup request cancelled successfully",
        request: result.request,
      });
    } catch (error) {
      console.error("Error in cancelMakeupRequest:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new LessonRequestController();
