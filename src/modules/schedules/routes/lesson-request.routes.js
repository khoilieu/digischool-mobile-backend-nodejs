const express = require('express');
const router = express.Router();
const lessonRequestController = require('../controllers/lesson-request.controller');
const lessonRequestValidation = require('../middleware/lesson-request.validation');
const authMiddleware = require('../../auth/middleware/auth.middleware');


// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// GET /api/schedules/lesson-request/teacher-lessons - Lấy các tiết học của giáo viên để tạo request
router.get(
  '/swap/teacher-lessons',
  authMiddleware.authorize('teacher', 'admin', 'manager'),
  lessonRequestValidation.validateTeacherLessonsQuery(),
  lessonRequestController.getTeacherLessonsForRequest
);

// GET /api/schedules/lesson-request/available-lessons - Lấy các tiết trống có thể dùng
router.get(
  '/swap/available-lessons',
  authMiddleware.authorize('teacher', 'admin', 'manager'),
  lessonRequestValidation.validateAvailableLessonsQuery(),
  lessonRequestController.getAvailableLessonsForRequest
);

// POST /api/schedules/lesson-request/create - Tạo yêu cầu đổi tiết hoặc dạy bù
router.post(
  '/swap/create',
  authMiddleware.authorize('teacher'),
  lessonRequestValidation.createLessonRequest(),
  lessonRequestController.createLessonRequest
);

// GET /api/schedules/lesson-request/my-requests - Lấy danh sách yêu cầu của giáo viên
router.get(
  '/swap/my-requests',
  authMiddleware.authorize('teacher', 'admin', 'manager'),
  lessonRequestValidation.validateTeacherRequestsQuery(),
  lessonRequestController.getTeacherRequests
);

// Routes for managers/admins

// GET /api/schedules/lesson-request/pending - Lấy danh sách yêu cầu đang chờ duyệt
router.get(
  '/swap/pending',
  authMiddleware.authorize('admin', 'manager'),
  lessonRequestValidation.validatePendingRequestsQuery(),
  lessonRequestController.getPendingRequests
);

// PATCH /api/schedules/lesson-request/:requestId/approve - Duyệt yêu cầu
router.patch(
  '/swap/:requestId/approve',
  authMiddleware.authorize('admin', 'manager'),
  lessonRequestValidation.processRequest(),
  lessonRequestController.approveRequest
);

// PATCH /api/schedules/lesson-request/:requestId/reject - Từ chối yêu cầu
router.patch(
  '/swap/:requestId/reject',
  authMiddleware.authorize('admin', 'manager'),
  lessonRequestValidation.processRequest(),
  lessonRequestController.rejectRequest
);

// Common routes

// GET /api/schedules/lesson-request/:requestId - Lấy chi tiết yêu cầu
router.get(
  '/swap/:requestId',
  lessonRequestValidation.validateRequestId(),
  lessonRequestController.getRequestDetails
);



//  ================================ DẠY THAY ROUTE ================================

// Tạo yêu cầu dạy thay (chỉ dành cho giáo viên) ✅
router.post(
  '/substitute/create',
  lessonRequestValidation.validateTeacherRole(),
  lessonRequestValidation.validateCreateRequest(),
  lessonRequestController.createRequest
);

// Lấy danh sách giáo viên dạy thay có sẵn cho một tiết học (chỉ dành cho giáo viên) ✅
router.get(
  '/substitute/available-teachers/:lessonId',
  lessonRequestValidation.validateTeacherRole(),
  lessonRequestValidation.validateLessonId(),
  lessonRequestController.getAvailableTeachers
);

// Lấy danh sách yêu cầu dạy thay của giáo viên hiện tại ✅
router.get(
  '/substitute/my-requests',
  lessonRequestValidation.validateTeacherRole(),
  lessonRequestValidation.validateGetRequests(),
  lessonRequestController.getTeacherRequests
);

// Lấy tất cả yêu cầu dạy thay (chỉ dành cho quản trị viên/quản lý) ✅
router.get(
  '/substitute/all',
  lessonRequestValidation.validateManagerRole(),
  lessonRequestValidation.validateGetRequests(),
  lessonRequestController.getAllRequests
);

// Lấy thống kê yêu cầu dạy thay (chỉ dành cho quản trị viên/quản lý) ✅
// Ví dụ: GET /api/schedules/lesson-request/substitute/stats
router.get(
  '/substitute/stats',
  lessonRequestValidation.validateManagerRole(),
  lessonRequestController.getRequestStats
);

// Lấy yêu cầu dạy thay theo ID  ✅
router.get(
  '/substitute/:requestId',
  lessonRequestValidation.validateRequestId(),
  lessonRequestController.getRequestById
);

// Phê duyệt yêu cầu dạy thay (chỉ dành cho giáo viên ứng cử) ✅
router.post(
  '/substitute/:requestId/approve',
  lessonRequestValidation.validateTeacherRole(),
  lessonRequestValidation.validateRequestId(),
  lessonRequestController.approveRequest
);

// Từ chối yêu cầu dạy thay (chỉ dành cho giáo viên ứng cử)
router.post(
  '/substitute/:requestId/reject',
  lessonRequestValidation.validateTeacherRole(),
  lessonRequestValidation.validateRejectRequest(),
  lessonRequestController.rejectRequest
);

// Hủy yêu cầu dạy thay (chỉ dành cho giáo viên yêu cầu) ✅
router.post(
  '/substitute/:requestId/cancel',
  lessonRequestValidation.validateTeacherRole(),
  lessonRequestValidation.validateRequestId(),
  lessonRequestController.cancelRequest
);
module.exports = router; 