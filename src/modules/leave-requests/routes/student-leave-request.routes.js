const express = require("express");
const router = express.Router();
const studentLeaveRequestController = require("../controllers/student-leave-request.controller");
const authMiddleware = require("../../auth/middleware/auth.middleware");
const studentLeaveRequestValidation = require("../middleware/student-leave-request.validation");

// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// Student routes - Học sinh xin vắng
// API tạo đơn xin vắng từng tiết (requestType = "lesson")
router.post(
  "/create-lesson",
  authMiddleware.authorize("student"),
  studentLeaveRequestValidation.createLessonLeaveRequests,
  studentLeaveRequestController.createLessonLeaveRequests
);

// API tạo đơn xin nghỉ cả ngày (requestType = "day")
router.post(
  "/create-day",
  authMiddleware.authorize("student"),
  studentLeaveRequestValidation.createDayLeaveRequest,
  studentLeaveRequestController.createDayLeaveRequest
);

router.get(
  "/my-requests",
  authMiddleware.authorize("student"),
  studentLeaveRequestValidation.validateGetRequests,
  studentLeaveRequestController.getMyLeaveRequests
);

router.get(
  "/available-lessons",
  authMiddleware.authorize("student"),
  studentLeaveRequestValidation.validateAvailableLessons,
  studentLeaveRequestController.getAvailableLessons
);

router.delete(
  "/:requestId/cancel",
  authMiddleware.authorize("student"),
  studentLeaveRequestValidation.validateRequestId,
  studentLeaveRequestController.cancelRequest
);

// Teacher routes - Giáo viên duyệt đơn
router.get(
  "/pending",
  authMiddleware.authorize("teacher", "homeroom_teacher"),
  studentLeaveRequestValidation.validateGetRequests,
  studentLeaveRequestController.getPendingRequests
);

router.get(
  "/teacher-requests",
  authMiddleware.authorize("teacher", "homeroom_teacher"),
  studentLeaveRequestValidation.validateGetRequests,
  studentLeaveRequestController.getTeacherRequests
);

router.post(
  "/:requestId/approve",
  authMiddleware.authorize("teacher", "homeroom_teacher"),
  studentLeaveRequestValidation.validateApproveRequest,
  studentLeaveRequestController.approveRequest
);

router.post(
  "/:requestId/reject",
  authMiddleware.authorize("teacher", "homeroom_teacher"),
  studentLeaveRequestValidation.validateRejectRequest,
  studentLeaveRequestController.rejectRequest
);

router.post(
  "/batch-process",
  authMiddleware.authorize("teacher", "homeroom_teacher"),
  studentLeaveRequestValidation.validateBatchProcess,
  studentLeaveRequestController.batchProcessRequests
);

// Common routes - Xem chi tiết đơn
router.get(
  "/:requestId",
  authMiddleware.authorize(
    "student",
    "teacher",
    "homeroom_teacher",
    "manager",
    "admin"
  ),
  studentLeaveRequestValidation.validateRequestId,
  studentLeaveRequestController.getRequestDetail
);

// Admin/Manager routes - Thống kê
router.get(
  "/stats/overview",
  authMiddleware.authorize("admin", "manager"),
  studentLeaveRequestValidation.validateStatsQuery,
  studentLeaveRequestController.getLeaveRequestStats
);

module.exports = router;
