const express = require('express');
const router = express.Router();
const substituteRequestController = require('../controllers/substitute-request.controller');
const substituteRequestValidation = require('../middleware/substitute-request.validation');
const authMiddleware = require('../../auth/middleware/auth.middleware');

// Áp dụng middleware xác thực cho tất cả các route
router.use(authMiddleware.protect);

// Tạo yêu cầu dạy thay (chỉ dành cho giáo viên)
router.post(
  '/',
  substituteRequestValidation.validateTeacherRole(),
  substituteRequestValidation.validateCreateRequest(),
  substituteRequestController.createRequest
);

// Lấy danh sách giáo viên dạy thay có sẵn cho một tiết học (chỉ dành cho giáo viên)
router.get(
  '/available-teachers/:lessonId',
  substituteRequestValidation.validateTeacherRole(),
  substituteRequestValidation.validateLessonId(),
  substituteRequestController.getAvailableTeachers
);

// Lấy danh sách yêu cầu dạy thay của giáo viên hiện tại
router.get(
  '/my-requests',
  substituteRequestValidation.validateTeacherRole(),
  substituteRequestValidation.validateGetRequests(),
  substituteRequestController.getTeacherRequests
);

// Lấy tất cả yêu cầu dạy thay (chỉ dành cho quản trị viên/quản lý)
router.get(
  '/all',
  substituteRequestValidation.validateManagerRole(),
  substituteRequestValidation.validateGetRequests(),
  substituteRequestController.getAllRequests
);

// Lấy thống kê yêu cầu dạy thay (chỉ dành cho quản trị viên/quản lý)
router.get(
  '/stats',
  substituteRequestValidation.validateManagerRole(),
  substituteRequestController.getRequestStats
);

// Lấy yêu cầu dạy thay theo ID
router.get(
  '/:requestId',
  substituteRequestValidation.validateRequestId(),
  substituteRequestController.getRequestById
);

// Phê duyệt yêu cầu dạy thay (chỉ dành cho giáo viên ứng cử)
router.post(
  '/:requestId/approve',
  substituteRequestValidation.validateTeacherRole(),
  substituteRequestValidation.validateRequestId(),
  substituteRequestController.approveRequest
);

// Từ chối yêu cầu dạy thay (chỉ dành cho giáo viên ứng cử)
router.post(
  '/:requestId/reject',
  substituteRequestValidation.validateTeacherRole(),
  substituteRequestValidation.validateRejectRequest(),
  substituteRequestController.rejectRequest
);

// Hủy yêu cầu dạy thay (chỉ dành cho giáo viên yêu cầu)
router.post(
  '/:requestId/cancel',
  substituteRequestValidation.validateTeacherRole(),
  substituteRequestValidation.validateRequestId(),
  substituteRequestController.cancelRequest
);

module.exports = router; 