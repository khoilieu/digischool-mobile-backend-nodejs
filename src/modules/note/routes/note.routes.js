const express = require("express");
const router = express.Router();
const noteController = require("../controllers/note.controller");
const authMiddleware = require("../../auth/middleware/auth.middleware");
const noteValidation = require("../middleware/note.validation");

// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// POST /api/notes/create - Tạo ghi chú mới ✅
router.post(
  "/create",
  noteValidation.validateCreateNote(),
  noteController.createNote
);

// GET /api/notes/get-by-lesson - Lấy danh sách ghi chú của user tại 1 tiết học ✅
router.get(
  "/get-by-lesson",
  noteValidation.validateGetNotesByLesson(),
  noteController.getNotesByLesson
);

// PATCH /api/notes/update/:id - Cập nhật ghi chú ✅
router.patch(
  "/update/:id",
  noteValidation.validateUpdateNote(),
  noteController.updateNote
);

// DELETE /api/notes/delete/:id - Xóa ghi chú ✅
router.delete(
  "/delete/:id",
  noteValidation.validateDeleteNote(),
  noteController.deleteNote
);

module.exports = router;
