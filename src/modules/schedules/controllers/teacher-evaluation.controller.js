const TeacherLessonEvaluation = require('../models/teacher-lesson-evaluation.model');
const Lesson = require('../models/lesson.model');
const User = require('../../auth/models/user.model');

class TeacherEvaluationController {
  
  // API để tạo đánh giá tiết học mới
  async createEvaluation(req, res, next) {
    try {
      const { lessonId } = req.params;
      const {
        curriculumLesson,
        content,
        description,
        rating,
        comments,
        evaluationDetails,
        absentStudents,
        oralTests,
        violations
      } = req.body;
      
      const teacherId = req.user._id;
      
      // Validate required fields
      if (!curriculumLesson || !content || !rating) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: curriculumLesson, content, rating'
        });
      }
      
      // Validate rating
      if (!['A+', 'A', 'B+', 'B', 'C'].includes(rating)) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be one of: A+, A, B+, B, C'
        });
      }
      
      // Lấy thông tin lesson để validation
      const lesson = await Lesson.findById(lessonId)
        .populate('class', 'className')
        .populate('subject', 'subjectName subjectCode');
      
      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }
      
      // Kiểm tra giáo viên có quyền đánh giá lesson này không
      // Cho phép cả giáo viên đảm nhiệm và giáo viên dạy thay đánh giá
      const isMainTeacher = lesson.teacher && lesson.teacher._id.toString() === teacherId.toString();
      const isSubstituteTeacher = lesson.substituteTeacher && lesson.substituteTeacher._id.toString() === teacherId.toString();
      
      if (!isMainTeacher && !isSubstituteTeacher) {
        return res.status(403).json({
          success: false,
          message: 'Only the assigned teacher or substitute teacher can evaluate this lesson'
        });
      }
      
      // Kiểm tra lesson có thể đánh giá không (chỉ đánh giá lesson completed)
      if (lesson.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Can only evaluate completed lessons'
        });
      }
      
      // Kiểm tra đã đánh giá chưa
      const existingEvaluation = await TeacherLessonEvaluation.findOne({
        lesson: lessonId,
        teacher: teacherId
      });
      
      if (existingEvaluation) {
        return res.status(409).json({
          success: false,
          message: 'Lesson has already been evaluated'
        });
      }
      
      // Tạo đánh giá mới
      const evaluation = new TeacherLessonEvaluation({
        lesson: lessonId,
        teacher: teacherId,
        class: lesson.class._id,
        subject: lesson.subject._id,
        lessonContent: {
          curriculumLesson,
          content,
          description: description || ''
        },
        evaluation: {
          rating,
          comments: comments || '',
          details: evaluationDetails || {}
        },
        absentStudents: absentStudents || [],
        oralTests: oralTests || [],
        violations: violations || [],
        status: 'draft'
      });
      
      // Tính số học sinh có mặt từ lesson attendance
      if (lesson.attendance && lesson.attendance.totalStudents) {
        evaluation.summary.totalPresent = lesson.attendance.totalStudents - (absentStudents?.length || 0);
      }
      
      await evaluation.save();

      lesson.isEvaluatedByTeacher = true;
      await lesson.save();
      
      // Xóa bỏ phần tự động chuyển lesson sang completed
      // Lesson phải được complete trước khi đánh giá
      
      // Xử lý đặc biệt cho makeup lesson - không cần thiết nữa vì lesson đã completed
      // if (lesson.type === 'makeup') {
      //   const LessonRequestService = require('../services/lesson-request.service');
      //   const lessonRequestService = new LessonRequestService();
      //   await lessonRequestService.handleMakeupLessonCompleted(lesson._id);
      // }
      
      // Populate để trả về
      await evaluation.populate([
        { path: 'lesson', select: 'lessonId scheduledDate actualDate topic' },
        { path: 'class', select: 'className' },
        { path: 'subject', select: 'subjectName subjectCode' },
        { path: 'absentStudents.student', select: 'name studentId' },
        { path: 'oralTests.student', select: 'name studentId' },
        { path: 'violations.student', select: 'name studentId' }
      ]);
      
      res.status(201).json({
        success: true,
        message: 'Tạo đánh giá tiết học thành công',
        data: {
          evaluationId: evaluation._id,
          lesson: {
            lessonId: evaluation.lesson.lessonId,
            scheduledDate: evaluation.lesson.scheduledDate,
            actualDate: evaluation.lesson.actualDate,
            topic: evaluation.lesson.topic
          },
          class: evaluation.class.className,
          subject: {
            name: evaluation.subject.subjectName,
            code: evaluation.subject.subjectCode
          },
          lessonContent: evaluation.lessonContent,
          evaluation: evaluation.evaluation,
          summary: evaluation.summary,
          absentStudents: evaluation.absentStudents,
          oralTests: evaluation.oralTests,
          violations: evaluation.violations,
          status: evaluation.status,
          createdAt: evaluation.createdAt
        }
      });
      
    } catch (error) {
      console.error('❌ Error in createEvaluation:', error.message);
      next(error);
    }
  }
  
  // API để cập nhật đánh giá tiết học
  async updateEvaluation(req, res, next) {
    try {
      const { evaluationId } = req.params;
      const {
        curriculumLesson,
        content,
        description,
        rating,
        comments,
        evaluationDetails,
        absentStudents,
        oralTests,
        violations
      } = req.body;
      
      const teacherId = req.user._id;
      
      // Tìm đánh giá
      const evaluation = await TeacherLessonEvaluation.findById(evaluationId);
      if (!evaluation) {
        return res.status(404).json({
          success: false,
          message: 'Evaluation not found'
        });
      }
      
      // Kiểm tra quyền sở hữu
      if (evaluation.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own evaluations'
        });
      }
      
      // Kiểm tra trạng thái có thể sửa không
      if (evaluation.status === 'submitted') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update submitted evaluation'
        });
      }
      
      // Cập nhật thông tin
      if (curriculumLesson) evaluation.lessonContent.curriculumLesson = curriculumLesson;
      if (content) evaluation.lessonContent.content = content;
      if (description !== undefined) evaluation.lessonContent.description = description;
      
      if (rating) {
        if (!['A+', 'A', 'B+', 'B', 'C'].includes(rating)) {
          return res.status(400).json({
            success: false,
            message: 'Rating must be one of: A+, A, B+, B, C'
          });
        }
        evaluation.evaluation.rating = rating;
      }
      
      if (comments) evaluation.evaluation.comments = comments;
      if (evaluationDetails) {
        evaluation.evaluation.details = { ...evaluation.evaluation.details, ...evaluationDetails };
      }
      
      if (absentStudents !== undefined) evaluation.absentStudents = absentStudents;
      if (oralTests !== undefined) evaluation.oralTests = oralTests;
      if (violations !== undefined) evaluation.violations = violations;
      
      await evaluation.save();
      
      // Populate để trả về
      await evaluation.populate([
        { path: 'lesson', select: 'lessonId scheduledDate actualDate topic' },
        { path: 'class', select: 'className' },
        { path: 'subject', select: 'subjectName subjectCode' },
        { path: 'absentStudents.student', select: 'name studentId' },
        { path: 'oralTests.student', select: 'name studentId' },
        { path: 'violations.student', select: 'name studentId' }
      ]);
      
      res.status(200).json({
        success: true,
        message: 'Cập nhật đánh giá thành công',
        data: {
          evaluationId: evaluation._id,
          lessonContent: evaluation.lessonContent,
          evaluation: evaluation.evaluation,
          summary: evaluation.summary,
          absentStudents: evaluation.absentStudents,
          oralTests: evaluation.oralTests,
          violations: evaluation.violations,
          status: evaluation.status,
          updatedAt: evaluation.updatedAt
        }
      });
      
    } catch (error) {
      console.error('❌ Error in updateEvaluation:', error.message);
      next(error);
    }
  }
  
  // API để lấy danh sách đánh giá của giáo viên
  async getTeacherEvaluations(req, res, next) {
    try {
      const teacherId = req.user._id;
      const { 
        classId, 
        subjectId, 
        status,
        rating,
        startDate, 
        endDate,
        page = 1,
        limit = 20
      } = req.query;
      
      const options = {};
      if (classId) options.classId = classId;
      if (subjectId) options.subjectId = subjectId;
      if (status) options.status = status;
      if (rating) options.rating = rating;
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Lấy đánh giá với pagination
      const evaluations = await TeacherLessonEvaluation.getTeacherEvaluations(teacherId, options)
        .skip(skip)
        .limit(parseInt(limit));
      
      // Đếm tổng số đánh giá
      const total = await TeacherLessonEvaluation.countDocuments({
        teacher: teacherId,
        ...(options.classId && { class: options.classId }),
        ...(options.subjectId && { subject: options.subjectId }),
        ...(options.status && { status: options.status }),
        ...(options.rating && { 'evaluation.rating': options.rating }),
        ...(options.startDate && { createdAt: { $gte: options.startDate } }),
        ...(options.endDate && { createdAt: { ...{}, $lte: options.endDate } })
      });
      
      const totalPages = Math.ceil(total / parseInt(limit));
      
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách đánh giá thành công',
        data: {
          evaluations: evaluations.map(evaluation => ({
            evaluationId: evaluation._id,
            lesson: {
              lessonId: evaluation.lesson.lessonId,
              scheduledDate: evaluation.lesson.scheduledDate,
              actualDate: evaluation.lesson.actualDate,
              topic: evaluation.lesson.topic
            },
            class: evaluation.class.className,
            subject: {
              name: evaluation.subject.subjectName,
              code: evaluation.subject.subjectCode
            },
            lessonContent: evaluation.lessonContent,
            evaluation: evaluation.evaluation,
            summary: evaluation.summary,
            status: evaluation.status,
            createdAt: evaluation.createdAt,
            updatedAt: evaluation.updatedAt
          }))
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      });
      
    } catch (error) {
      console.error('❌ Error in getTeacherEvaluations:', error.message);
      next(error);
    }
  }
  
  // API để lấy chi tiết một đánh giá
  async getEvaluationDetail(req, res, next) {
    try {
      const { evaluationId } = req.params;
      const teacherId = req.user._id;
      
      const evaluation = await TeacherLessonEvaluation.findById(evaluationId)
        .populate('lesson', 'lessonId scheduledDate actualDate topic status notes')
        .populate('class', 'className academicYear')
        .populate('subject', 'subjectName subjectCode')
        .populate('teacher', 'name email')
        .populate('absentStudents.student', 'name studentId email')
        .populate('oralTests.student', 'name studentId email')
        .populate('violations.student', 'name studentId email');
      
      if (!evaluation) {
        return res.status(404).json({
          success: false,
          message: 'Evaluation not found'
        });
      }
      
      // Kiểm tra quyền truy cập (teacher có thể xem đánh giá của mình, manager/admin có thể xem tất cả)
      if (!req.user.role.includes('manager') && !req.user.role.includes('admin')) {
        if (evaluation.teacher._id.toString() !== teacherId.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only view your own evaluations'
          });
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'Lấy chi tiết đánh giá thành công',
        data: {
          evaluationId: evaluation._id,
          lesson: {
            lessonId: evaluation.lesson.lessonId,
            scheduledDate: evaluation.lesson.scheduledDate,
            actualDate: evaluation.lesson.actualDate,
            topic: evaluation.lesson.topic,
            status: evaluation.lesson.status,
            notes: evaluation.lesson.notes
          },
          class: {
            name: evaluation.class.className,
            academicYear: evaluation.class.academicYear
          },
          subject: {
            name: evaluation.subject.subjectName,
            code: evaluation.subject.subjectCode
          },
          teacher: {
            name: evaluation.teacher.name,
            email: evaluation.teacher.email
          },
          lessonContent: evaluation.lessonContent,
          evaluation: evaluation.evaluation,
          absentStudents: evaluation.absentStudents.map(absent => ({
            student: {
              id: absent.student._id,
              name: absent.student.name,
              studentId: absent.student.studentId,
              email: absent.student.email
            },
            isExcused: absent.isExcused,
            reason: absent.reason,
            recordedAt: absent.recordedAt
          })),
          oralTests: evaluation.oralTests.map(test => ({
            student: {
              id: test.student._id,
              name: test.student.name,
              studentId: test.student.studentId,
              email: test.student.email
            },
            score: test.score,
            question: test.question,
            comment: test.comment,
            testedAt: test.testedAt
          })),
          violations: evaluation.violations.map(violation => ({
            student: {
              id: violation.student._id,
              name: violation.student.name,
              studentId: violation.student.studentId,
              email: violation.student.email
            },
            description: violation.description,
            type: violation.type,
            severity: violation.severity,
            action: violation.action,
            recordedAt: violation.recordedAt
          })),
          summary: evaluation.summary,
          status: evaluation.status,
          completedAt: evaluation.completedAt,
          submittedAt: evaluation.submittedAt,
          createdAt: evaluation.createdAt,
          updatedAt: evaluation.updatedAt
        }
      });
      
    } catch (error) {
      console.error('❌ Error in getEvaluationDetail:', error.message);
      next(error);
    }
  }
  
  // API để hoàn thành đánh giá
  async completeEvaluation(req, res, next) {
    try {
      const { evaluationId } = req.params;
      const teacherId = req.user._id;
      
      const evaluation = await TeacherLessonEvaluation.findById(evaluationId);
      if (!evaluation) {
        return res.status(404).json({
          success: false,
          message: 'Evaluation not found'
        });
      }
      
      // Kiểm tra quyền sở hữu
      if (evaluation.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only complete your own evaluations'
        });
      }
      
      // Kiểm tra trạng thái
      if (evaluation.status === 'submitted') {
        return res.status(400).json({
          success: false,
          message: 'Evaluation is already submitted'
        });
      }
      
      await evaluation.complete();
      
      // Cập nhật lesson status và xử lý makeup lesson
      const lesson = await Lesson.findById(evaluation.lesson);
      if (lesson) {
        lesson.status = 'completed';
        await lesson.save();
        
        // Xử lý đặc biệt cho makeup lesson
        if (lesson.type === 'makeup') {
          const LessonRequestService = require('../services/lesson-request.service');
          const lessonRequestService = new LessonRequestService();
          await lessonRequestService.handleMakeupLessonCompleted(lesson._id);
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'Hoàn thành đánh giá thành công',
        data: {
          evaluationId: evaluation._id,
          status: evaluation.status,
          completedAt: evaluation.completedAt
        }
      });
      
    } catch (error) {
      console.error('❌ Error in completeEvaluation:', error.message);
      next(error);
    }
  }
  
  // API để submit đánh giá
  async submitEvaluation(req, res, next) {
    try {
      const { evaluationId } = req.params;
      const teacherId = req.user._id;
      
      const evaluation = await TeacherLessonEvaluation.findById(evaluationId);
      if (!evaluation) {
        return res.status(404).json({
          success: false,
          message: 'Evaluation not found'
        });
      }
      
      // Kiểm tra quyền sở hữu
      if (evaluation.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only submit your own evaluations'
        });
      }
      
      // Kiểm tra trạng thái
      if (evaluation.status === 'submitted') {
        return res.status(400).json({
          success: false,
          message: 'Evaluation is already submitted'
        });
      }
      
      await evaluation.submit();
      
      // Cập nhật lesson status và xử lý makeup lesson
      const lesson = await Lesson.findById(evaluation.lesson);
      if (lesson) {
        lesson.status = 'completed';
        await lesson.save();
        
        // Xử lý đặc biệt cho makeup lesson
        if (lesson.type === 'makeup') {
          const LessonRequestService = require('../services/lesson-request.service');
          const lessonRequestService = new LessonRequestService();
          await lessonRequestService.handleMakeupLessonCompleted(lesson._id);
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'Submit đánh giá thành công',
        data: {
          evaluationId: evaluation._id,
          status: evaluation.status,
          completedAt: evaluation.completedAt,
          submittedAt: evaluation.submittedAt
        }
      });
      
    } catch (error) {
      console.error('❌ Error in submitEvaluation:', error.message);
      next(error);
    }
  }
  
  // API để thêm học sinh vắng
  async addAbsentStudent(req, res, next) {
    try {
      const { evaluationId } = req.params;
      const { studentId, isExcused, reason } = req.body;
      const teacherId = req.user._id;
      
      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required'
        });
      }
      
      const evaluation = await TeacherLessonEvaluation.findById(evaluationId);
      if (!evaluation) {
        return res.status(404).json({
          success: false,
          message: 'Evaluation not found'
        });
      }
      
      // Kiểm tra quyền sở hữu
      if (evaluation.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only modify your own evaluations'
        });
      }
      
      // Kiểm tra trạng thái
      if (evaluation.status === 'submitted') {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify submitted evaluation'
        });
      }
      
      await evaluation.addAbsentStudent(studentId, isExcused || false, reason || '');
      
      res.status(200).json({
        success: true,
        message: 'Thêm học sinh vắng thành công',
        data: {
          evaluationId: evaluation._id,
          summary: evaluation.summary
        }
      });
      
    } catch (error) {
      console.error('❌ Error in addAbsentStudent:', error.message);
      next(error);
    }
  }
  
  // API để thêm kiểm tra miệng
  async addOralTest(req, res, next) {
    try {
      const { evaluationId } = req.params;
      const { studentId, score, question, comment } = req.body;
      const teacherId = req.user._id;
      
      if (!studentId || score === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Student ID and score are required'
        });
      }
      
      // Validate score
      if (typeof score !== 'number' || score < 0 || score > 10) {
        return res.status(400).json({
          success: false,
          message: 'Score must be a number between 0 and 10'
        });
      }
      
      const evaluation = await TeacherLessonEvaluation.findById(evaluationId);
      if (!evaluation) {
        return res.status(404).json({
          success: false,
          message: 'Evaluation not found'
        });
      }
      
      // Kiểm tra quyền sở hữu
      if (evaluation.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only modify your own evaluations'
        });
      }
      
      // Kiểm tra trạng thái
      if (evaluation.status === 'submitted') {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify submitted evaluation'
        });
      }
      
      await evaluation.addOralTest(studentId, score, question || '', comment || '');
      
      res.status(200).json({
        success: true,
        message: 'Thêm kiểm tra miệng thành công',
        data: {
          evaluationId: evaluation._id,
          summary: evaluation.summary
        }
      });
      
    } catch (error) {
      console.error('❌ Error in addOralTest:', error.message);
      next(error);
    }
  }
  
  // API để thêm vi phạm
  async addViolation(req, res, next) {
    try {
      const { evaluationId } = req.params;
      const { studentId, description, type, severity, action } = req.body;
      const teacherId = req.user._id;
      
      if (!studentId || !description) {
        return res.status(400).json({
          success: false,
          message: 'Student ID and description are required'
        });
      }
      
      const evaluation = await TeacherLessonEvaluation.findById(evaluationId);
      if (!evaluation) {
        return res.status(404).json({
          success: false,
          message: 'Evaluation not found'
        });
      }
      
      // Kiểm tra quyền sở hữu
      if (evaluation.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only modify your own evaluations'
        });
      }
      
      // Kiểm tra trạng thái
      if (evaluation.status === 'submitted') {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify submitted evaluation'
        });
      }
      
      await evaluation.addViolation(
        studentId, 
        description, 
        type || 'other', 
        severity || 'minor', 
        action || ''
      );
      
      res.status(200).json({
        success: true,
        message: 'Thêm vi phạm thành công',
        data: {
          evaluationId: evaluation._id,
          summary: evaluation.summary
        }
      });
      
    } catch (error) {
      console.error('❌ Error in addViolation:', error.message);
      next(error);
    }
  }
  
  // API để lấy thống kê đánh giá của giáo viên
  async getEvaluationStats(req, res, next) {
    try {
      const teacherId = req.user._id;
      const { startDate, endDate, subjectId, classId } = req.query;
      
      const options = {};
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);
      if (subjectId) options.subjectId = subjectId;
      if (classId) options.classId = classId;
      
      const stats = await TeacherLessonEvaluation.getTeacherEvaluationStats(teacherId, options);
      
      res.status(200).json({
        success: true,
        message: 'Lấy thống kê đánh giá thành công',
        data: stats
      });
      
    } catch (error) {
      console.error('❌ Error in getEvaluationStats:', error.message);
      next(error);
    }
  }
}

module.exports = new TeacherEvaluationController();