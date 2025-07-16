const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chat.controller");
const { protect } = require("../../auth/middleware/auth.middleware");
const upload = require("../middleware/chat.upload");

// Gửi tin nhắn
router.post("/message", protect, chatController.sendMessage);

// Lấy lịch sử chat giữa 2 user
router.get("/messages/:userId", protect, chatController.getMessages);

// Lấy danh sách đoạn chat
router.get("/conversations", protect, chatController.getConversations);

// Cập nhật trạng thái tin nhắn
router.patch("/message/:messageId/status", protect, chatController.updateMessageStatus);

// Upload media
router.post("/upload", protect, upload.single("file"), chatController.uploadMedia);

// Deprecated: Upload media base64 (use /upload with FormData instead)
// router.post("/upload-base64", protect, chatController.uploadMediaBase64);

module.exports = router; 