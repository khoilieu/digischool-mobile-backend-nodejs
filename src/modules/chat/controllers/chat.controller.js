const chatService = require("../services/chat.service");
const path = require("path");
const fs = require("fs");

// Gửi tin nhắn
exports.sendMessage = async (req, res, next) => {
  try {
    const { receiver, content, type, mediaUrl } = req.body;
    const sender = req.user._id; // giả định đã có middleware xác thực
    const message = await chatService.sendMessage({
      sender,
      receiver,
      content,
      type,
      mediaUrl,
    });
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};

// Lấy lịch sử chat giữa 2 user
exports.getMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user1 = req.user._id;
    const user2 = userId;
    const { limit = 50, skip = 0 } = req.query;
    const messages = await chatService.getMessages({
      user1,
      user2,
      limit: Number(limit),
      skip: Number(skip),
    });
    res.json(messages);
  } catch (err) {
    next(err);
  }
};

// Cập nhật trạng thái tin nhắn
exports.updateMessageStatus = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;
    const message = await chatService.updateMessageStatus(messageId, status);
    res.json(message);
  } catch (err) {
    next(err);
  }
};

// Lấy danh sách đoạn chat (conversation) của user
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    // Lấy biến userActiveChat từ socket server
    const io = require("../../../server").io;
    let activeChatMap = {};
    if (io && io.userActiveChat) {
      activeChatMap = io.userActiveChat;
    }
    const conversations = await chatService.getConversations(
      userId,
      activeChatMap
    );
    res.json(conversations);
  } catch (err) {
    next(err);
  }
};

// Upload media (ảnh, video, file) lên GCS
exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer || req.file.size === 0) {
      return res.status(400).json({ error: "Empty file" });
    }
    const result = await chatService.uploadMedia(req.file);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || "Upload to GCS failed" });
  }
};
