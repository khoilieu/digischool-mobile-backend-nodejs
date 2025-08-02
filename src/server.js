require("dotenv").config();
const connectDB = require("./config/database");
const app = require("./app");

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
      console.log("MongoDB Connected");
    } else {
      console.log("MONGODB_URI not set");
    }

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
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
      });
    });

    module.exports.io = io;

    process.on("SIGTERM", () => {
      server.close(() => {
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      server.close(() => {
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
