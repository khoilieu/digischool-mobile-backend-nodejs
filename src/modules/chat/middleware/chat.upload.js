const multer = require("multer");
// const path = require("path");

// Dùng memoryStorage để có file.buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload; 