# Leave Request API Endpoints - Quick Reference

## 🔗 Base URL
```
http://localhost:3000/api/leave-requests
```

## 📚 Student Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/available-lessons?startDate=xxx&endDate=xxx` | Xem tiết có thể xin vắng | Student |
| `POST` | `/create` | Tạo đơn xin vắng nhiều tiết | Student |
| `GET` | `/my-requests?status=xxx&page=1&limit=20` | Xem đơn của mình | Student |
| `DELETE` | `/{requestId}/cancel` | Hủy đơn pending | Student |

## 👨‍🏫 Teacher Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/pending?page=1&limit=50` | Xem đơn cần duyệt | Teacher |
| `GET` | `/teacher-requests?status=xxx&page=1&limit=20` | Xem tất cả đơn đã xử lý | Teacher |
| `POST` | `/{requestId}/approve` | Duyệt đơn xin vắng | Teacher |
| `POST` | `/{requestId}/reject` | Từ chối đơn xin vắng | Teacher |
| `POST` | `/batch-process` | Xử lý nhiều đơn cùng lúc | Teacher |

## 🔍 Common Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/{requestId}` | Xem chi tiết đơn | All roles |

## 📊 Admin/Manager Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/stats/overview?teacherId=xxx&startDate=xxx&endDate=xxx` | Thống kê tổng quan | Admin/Manager |

## 📝 Request Body Examples

### Create Leave Request
```json
{
  "lessonIds": ["675a1b2c3d4e5f6789012345", "675a1b2c3d4e5f6789012346"],
  "phoneNumber": "0987654321",
  "reason": "Có việc gia đình đột xuất cần xin phép vắng mặt. Em sẽ học bù sau."
}
```

### Approve Request
```json
{
  "comment": "Đồng ý cho phép nghỉ học. Nhớ học bù."
}
```

### Reject Request
```json
{
  "comment": "Không thể phê duyệt vì đây là tiết kiểm tra quan trọng."
}
```

### Batch Process
```json
{
  "requests": [
    {
      "requestId": "675a1b2c3d4e5f6789012347",
      "action": "approve",
      "comment": "Đồng ý"
    },
    {
      "requestId": "675a1b2c3d4e5f6789012348",
      "action": "reject",
      "comment": "Không thể phê duyệt vì là tiết kiểm tra"
    }
  ]
}
```

## 🔑 Authentication
```
Authorization: Bearer <token>
Content-Type: application/json
```

## 📋 Response Format
```json
{
  "success": true|false,
  "message": "Description",
  "data": { /* response data */ },
  "errors": [ /* validation errors */ ]
}
```

## 🚦 HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## 🧪 Test Commands

### Get Available Lessons
```bash
curl -X GET "http://localhost:3000/api/leave-requests/available-lessons?startDate=2024-08-12&endDate=2024-08-19" \
  -H "Authorization: Bearer <student_token>"
```

### Create Leave Request
```bash
curl -X POST "http://localhost:3000/api/leave-requests/create" \
  -H "Authorization: Bearer <student_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonIds": ["675a1b2c3d4e5f6789012345"],
    "phoneNumber": "0987654321",
    "reason": "Có việc gia đình đột xuất"
  }'
```

### Get Pending Requests
```bash
curl -X GET "http://localhost:3000/api/leave-requests/pending" \
  -H "Authorization: Bearer <teacher_token>"
```

### Approve Request
```bash
curl -X POST "http://localhost:3000/api/leave-requests/{requestId}/approve" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Đồng ý cho phép nghỉ học"}'
```

### Reject Request
```bash
curl -X POST "http://localhost:3000/api/leave-requests/{requestId}/reject" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Không thể phê duyệt vì đây là tiết kiểm tra quan trọng"}'
```

### Get Statistics
```bash
curl -X GET "http://localhost:3000/api/leave-requests/stats/overview" \
  -H "Authorization: Bearer <admin_token>"
``` 