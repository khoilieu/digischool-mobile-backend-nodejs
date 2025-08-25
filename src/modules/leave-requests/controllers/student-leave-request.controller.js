const studentLeaveRequestService = require("../services/student-leave-request.service");

class StudentLeaveRequestController {
  // Tạo đơn xin vắng cho nhiều tiết (requestType = "lesson")
  async createLessonLeaveRequests(req, res, next) {
    try {
      const studentId = req.user._id; // From auth middleware
      const { lessonIds, phoneNumber, reason } = req.body;

      // Validate input
      if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Lesson IDs are required and must be an array",
        });
      }

      if (!phoneNumber || !reason) {
        return res.status(400).json({
          success: false,
          message: "Phone number and reason are required",
        });
      }

      if (lessonIds.length > 10) {
        return res.status(400).json({
          success: false,
          message: "Cannot request leave for more than 10 lessons at once",
        });
      }

      console.log(
        `📝 Student ${studentId} requesting lesson leave for ${lessonIds.length} lessons`
      );

      const result =
        await studentLeaveRequestService.createMultipleLeaveRequests(
          { lessonIds, phoneNumber, reason },
          studentId
        );

      const statusCode = result.success ? 201 : 400;

      res.status(statusCode).json({
        success: result.success,
        message: result.success
          ? `Successfully created ${result.created.length} lesson leave requests and notifications sent to subject teachers`
          : "Failed to create lesson leave requests",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in createLessonLeaveRequests:", error.message);
      next(error);
    }
  }

  // Tạo đơn xin nghỉ cả ngày (requestType = "day")
  async createDayLeaveRequest(req, res, next) {
    try {
      const studentId = req.user._id; // From auth middleware
      const { date, phoneNumber, reason } = req.body;

      // Validate input
      if (!date || !phoneNumber || !reason) {
        return res.status(400).json({
          success: false,
          message: "Date, phone number and reason are required",
        });
      }

      // Validate date is not in the past
      const requestDate = new Date(date);
      const now = new Date();
      if (requestDate < now.setHours(0, 0, 0, 0)) {
        return res.status(400).json({
          success: false,
          message: "Cannot request leave for past dates",
        });
      }

      console.log(
        `📝 Student ${studentId} requesting day leave for ${new Date(date).toLocaleDateString()}`
      );

      const result = await studentLeaveRequestService.createDayLeaveRequest(
        { date, phoneNumber, reason },
        studentId
      );

      res.status(201).json({
        success: true,
        message: "Day leave request created successfully and notification sent to homeroom teacher",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in createDayLeaveRequest:", error.message);
      next(error);
    }
  }

  // Lấy danh sách đơn xin vắng của học sinh
  async getMyLeaveRequests(req, res, next) {
    try {
      const studentId = req.user._id;
      const filters = {
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
      };

      const result = await studentLeaveRequestService.getStudentLeaveRequests(
        studentId,
        filters
      );

      res.status(200).json({
        success: true,
        message: "Leave requests retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in getMyLeaveRequests:", error.message);
      next(error);
    }
  }

  // Lấy danh sách đơn cần duyệt của giáo viên
  async getPendingRequests(req, res, next) {
    try {
      const teacherId = req.user._id;
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
      };

      const result = await studentLeaveRequestService.getTeacherPendingRequests(
        teacherId,
        filters
      );

      res.status(200).json({
        success: true,
        message: "Pending leave requests retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in getPendingRequests:", error.message);
      next(error);
    }
  }

  // Lấy tất cả đơn xin vắng của giáo viên
  async getTeacherRequests(req, res, next) {
    try {
      const teacherId = req.user._id;
      const filters = {
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
      };

      const result = await studentLeaveRequestService.getTeacherLeaveRequests(
        teacherId,
        filters
      );

      res.status(200).json({
        success: true,
        message: "Teacher leave requests retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in getTeacherRequests:", error.message);
      next(error);
    }
  }

  // Duyệt đơn xin vắng
  async approveRequest(req, res, next) {
    try {
      const { requestId } = req.params;
      const teacherId = req.user._id;
      const { comment = "" } = req.body;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          message: "Request ID is required",
        });
      }

      const result = await studentLeaveRequestService.approveLeaveRequest(
        requestId,
        teacherId,
        comment
      );

      res.status(200).json({
        success: true,
        message:
          "Leave request approved successfully and notification sent to student",
        data: result.request,
      });
    } catch (error) {
      console.error("❌ Error in approveRequest:", error.message);

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

  // Từ chối đơn xin vắng
  async rejectRequest(req, res, next) {
    try {
      const { requestId } = req.params;
      const teacherId = req.user._id;
      // Bỏ lấy comment

      if (!requestId) {
        return res.status(400).json({
          success: false,
          message: "Request ID is required",
        });
      }

      // Không kiểm tra comment nữa
      const result = await studentLeaveRequestService.rejectLeaveRequest(
        requestId,
        teacherId
      );

      res.status(200).json({
        success: true,
        message:
          "Leave request rejected successfully and notification sent to student",
        data: result.request,
      });
    } catch (error) {
      console.error("❌ Error in rejectRequest:", error.message);

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

  // Lấy chi tiết đơn xin vắng
  async getRequestDetail(req, res, next) {
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

      const request = await studentLeaveRequestService.getLeaveRequestDetail(
        requestId,
        userId,
        userRole
      );

      res.status(200).json({
        success: true,
        message: "Leave request detail retrieved successfully",
        data: request,
      });
    } catch (error) {
      console.error("❌ Error in getRequestDetail:", error.message);
      next(error);
    }
  }

  // Hủy đơn xin vắng
  async cancelRequest(req, res, next) {
    try {
      const { requestId } = req.params;
      const studentId = req.user._id;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          message: "Request ID is required",
        });
      }

      const result = await studentLeaveRequestService.cancelLeaveRequest(
        requestId,
        studentId
      );

      res.status(200).json({
        success: true,
        message: "Leave request cancelled successfully",
      });
    } catch (error) {
      console.error("❌ Error in cancelRequest:", error.message);
      next(error);
    }
  }

  // Lấy lessons có thể xin vắng
  async getAvailableLessons(req, res, next) {
    try {
      const studentId = req.user._id;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Start date and end date are required",
        });
      }

      // Validate date range (max 30 days)
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = (end - start) / (1000 * 60 * 60 * 24);

      if (diffDays > 30) {
        return res.status(400).json({
          success: false,
          message: "Date range cannot exceed 30 days",
        });
      }

      const lessons =
        await studentLeaveRequestService.getAvailableLessonsForLeave(
          studentId,
          startDate,
          endDate
        );

      res.status(200).json({
        success: true,
        message: "Available lessons retrieved successfully",
        data: {
          lessons,
          dateRange: { startDate, endDate },
          total: lessons.length,
        },
      });
    } catch (error) {
      console.error("❌ Error in getAvailableLessons:", error.message);
      next(error);
    }
  }

  // Thống kê đơn xin vắng (cho admin/manager)
  async getLeaveRequestStats(req, res, next) {
    try {
      const userRole = req.user.role;

      // Only admin/manager can view overall stats
      if (!userRole.includes("admin") && !userRole.includes("manager")) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin or manager role required.",
        });
      }

      const filters = {
        teacherId: req.query.teacherId,
        studentId: req.query.studentId,
        classId: req.query.classId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };

      const stats = await studentLeaveRequestService.getLeaveRequestStats(
        filters
      );

      res.status(200).json({
        success: true,
        message: "Leave request statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      console.error("❌ Error in getLeaveRequestStats:", error.message);
      next(error);
    }
  }

  // Batch approve/reject requests (for teachers)
  async batchProcessRequests(req, res, next) {
    try {
      const teacherId = req.user._id;
      const { requests } = req.body; // Array of {requestId, action, comment}

      if (!requests || !Array.isArray(requests) || requests.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Requests array is required",
        });
      }

      if (requests.length > 20) {
        return res.status(400).json({
          success: false,
          message: "Cannot process more than 20 requests at once",
        });
      }

      const results = [];
      const errors = [];

      for (const req of requests) {
        try {
          const { requestId, action, comment = "" } = req;

          if (!requestId || !action) {
            errors.push(`Missing requestId or action for request`);
            continue;
          }

          if (!["approve", "reject"].includes(action)) {
            errors.push(`Invalid action: ${action} for request ${requestId}`);
            continue;
          }

          if (action === "reject" && !comment.trim()) {
            errors.push(`Comment required for rejecting request ${requestId}`);
            continue;
          }

          let result;
          if (action === "approve") {
            result = await studentLeaveRequestService.approveLeaveRequest(
              requestId,
              teacherId,
              comment
            );
          } else {
            result = await studentLeaveRequestService.rejectLeaveRequest(
              requestId,
              teacherId,
              comment
            );
          }

          results.push({
            requestId,
            action,
            success: true,
            request: result.request,
          });
        } catch (reqError) {
          errors.push(
            `Error processing request ${req.requestId}: ${reqError.message}`
          );
        }
      }

      res.status(200).json({
        success: results.length > 0,
        message: `Processed ${results.length} requests successfully`,
        data: {
          processed: results,
          errors: errors,
          summary: {
            total: requests.length,
            processed: results.length,
            failed: errors.length,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error in batchProcessRequests:", error.message);
      next(error);
    }
  }
}

module.exports = new StudentLeaveRequestController();
