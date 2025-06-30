# Teacher Leave Request API Guide

## Tổng quan
API này cho phép giáo viên tạo đơn xin nghỉ cho các tiết học của mình, và manager duyệt/từ chối các đơn xin nghỉ đó.

## Luồng hoạt động

### 1. Giáo viên tạo đơn xin nghỉ
- Giáo viên chỉ có thể xin nghỉ cho các tiết học mà họ dạy
- Chỉ có thể xin nghỉ cho các tiết trong tương lai
- **Chỉ có thể xin nghỉ cho các tiết có status = 'scheduled'**
- Hệ thống tự động gửi email thông báo cho manager

### 2. Manager duyệt đơn
- **Approve**: Gửi email thông báo cho giáo viên và học sinh, cập nhật lesson status thành "absent"
- **Reject**: Xóa đơn và gửi email thông báo cho giáo viên

## Endpoints

### Teacher Endpoints

#### 1. Tạo đơn xin nghỉ (nhiều tiết)
```http
POST /api/teacher-leave-requests
Authorization: Bearer {teacher_token}
Content-Type: application/json

{
  "lessonIds": [
    "675a1b2c3d4e5f6789012345",
    "675a1b2c3d4e5f6789012346",
    "675a1b2c3d4e5f6789012347"
  ],
  "reason": "Lý do xin nghỉ chi tiết (tối thiểu 10 ký tự)",
  "emergencyContact": {
    "phone": "0123456789",
    "relationship": "Vợ/chồng"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully created 3 teacher leave requests and notifications sent to managers",
  "data": {
    "success": true,
    "created": [
      {
        "_id": "675a1b2c3d4e5f6789012346",
        "teacherId": "675a1b2c3d4e5f6789012347",
        "lessonId": {
          "_id": "675a1b2c3d4e5f6789012345",
          "lessonId": "LESSON_001",
          "type": "regular",
          "topic": "Chương 1: Giới thiệu"
        },
        "status": "pending",
        "reason": "Có việc gia đình khẩn cấp cần xử lý",
        "emergencyContact": {
          "phone": "0123456789",
          "relationship": "Vợ"
        },
        "createdAt": "2024-01-10T10:30:00.000Z"
      }
    ],
    "errors": [],
    "summary": {
      "totalRequested": 3,
      "created": 3,
      "failed": 0
    }
  }
}
```

#### 2. Lấy danh sách đơn xin nghỉ của mình
```http
GET /api/teacher-leave-requests/my-requests?status=pending&page=1&limit=20
Authorization: Bearer {teacher_token}
```

#### 3. Lấy các tiết có thể xin nghỉ
```http
GET /api/teacher-leave-requests/available-lessons?startDate=2024-01-15&endDate=2024-02-15
Authorization: Bearer {teacher_token}
```

#### 4. Xem chi tiết đơn xin nghỉ
```http
GET /api/teacher-leave-requests/{requestId}
Authorization: Bearer {teacher_token}
```

#### 5. Xóa đơn xin nghỉ (chỉ khi pending)
```http
DELETE /api/teacher-leave-requests/{requestId}
Authorization: Bearer {teacher_token}
```

### Manager Endpoints

#### 1. Lấy danh sách đơn cần duyệt
```http
GET /api/teacher-leave-requests/pending/all?page=1&limit=50
Authorization: Bearer {manager_token}
```

#### 2. Duyệt đơn xin nghỉ
```http
POST /api/teacher-leave-requests/{requestId}/approve
Authorization: Bearer {manager_token}
Content-Type: application/json

{
  "comment": "Đồng ý cho nghỉ vì lý do chính đáng"
}
```

#### 3. Từ chối đơn xin nghỉ
```http
POST /api/teacher-leave-requests/{requestId}/reject
Authorization: Bearer {manager_token}
Content-Type: application/json

{
  "comment": "Không thể nghỉ vì gần kỳ thi quan trọng"
}
```

## Email Notifications

### 1. Email cho Manager (khi giáo viên tạo đơn mới)
- **Tiêu đề**: 🏫 Đơn xin nghỉ của giáo viên cần duyệt - {Môn học}
- **Nội dung**: Thông tin giáo viên, tiết học, lý do, số học sinh bị ảnh hưởng

### 2. Email cho Giáo viên (khi được duyệt/từ chối)
- **Tiêu đề**: ✅/❌ Thông báo kết quả đơn xin nghỉ - {Môn học}
- **Nội dung**: Kết quả, nhận xét manager, hướng dẫn tiếp theo

### 3. Email cho Học sinh (khi đơn được approve)
- **Tiêu đề**: 📢 Thông báo nghỉ học - {Môn học}
- **Nội dung**: Thông tin tiết học bị hủy, hướng dẫn cho học sinh

## Error Handling

### Validation Errors (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "reason",
      "message": "Reason must be between 10-500 characters",
      "value": "Ngắn"
    }
  ]
}
```

### Authorization Errors (403)
```json
{
  "success": false,
  "message": "You can only request leave for lessons you are teaching"
}
```

### Not Found Errors (404)
```json
{
  "success": false,
  "message": "Teacher leave request not found"
}
```

### Business Logic Errors (400)
```json
{
  "success": false,
  "message": "Cannot request leave for past or current lessons"
}
```

```json
{
  "success": false,
  "message": "Failed to create teacher leave requests: Error processing lesson 675a1b2c3d4e5f6789012345: Cannot request leave for lesson with status 'completed': Toán học on 15/1/2024. Only scheduled lessons can be requested for leave."
}
```

## Validation Rules

### Tạo đơn xin nghỉ
- `lessonIds`: Array of MongoDB ObjectIds (1-10 items)
- `reason`: 10-500 ký tự
- `emergencyContact.phone`: 10-15 số, có thể có dấu +, -, space, ()
- `emergencyContact.relationship`: tối đa 100 ký tự (optional)

### Business Rules
- Chỉ giáo viên mới có thể tạo đơn xin nghỉ
- Chỉ có thể xin nghỉ cho tiết học của chính mình
- Chỉ có thể xin nghỉ cho tiết trong tương lai
- **Chỉ có thể xin nghỉ cho tiết có status = 'scheduled'**
- Không thể tạo đơn trùng lặp cho cùng một tiết
- Chỉ có thể xóa đơn khi status = pending
- Chỉ manager/admin mới có thể duyệt/từ chối đơn
- Comment bắt buộc khi từ chối đơn

## Security Features

### Authentication
- Tất cả endpoints yêu cầu JWT token hợp lệ
- Token phải chứa thông tin user với role phù hợp

### Authorization
- Teachers: chỉ có thể thao tác với đơn của chính mình
- Managers/Admins: có thể xem và duyệt tất cả đơn
- Kiểm tra ownership khi xóa/xem chi tiết đơn

### Data Validation
- Validate tất cả input trước khi xử lý
- Kiểm tra quyền sở hữu lesson
- Kiểm tra trạng thái đơn trước khi thay đổi

## Performance Considerations

### Database Indexes
- `{ teacherId: 1, date: 1 }`: Tìm đơn theo giáo viên và thời gian
- `{ managerId: 1, status: 1 }`: Tìm đơn theo manager và trạng thái
- `{ lessonId: 1 }`: Tìm đơn theo lesson
- `{ status: 1, date: 1 }`: Tìm đơn pending theo thời gian

### Pagination
- Default limit: 20 items
- Maximum limit: 100 items
- Sử dụng skip/limit cho phân trang

### Email Optimization
- Email được gửi async để không block response
- Sử dụng Promise.allSettled để gửi multiple emails
- Log errors nhưng không fail request nếu email lỗi 