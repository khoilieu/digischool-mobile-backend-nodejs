const pushService = require("../services/push.service");
const PushToken = require("../models/push-token.model");

class PushController {
  // Đăng ký device token
  async registerDeviceToken(req, res) {
    try {
      const { userId, fcmToken, platform, deviceId } = req.body;
      const currentUser = req.user._id;

      // Validate required fields
      if (!fcmToken || !platform) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: fcmToken, platform",
        });
      }

      // Validate platform
      if (!["android", "ios"].includes(platform)) {
        return res.status(400).json({
          success: false,
          message: "Platform must be 'android' or 'ios'",
        });
      }

      // Kiểm tra quyền - user chỉ có thể đăng ký token cho chính mình
      if (userId && userId !== currentUser.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only register tokens for yourself",
        });
      }

      const targetUserId = userId || currentUser;
      const result = await pushService.registerDeviceToken(
        targetUserId,
        fcmToken,
        platform,
        deviceId
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in registerDeviceToken:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to register device token",
        error: error.message,
      });
    }
  }

  // Hủy đăng ký device token
  async unregisterDeviceToken(req, res) {
    try {
      const { userId, fcmToken } = req.body;
      const currentUser = req.user._id;

      // Validate required fields
      if (!fcmToken) {
        return res.status(400).json({
          success: false,
          message: "Missing required field: fcmToken",
        });
      }

      // Kiểm tra quyền - user chỉ có thể hủy token của chính mình
      if (userId && userId !== currentUser.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only unregister your own tokens",
        });
      }

      const targetUserId = userId || currentUser;
      const result = await pushService.unregisterDeviceToken(targetUserId, fcmToken);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in unregisterDeviceToken:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to unregister device token",
        error: error.message,
      });
    }
  }

  // Gửi push notification (cho admin/manager)
  async sendPushNotification(req, res) {
    try {
      const { userIds, title, content, type = "general", data = {} } = req.body;
      const currentUser = req.user._id;

      // Validate required fields
      if (!userIds || !title || !content) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: userIds, title, content",
        });
      }

      // Kiểm tra quyền - chỉ admin/manager mới có thể gửi push notification
      const User = require("../../auth/models/user.model");
      const user = await User.findById(currentUser);
      if (!user || !["admin", "manager"].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only admins and managers can send push notifications",
        });
      }

      const notification = {
        title,
        content,
        type,
        _id: new Date().getTime().toString(), // Temporary ID
        relatedObject: data.relatedObject || null,
      };

      const result = await pushService.sendPushNotification(userIds, notification);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in sendPushNotification:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to send push notification",
        error: error.message,
      });
    }
  }

  // Lấy danh sách tokens của user
  async getUserTokens(req, res) {
    try {
      const { userId } = req.params;
      const currentUser = req.user._id;

      let targetUserId = currentUser;

      // Nếu có userId trong params, kiểm tra quyền
      if (userId) {
        // Kiểm tra quyền - user chỉ có thể xem tokens của chính mình
        if (userId !== currentUser.toString()) {
          const User = require("../../auth/models/user.model");
          const user = await User.findById(currentUser);
          if (!user || !["admin", "manager"].includes(user.role)) {
            return res.status(403).json({
              success: false,
              message: "You can only view your own tokens",
            });
          }
        }
        targetUserId = userId;
      }

      const tokens = await PushToken.find({
        userId: targetUserId,
        isActive: true,
      }).select("-__v");

      res.status(200).json({
        success: true,
        message: "Tokens retrieved successfully",
        data: tokens,
      });
    } catch (error) {
      console.error("❌ Error in getUserTokens:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve user tokens",
        error: error.message,
      });
    }
  }

  // Cleanup inactive tokens (cho admin)
  async cleanupInactiveTokens(req, res) {
    try {
      const currentUser = req.user._id;

      // Kiểm tra quyền - chỉ admin mới có thể cleanup tokens
      const User = require("../../auth/models/user.model");
      const user = await User.findById(currentUser);
      if (!user || user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only admins can cleanup inactive tokens",
        });
      }

      const result = await pushService.cleanupInactiveTokens();

      res.status(200).json({
        success: true,
        message: "Inactive tokens cleaned up successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in cleanupInactiveTokens:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to cleanup inactive tokens",
        error: error.message,
      });
    }
  }
}

module.exports = new PushController();
