const express = require('express');
const router = express.Router();
const leaveRequestController = require('../controllers/leave-request.controller');
const authMiddleware = require('../../auth/middleware/auth.middleware');
const validation = require('../middleware/leave-request.validation');

// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// Student routes - Học sinh xin vắng
router.post('/create', 
  authMiddleware.authorize('student'),
  validation.validateCreateLeaveRequest,
  leaveRequestController.createLeaveRequests
);

router.get('/my-requests', 
  authMiddleware.authorize('student'),
  validation.validateGetRequests,
  leaveRequestController.getMyLeaveRequests
);

router.get('/available-lessons', 
  authMiddleware.authorize('student'),
  validation.validateAvailableLessons,
  leaveRequestController.getAvailableLessons
);

router.delete('/:requestId/cancel', 
  authMiddleware.authorize('student'),
  validation.validateRequestId,
  leaveRequestController.cancelRequest
);

// Teacher routes - Giáo viên duyệt đơn
router.get('/pending', 
  authMiddleware.authorize('teacher', 'homeroom_teacher'),
  validation.validateGetRequests,
  leaveRequestController.getPendingRequests
);

router.get('/teacher-requests', 
  authMiddleware.authorize('teacher', 'homeroom_teacher'),
  validation.validateGetRequests,
  leaveRequestController.getTeacherRequests
);

router.put('/:requestId/approve', 
  authMiddleware.authorize('teacher', 'homeroom_teacher'),
  validation.validateApproveRequest,
  leaveRequestController.approveRequest
);

router.put('/:requestId/reject', 
  authMiddleware.authorize('teacher', 'homeroom_teacher'),
  validation.validateRejectRequest,
  leaveRequestController.rejectRequest
);

router.post('/batch-process', 
  authMiddleware.authorize('teacher', 'homeroom_teacher'),
  validation.validateBatchProcess,
  leaveRequestController.batchProcessRequests
);

// Common routes - Xem chi tiết đơn
router.get('/:requestId', 
  authMiddleware.authorize('student', 'teacher', 'homeroom_teacher', 'manager', 'admin'),
  validation.validateRequestId,
  leaveRequestController.getRequestDetail
);

// Admin/Manager routes - Thống kê
router.get('/stats/overview', 
  authMiddleware.authorize('admin', 'manager'),
  validation.validateStatsQuery,
  leaveRequestController.getLeaveRequestStats
);

module.exports = router; 