const express = require('express');
const router = express.Router();
const noteController = require('../controllers/note.controller');
const auth = require('../../auth/middleware/auth.middleware');
const noteValidation = require('../middleware/note.validation');

// Tất cả route đều cần xác thực
router.use(auth.protect);

// Tạo ghi chú mới
router.post('/', noteValidation.create, noteController.createNote);
// Lấy danh sách ghi chú của user tại 1 tiết học
router.get('/', noteController.getNotesByLesson);
// Cập nhật ghi chú (PATCH)
router.patch('/:id', noteValidation.update, noteController.updateNote);
// Xóa ghi chú
router.delete('/:id', noteController.deleteNote);

module.exports = router; 