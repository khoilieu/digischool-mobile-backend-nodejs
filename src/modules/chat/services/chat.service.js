const mongoose = require("mongoose");
const Message = require("../models/message.model");
const User = require("../../auth/models/user.model");

// Gửi tin nhắn
async function sendMessage({ sender, receiver, content, type = "text", mediaUrl }) {
  // TODO: kiểm tra trạng thái realtime qua socket, tạm thời luôn là 'sent'
  const message = await Message.create({ sender, receiver, content, type, mediaUrl, status: "sent" });
  return message;
}

// Lấy lịch sử chat giữa 2 user
async function getMessages({ user1, user2, limit = 50, skip = 0 }) {
  // Mark tất cả tin nhắn gửi tới user1 từ user2 là đã xem
  await Message.updateMany(
    { sender: new mongoose.Types.ObjectId(user2), receiver: new mongoose.Types.ObjectId(user1), status: { $ne: "read" } },
    { $set: { status: "read" } }
  );
  // Lấy lịch sử chat
  const id1 = new mongoose.Types.ObjectId(user1);
  const id2 = new mongoose.Types.ObjectId(user2);
  return Message.find({
    $or: [
      { sender: id1, receiver: id2 },
      { sender: id2, receiver: id1 },
    ],
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
}

// Lấy danh sách đoạn chat (conversation) của user
async function getConversations(userId, activeChatMap = {}) {
  // Lấy tất cả user đã từng chat với userId
  const pipeline = [
    {
      $match: {
        $or: [
          { sender: new mongoose.Types.ObjectId(userId) },
          { receiver: new mongoose.Types.ObjectId(userId) },
        ],
      },
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ["$sender", new mongoose.Types.ObjectId(userId)] },
            "$receiver",
            "$sender"
          ]
        },
        lastMessage: { $first: "$content" },
        lastMessageType: { $first: "$type" },
        lastMessageStatus: { $first: "$status" },
        lastMessageTime: { $first: "$createdAt" },
        lastMessageSender: { $first: "$sender" },
        unreadMessages: {
          $push: {
            $cond: [
              {
                $and: [
                  { $eq: ["$receiver", new mongoose.Types.ObjectId(userId)] },
                  { $eq: ["$status", "sent"] }
                ]
              },
              { sender: "$sender", receiver: "$receiver", status: "$status" },
              null
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userInfo"
      }
    },
    {
      $unwind: "$userInfo"
    },
    {
      $project: {
        userId: "$_id",
        name: "$userInfo.name",
        email: "$userInfo.email",
        lastMessage: 1,
        lastMessageType: 1,
        lastMessageStatus: 1,
        lastMessageTime: 1,
        lastMessageSender: 1,
        unreadMessages: 1
      }
    },
    { $sort: { lastMessageTime: -1 } }
  ];
  let conversations = await Message.aggregate(pipeline);

  // Tính unreadCount ngoài pipeline để lấy đúng trạng thái activeChatMap
  conversations = conversations.map(conv => {
    const otherUserId = String(conv.userId);
    const userActiveWith = activeChatMap[String(userId)];
    let unreadCount = 0;
    // Nếu user hiện tại KHÔNG mở đoạn chat với người kia thì đếm số chưa đọc
    if (userActiveWith !== otherUserId) {
      unreadCount = (conv.unreadMessages || []).filter(m => m && m.status === "sent").length;
    }
    return {
      ...conv,
      unreadCount
    };
  });
  // Xóa unreadMessages khỏi kết quả trả về
  conversations = conversations.map(({ unreadMessages, ...rest }) => rest);
  return conversations;
}

// Cập nhật trạng thái tin nhắn
async function updateMessageStatus(messageId, status) {
  return Message.findByIdAndUpdate(messageId, { status }, { new: true });
}

// Upload media (ảnh, video, file)
async function uploadMedia(file) {
  const cloudinary = require("cloudinary").v2;
  // Xác định resource_type
  let resource_type = "image";
  if (file.mimetype.startsWith("video/")) resource_type = "video";
  else if (!file.mimetype.startsWith("image/")) resource_type = "auto";

  // Upload file buffer lên Cloudinary
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type,
        folder: "chat-media",
        public_id: file.originalname.replace(/\.[^/.]+$/, "") + "-" + Date.now(),
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url });
      }
    );
    stream.end(file.buffer);
  });
}

module.exports = {
  sendMessage,
  getMessages,
  updateMessageStatus,
  getConversations,
  uploadMedia,
}; 