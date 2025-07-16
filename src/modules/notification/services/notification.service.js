const Notification = require("../models/notification.model");
const User = require("../../auth/models/user.model");

class NotificationService {
  async createNotification({
    type,
    title,
    content,
    sender,
    receiverScope,
    relatedObject,
  }) {
    try {
      // Xử lý relatedObject: luôn là object gồm id và requestType
      let finalRelatedObject = undefined;
      if (relatedObject) {
        if (
          typeof relatedObject === "object" &&
          relatedObject.id &&
          relatedObject.requestType
        ) {
          finalRelatedObject = relatedObject;
        } else if (
          typeof relatedObject === "object" &&
          relatedObject.id &&
          relatedObject.type
        ) {
          // Trường hợp cũ: type => requestType
          finalRelatedObject = {
            id: relatedObject.id,
            requestType: relatedObject.type,
          };
        } else if (typeof relatedObject === "object" && relatedObject.id) {
          finalRelatedObject = { id: relatedObject.id, requestType: type };
        } else if (typeof relatedObject === "string") {
          finalRelatedObject = { id: relatedObject, requestType: type };
        } else {
          finalRelatedObject = undefined;
        }
      }
      console.log(
        "\uD83D\uDCE2 Creating new notification:",
        JSON.stringify(
          {
            type,
            title,
            content,
            sender,
            receiverScope,
            relatedObject: finalRelatedObject,
          },
          null,
          2
        )
      );
      const receivers = await this.getUserIdsFromScope(receiverScope);
      const notificationData = {
        type,
        title,
        content,
        sender,
        receivers,
        receiverScope,
        relatedObject: finalRelatedObject,
        isReadBy: [],
      };
      const notification = await Notification.create(notificationData);
      console.log(
        "\u2705 Notification created successfully:",
        notification._id
      );
      return notification;
    } catch (error) {
      console.error("\u274C Error creating notification:", error.message);
      throw error;
    }
  }

  async getUserNotifications(userId, type, page = 1, limit = 20) {
    try {
      console.log("\uD83D\uDCCB Getting notifications for user:", userId);
      const query = { receivers: userId };
      if (type) query.type = type;
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(); // Sử dụng lean() để có thể chỉnh sửa kết quả

      // Lấy thông tin người gửi cho từng thông báo
      for (let notification of notifications) {
        const sender = await User.findById(notification.sender, "name gender");
        if (sender) {
          notification.sender = {
            id: sender._id,
            name: sender.name,
            gender: sender.gender,
          };
        }
      }

      console.log(
        `\u2705 Found ${notifications.length} notifications for user ${userId}`
      );
      return notifications;
    } catch (error) {
      console.error("\u274C Error getting notifications:", error.message);
      throw error;
    }
  }

  async markAsRead(notificationId, userId) {
    try {
      console.log(
        "\u270F\uFE0F Marking notification as read:",
        notificationId,
        "for user:",
        userId
      );
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { $addToSet: { isReadBy: userId } },
        { new: true }
      );
      if (notification) {
        console.log("\u2705 Notification marked as read");
      } else {
        console.log("\u274C Notification not found");
      }
      return notification;
    } catch (error) {
      console.error(
        "\u274C Error marking notification as read:",
        error.message
      );
      throw error;
    }
  }

  async markAllAsRead(userId) {
    try {
      console.log(
        "\u270F\uFE0F Marking all notifications as read for user:",
        userId
      );
      const result = await Notification.updateMany(
        { receivers: userId },
        { $addToSet: { isReadBy: userId } }
      );
      console.log("\u2705 All notifications marked as read");
      return result;
    } catch (error) {
      console.error(
        "\u274C Error marking all notifications as read:",
        error.message
      );
      throw error;
    }
  }

  async getUserIdsFromScope(receiverScope) {
    try {
      switch (receiverScope.type) {
        case "user":
          return receiverScope.ids;
        case "class": {
          // Lấy toàn bộ user thuộc các lớp
          const users = await User.find(
            { class: { $in: receiverScope.ids } },
            "_id"
          );
          return users.map((u) => u._id);
        }
        case "school": {
          const users = await User.find({}, "_id");
          return users.map((u) => u._id);
        }
        // TODO: Thêm các trường hợp khác như department, grade...
        default:
          return [];
      }
    } catch (error) {
      console.error("\u274C Error getting user ids from scope:", error.message);
      throw error;
    }
  }
}

module.exports = new NotificationService();
