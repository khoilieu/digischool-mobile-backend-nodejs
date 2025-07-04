const LessonRequestService = require('../services/lesson-request.service');
const { validationResult } = require('express-validator');

class LessonRequestController {
  constructor() {
    this.lessonRequestService = new LessonRequestService();
  }
  
  // Lấy các tiết học của giáo viên để tạo request (swap/makeup)
  async getTeacherLessonsForRequest(req, res) {
    try {
      const { teacherId, academicYear, startOfWeek, endOfWeek, requestType = 'swap' } = req.query;
      
      // Validate required parameters
      if (!teacherId || !academicYear || !startOfWeek || !endOfWeek) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: teacherId, academicYear, startOfWeek, endOfWeek'
        });
      }
      
      // Validate requestType
      if (!['swap', 'makeup'].includes(requestType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid requestType. Must be swap or makeup'
        });
      }
      
      // Validate teacher authorization (teacher can only see their own lessons)
      if (req.user.role === 'teacher' && req.user.id !== teacherId) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own lessons'
        });
      }
      
      const result = await this.lessonRequestService.getTeacherLessonsForWeek(
        teacherId,
        academicYear,
        startOfWeek,
        endOfWeek,
        requestType
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error in getTeacherLessonsForRequest:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Lấy các tiết trống có thể dùng cho request
  async getAvailableLessonsForRequest(req, res) {
    try {
      const { classId, academicYear, startOfWeek, endOfWeek, subjectId } = req.query;
      
      // Validate required parameters
      if (!classId || !academicYear || !startOfWeek || !endOfWeek || !subjectId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: classId, academicYear, startOfWeek, endOfWeek, subjectId'
        });
      }
      
      const result = await this.lessonRequestService.getAvailableLessonsForRequest(
        classId,
        academicYear,
        startOfWeek,
        endOfWeek,
        subjectId
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error in getAvailableLessonsForRequest:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Tạo yêu cầu đổi tiết hoặc dạy bù
  async createLessonRequest(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { originalLessonId, replacementLessonId, reason, requestType, absentReason } = req.body;
      
      const requestData = {
        teacherId: req.user.id,
        originalLessonId,
        replacementLessonId,
        reason,
        requestType,
        absentReason // Chỉ dùng cho makeup request
      };
      
      const result = await this.lessonRequestService.createLessonRequest(requestData);
      
      res.status(201).json(result);
      
    } catch (error) {
      console.error('❌ Error in createLessonRequest:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Lấy danh sách yêu cầu của giáo viên
  async getTeacherRequests(req, res) {
    try {
      const teacherId = req.user.role === 'teacher' ? req.user.id : req.query.teacherId;
      
      if (!teacherId) {
        return res.status(400).json({
          success: false,
          message: 'Teacher ID is required'
        });
      }
      
      // Validate teacher authorization
      if (req.user.role === 'teacher' && req.user.id !== teacherId) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own requests'
        });
      }
      
      const options = {};
      if (req.query.status) options.status = req.query.status;
      if (req.query.requestType) options.requestType = req.query.requestType;
      if (req.query.startDate) options.startDate = new Date(req.query.startDate);
      if (req.query.endDate) options.endDate = new Date(req.query.endDate);
      
      // Use static method from model
      const LessonRequest = require('../models/lesson-request.model');
      const requests = await LessonRequest.findByTeacher(teacherId, options);
      
      res.json({
        success: true,
        requests: requests,
        count: requests.length
      });
      
    } catch (error) {
      console.error('❌ Error in getTeacherRequests:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Lấy danh sách yêu cầu đang chờ duyệt (cho manager)
  async getPendingRequests(req, res) {
    try {
      const options = {};
      if (req.query.academicYear) options.academicYear = req.query.academicYear;
      if (req.query.classId) options.classId = req.query.classId;
      if (req.query.requestType) options.requestType = req.query.requestType;
      
      // Use static method from model
      const LessonRequest = require('../models/lesson-request.model');
      const pendingRequests = await LessonRequest.findPendingRequests(options);
      
      res.json({
        success: true,
        pendingRequests: pendingRequests,
        count: pendingRequests.length
      });
      
    } catch (error) {
      console.error('❌ Error in getPendingRequests:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Duyệt yêu cầu
  async approveRequest(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { requestId } = req.params;
      const { comment = '' } = req.body;
      
      const result = await this.lessonRequestService.approveRequest(
        requestId,
        req.user.id,
        comment
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error in approveRequest:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Từ chối yêu cầu
  async rejectRequest(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { requestId } = req.params;
      const { comment = '' } = req.body;
      
      const result = await this.lessonRequestService.rejectRequest(
        requestId,
        req.user.id,
        comment
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error in rejectRequest:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Lấy chi tiết yêu cầu
  async getRequestDetails(req, res) {
    try {
      const { requestId } = req.params;
      
      const LessonRequest = require('../models/lesson-request.model');
      const request = await LessonRequest.findById(requestId)
        .populate({
          path: 'originalLesson',
          select: 'lessonId scheduledDate timeSlot topic status type',
          populate: {
            path: 'timeSlot',
            select: 'period name startTime endTime'
          }
        })
                  .populate({
            path: 'replacementLesson',
            select: 'lessonId scheduledDate timeSlot topic status type',
            populate: {
              path: 'timeSlot',
              select: 'period name startTime endTime'
            }
          })
        .populate('requestingTeacher', 'name email fullName')
        .populate('processedBy', 'name email fullName')
        .populate('additionalInfo.classInfo', 'className gradeLevel')
        .populate('additionalInfo.subjectInfo', 'subjectName subjectCode')
        .populate('additionalInfo.academicYear', 'name startDate endDate')
        .populate('makeupInfo.createdMakeupLesson', 'lessonId scheduledDate timeSlot status');
      
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Request not found'
        });
      }
      
      // Check authorization
      if (req.user.role === 'teacher' && req.user.id !== request.requestingTeacher._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own requests'
        });
      }
      
      res.json({
        success: true,
        request: request
      });
      
    } catch (error) {
      console.error('❌ Error in getRequestDetails:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = LessonRequestController; 