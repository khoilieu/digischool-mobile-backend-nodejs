const express = require("express");
const router = express.Router();
const pushController = require("../controllers/push.controller");
const authMiddleware = require("../../auth/middleware/auth.middleware");
const {
  validateRegisterDeviceToken,
  validateUnregisterDeviceToken,
  validateSendPushNotification,
  validateUserId,
} = require("../middleware/push.validation");

// Tất cả routes đều yêu cầu authentication
router.use(authMiddleware.protect);

// Đăng ký device token
router.post(
  "/register",
  validateRegisterDeviceToken,
  pushController.registerDeviceToken
);

// Hủy đăng ký device token
router.post(
  "/unregister",
  validateUnregisterDeviceToken,
  pushController.unregisterDeviceToken
);

// Gửi push notification (cho admin/manager)
router.post(
  "/send",
  validateSendPushNotification,
  pushController.sendPushNotification
);

// Lấy danh sách tokens của user hiện tại
router.get(
  "/tokens",
  pushController.getUserTokens
);

// Lấy danh sách tokens của user cụ thể
router.get(
  "/tokens/:userId",
  validateUserId,
  pushController.getUserTokens
);

// Cleanup inactive tokens (cho admin)
router.post("/cleanup", pushController.cleanupInactiveTokens);

module.exports = router;
