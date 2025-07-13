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
