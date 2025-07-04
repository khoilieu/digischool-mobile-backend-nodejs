const express = require('express');
const router = express.Router();
const LessonSwapController = require('../controllers/lesson-swap.controller');
const LessonSwapValidation = require('../middleware/lesson-swap.validation');
const authMiddleware = require('../../auth/middleware/auth.middleware');

// Initialize controller
const lessonSwapController = new LessonSwapController();

// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// Routes for teachers

// GET /api/schedules/lesson-swap/teacher-lessons - Lấy các tiết học của giáo viên để đổi
router.get(
  '/teacher-lessons',
  authMiddleware.authorize('teacher', 'admin', 'manager'),
  LessonSwapValidation.validateTeacherLessonsQuery(),
  lessonSwapController.getTeacherLessonsForSwap.bind(lessonSwapController)
);

// GET /api/schedules/lesson-swap/available-lessons - Lấy các tiết trống có thể đổi
router.get(
  '/available-lessons',
  authMiddleware.authorize('teacher', 'admin', 'manager'),
  LessonSwapValidation.validateAvailableLessonsQuery(),
  lessonSwapController.getAvailableLessonsForSwap.bind(lessonSwapController)
);

// POST /api/schedules/lesson-swap/request - Tạo yêu cầu đổi tiết
router.post(
  '/request',
  authMiddleware.authorize('teacher'),
  LessonSwapValidation.createLessonSwapRequest(),
  lessonSwapController.createLessonSwapRequest.bind(lessonSwapController)
);

// GET /api/schedules/lesson-swap/my-requests - Lấy danh sách yêu cầu đổi tiết của giáo viên
router.get(
  '/my-requests',
  authMiddleware.authorize('teacher', 'admin', 'manager'),
  LessonSwapValidation.validateTeacherSwapRequestsQuery(),
  lessonSwapController.getTeacherSwapRequests.bind(lessonSwapController)
);

// Routes for managers/admins

// GET /api/schedules/lesson-swap/pending - Lấy danh sách yêu cầu đổi tiết đang chờ duyệt
router.get(
  '/pending',
  authMiddleware.authorize('admin', 'manager'),
  LessonSwapValidation.validatePendingSwapRequestsQuery(),
  lessonSwapController.getPendingSwapRequests.bind(lessonSwapController)
);

// PATCH /api/schedules/lesson-swap/:requestId/approve - Duyệt yêu cầu đổi tiết
router.patch(
  '/:requestId/approve',
  authMiddleware.authorize('admin', 'manager'),
  LessonSwapValidation.processSwapRequest(),
  lessonSwapController.approveSwapRequest.bind(lessonSwapController)
);

// PATCH /api/schedules/lesson-swap/:requestId/reject - Từ chối yêu cầu đổi tiết
router.patch(
  '/:requestId/reject',
  authMiddleware.authorize('admin', 'manager'),
  LessonSwapValidation.processSwapRequest(),
  lessonSwapController.rejectSwapRequest.bind(lessonSwapController)
);

// Common routes

// GET /api/schedules/lesson-swap/:requestId - Lấy chi tiết yêu cầu đổi tiết
router.get(
  '/:requestId',
  LessonSwapValidation.validateRequestId(),
  lessonSwapController.getSwapRequestDetails.bind(lessonSwapController)
);

module.exports = router; 