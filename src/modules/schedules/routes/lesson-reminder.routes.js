const express = require('express');
const router = express.Router();
const lessonReminderController = require('../controllers/lesson-reminder.controller');
const authMiddleware = require('../../auth/middleware/auth.middleware');
const {
  createReminderValidation,
  updateReminderValidation,
  queryValidation,
  paramIdValidation
} = require('../middleware/lesson-reminder.validation');

// Routes cho quản lý nhắc nhở kiểm tra tiết học

// POST /api/lesson-reminders/lessons/:lessonId - Tạo nhắc nhở cho tiết học
router.post('/lessons/:lessonId',
  authMiddleware.protect,
  authMiddleware.authorize('teacher'),
  createReminderValidation,
  lessonReminderController.createReminder
);

// GET /api/lesson-reminders - Lấy danh sách nhắc nhở của giáo viên
// Query params: status, priority, testType, startDate, endDate, page, limit
router.get('/',
  authMiddleware.protect,
  authMiddleware.authorize('teacher'),
  queryValidation,
  lessonReminderController.getTeacherReminders
);

// GET /api/lesson-reminders/upcoming - Lấy nhắc nhở sắp đến hạn
// Query params: days (default: 7)
router.get('/upcoming',
  authMiddleware.protect,
  authMiddleware.authorize('teacher'),
  queryValidation,
  lessonReminderController.getUpcomingReminders
);

// GET /api/lesson-reminders/stats - Lấy thống kê nhắc nhở
// Query params: startDate, endDate
router.get('/stats',
  authMiddleware.protect,
  authMiddleware.authorize('teacher'),
  queryValidation,
  lessonReminderController.getReminderStats
);

// GET /api/lesson-reminders/:reminderId - Lấy chi tiết nhắc nhở
router.get('/:reminderId',
  authMiddleware.protect,
  authMiddleware.authorize('teacher'),
  paramIdValidation,
  lessonReminderController.getReminderDetail
);

// PUT /api/lesson-reminders/:reminderId - Cập nhật nhắc nhở
router.put('/:reminderId',
  authMiddleware.protect,
  authMiddleware.authorize('teacher'),
  updateReminderValidation,
  lessonReminderController.updateReminder
);

// DELETE /api/lesson-reminders/:reminderId - Xóa nhắc nhở
router.delete('/:reminderId',
  authMiddleware.protect,
  authMiddleware.authorize('teacher'),
  paramIdValidation,
  lessonReminderController.deleteReminder
);

// POST /api/lesson-reminders/:reminderId/complete - Đánh dấu hoàn thành
router.post('/:reminderId/complete',
  authMiddleware.protect,
  authMiddleware.authorize('teacher'),
  paramIdValidation,
  lessonReminderController.markCompleted
);

// POST /api/lesson-reminders/:reminderId/resend-email - Gửi lại email nhắc nhở
router.post('/:reminderId/resend-email',
  authMiddleware.protect,
  authMiddleware.authorize('teacher'),
  paramIdValidation,
  lessonReminderController.resendReminderEmail
);

// POST /api/lesson-reminders/:reminderId/test-email - Test gửi email
router.post('/:reminderId/test-email',
  authMiddleware.protect,
  authMiddleware.authorize('teacher'),
  paramIdValidation,
  lessonReminderController.testReminderEmail
);

module.exports = router; 