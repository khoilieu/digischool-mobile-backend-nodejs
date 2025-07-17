const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subject.controller');
const { uploadExcelFile } = require('../middleware/subject.upload');
const { validateSubjectCreate, validateSubjectUpdate } = require('../middleware/subject.validation');
const { protect, authorize } = require('../../auth/middleware/auth.middleware');

// Yêu cầu xác thực cho tất cả các route
router.use(protect);

// Route nhập dữ liệu từ file Excel
router.post('/import/excel', 
  authorize('admin', 'manager'),
  uploadExcelFile,
  subjectController.importFromExcel
);

// Route tải mẫu file Excel
router.get('/import/template',
  authorize('admin', 'manager'),
  subjectController.downloadTemplate
);

// Route CRUD
router.get('/',
  subjectController.getAllSubjects
);

// Route lấy thống kê môn học
router.get('/stats',
  authorize('admin', 'manager'),
  subjectController.getSubjectStats
);

// Route lấy thông tin môn học theo ID
router.get('/:id',
  subjectController.getSubjectById
);

// Route tạo môn học mới
router.post('/',
  authorize('admin', 'manager'),
  validateSubjectCreate,
  subjectController.createSubject
);

// Route cập nhật môn học theo ID
router.put('/:id',
  authorize('admin', 'manager'),
  validateSubjectUpdate,
  subjectController.updateSubject
);

// Route xóa môn học theo ID
router.delete('/:id',
  authorize('admin', 'manager'),
  subjectController.deleteSubject
);

module.exports = router; 