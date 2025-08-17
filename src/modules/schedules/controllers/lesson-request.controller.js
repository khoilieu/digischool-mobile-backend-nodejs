const swapRequestService = require("../services/request-swap.service");
const makeupRequestService = require("../services/request-makeup.service");
const substituteRequestService = require("../services/request-substitute.service");
const { validationResult } = require("express-validator");

class LessonRequestController {
  // ================================ SWAP CONTROLLERS (ĐỔI TIẾT) ================================

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

  // Tạo yêu cầu dạy bù
  async createMakeupRequest(req, res) {
    try {
      const errors = validationResult(req);
      console.log(errors);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Lỗi validation",
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
        availableTeachers: result.availableTeachers,
        unavailableTeachers: result.unavailableTeachers,
        totalChecked: result.totalChecked,
        lessonInfo: result.lessonInfo,
        message: `Tìm thấy ${result.availableTeachers.length} giáo viên có thể dạy thay trong tổng số ${result.totalChecked} giáo viên được kiểm tra`,
      });
    } catch (error) {
      console.error("Error in getAvailableTeachersForSubstitute:", error);
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
          managerId
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
          managerId
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
