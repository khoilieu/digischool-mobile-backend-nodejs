const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parent.controller');
const { 
  validateFeedback, 
  validateScheduleQuery, 
  validatePagination,
  checkParentRole 
} = require('../middleware/parent.validation');
const authMiddleware = require('../../auth/middleware/auth.middleware');

// Áp dụng middleware xác thực cho tất cả routes
router.use(authMiddleware.protect);
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

// Lấy danh sách feedback của phụ huynh
// GET /api/parents/feedback?page=1&limit=10
router.get('/feedback', 
  validatePagination, 
  parentController.getMyFeedbacks
);

module.exports = router; 