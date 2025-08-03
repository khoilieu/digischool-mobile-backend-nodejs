# Feedback Management API Guide

Hướng dẫn sử dụng API quản lý feedback cho admin/manager.

## Tổng quan

API feedback management cho phép admin/manager:
- Xem tất cả feedback từ phụ huynh
- Lọc feedback theo trạng thái và đánh giá
- Xem thống kê feedback
- Cập nhật trạng thái và phản hồi feedback
- Xem chi tiết feedback
- **Gửi notification realtime cho phụ huynh khi phản hồi**

## API Endpoints

### 1. Lấy tất cả feedback (với filter)

**Endpoint:** `GET /api/parents/feedback`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `status` (optional): `all`, `pending`, `reviewed`, `resolved`
- `rating` (optional): `0`, `1`, `2`, `3`, `4`, `5` (0 = tất cả)
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số lượng per page (default: 10, max: 100)

**Ví dụ:**
```bash
# Lấy tất cả feedback
curl -X GET "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer your_token"

# Lọc theo trạng thái pending
curl -X GET "http://localhost:3000/api/parents/feedback?status=pending" \
  -H "Authorization: Bearer your_token"

# Lọc theo rating 5 sao
curl -X GET "http://localhost:3000/api/parents/feedback?rating=5" \
  -H "Authorization: Bearer your_token"

# Kết hợp filter và pagination
curl -X GET "http://localhost:3000/api/parents/feedback?status=pending&rating=5&page=1&limit=20" \
  -H "Authorization: Bearer your_token"
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách feedback thành công",
  "data": {
    "feedbacks": [
      {
        "_id": "feedback_id",
        "user": {
          "_id": "parent_id",
          "name": "Nguyễn Văn A",
          "email": "parent@example.com"
        },
        "rating": 5,
        "description": "Hệ thống rất tốt, giao diện dễ sử dụng.",
        "status": "pending",
        "adminResponse": null,
        "respondedBy": null,
        "respondedAt": null,
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### 2. Lấy thống kê feedback

**Endpoint:** `GET /api/parents/feedback/stats`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Ví dụ:**
```bash
curl -X GET "http://localhost:3000/api/parents/feedback/stats" \
  -H "Authorization: Bearer your_token"
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy thống kê feedback thành công",
  "data": {
    "total": 100,
    "pending": 15,
    "reviewed": 25,
    "resolved": 60,
    "averageRating": 4.2
  }
}
```

### 3. Cập nhật trạng thái feedback

**Endpoint:** `PATCH /api/parents/feedback/:feedbackId/status`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "status": "resolved",
  "adminResponse": "Cảm ơn phụ huynh đã góp ý. Chúng tôi sẽ cải thiện hệ thống."
}
```

**Ví dụ:**
```bash
curl -X PATCH "http://localhost:3000/api/parents/feedback/feedback_id/status" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "adminResponse": "Cảm ơn phụ huynh đã góp ý. Chúng tôi sẽ cải thiện hệ thống."
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Cập nhật trạng thái feedback thành công",
  "data": {
    "_id": "feedback_id",
    "user": {
      "_id": "parent_id",
      "name": "Nguyễn Văn A",
      "email": "parent@example.com"
    },
    "rating": 5,
    "description": "Hệ thống rất tốt, giao diện dễ sử dụng.",
    "status": "resolved",
    "adminResponse": "Cảm ơn phụ huynh đã góp ý. Chúng tôi sẽ cải thiện hệ thống.",
    "respondedBy": {
      "_id": "admin_id",
      "name": "Admin Name",
      "email": "admin@example.com"
    },
    "respondedAt": "2024-01-16T10:00:00.000Z",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-16T10:00:00.000Z"
  }
}
```

**Notification:** Khi admin phản hồi feedback, phụ huynh sẽ nhận được notification realtime ngay lập tức.

### 4. Lấy chi tiết feedback

**Endpoint:** `GET /api/parents/feedback/:feedbackId`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Ví dụ:**
```bash
curl -X GET "http://localhost:3000/api/parents/feedback/feedback_id" \
  -H "Authorization: Bearer your_token"
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy chi tiết feedback thành công",
  "data": {
    "_id": "feedback_id",
    "user": {
      "_id": "parent_id",
      "name": "Nguyễn Văn A",
      "email": "parent@example.com"
    },
    "rating": 5,
    "description": "Hệ thống rất tốt, giao diện dễ sử dụng. Tuy nhiên cần cải thiện tốc độ tải trang.",
    "status": "resolved",
    "adminResponse": "Cảm ơn phụ huynh đã góp ý. Chúng tôi sẽ cải thiện hệ thống.",
    "respondedBy": {
      "_id": "admin_id",
      "name": "Admin Name",
      "email": "admin@example.com"
    },
    "respondedAt": "2024-01-16T10:00:00.000Z",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-16T10:00:00.000Z"
  }
}
```

