require("dotenv").config();
const connectDB = require("./config/database");
const app = require("./app");

const PORT = process.env.PORT || 8080;

// Hàm khởi động server
const startServer = async () => {
  try {
    // Thử kết nối database nếu có MONGODB_URI
    if (process.env.MONGODB_URI) {
      await connectDB();
      console.log("✅ MongoDB Connected Successfully");
    } else {
      console.log(
        "⚠️  MONGODB_URI not set - running without database connection"
      );
    }

    // Khởi động server
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`📧 Email Host: ${process.env.EMAIL_HOST || "NOT SET"}`);
      console.log(`👤 Email User: ${process.env.EMAIL_USER || "NOT SET"}`);
      console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    });

    // Xử lý graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully");
      server.close(() => {
        console.log("Process terminated");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received, shutting down gracefully");
      server.close(() => {
        console.log("Process terminated");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Khởi động server
startServer();
