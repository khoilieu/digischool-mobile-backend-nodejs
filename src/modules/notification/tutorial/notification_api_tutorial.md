# Notification API Tutorial (Cập nhật 2024)

## 1. Lấy danh sách thông báo của user

**Endpoint:**

```
GET /api/notifications/get-by-user
```

**Headers:**

- `Authorization: Bearer <token>`

**Query Params (tùy chọn):**

- `type`: Lọc theo loại thông báo (`user`, `activity`, `system`, `school`, `teacher`)
- `page`: Số trang (mặc định 1)
- `limit`: Số lượng mỗi trang (mặc định 20)

**Các loại notification type:**

- `user`: Thông báo cá nhân cho user
- `activity`: Thông báo về hoạt động (yêu cầu, đơn từ, etc.)
- `system`: Thông báo hệ thống
- `school`: Thông báo cho phụ huynh về hoạt động của con cái
- `teacher`: Thông báo cho giáo viên

**Ví dụ:**

```
GET /api/notifications/get-by-user?type=school&page=1&limit=10
```

**Response mẫu:**

```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "_id": "665f1a2b3c4d5e6f7a8b9c0d",
      "type": "school",
      "title": "Thông báo đánh giá tiết học",
      "content": "Giáo viên Nguyễn Thị Kim Huệ đã đánh giá tiết Chào cờ lớp 12A2.\n- Điểm kiểm tra miệng của Trần Thị B: 8.5\n- Vi phạm của Trần Thị B: Nói chuyện riêng",
      "sender": "665f1a2b3c4d5e6f7a8b9c01",
      "receivers": ["665f1a2b3c4d5e6f7a8b9c02", "665f1a2b3c4d5e6f7a8b9c03"],
      "receiverScope": {
        "type": "user",
        "ids": ["665f1a2b3c4d5e6f7a8b9c02", "665f1a2b3c4d5e6f7a8b9c03"]
      },
      "relatedObject": {
        "id": "665f1a2b3c4d5e6f7a8b9c99",
        "requestType": "lesson_evaluation"
      },
      "isReadBy": ["665f1a2b3c4d5e6f7a8b9c02"],
      "createdAt": "2024-06-10T08:00:00.000Z",
      "updatedAt": "2024-06-10T08:00:00.000Z"
    }
  ]
}
```

---

## 2. Tạo thông báo mới

**Endpoint:**

```
POST /api/notifications/create
```

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Body ví dụ (có liên kết đối tượng):**

```json
{
  "type": "school",
  "title": "Thông báo đánh giá tiết học",
  "content": "Giáo viên Nguyễn Thị Kim Huệ đã đánh giá tiết Chào cờ lớp 12A2.\n- Điểm kiểm tra miệng của Trần Thị B: 8.5",
  "receiverScope": { "type": "user", "ids": ["665f1a2b3c4d5e6f7a8b9c10"] },
  "relatedObject": {
    "id": "665f1a2b3c4d5e6f7a8b9c20",
    "requestType": "lesson_evaluation"
  }
}
```

**Body ví dụ gửi cho nhiều user (không liên kết đối tượng):**

```json
{
  "type": "user",
  "title": "Nhắc nhở hoàn thành bài tập",
  "content": "Bạn vui lòng hoàn thành bài tập Toán trước ngày 12/06/2024.",
  "receiverScope": {
    "type": "user",
    "ids": ["665f1a2b3c4d5e6f7a8b9c02", "665f1a2b3c4d5e6f7a8b9c03"]
  }
}
```

**Response mẫu:**

```json
{
  "success": true,
  "message": "Notification created successfully",
  "data": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0d",
    "type": "activity",
    "title": "Thông báo họp phụ huynh",
    "content": "Kính mời quý phụ huynh tham dự buổi họp vào lúc 8h sáng ngày 15/06/2024 tại phòng hội trường.",
    "sender": "665f1a2b3c4d5e6f7a8b9c01",
    "receivers": ["665f1a2b3c4d5e6f7a8b9c10"],
    "receiverScope": { "type": "class", "ids": ["665f1a2b3c4d5e6f7a8b9c10"] },
    "relatedObject": {
      "id": "665f1a2b3c4d5e6f7a8b9c20",
      "requestType": "parent_meeting"
    },
    "isReadBy": [],
    "createdAt": "2024-06-10T08:00:00.000Z",
    "updatedAt": "2024-06-10T08:00:00.000Z"
  }
}
```

---

## 3. Đánh dấu đã đọc một thông báo

**Endpoint:**

```
PATCH /api/notifications/read/665f1a2b3c4d5e6f7a8b9c0d
```

**Headers:**

- `Authorization: Bearer <token>`

**Response mẫu:**

```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0d",
    "isReadBy": ["665f1a2b3c4d5e6f7a8b9c02", "665f1a2b3c4d5e6f7a8b9c03"],
    ...
  }
}
```

---

## 4. Đánh dấu tất cả thông báo đã đọc

**Endpoint:**

```
PATCH /api/notifications/read-all
```

**Headers:**

- `Authorization: Bearer <token>`

**Response mẫu:**

```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

## 5. Lưu ý

- Tất cả các API đều yêu cầu xác thực bằng JWT (Bearer Token).
- Trường `relatedObject` (nếu có) **luôn là object gồm 2 trường**: `id` (ObjectId) và `requestType` (String). Ví dụ:
  ```json
  "relatedObject": {
    "id": "665f1a2b3c4d5e6f7a8b9c99",
    "requestType": "substitute_request"
  }
  ```
- Các trường hợp lỗi sẽ trả về `{ success: false, message: "..." }` hoặc kèm `errors` nếu lỗi validate.
- Tham khảo thêm các ví dụ trong file này để test bằng Postman hoặc code frontend.
