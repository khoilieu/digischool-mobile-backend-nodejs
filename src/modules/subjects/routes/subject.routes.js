const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subject.controller');
const { uploadExcelFile } = require('../middleware/subject.upload');
const { validateSubjectCreate, validateSubjectUpdate } = require('../middleware/subject.validation');
const { protect, authorize } = require('../../auth/middleware/auth.middleware');

// Authentication required for all routes
router.use(protect);

// Excel import routes
router.post('/import/excel', 
  authorize('admin', 'manager'),
  uploadExcelFile,
  subjectController.importFromExcel
);

router.get('/import/template',
  authorize('admin', 'manager'),
  subjectController.downloadTemplate
);

// CRUD routes
router.get('/',
  subjectController.getAllSubjects
);

router.get('/stats',
  authorize('admin', 'manager'),
  subjectController.getSubjectStats
);

router.get('/:id',
  subjectController.getSubjectById
);

router.post('/',
  authorize('admin', 'manager'),
  validateSubjectCreate,
  subjectController.createSubject
);

router.put('/:id',
  authorize('admin', 'manager'),
  validateSubjectUpdate,
  subjectController.updateSubject
);

router.delete('/:id',
  authorize('admin', 'manager'),
  subjectController.deleteSubject
);

module.exports = router; 