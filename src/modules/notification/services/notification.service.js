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
      
      // Gửi notification realtime
      await this.sendRealtimeNotification(notification);
      
      return notification;
    } catch (error) {
      console.error("\u274C Error creating notification:", error.message);
      throw error;
    }
  }

  async getUserNotifications(userId, type, page = 1, limit = 20) {
    try {
      const query = { receivers: userId };
      if (type) query.type = type;
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      for (let notification of notifications) {
        const sender = await User.findById(notification.sender, "name gender role");
        if (sender) {
          notification.sender = {
            id: sender._id,
            name: sender.name,
            gender: sender.gender,
            role: sender.role,
          };
        }
        if (
          notification.relatedObject &&
          notification.relatedObject.id &&
          notification.relatedObject.requestType
        ) {
          let status = null;
          try {
            const reqType = notification.relatedObject.requestType;
            const reqId = notification.relatedObject.id;
            if (reqType === "student_leave_request") {
              const StudentLeaveRequest = require("../../leave-requests/models/student-leave-request.model");
              const doc = await StudentLeaveRequest.findById(reqId).select(
                "status"
              );
              status = doc ? doc.status : null;
            } else if (reqType === "teacher_leave_request") {
              const TeacherLeaveRequest = require("../../leave-requests/models/teacher-leave-request.model");
              const doc = await TeacherLeaveRequest.findById(reqId).select(
                "status"
              );
              status = doc ? doc.status : null;
            } else if (
              ["swap_request", "makeup_request", "substitute_request"].includes(
                reqType
              )
            ) {
              const LessonRequest = require("../../schedules/models/lesson-request.model");
              const doc = await LessonRequest.findById(reqId).select("status");
              status = doc ? doc.status : null;
            } else if (reqType === "test_info") {
              const TestInfo = require("../../schedules/models/test-info.model");
              const doc = await TestInfo.findById(reqId).select("status");
              status = doc ? doc.status : null;
            }
          } catch (err) {
            status = null;
          }
          notification.relatedObject = {
            ...notification.relatedObject,
            status,
          };
        }
      }
      return notifications;
    } catch (error) {
      console.error("\u274C Error getting notifications:", error.message);
      throw error;
    }
  }

  async markAsRead(notificationId, userId) {
    try {
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
          const users = await User.find(
            { class_id: { $in: receiverScope.ids } },
            "_id"
          );
          return users.map((u) => u._id);
        }
        case "school": {
          const users = await User.find({}, "_id");
          return users.map((u) => u._id);
        }
        default:
          return [];
      }
    } catch (error) {
      throw error;
    }
  }

  // Gửi notification realtime
  async sendRealtimeNotification(notification) {
    try {
      const io = require("../../../server").io;
      if (io && notification.receivers && notification.receivers.length > 0) {
        notification.receivers.forEach(receiverId => {
          io.to(String(receiverId)).emit("new_notification", {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            content: notification.content,
            sender: notification.sender,
            createdAt: notification.createdAt,
            receivers: notification.receivers,
            relatedObject: notification.relatedObject
          });
        });
        console.log("✅ Realtime notification sent to", notification.receivers.length, "receivers");
      } else {
        console.log("⚠️ Socket.IO not available or no receivers");
      }
    } catch (error) {
      console.error("❌ Realtime notification failed:", error);
    }
  }
}

module.exports = new NotificationService();
