const express = require('express');
const router = express.Router();
const LessonRequestController = require('../controllers/lesson-request.controller');
const LessonRequestValidation = require('../middleware/lesson-request.validation');
const authMiddleware = require('../../auth/middleware/auth.middleware');

// Initialize controller
const lessonRequestController = new LessonRequestController();

// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// Routes for teachers

// GET /api/schedules/lesson-request/teacher-lessons - Lấy các tiết học của giáo viên để tạo request
router.get(
  '/teacher-lessons',
  authMiddleware.authorize('teacher', 'admin', 'manager'),
  LessonRequestValidation.validateTeacherLessonsQuery(),
  lessonRequestController.getTeacherLessonsForRequest.bind(lessonRequestController)
);

// GET /api/schedules/lesson-request/available-lessons - Lấy các tiết trống có thể dùng
router.get(
  '/available-lessons',
  authMiddleware.authorize('teacher', 'admin', 'manager'),
  LessonRequestValidation.validateAvailableLessonsQuery(),
  lessonRequestController.getAvailableLessonsForRequest.bind(lessonRequestController)
);

// POST /api/schedules/lesson-request/create - Tạo yêu cầu đổi tiết hoặc dạy bù
router.post(
  '/create',
  authMiddleware.authorize('teacher'),
  LessonRequestValidation.createLessonRequest(),
  lessonRequestController.createLessonRequest.bind(lessonRequestController)
);

// GET /api/schedules/lesson-request/my-requests - Lấy danh sách yêu cầu của giáo viên
router.get(
  '/my-requests',
  authMiddleware.authorize('teacher', 'admin', 'manager'),
  LessonRequestValidation.validateTeacherRequestsQuery(),
  lessonRequestController.getTeacherRequests.bind(lessonRequestController)
);

// Routes for managers/admins

// GET /api/schedules/lesson-request/pending - Lấy danh sách yêu cầu đang chờ duyệt
router.get(
  '/pending',
  authMiddleware.authorize('admin', 'manager'),
  LessonRequestValidation.validatePendingRequestsQuery(),
  lessonRequestController.getPendingRequests.bind(lessonRequestController)
);

// PATCH /api/schedules/lesson-request/:requestId/approve - Duyệt yêu cầu
router.patch(
  '/:requestId/approve',
  authMiddleware.authorize('admin', 'manager'),
  LessonRequestValidation.processRequest(),
  lessonRequestController.approveRequest.bind(lessonRequestController)
);

// PATCH /api/schedules/lesson-request/:requestId/reject - Từ chối yêu cầu
router.patch(
  '/:requestId/reject',
  authMiddleware.authorize('admin', 'manager'),
  LessonRequestValidation.processRequest(),
  lessonRequestController.rejectRequest.bind(lessonRequestController)
);

// Common routes

// GET /api/schedules/lesson-request/:requestId - Lấy chi tiết yêu cầu
router.get(
  '/:requestId',
  LessonRequestValidation.validateRequestId(),
  lessonRequestController.getRequestDetails.bind(lessonRequestController)
);

module.exports = router; 