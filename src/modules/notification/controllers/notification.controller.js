const notificationService = require("../services/notification.service");

class NotificationController {
  // Tạo thông báo mới
  async createNotification(req, res, next) {
    try {
      const { type, title, content, receiverScope, relatedObject } = req.body;
      const user = req.user._id;
      if (!type || !title || !content || !receiverScope) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }
      const notification = await notificationService.createNotification({
        type,
        title,
        content,
        sender: user,
        receiverScope,
        relatedObject,
      });
      res.status(201).json({
        success: true,
        message: "Notification created successfully",
        data: notification,
      });
    } catch (error) {
      console.error("\u274C Error in createNotification:", error.message);
      next(error);
    }
  }

  // Lấy danh sách thông báo của user
  async getUserNotifications(req, res, next) {
    try {
      const user = req.user._id;
      const { type, page = 1, limit = 20 } = req.query;
      const notifications = await notificationService.getUserNotifications(
        user,
        type,
        parseInt(page),
        parseInt(limit)
      );
      res.status(200).json({
        success: true,
        message: "Notifications retrieved successfully",
        data: notifications,
      });
    } catch (error) {
      console.error("\u274C Error in getUserNotifications:", error.message);
      next(error);
    }
  }

  // Đánh dấu đã đọc
  async markAsRead(req, res, next) {
    try {
      const user = req.user._id;
      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, user);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }
      res.status(200).json({
        success: true,
        message: "Notification marked as read",
        data: notification,
      });
    } catch (error) {
      console.error("\u274C Error in markAsRead:", error.message);
      next(error);
    }
  }

  // Đánh dấu tất cả đã đọc
  async markAllAsRead(req, res, next) {
    try {
      const user = req.user._id;
      await notificationService.markAllAsRead(user);
      res.status(200).json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error) {
      console.error("\u274C Error in markAllAsRead:", error.message);
      next(error);
    }
  }
}

module.exports = new NotificationController();
