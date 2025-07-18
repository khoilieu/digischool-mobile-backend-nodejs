require("dotenv").config();
const connectDB = require("./config/database");
const app = require("./app");

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    console.log("🚀 Starting server...");
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔌 Port: ${PORT}`);

    if (process.env.MONGODB_URI) {
      console.log("📦 Connecting to MongoDB...");
      await connectDB();
      console.log("✅ MongoDB Connected");
    } else {
      console.log("⚠️  MONGODB_URI not set - running without database");
    }

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(
        `🌐 Health check available at: http://localhost:${PORT}/api/health`
      );
    });

    // Socket.IO
    const { Server } = require("socket.io");
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    // Quản lý trạng thái activeChatWith cho từng user
    const userActiveChat = {};
    io.userActiveChat = userActiveChat;

    io.on("connection", (socket) => {
      console.log("User connected: " + socket.id);

      // Tham gia phòng riêng theo userId
      socket.on("join", (userId) => {
        socket.join(userId);
        socket.userId = userId;
        userActiveChat[userId] = null;
      });

      // Khi mở đoạn chat, mark đã xem
      socket.on("mark_read", async ({ from, to }) => {
        userActiveChat[from] = to;
        // Cập nhật DB: mark đã xem tất cả tin nhắn từ 'to' gửi tới 'from'
        try {
          const Message = require("./modules/chat/models/message.model");
          await Message.updateMany(
            { sender: to, receiver: from, status: { $ne: "read" } },
            { $set: { status: "read" } }
          );
        } catch (e) {
          console.error(e);
        }
        // Gửi event cho người còn lại để cập nhật trạng thái đã xem
        io.to(to).emit("message_read", { from });
        // Cập nhật lại danh sách đoạn chat cho cả hai
        io.to(to).emit("update_conversations");
        io.to(from).emit("update_conversations");
      });

      // Khi rời khỏi đoạn chat (tùy chọn, có thể thêm event riêng)
      socket.on("leave_chat", (userId) => {
        userActiveChat[userId] = null;
      });

      // Gửi tin nhắn realtime
      socket.on("send_message", async (data) => {
        // data: { sender, receiver, content, type, mediaUrl }
        const isReceiverActive = userActiveChat[data.receiver] === data.sender;
        let status = "sent";
        if (isReceiverActive) {
          status = "read";
          // Cập nhật DB: mark đã xem
          try {
            const Message = require("./modules/chat/models/message.model");
            await Message.updateMany(
              {
                sender: data.sender,
                receiver: data.receiver,
                status: { $ne: "read" },
              },
              { $set: { status: "read" } }
            );
          } catch (e) {
            console.error(e);
          }
          // Gửi event đã xem cho người gửi
          io.to(data.sender).emit("message_read", { from: data.receiver });
        }
        // Gửi cho người nhận
        io.to(data.receiver).emit("new_message", { ...data, status });
        // Gửi cho người gửi (xác nhận đã gửi)
        io.to(data.sender).emit("new_message", { ...data, status });
        // Cập nhật lại danh sách đoạn chat cho cả hai
        io.to(data.receiver).emit("update_conversations");
        io.to(data.sender).emit("update_conversations");
      });

      socket.on("disconnect", () => {
        if (socket.userId) userActiveChat[socket.userId] = null;
        console.log("User disconnected: " + socket.id);
      });
    });

    module.exports.io = io;

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("🛑 SIGTERM received, shutting down gracefully...");
      server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("🛑 SIGINT received, shutting down gracefully...");
      server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
      });
    });

    // Error handling
    process.on("uncaughtException", (error) => {
      console.error("💥 Uncaught Exception:", error);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
