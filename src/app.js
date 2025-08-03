const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { errorHandler } = require("./middleware/errorHandler");
const routes = require("./routes");
// const cors = require("cors");

// Initialize global variables for session management
global.invalidTokens = new Set();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cors());
// Routes
app.use("/api", routes);

// Error handling
app.use(errorHandler);

module.exports = app;
