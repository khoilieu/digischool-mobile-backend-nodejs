const admin = require("firebase-admin");
const PushToken = require("../models/push-token.model");

class PushService {
  constructor() {
    this.initializeFirebase();
  }

  initializeFirebase() {
    try {
      // Kiểm tra xem Firebase đã được khởi tạo chưa
      if (!admin.apps.length) {
        // Sử dụng service account từ environment variables
        const serviceAccount = {
          type: process.env.FIREBASE_TYPE || "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
          token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
        };

        if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
          console.warn("⚠️ Firebase credentials not found. Push notifications will be disabled.");
          this.isEnabled = false;
          return;
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ Firebase Admin SDK initialized successfully");
        this.isEnabled = true;
      } else {
        this.isEnabled = true;
        console.log("✅ Firebase Admin SDK already initialized");
      }
    } catch (error) {
      console.error("❌ Failed to initialize Firebase Admin SDK:", error.message);
      this.isEnabled = false;
    }
  }

  async registerDeviceToken(userId, fcmToken, platform, deviceId = null) {
    try {
      if (!this.isEnabled) {
        console.warn("⚠️ Push notifications disabled - skipping token registration");
        return { success: false, message: "Push notifications disabled" };
      }

      // Kiểm tra token đã tồn tại chưa
      const existingToken = await PushToken.findOne({ fcmToken });
      if (existingToken) {
        // Cập nhật thông tin nếu token đã tồn tại
        existingToken.userId = userId;
        existingToken.platform = platform;
        existingToken.deviceId = deviceId;
        existingToken.isActive = true;
        existingToken.lastUsed = new Date();
        await existingToken.save();
        console.log("✅ Updated existing FCM token for user:", userId);
        return { success: true, message: "Token updated successfully" };
      }

      // Tạo token mới
      const pushToken = new PushToken({
        userId,
        fcmToken,
        platform,
        deviceId,
        isActive: true,
        lastUsed: new Date(),
      });

      await pushToken.save();
      console.log("✅ Registered new FCM token for user:", userId);
      return { success: true, message: "Token registered successfully" };
    } catch (error) {
      console.error("❌ Error registering device token:", error.message);
      throw error;
    }
  }

  async unregisterDeviceToken(userId, fcmToken) {
    try {
      const result = await PushToken.findOneAndUpdate(
        { userId, fcmToken },
        { isActive: false },
        { new: true }
      );

      if (result) {
        console.log("✅ Unregistered FCM token for user:", userId);
        return { success: true, message: "Token unregistered successfully" };
      } else {
        return { success: false, message: "Token not found" };
      }
    } catch (error) {
      console.error("❌ Error unregistering device token:", error.message);
      throw error;
    }
  }

  async sendPushNotification(userIds, notification) {
    try {
      if (!this.isEnabled) {
        console.warn("⚠️ Push notifications disabled - skipping notification");
        return { success: false, message: "Push notifications disabled" };
      }

      // Lấy tất cả FCM tokens của users
      const pushTokens = await PushToken.find({
        userId: { $in: userIds },
        isActive: true,
      });

      if (pushTokens.length === 0) {
        console.log("⚠️ No active FCM tokens found for users:", userIds);
        return { success: false, message: "No active tokens found" };
      }

      const tokens = pushTokens.map(pt => pt.fcmToken);
      const message = {
        notification: {
          title: notification.title,
          body: notification.content,
        },
        data: {
          type: notification.type || "general",
          notificationId: notification._id?.toString() || "",
          relatedObjectId: notification.relatedObject?.id?.toString() || "",
          relatedObjectType: notification.relatedObject?.requestType || "",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
            },
          },
        },
      };

      // Gửi notification cho từng token
      const results = await Promise.allSettled(
        tokens.map(token => 
          admin.messaging().send({
            ...message,
            token,
          })
        )
      );

      // Phân tích kết quả
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`✅ Push notification sent: ${successful} successful, ${failed} failed`);

      // Cập nhật lastUsed cho tokens thành công
      const successfulTokens = tokens.filter((_, index) => results[index].status === 'fulfilled');
      if (successfulTokens.length > 0) {
        await PushToken.updateMany(
          { fcmToken: { $in: successfulTokens } },
          { lastUsed: new Date() }
        );
      }

      return {
        success: true,
        message: `Push notification sent: ${successful} successful, ${failed} failed`,
        total: tokens.length,
        successful,
        failed,
      };
    } catch (error) {
      console.error("❌ Error sending push notification:", error.message);
      throw error;
    }
  }

  async sendPushNotificationToToken(fcmToken, notification) {
    try {
      if (!this.isEnabled) {
        console.warn("⚠️ Push notifications disabled - skipping notification");
        return { success: false, message: "Push notifications disabled" };
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.content,
        },
        data: {
          type: notification.type || "general",
          notificationId: notification._id?.toString() || "",
          relatedObjectId: notification.relatedObject?.id?.toString() || "",
          relatedObjectType: notification.relatedObject?.requestType || "",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
            },
          },
        },
        token: fcmToken,
      };

      const result = await admin.messaging().send(message);
      console.log("✅ Push notification sent to token:", fcmToken);
      
      // Cập nhật lastUsed
      await PushToken.findOneAndUpdate(
        { fcmToken },
        { lastUsed: new Date() }
      );

      return { success: true, messageId: result };
    } catch (error) {
      console.error("❌ Error sending push notification to token:", error.message);
      throw error;
    }
  }

  async cleanupInactiveTokens() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await PushToken.updateMany(
        { lastUsed: { $lt: thirtyDaysAgo }, isActive: true },
        { isActive: false }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Cleaned up ${result.modifiedCount} inactive tokens`);
      }
      
      return result;
    } catch (error) {
      console.error("❌ Error cleaning up inactive tokens:", error.message);
      throw error;
    }
  }
}

module.exports = new PushService();

