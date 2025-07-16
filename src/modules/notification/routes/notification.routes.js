const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const notificationValidation = require("../middleware/notification.validation");
const authMiddleware = require("../../auth/middleware/auth.middleware");

// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// POST /api/notifications/create - Tạo thông báo mới
router.post(
  "/create",
  notificationValidation.validateCreateNotification(),
  notificationController.createNotification
);

// GET /api/notifications/get-by-user - Lấy danh sách thông báo của user
router.get(
  "/get-by-user",
  notificationValidation.validateGetUserNotifications(),
  notificationController.getUserNotifications
);

// PATCH /api/notifications/read/:id - Đánh dấu đã đọc
router.patch(
  "/read/:id",
  notificationValidation.validateMarkAsRead(),
  notificationController.markAsRead
);

// PATCH /api/notifications/read-all - Đánh dấu tất cả đã đọc
router.patch(
  "/read-all",
  notificationValidation.validateMarkAllAsRead(),
  notificationController.markAllAsRead
);

module.exports = router;