## Trạng thái Feedback

- **pending**: Chờ xử lý
- **reviewed**: Đã xem
- **resolved**: Đã giải quyết

## Notification System

### Khi Admin Phản hồi Feedback

Khi admin cập nhật trạng thái feedback với `adminResponse`, hệ thống sẽ tự động gửi notification realtime cho phụ huynh:

#### Trạng thái "reviewed":
- **Title:** "Feedback đã được xem xét"
- **Content:** "Feedback của bạn đã được [Admin Name] xem xét."

#### Trạng thái "resolved":
- **Title:** "Feedback đã được giải quyết"
- **Content:** "Feedback của bạn đã được [Admin Name] giải quyết với phản hồi: "[adminResponse]"

#### Trạng thái khác:
- **Title:** "Cập nhật trạng thái feedback"
- **Content:** "Trạng thái feedback của bạn đã được cập nhật thành "[status]."

### Notification Properties
- **Type:** `feedback`
- **Sender:** Admin ID
- **Receiver:** Phụ huynh ID
- **Related Object:** Feedback ID với requestType `feedback`
- **Realtime:** Notification được gửi realtime qua Socket.IO

## Validation Rules

### Cập nhật trạng thái
- `status`: Bắt buộc, phải là `pending`, `reviewed`, hoặc `resolved`
- `adminResponse`: Tùy chọn, tối đa 2000 ký tự

### Query Parameters
- `status`: Tùy chọn, `all`, `pending`, `reviewed`, `resolved`
- `rating`: Tùy chọn, 0-5 (0 = tất cả)
- `page`: Tùy chọn, >= 1, mặc định: 1
- `limit`: Tùy chọn, 1-100, mặc định: 10

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Dữ liệu cập nhật không hợp lệ",
  "errors": [
    "Trạng thái phải là pending, reviewed hoặc resolved"
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Chưa đăng nhập"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Bạn không có quyền truy cập tính năng này"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Feedback không tồn tại"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Lỗi khi cập nhật trạng thái feedback"
}
```

## Workflow Quản lý Feedback

1. **Phụ huynh gửi feedback** → Status: `pending`
2. **Admin xem feedback** → Status: `reviewed` + Notification
3. **Admin phản hồi và giải quyết** → Status: `resolved` + Notification

## Ví dụ Workflow Hoàn chỉnh

### Bước 1: Lấy danh sách feedback pending
```bash
curl -X GET "http://localhost:3000/api/parents/feedback?status=pending" \
  -H "Authorization: Bearer admin_token"
```

### Bước 2: Xem chi tiết feedback
```bash
curl -X GET "http://localhost:3000/api/parents/feedback/feedback_id" \
  -H "Authorization: Bearer admin_token"
```

### Bước 3: Cập nhật trạng thái thành reviewed
```bash
curl -X PATCH "http://localhost:3000/api/parents/feedback/feedback_id/status" \
  -H "Authorization: Bearer admin_token" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "reviewed"
  }'
```
**Kết quả:** Phụ huynh nhận notification "Feedback đã được xem xét"

### Bước 4: Phản hồi và giải quyết
```bash
curl -X PATCH "http://localhost:3000/api/parents/feedback/feedback_id/status" \
  -H "Authorization: Bearer admin_token" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "adminResponse": "Cảm ơn phụ huynh đã góp ý. Chúng tôi sẽ cải thiện hệ thống."
  }'
```
**Kết quả:** Phụ huynh nhận notification "Feedback đã được giải quyết" với nội dung phản hồi

### Bước 5: Kiểm tra thống kê
```bash
curl -X GET "http://localhost:3000/api/parents/feedback/stats" \
  -H "Authorization: Bearer admin_token"
```

## Tips

1. **Sử dụng filter hiệu quả**: Kết hợp `status` và `rating` để lọc chính xác
2. **Pagination**: Sử dụng `page` và `limit` để tải dữ liệu theo từng phần
3. **Thống kê**: Kiểm tra stats thường xuyên để theo dõi tình hình
4. **Phản hồi nhanh**: Cập nhật status thành `reviewed` ngay khi xem
5. **Phản hồi chi tiết**: Viết `adminResponse` rõ ràng và hữu ích
6. **Notification**: Phụ huynh sẽ nhận notification realtime khi admin phản hồi
7. **Realtime**: Sử dụng Socket.IO để gửi notification ngay lập tức 