const Joi = require('joi');

const teachingProgressValidation = {
  /**
   * Validation cho API lấy dữ liệu tiến trình dạy học
   */
  getTeachingProgress: (req, res, next) => {
    const schema = Joi.object({
      gradeLevel: Joi.number().integer().min(10).max(12).required()
        .messages({
          'number.base': 'Khối học phải là số',
          'number.integer': 'Khối học phải là số nguyên',
          'number.min': 'Khối học phải từ 10-12',
          'number.max': 'Khối học phải từ 10-12',
          'any.required': 'Khối học là bắt buộc'
        }),
      semester: Joi.number().integer().min(1).max(2).required()
        .messages({
          'number.base': 'Học kỳ phải là số',
          'number.integer': 'Học kỳ phải là số nguyên',
          'number.min': 'Học kỳ phải là 1 hoặc 2',
          'number.max': 'Học kỳ phải là 1 hoặc 2',
          'any.required': 'Học kỳ là bắt buộc'
        }),
      weekNumber: Joi.number().integer().min(1).max(52).required()
        .messages({
          'number.base': 'Số tuần phải là số',
          'number.integer': 'Số tuần phải là số nguyên',
          'number.min': 'Số tuần phải từ 1-52',
          'number.max': 'Số tuần phải từ 1-52',
          'any.required': 'Số tuần là bắt buộc'
        }),
      academicYear: Joi.alternatives().try(
        Joi.string().pattern(/^\d{4}-\d{4}$/),
        Joi.string().regex(/^[0-9a-fA-F]{24}$/)
      ).required()
        .messages({
          'alternatives.types': 'Năm học phải có định dạng YYYY-YYYY hoặc ObjectId hợp lệ',
          'any.required': 'Năm học là bắt buộc'
        })
    });

    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },

  /**
   * Validation cho API lấy cấu hình số tiết yêu cầu
   */
  getLessonRequirements: (req, res, next) => {
    const schema = Joi.object({
      gradeLevel: Joi.number().integer().min(10).max(12).required()
        .messages({
          'number.base': 'Khối học phải là số',
          'number.integer': 'Khối học phải là số nguyên',
          'number.min': 'Khối học phải từ 10-12',
          'number.max': 'Khối học phải từ 10-12',
          'any.required': 'Khối học là bắt buộc'
        }),
      semester: Joi.number().integer().min(1).max(2).required()
        .messages({
          'number.base': 'Học kỳ phải là số',
          'number.integer': 'Học kỳ phải là số nguyên',
          'number.min': 'Học kỳ phải là 1 hoặc 2',
          'number.max': 'Học kỳ phải là 1 hoặc 2',
          'any.required': 'Học kỳ là bắt buộc'
        }),
      academicYear: Joi.alternatives().try(
        Joi.string().pattern(/^\d{4}-\d{4}$/),
        Joi.string().regex(/^[0-9a-fA-F]{24}$/)
      ).required()
        .messages({
          'alternatives.types': 'Năm học phải có định dạng YYYY-YYYY hoặc ObjectId hợp lệ',
          'any.required': 'Năm học là bắt buộc'
        })
    });

    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },

  /**
   * Validation cho API cập nhật cấu hình số tiết yêu cầu
   */
  updateLessonRequirements: (req, res, next) => {
    const querySchema = Joi.object({
      gradeLevel: Joi.number().integer().min(10).max(12).required()
        .messages({
          'number.base': 'Khối học phải là số',
          'number.integer': 'Khối học phải là số nguyên',
          'number.min': 'Khối học phải từ 10-12',
          'number.max': 'Khối học phải từ 10-12',
          'any.required': 'Khối học là bắt buộc'
        }),
      semester: Joi.number().integer().min(1).max(2).required()
        .messages({
          'number.base': 'Học kỳ phải là số',
          'number.integer': 'Học kỳ phải là số nguyên',
          'number.min': 'Học kỳ phải là 1 hoặc 2',
          'number.max': 'Học kỳ phải là 1 hoặc 2',
          'any.required': 'Học kỳ là bắt buộc'
        }),
      academicYear: Joi.alternatives().try(
        Joi.string().pattern(/^\d{4}-\d{4}$/),
        Joi.string().regex(/^[0-9a-fA-F]{24}$/)
      ).required()
        .messages({
          'alternatives.types': 'Năm học phải có định dạng YYYY-YYYY hoặc ObjectId hợp lệ',
          'any.required': 'Năm học là bắt buộc'
        })
    });

    const bodySchema = Joi.object({
      requirements: Joi.object().pattern(
        Joi.string(),
        Joi.number().integer().min(0).max(10)
      ).required()
        .messages({
          'object.base': 'Requirements phải là object',
          'any.required': 'Requirements là bắt buộc'
        })
    });

    const queryError = querySchema.validate(req.query).error;
    const bodyError = bodySchema.validate(req.body).error;

    if (queryError) {
      return res.status(400).json({
        success: false,
        message: 'Query parameters không hợp lệ',
        errors: queryError.details.map(detail => detail.message)
      });
    }

    if (bodyError) {
      return res.status(400).json({
        success: false,
        message: 'Body data không hợp lệ',
        errors: bodyError.details.map(detail => detail.message)
      });
    }

    next();
  },

  /**
   * Validation cho API lấy dữ liệu điểm danh giáo viên
   */
  getTeacherRollcallData: (req, res, next) => {
    const schema = Joi.object({
      targetDate: Joi.date().iso().required()
        .messages({
          'date.base': 'Ngày không hợp lệ',
          'date.format': 'Ngày phải có định dạng ISO',
          'any.required': 'Ngày là bắt buộc'
        }),
      status: Joi.string().valid('all', 'present', 'absent', 'late').optional()
        .messages({
          'string.base': 'Trạng thái phải là string',
          'any.only': 'Trạng thái phải là all, present, absent, hoặc late'
        }),
      subject: Joi.string().optional()
        .messages({
          'string.base': 'Môn học phải là string'
        }),
      weekNumber: Joi.number().integer().min(1).max(52).optional()
        .messages({
          'number.base': 'Số tuần phải là số',
          'number.integer': 'Số tuần phải là số nguyên',
          'number.min': 'Số tuần phải từ 1-52',
          'number.max': 'Số tuần phải từ 1-52'
        }),
      academicYear: Joi.alternatives().try(
        Joi.string().pattern(/^\d{4}-\d{4}$/),
        Joi.string().regex(/^[0-9a-fA-F]{24}$/)
      ).optional()
        .messages({
          'alternatives.types': 'Năm học phải có định dạng YYYY-YYYY hoặc ObjectId hợp lệ'
        })
    });

    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },

  /**
   * Validation cho API lấy danh sách lớp theo khối
   */
  getClassesByGrade: (req, res, next) => {
    const schema = Joi.object({
      gradeLevel: Joi.number().integer().min(10).max(12).required()
        .messages({
          'number.base': 'Khối học phải là số',
          'number.integer': 'Khối học phải là số nguyên',
          'number.min': 'Khối học phải từ 10-12',
          'number.max': 'Khối học phải từ 10-12',
          'any.required': 'Khối học là bắt buộc'
        }),
      academicYear: Joi.alternatives().try(
        Joi.string().pattern(/^\d{4}-\d{4}$/),
        Joi.string().regex(/^[0-9a-fA-F]{24}$/)
      ).required()
        .messages({
          'alternatives.types': 'Năm học phải có định dạng YYYY-YYYY hoặc ObjectId hợp lệ',
          'any.required': 'Năm học là bắt buộc'
        })
    });

    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  }
};

module.exports = teachingProgressValidation; 