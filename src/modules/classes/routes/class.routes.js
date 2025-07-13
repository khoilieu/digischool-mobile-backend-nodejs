const express = require('express');
const router = express.Router();
const classController = require('../controllers/class.controller');
const { 
  validateCreateClass,
  validateUpdateClass,
  validateGetClasses,
  validateGetClassById,
  validateDeleteClass,
  validateGetAvailableTeachers
} = require('../middleware/class.validation');
const { protect, authorize } = require('../../auth/middleware/auth.middleware');
const { validationResult } = require('express-validator');

// Middleware để xử lý lỗi validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Lấy danh sách giáo viên có thể làm chủ nhiệm
router.get('/available-teachers', 
  protect,
  authorize('manager', 'admin'),
  validateGetAvailableTeachers,
  handleValidationErrors,
  classController.getAvailableHomeroomTeachers
);

// Lấy danh sách lớp học
// Ví dụ: /api/classes?grade=12&academicYear=2024-2025
router.get('/', 
  protect,
  validateGetClasses,
  handleValidationErrors,
  classController.getClasses
);

// Lấy thông tin chi tiết lớp học
router.get('/:id', 
  protect,
  validateGetClassById,
  handleValidationErrors,
  classController.getClassById
);

// Tạo lớp học mới
router.post('/', 
  protect,
  authorize('manager', 'admin'),
  validateCreateClass,
  handleValidationErrors,
  classController.createClass
);

// Cập nhật thông tin lớp học
router.put('/:id', 
  protect,
  authorize('manager', 'admin'),
  validateUpdateClass,
  handleValidationErrors,
  classController.updateClass
);

// Xóa lớp học (soft delete)
router.delete('/:id', 
  protect,
  authorize('manager', 'admin'),
  validateDeleteClass,
  handleValidationErrors,
  classController.deleteClass
);

module.exports = router; 