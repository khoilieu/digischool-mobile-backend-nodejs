const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parent.controller');
const { 
  validateFeedback, 
  validateScheduleQuery, 
  validatePagination,
  validateFeedbackFilters,
  validateFeedbackStatus,
  validateFeedbackId,
  checkParentRole,
  checkAdminRole
} = require('../middleware/parent.validation');
const authMiddleware = require('../../auth/middleware/auth.middleware');

// Áp dụng middleware xác thực cho tất cả routes
router.use(authMiddleware.protect);

// Routes cho admin/manager (đặt trước để tránh conflict)
// Lấy tất cả feedback (cho admin/manager)
// GET /api/parents/feedback?status=pending&rating=5&page=1&limit=10
router.get('/feedback', 
  checkAdminRole,
  validateFeedbackFilters, 
  parentController.getAllFeedbacks
);

// Lấy thống kê feedback (cho admin/manager)
// GET /api/parents/feedback/stats
router.get('/feedback/stats', 
  checkAdminRole,
  parentController.getFeedbackStats
);

// Cập nhật trạng thái feedback (cho admin/manager)
// PATCH /api/parents/feedback/:feedbackId/status
router.patch('/feedback/:feedbackId/status', 
  checkAdminRole,
  validateFeedbackId,
  validateFeedbackStatus,
  parentController.updateFeedbackStatus
);

// Lấy chi tiết feedback (cho admin/manager)
// GET /api/parents/feedback/:feedbackId
router.get('/feedback/:feedbackId', 
  checkAdminRole,
  validateFeedbackId,
  parentController.getFeedbackDetail
);

// Routes cho phụ huynh
router.use(checkParentRole);

// Lấy danh sách con của phụ huynh
// GET /api/parents/children
router.get('/children', parentController.getChildren);

// Xem thời khóa biểu của con
// GET /api/parents/children/:childId/schedule?academicYear=2024-2025&startOfWeek=2024-01-15&endOfWeek=2024-01-21
router.get('/children/:childId/schedule', 
  validateScheduleQuery, 
  parentController.getChildSchedule
);

// Gửi feedback
// POST /api/parents/feedback
router.post('/feedback', 
  validateFeedback, 
  parentController.sendFeedback
);

// Lấy danh sách feedback của phụ huynh (đặt sau routes admin để tránh conflict)
// GET /api/parents/feedback?page=1&limit=10
router.get('/my-feedback', 
  validatePagination, 
  parentController.getMyFeedbacks
);

module.exports = router; 