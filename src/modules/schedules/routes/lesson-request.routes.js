const express = require("express");
const router = express.Router();
const lessonRequestController = require("../controllers/lesson-request.controller");
const lessonRequestValidation = require("../middleware/lesson-request.validation");
const authMiddleware = require("../../auth/middleware/auth.middleware");

// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// ================================ MAKEUP ROUTES (DẠY BÙ) ================================

// GET /api/schedules/lesson-request/makeup/teacher-lessons - Lấy các tiết absent của giáo viên để dạy bù
router.get(
  "/makeup/teacher-lessons",
  authMiddleware.authorize("teacher", "admin", "manager"),
  lessonRequestValidation.validateTeacherLessonsQuery(),
  lessonRequestController.getTeacherLessonsForMakeup
);

// GET /api/schedules/lesson-request/makeup/available-lessons - Lấy các tiết trống để dạy bù
router.get(
  "/makeup/available-lessons",
  authMiddleware.authorize("teacher", "admin", "manager"),
  lessonRequestValidation.validateAvailableLessonsQuery(),
  lessonRequestController.getAvailableLessonsForMakeup
);

// POST /api/schedules/lesson-request/makeup/create - Tạo yêu cầu dạy bù
router.post(
  "/makeup/create",
  authMiddleware.authorize("teacher"),
  lessonRequestValidation.createMakeupRequest(),
  lessonRequestController.createMakeupRequest
);

// ================================ SUBSTITUTE ROUTES (DẠY THAY) ================================

// ✅ POST /api/schedules/lesson-request/substitute/create - Tạo yêu cầu dạy thay
router.post(
  "/substitute/create",
  authMiddleware.authorize("teacher"),
  lessonRequestValidation.validateCreateSubstituteRequest(),
  lessonRequestController.createSubstituteRequest
);

// ✅ GET /api/schedules/lesson-request/substitute/available-teachers/:lessonId - Lấy danh sách giáo viên dạy thay có sẵn
router.get(
  "/substitute/available-teachers/:lessonId",
  authMiddleware.authorize("teacher"),
  lessonRequestValidation.validateLessonId(),
  lessonRequestController.getAvailableTeachersForSubstitute
);

// ✅ POST /api/schedules/lesson-request/substitute/:requestId/approve - Phê duyệt yêu cầu dạy thay
router.post(
  "/substitute/:requestId/approve",
  authMiddleware.authorize("teacher"),
  lessonRequestValidation.validateRequestId(),
  lessonRequestController.approveSubstituteRequest
);

// ✅ POST /api/schedules/lesson-request/substitute/:requestId/reject - Từ chối yêu cầu dạy thay
router.post(
  "/substitute/:requestId/reject",
  authMiddleware.authorize("teacher"),
  lessonRequestValidation.validateRejectSubstituteRequest(),
  lessonRequestController.rejectSubstituteRequest
);

// ✅ POST /api/schedules/lesson-request/substitute/:requestId/cancel - Hủy yêu cầu dạy thay
router.post(
  "/substitute/:requestId/cancel",
  authMiddleware.authorize("teacher"),
  lessonRequestValidation.validateRequestId(),
  lessonRequestController.cancelSubstituteRequest
);

// ================================ SWAP SPECIFIC ROUTES ================================

// POST /api/schedules/lesson-request/swap/create - Tạo yêu cầu đổi tiết
router.post(
  "/swap/create",
  authMiddleware.authorize("teacher"),
  lessonRequestValidation.createSwapRequest(),
  lessonRequestController.createSwapRequest
);

// POST /api/schedules/lesson-request/swap/:requestId/cancel - Hủy yêu cầu đổi tiết bởi requesting teacher
router.post(
  "/swap/:requestId/cancel",
  authMiddleware.authorize("teacher"),
  lessonRequestValidation.validateRequestId(),
  lessonRequestController.cancelSwapRequest
);

// POST /api/schedules/lesson-request/swap/:requestId/approve - Duyệt yêu cầu đổi tiết bởi replacement teacher
router.post(
  "/swap/:requestId/approve",
  authMiddleware.authorize("teacher"),
  lessonRequestValidation.validateSwapApproval(),
  lessonRequestController.approveSwapRequest
);

// POST /api/schedules/lesson-request/swap/:requestId/reject - Từ chối yêu cầu đổi tiết bởi replacement teacher
router.post(
  "/swap/:requestId/reject",
  authMiddleware.authorize("teacher"),
  lessonRequestValidation.processRequest(),
  lessonRequestController.rejectSwapRequest
);

// ================================ MAKEUP ROUTES (DẠY BÙ) ================================

// POST /api/schedules/lesson-request/:requestId/approve - Duyệt yêu cầu (makeup)
router.post(
  "/:requestId/approve",
  authMiddleware.authorize("admin", "manager"),
  lessonRequestValidation.processRequest(),
  lessonRequestController.approveRequest
);

// POST /api/schedules/lesson-request/:requestId/reject - Từ chối yêu cầu (makeup)
router.post(
  "/:requestId/reject",
  authMiddleware.authorize("admin", "manager"),
  lessonRequestValidation.processRequest(),
  lessonRequestController.rejectRequest
);

// GET /api/schedules/lesson-request/:requestId - Lấy chi tiết yêu cầu
router.get(
  "/:requestId",
  lessonRequestValidation.validateRequestId(),
  lessonRequestController.getRequestDetails
);

// ================================ COMMON ROUTES ================================

// GET /api/schedules/lesson-request/my-requests - Lấy danh sách yêu cầu của giáo viên (tất cả loại)
router.get(
  "/my-requests",
  authMiddleware.authorize("teacher", "admin", "manager"),
  lessonRequestValidation.validateTeacherRequestsQuery(),
  lessonRequestController.getTeacherRequests
);

// GET /api/schedules/lesson-request/pending - Lấy danh sách yêu cầu đang chờ duyệt (swap & makeup)
router.get(
  "/pending",
  authMiddleware.authorize("admin", "manager"),
  lessonRequestValidation.validatePendingRequestsQuery(),
  lessonRequestController.getPendingRequests
);

module.exports = router;
