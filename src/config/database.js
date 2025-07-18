const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const DB_NAME = process.env.DB_NAME || "Ecoschool-app-dev";
    const MONGODB_URI = process.env.MONGODB_URI;

    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${DB_NAME}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
