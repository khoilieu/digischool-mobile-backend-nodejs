const Joi = require('joi');

// Validation schema cho feedback
const feedbackSchema = Joi.object({
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base': 'Đánh giá phải là số',
      'number.integer': 'Đánh giá phải là số nguyên',
      'number.min': 'Đánh giá tối thiểu là 1 sao',
      'number.max': 'Đánh giá tối đa là 5 sao',
      'any.required': 'Đánh giá là bắt buộc'
    }),
  description: Joi.string()
    .trim()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.empty': 'Mô tả không được để trống',
      'string.min': 'Mô tả phải có ít nhất 10 ký tự',
      'string.max': 'Mô tả không được quá 1000 ký tự',
      'any.required': 'Mô tả là bắt buộc'
    })
});

// Validation schema cho query parameters
const scheduleQuerySchema = Joi.object({
  academicYear: Joi.string()
    .required()
    .messages({
      'string.empty': 'Năm học không được để trống',
      'any.required': 'Năm học là bắt buộc'
    }),
  startOfWeek: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': 'Ngày bắt đầu tuần phải là ngày hợp lệ',
      'date.format': 'Ngày bắt đầu tuần phải có định dạng ISO (YYYY-MM-DD)',
      'any.required': 'Ngày bắt đầu tuần là bắt buộc'
    }),
  endOfWeek: Joi.date()
    .iso()
    .min(Joi.ref('startOfWeek'))
    .required()
    .messages({
      'date.base': 'Ngày kết thúc tuần phải là ngày hợp lệ',
      'date.format': 'Ngày kết thúc tuần phải có định dạng ISO (YYYY-MM-DD)',
      'date.min': 'Ngày kết thúc tuần phải sau ngày bắt đầu tuần',
      'any.required': 'Ngày kết thúc tuần là bắt buộc'
    })
});

const paginationQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Trang phải là số',
      'number.integer': 'Trang phải là số nguyên',
      'number.min': 'Trang tối thiểu là 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Giới hạn phải là số',
      'number.integer': 'Giới hạn phải là số nguyên',
      'number.min': 'Giới hạn tối thiểu là 1',
      'number.max': 'Giới hạn tối đa là 100'
    })
});

// Middleware validation cho feedback
const validateFeedback = (req, res, next) => {
  const { error } = feedbackSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: error.details.map(detail => detail.message)
    });
  }
  
  next();
};

// Middleware validation cho query parameters của schedule
const validateScheduleQuery = (req, res, next) => {
  const { error } = scheduleQuerySchema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Tham số truy vấn không hợp lệ',
      errors: error.details.map(detail => detail.message)
    });
  }
  
  next();
};

// Middleware validation cho pagination
const validatePagination = (req, res, next) => {
  const { error } = paginationQuerySchema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Tham số phân trang không hợp lệ',
      errors: error.details.map(detail => detail.message)
    });
  }
  
  next();
};

// Middleware kiểm tra quyền phụ huynh
const checkParentRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Chưa đăng nhập'
    });
  }

  if (!req.user.role.includes('parents')) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập tính năng này'
    });
  }

  next();
};

module.exports = {
  validateFeedback,
  validateScheduleQuery,
  validatePagination,
  checkParentRole
}; 