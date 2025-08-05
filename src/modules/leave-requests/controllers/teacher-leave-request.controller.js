const teacherLeaveRequestService = require("../services/teacher-leave-request.service");

class TeacherLeaveRequestController {
  // Tạo đơn xin nghỉ cho giáo viên (nhiều tiết)
  async createTeacherLeaveRequest(req, res, next) {
    try {
      const teacherId = req.user._id; // From auth middleware
      const { lessonIds, reason } = req.body;

      // Validate input
      if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Lesson IDs are required and must be an array with at least 1 item",
        });
      }

      if (lessonIds.length > 10) {
        return res.status(400).json({
          success: false,
          message: "Cannot request leave for more than 10 lessons at once",
        });
      }

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Reason is required",
        });
      }

      if (reason.length < 1 || reason.length > 300) {
        return res.status(400).json({
          success: false,
          message: "Reason must be between 1-300 characters",
        });
      }

      console.log(
        `📝 Teacher ${teacherId} requesting leave for ${lessonIds.length} lessons`
      );

      const result =
        await teacherLeaveRequestService.createMultipleTeacherLeaveRequests(
          { lessonIds, reason },
          teacherId
        );

      const statusCode = result.success ? 201 : 400;

      res.status(statusCode).json({
        success: result.success,
        message: result.success
          ? `Successfully created ${result.created.length} teacher leave requests and notifications sent to managers`
          : "Failed to create teacher leave requests",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in createTeacherLeaveRequest:", error.message);
      console.log(error);
      next(error);
    }
  }

  // Lấy danh sách đơn xin nghỉ của giáo viên
  async getMyTeacherLeaveRequests(req, res, next) {
    try {
      const teacherId = req.user._id;
      const filters = {
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
      };

      const result = await teacherLeaveRequestService.getTeacherLeaveRequests(
        teacherId,
        filters
      );

      res.status(200).json({
        success: true,
        message: "Teacher leave requests retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in getMyTeacherLeaveRequests:", error.message);
      next(error);
    }
  }

  // Lấy danh sách đơn cần duyệt cho manager
  async getPendingTeacherLeaveRequests(req, res, next) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
      };

      const result =
        await teacherLeaveRequestService.getPendingTeacherLeaveRequests(
          filters
        );

      res.status(200).json({
        success: true,
        message: "Pending teacher leave requests retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error(
        "❌ Error in getPendingTeacherLeaveRequests:",
        error.message
      );
      next(error);
    }
  }

  // Duyệt đơn xin nghỉ của giáo viên (chỉ manager)
  async approveTeacherLeaveRequest(req, res, next) {
    try {
      const { requestId } = req.params;
      const managerId = req.user._id;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          message: "Request ID is required",
        });
      }

      const result =
        await teacherLeaveRequestService.approveTeacherLeaveRequest(
          requestId,
          managerId
        );

      res.status(200).json({
        success: true,
        message:
          "Teacher leave request approved successfully. Lesson status updated to absent.",
        data: result.request,
      });
    } catch (error) {
      console.error("❌ Error in approveTeacherLeaveRequest:", error.message);

      // Handle specific error status codes
      if (error.statusCode === 403) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.statusCode === 404) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      next(error);
    }
  }

  // Từ chối đơn xin nghỉ của giáo viên (chỉ manager)
  async rejectTeacherLeaveRequest(req, res, next) {
    try {
      const { requestId } = req.params;
      const managerId = req.user._id;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          message: "Request ID is required",
        });
      }

      const result = await teacherLeaveRequestService.rejectTeacherLeaveRequest(
        requestId,
        managerId
      );

      res.status(200).json({
        success: true,
        message:
          "Teacher leave request rejected successfully and notification sent to teacher",
        data: result.request,
      });
    } catch (error) {
      console.error("❌ Error in rejectTeacherLeaveRequest:", error.message);

      // Handle specific error status codes
      if (error.statusCode === 403) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.statusCode === 404) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      next(error);
    }
  }

  // Hủy đơn xin nghỉ (chỉ khi pending và là của teacher đó)
  async cancelTeacherLeaveRequest(req, res, next) {
    try {
      const { requestId } = req.params;
      const teacherId = req.user._id;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          message: "Request ID is required",
        });
      }

      const result = await teacherLeaveRequestService.cancelTeacherLeaveRequest(
        requestId,
        teacherId
      );

      res.status(200).json({
        success: true,
        message: "Teacher leave request cancelled successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in cancelTeacherLeaveRequest:", error.message);

      // Handle specific error status codes
      if (error.statusCode === 403) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.statusCode === 404) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      next(error);
    }
  }

  // Lấy lessons mà giáo viên có thể xin nghỉ
  async getAvailableLessonsForTeacher(req, res, next) {
    try {
      const teacherId = req.user._id;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Start date and end date are required",
        });
      }

      const result =
        await teacherLeaveRequestService.getAvailableLessonsForTeacher(
          teacherId,
          startDate,
          endDate
        );

      res.status(200).json({
        success: true,
        message: "Available lessons for leave request retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error(
        "❌ Error in getAvailableLessonsForTeacher:",
        error.message
      );
      next(error);
    }
  }

  // Lấy chi tiết đơn xin nghỉ
  async getTeacherLeaveRequestDetail(req, res, next) {
    try {
      const { requestId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          message: "Request ID is required",
        });
      }

      const request =
        await teacherLeaveRequestService.getTeacherLeaveRequestDetail(
          requestId,
          userId,
          userRole
        );

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Teacher leave request not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Teacher leave request detail retrieved successfully",
        data: request,
      });
    } catch (error) {
      console.error("❌ Error in getTeacherLeaveRequestDetail:", error.message);
      next(error);
    }
  }
}

module.exports = new TeacherLeaveRequestController();
