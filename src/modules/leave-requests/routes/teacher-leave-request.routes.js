const express = require('express');
const router = express.Router();
const teacherLeaveRequestController = require('../controllers/teacher-leave-request.controller');
const authMiddleware = require('../../auth/middleware/auth.middleware');
const validation = require('../middleware/teacher-leave-request.validation');

// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// Teacher routes - for teachers to manage their own leave requests
router.post('/create', 
  authMiddleware.authorize('teacher'),
  validation.validateCreateTeacherLeaveRequest,
  validation.handleValidationErrors,
  teacherLeaveRequestController.createTeacherLeaveRequest
);

router.get('/my-requests', 
  authMiddleware.authorize('teacher'),
  validation.validateGetTeacherRequests,
  validation.handleValidationErrors,
  teacherLeaveRequestController.getMyTeacherLeaveRequests
);

router.get('/available-lessons', 
  authMiddleware.authorize('teacher'),
  validation.validateAvailableLessonsForTeacher,
  validation.handleValidationErrors,
  teacherLeaveRequestController.getAvailableLessonsForTeacher
);

router.get('/:requestId', 
  authMiddleware.authorize('teacher', 'manager', 'admin'),
  validation.validateRequestId,
  validation.handleValidationErrors,
  teacherLeaveRequestController.getTeacherLeaveRequestDetail
);

router.delete('/:requestId', 
  authMiddleware.authorize('teacher'),
  validation.validateRequestId,
  validation.handleValidationErrors,
  teacherLeaveRequestController.cancelTeacherLeaveRequest
);

// Manager routes - for managers to approve/reject teacher leave requests
router.get('/pending/all', 
  authMiddleware.authorize('manager', 'admin'),
  validation.validateGetPendingRequests,
  validation.handleValidationErrors,
  teacherLeaveRequestController.getPendingTeacherLeaveRequests
);

router.post('/:requestId/approve', 
  authMiddleware.authorize('manager', 'admin'),
  validation.validateApproveTeacherLeaveRequest,
  validation.handleValidationErrors,
  teacherLeaveRequestController.approveTeacherLeaveRequest
);

router.post('/:requestId/reject', 
  authMiddleware.authorize('manager', 'admin'),
  validation.validateRejectTeacherLeaveRequest,
  validation.handleValidationErrors,
  teacherLeaveRequestController.rejectTeacherLeaveRequest
);

module.exports = router; 