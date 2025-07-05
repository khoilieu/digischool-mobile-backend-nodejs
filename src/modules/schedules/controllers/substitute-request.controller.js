const substituteRequestService = require('../services/substitute-request.service');
const { validationResult } = require('express-validator');

class SubstituteRequestController {

  // Create new substitute request
  async createRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { lessonId, candidateTeachers, reason } = req.body;
      const requestingTeacherId = req.user._id;

      const request = await substituteRequestService.createSubstituteRequest(
        lessonId,
        requestingTeacherId,
        candidateTeachers,
        reason
      );

      res.status(201).json({
        success: true,
        message: 'Substitute request created successfully',
        data: request
      });

    } catch (error) {
      console.error('Error in createRequest:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create substitute request'
      });
    }
  }

  // Get available substitute teachers for a lesson
  async getAvailableTeachers(req, res) {
    try {
      const { lessonId } = req.params;

      const teachers = await substituteRequestService.getAvailableTeachers(lessonId);

      res.json({
        success: true,
        message: 'Available teachers retrieved successfully',
        data: teachers
      });

    } catch (error) {
      console.error('Error in getAvailableTeachers:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get available teachers'
      });
    }
  }

  // Get teacher's substitute requests
  async getTeacherRequests(req, res) {
    try {
      const teacherId = req.user._id;
      const { status } = req.query;

      const requests = await substituteRequestService.getTeacherRequests(teacherId, status);

      res.json({
        success: true,
        message: 'Teacher requests retrieved successfully',
        data: requests
      });

    } catch (error) {
      console.error('Error in getTeacherRequests:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get teacher requests'
      });
    }
  }

  // Get substitute request by ID
  async getRequestById(req, res) {
    try {
      const { requestId } = req.params;

      const request = await substituteRequestService.getSubstituteRequestById(requestId);

      // Check if user has permission to view this request
      const userId = req.user._id.toString();
      const hasPermission = 
        request.requestingTeacher._id.toString() === userId ||
        request.candidateTeachers.some(c => c.teacher._id.toString() === userId) ||
        req.user.role.includes('manager') ||
        req.user.role.includes('admin');

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        message: 'Request retrieved successfully',
        data: request
      });

    } catch (error) {
      console.error('Error in getRequestById:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get request'
      });
    }
  }

  // Approve substitute request
  async approveRequest(req, res) {
    try {
      const { requestId } = req.params;
      const teacherId = req.user._id;

      const request = await substituteRequestService.approveRequest(requestId, teacherId);

      res.json({
        success: true,
        message: 'Request approved successfully',
        data: request
      });

    } catch (error) {
      console.error('Error in approveRequest:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to approve request'
      });
    }
  }

  // Reject substitute request
  async rejectRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { requestId } = req.params;
      const { reason } = req.body;
      const teacherId = req.user._id;

      const request = await substituteRequestService.rejectRequest(requestId, teacherId, reason);

      res.json({
        success: true,
        message: 'Request rejected successfully',
        data: request
      });

    } catch (error) {
      console.error('Error in rejectRequest:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to reject request'
      });
    }
  }

  // Cancel substitute request
  async cancelRequest(req, res) {
    try {
      const { requestId } = req.params;
      const teacherId = req.user._id;

      const request = await substituteRequestService.cancelRequest(requestId, teacherId);

      res.json({
        success: true,
        message: 'Request cancelled successfully',
        data: request
      });

    } catch (error) {
      console.error('Error in cancelRequest:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel request'
      });
    }
  }

  // Get all substitute requests (admin/manager only)
  async getAllRequests(req, res) {
    try {
      // Check if user is admin or manager
      if (!req.user.role.includes('manager') && !req.user.role.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin or manager role required.'
        });
      }

      const { status, page = 1, limit = 20 } = req.query;

      const result = await substituteRequestService.getAllRequests(
        status,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        message: 'All requests retrieved successfully',
        data: result.requests,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Error in getAllRequests:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get all requests'
      });
    }
  }

  // Get substitute request statistics (admin/manager only)
  async getRequestStats(req, res) {
    try {
      // Check if user is admin or manager
      if (!req.user.role.includes('manager') && !req.user.role.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin or manager role required.'
        });
      }

      const SubstituteRequest = require('../models/substitute-request.model');

      const stats = await Promise.all([
        SubstituteRequest.countDocuments({ status: 'pending' }),
        SubstituteRequest.countDocuments({ status: 'approved' }),
        SubstituteRequest.countDocuments({ status: 'rejected' }),
        SubstituteRequest.countDocuments({ status: 'cancelled' }),
        SubstituteRequest.countDocuments({
          requestDate: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        })
      ]);

      const [pending, approved, rejected, cancelled, lastMonth] = stats;

      res.json({
        success: true,
        message: 'Request statistics retrieved successfully',
        data: {
          pending,
          approved,
          rejected,
          cancelled,
          total: pending + approved + rejected + cancelled,
          lastMonth
        }
      });

    } catch (error) {
      console.error('Error in getRequestStats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get request statistics'
      });
    }
  }
}

module.exports = new SubstituteRequestController();