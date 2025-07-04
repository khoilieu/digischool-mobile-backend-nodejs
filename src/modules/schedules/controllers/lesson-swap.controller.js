const LessonSwapService = require('../services/lesson-swap.service');
const { validationResult } = require('express-validator');

class LessonSwapController {
  constructor() {
    this.lessonSwapService = new LessonSwapService();
  }
  
  // Lấy các tiết học của giáo viên để đổi
  async getTeacherLessonsForSwap(req, res) {
    try {
      const { teacherId, academicYear, startOfWeek, endOfWeek } = req.query;
      
      // Validate required parameters
      if (!teacherId || !academicYear || !startOfWeek || !endOfWeek) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: teacherId, academicYear, startOfWeek, endOfWeek'
        });
      }
      
      // Validate teacher authorization (teacher can only see their own lessons)
      if (req.user.role === 'teacher' && req.user.id !== teacherId) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own lessons'
        });
      }
      
      const result = await this.lessonSwapService.getTeacherLessonsForWeek(
        teacherId,
        academicYear,
        startOfWeek,
        endOfWeek
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error in getTeacherLessonsForSwap:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Lấy các tiết trống có thể đổi
  async getAvailableLessonsForSwap(req, res) {
    try {
      const { classId, academicYear, startOfWeek, endOfWeek, subjectId } = req.query;
      
      // Validate required parameters
      if (!classId || !academicYear || !startOfWeek || !endOfWeek || !subjectId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: classId, academicYear, startOfWeek, endOfWeek, subjectId'
        });
      }
      
      const result = await this.lessonSwapService.getAvailableLessonsForSwap(
        classId,
        academicYear,
        startOfWeek,
        endOfWeek,
        subjectId
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error in getAvailableLessonsForSwap:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Tạo yêu cầu đổi tiết
  async createLessonSwapRequest(req, res) {
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
      
      const { originalLessonId, replacementLessonId, reason } = req.body;
      
      const swapData = {
        teacherId: req.user.id,
        originalLessonId,
        replacementLessonId,
        reason
      };
      
      const result = await this.lessonSwapService.createLessonSwapRequest(swapData);
      
      res.status(201).json(result);
      
    } catch (error) {
      console.error('❌ Error in createLessonSwapRequest:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Lấy danh sách yêu cầu đổi tiết của giáo viên
  async getTeacherSwapRequests(req, res) {
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
          message: 'You can only view your own swap requests'
        });
      }
      
      const options = {};
      if (req.query.status) options.status = req.query.status;
      if (req.query.startDate) options.startDate = new Date(req.query.startDate);
      if (req.query.endDate) options.endDate = new Date(req.query.endDate);
      
      // Use static method from model
      const LessonSwap = require('../models/lesson-swap.model');
      const swapRequests = await LessonSwap.findByTeacher(teacherId, options);
      
      res.json({
        success: true,
        swapRequests: swapRequests,
        count: swapRequests.length
      });
      
    } catch (error) {
      console.error('❌ Error in getTeacherSwapRequests:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Lấy danh sách yêu cầu đổi tiết đang chờ duyệt (cho manager)
  async getPendingSwapRequests(req, res) {
    try {
      const options = {};
      if (req.query.academicYear) options.academicYear = req.query.academicYear;
      if (req.query.classId) options.classId = req.query.classId;
      
      // Use static method from model
      const LessonSwap = require('../models/lesson-swap.model');
      const pendingRequests = await LessonSwap.findPendingRequests(options);
      
      res.json({
        success: true,
        pendingRequests: pendingRequests,
        count: pendingRequests.length
      });
      
    } catch (error) {
      console.error('❌ Error in getPendingSwapRequests:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Duyệt yêu cầu đổi tiết
  async approveSwapRequest(req, res) {
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
      
      const result = await this.lessonSwapService.approveSwapRequest(
        requestId,
        req.user.id,
        comment
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error in approveSwapRequest:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Từ chối yêu cầu đổi tiết
  async rejectSwapRequest(req, res) {
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
      
      const result = await this.lessonSwapService.rejectSwapRequest(
        requestId,
        req.user.id,
        comment
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error in rejectSwapRequest:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Lấy chi tiết yêu cầu đổi tiết
  async getSwapRequestDetails(req, res) {
    try {
      const { requestId } = req.params;
      
      const LessonSwap = require('../models/lesson-swap.model');
      const swapRequest = await LessonSwap.findById(requestId)
        .populate('requestingTeacher', 'name email fullName')
        .populate('originalLesson', 'lessonId scheduledDate timeSlot topic status')
        .populate('replacementLesson', 'lessonId scheduledDate timeSlot status')
        .populate('processedBy', 'name email fullName')
        .populate('additionalInfo.classInfo', 'className gradeLevel')
        .populate('additionalInfo.subjectInfo', 'subjectName subjectCode')
        .populate('additionalInfo.academicYear', 'name startDate endDate');
      
      if (!swapRequest) {
        return res.status(404).json({
          success: false,
          message: 'Swap request not found'
        });
      }
      
      // Validate authorization
      const isTeacher = req.user.role === 'teacher' && req.user.id === swapRequest.requestingTeacher._id.toString();
      const isManager = ['manager', 'admin'].includes(req.user.role);
      
      if (!isTeacher && !isManager) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this swap request'
        });
      }
      
      res.json({
        success: true,
        swapRequest: swapRequest
      });
      
    } catch (error) {
      console.error('❌ Error in getSwapRequestDetails:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = LessonSwapController; 