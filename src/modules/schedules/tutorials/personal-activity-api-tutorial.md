# Hướng dẫn sử dụng API Hoạt động cá nhân (Personal Activity) - Postman

## Tổng quan

API Personal Activity cho phép **mọi user** (học sinh, giáo viên) tạo, xem, cập nhật, xóa hoạt động cá nhân (có nhắc nhở) trên thời khóa biểu cá nhân, dựa trên slot thời gian (`date`, `period`).

- Mỗi user chỉ có 1 hoạt động cá nhân trên 1 slot (ngày, tiết).
- Không còn lessonId, không phân biệt học sinh/giáo viên.
- Trường `remindAt` sẽ được tính tự động dựa vào `date`, `period` và bảng TimeSlot.

## Base URL

```
http://localhost:8080/api/schedules/personal-activity
```

## Authentication

Tất cả API đều yêu cầu Bearer Token. Thêm header:

```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Tạo hoạt động cá nhân

**Endpoint:**

```
POST /api/schedules/personal-activity
```

**Body:**

```json
{
  "title": "Soạn giáo án",
  "content": "Chuẩn bị bài cho tuần sau",
  "date": "2024-08-22",
  "period": 1,
  "remindMinutes": 15
}
```

**Cách tính remindAt:**

- Hệ thống sẽ lấy giờ bắt đầu tiết học (`startTime`) từ bảng TimeSlot theo `period`.
- `remindAt = date + startTime - remindMinutes` (tính bằng phút).
- Nếu không tìm thấy timeSlot, remindAt sẽ là `null`.

**Response:**

```json
{
  "success": true,
  "message": "Tạo hoạt động cá nhân thành công",
  "data": {
    "_id": "...",
    "title": "Soạn giáo án",
    "content": "Chuẩn bị bài cho tuần sau",
    "user": "...",
    "date": "2024-08-22T00:00:00.000Z",
    "period": 1,
    "remindAt": "2024-08-22T06:45:00.000Z",
    "time": 15,
    ...
  }
}
```

---

## 2. Lấy hoạt động cá nhân của user tại 1 slot

**Endpoint:**

```
GET /api/schedules/personal-activity?date=2024-08-22&period=1
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "Soạn giáo án",
    "content": "Chuẩn bị bài cho tuần sau",
    "user": "...",
    "date": "2024-08-22T00:00:00.000Z",
    "period": 1,
    ...
  }
}
```

---

## 3. Cập nhật hoạt động cá nhân

**Endpoint:**

```
PATCH /api/schedules/personal-activity/:activityId
```

**Body:**

```json
{
  "title": "Họp tổ chuyên môn",
  "date": "2024-08-22",
  "period": 1,
  "remindMinutes": 10
}
```

**Response:**

```json
{
  "success": true,
  "message": "Cập nhật hoạt động cá nhân thành công",
  "data": {
    "_id": "...",
    "title": "Họp tổ chuyên môn",
    "date": "2024-08-22T00:00:00.000Z",
    "period": 1,
    "remindAt": "2024-08-22T06:50:00.000Z",
    ...
  }
}
```

---

## 4. Xóa hoạt động cá nhân

**Endpoint:**

```
DELETE /api/schedules/personal-activity/:activityId
```

**Response:**

```json
{
  "success": true,
  "message": "Xóa hoạt động cá nhân thành công"
}
```

---

## 5. Lưu ý sử dụng

- Mỗi user chỉ có 1 hoạt động cá nhân trên 1 slot (ngày, tiết).
- Trường `remindMinutes` là số phút trước khi tiết học bắt đầu để gửi nhắc nhở. Hệ thống sẽ tự động tính remindAt dựa vào bảng TimeSlot.
- Khi lấy TKB tuần của lớp hoặc giáo viên, backend sẽ trả về các hoạt động cá nhân của user trong tuần đó để frontend hiển thị đúng slot.

---

## 6. Ví dụ luồng sử dụng

1. User vào TKB, chọn slot (ngày, tiết) muốn thêm hoạt động cá nhân.
2. Tạo hoạt động cá nhân với tiêu đề, nội dung, nhắc nhở.
3. Có thể cập nhật hoặc xóa hoạt động cá nhân bất cứ lúc nào.

---

Mọi thắc mắc vui lòng liên hệ quản trị hệ thống hoặc đội phát triển.
