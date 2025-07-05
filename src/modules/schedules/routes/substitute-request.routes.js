const express = require('express');
const router = express.Router();
const substituteRequestController = require('../controllers/substitute-request.controller');
const substituteRequestValidation = require('../middleware/substitute-request.validation');
const authMiddleware = require('../../auth/middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// Create substitute request (teachers only)
router.post(
  '/',
  substituteRequestValidation.validateTeacherRole(),
  substituteRequestValidation.validateCreateRequest(),
  substituteRequestController.createRequest
);

// Get available substitute teachers for a lesson (teachers only)
router.get(
  '/available-teachers/:lessonId',
  substituteRequestValidation.validateTeacherRole(),
  substituteRequestValidation.validateLessonId(),
  substituteRequestController.getAvailableTeachers
);

// Get current teacher's substitute requests
router.get(
  '/my-requests',
  substituteRequestValidation.validateTeacherRole(),
  substituteRequestValidation.validateGetRequests(),
  substituteRequestController.getTeacherRequests
);

// Get all substitute requests (admin/manager only)
router.get(
  '/all',
  substituteRequestValidation.validateManagerRole(),
  substituteRequestValidation.validateGetRequests(),
  substituteRequestController.getAllRequests
);

// Get substitute request statistics (admin/manager only)
router.get(
  '/stats',
  substituteRequestValidation.validateManagerRole(),
  substituteRequestController.getRequestStats
);

// Get substitute request by ID
router.get(
  '/:requestId',
  substituteRequestValidation.validateRequestId(),
  substituteRequestController.getRequestById
);

// Approve substitute request (candidate teachers only)
router.post(
  '/:requestId/approve',
  substituteRequestValidation.validateTeacherRole(),
  substituteRequestValidation.validateRequestId(),
  substituteRequestController.approveRequest
);

// Reject substitute request (candidate teachers only)
router.post(
  '/:requestId/reject',
  substituteRequestValidation.validateTeacherRole(),
  substituteRequestValidation.validateRejectRequest(),
  substituteRequestController.rejectRequest
);

// Cancel substitute request (requesting teacher only)
router.post(
  '/:requestId/cancel',
  substituteRequestValidation.validateTeacherRole(),
  substituteRequestValidation.validateRequestId(),
  substituteRequestController.cancelRequest
);

module.exports = router; 