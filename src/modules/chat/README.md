# Chat Realtime API & Socket.IO Guide (2024)

## REST API

### 1. Gửi tin nhắn
- **POST** `/api/chat/message`
- Body:
```json
{
  "receiver": "<receiverUserId>",
  "content": "Hello!", // optional, có thể rỗng nếu chỉ gửi media
  "mediaUrl": "<url>", // optional, url file/image/video từ Cloudinary
  "type": "text" // hoặc "image", "video", "file"
}
```
- Yêu cầu xác thực (Bearer token)
- Nếu chỉ gửi file/hình/video, truyền content là "" hoặc bỏ qua, chỉ cần mediaUrl và type phù hợp.

### 2. Upload media (ảnh, video, file)
- **POST** `/api/chat/upload`
- Body: `form-data` với key `file` (File)
- Header: `Authorization: Bearer <token>`
- Trả về:
```json
{
  "url": "https://res.cloudinary.com/..."
}
```
- Dùng url này làm mediaUrl khi gửi tin nhắn.

### 3. Lấy lịch sử chat giữa 2 user
- **GET** `/api/chat/messages/:userId`
- Query: `limit`, `skip` (tùy chọn)
- Trả về mảng tin nhắn giữa user hiện tại và userId

### 4. Lấy danh sách đoạn chat (conversations)
- **GET** `/api/chat/conversations`
- Trả về danh sách các đoạn chat, kèm unreadCount, lastMessage, ...

### 5. Cập nhật trạng thái tin nhắn
- **PATCH** `/api/chat/message/:messageId/status`
- Body:
```json
{
  "status": "delivered" // hoặc "read"
}
```

---

## Realtime với Socket.IO

### Kết nối
```js
const socket = io("<server_url>");
```

### Tham gia phòng riêng (theo userId)
```js
socket.emit("join", userId);
```

### Gửi tin nhắn realtime
```js
socket.emit("send_message", {
  sender: "<userId>",
  receiver: "<receiverUserId>",
  content: "Hello!", // optional
  mediaUrl: "<url>", // optional
  type: "text" // hoặc "image", "video", "file"
});
```

### Nhận tin nhắn realtime
```js
socket.on("new_message", (data) => {
  // data: { sender, receiver, content, mediaUrl, type, ... }
  console.log(data);
});
```

---

## Ghi chú
- Trường `content` là optional, có thể rỗng nếu chỉ gửi media.
- Trường `mediaUrl` là url file/image/video từ Cloudinary (nếu có).
- Trường `type` xác định loại tin nhắn: "text", "image", "video", "file".
- Nên xác thực user trước khi cho phép gửi/nhận tin nhắn.
- Kết hợp REST API để lưu trữ và truy xuất lịch sử, Socket.IO để realtime.
- Có thể mở rộng cho chat nhóm bằng cách thay receiver thành groupId. 