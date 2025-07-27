# Module Phụ Huynh (Parents Module)

Module này cung cấp các API cho phụ huynh để quản lý thông tin con cái và gửi góp ý cho hệ thống.

## Các API Endpoints

### 1. Lấy danh sách con của phụ huynh
**GET** `/api/parents/children`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách con thành công",
  "data": [
    {
      "_id": "child_id",
      "name": "Nguyễn Văn A",
      "studentId": "HS001",
      "email": "student@example.com",
      "dateOfBirth": "2010-01-01T00:00:00.000Z",
      "gender": "male",
      "class_id": {
        "_id": "class_id",
        "className": "10A1",
        "gradeLevel": "10",
        "academicYear": "2024-2025",
        "homeroomTeacher": {
          "_id": "teacher_id",
          "name": "Cô Nguyễn Thị B",
          "email": "teacher@example.com"
        }
      }
    }
  ]
}
```

### 2. Xem thời khóa biểu của con
**GET** `/api/parents/children/:childId/schedule`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `academicYear` (required): Năm học (ví dụ: "2024-2025")
- `startOfWeek` (required): Ngày bắt đầu tuần (định dạng: YYYY-MM-DD)
- `endOfWeek` (required): Ngày kết thúc tuần (định dạng: YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "message": "Lấy thời khóa biểu thành công",
  "data": {
    "child": {
      "_id": "child_id",
      "name": "Nguyễn Văn A",
      "studentId": "HS001",
      "class": {
        "_id": "class_id",
        "className": "10A1",
        "gradeLevel": "10",
        "academicYear": "2024-2025"
      }
    },
    "schedule": {
      // Thời khóa biểu giống như học sinh thấy
      "weeklySchedule": {
        "lessons": [
          {
            "subject": "Toán",
            "teacher": "Cô Nguyễn Thị B",
            "timeSlot": {
              "period": 1,
              "startTime": "07:00",
              "endTime": "07:45"
            },
            "scheduledDate": "2024-01-15T00:00:00.000Z",
            "type": "lesson"
          }
        ]
      }
    }
  }
}
```

### 3. Gửi góp ý cho hệ thống
**POST** `/api/parents/feedback`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "rating": 4,
  "description": "Hệ thống rất tốt, giao diện dễ sử dụng. Tuy nhiên cần cải thiện tốc độ tải trang."
}
```

**Validation Rules:**
- `rating`: Số nguyên từ 1-5 (bắt buộc)
- `description`: Chuỗi từ 10-1000 ký tự (bắt buộc)

**Response:**
```json
{
  "success": true,
  "message": "Góp ý đã được gửi thành công",
  "data": {
    "_id": "feedback_id",
    "user": "parent_id",
    "rating": 4,
    "description": "Hệ thống rất tốt, giao diện dễ sử dụng. Tuy nhiên cần cải thiện tốc độ tải trang.",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. Lấy danh sách góp ý của phụ huynh
**GET** `/api/parents/feedback`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Số trang (mặc định: 1)
- `limit` (optional): Số lượng item mỗi trang (mặc định: 10, tối đa: 100)

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách góp ý thành công",
  "data": {
    "feedbacks": [
      {
        "_id": "feedback_id",
        "rating": 4,
        "description": "Hệ thống rất tốt...",
        "status": "pending",
        "adminResponse": null,
        "respondedBy": null,
        "respondedAt": null,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

## Quyền truy cập

Tất cả các API trong module này yêu cầu:
1. **Xác thực**: Token JWT hợp lệ
2. **Phân quyền**: Người dùng phải có role `parents`

## Lỗi thường gặp

### 401 Unauthorized
- Chưa đăng nhập hoặc token không hợp lệ

### 403 Forbidden
- Người dùng không có role `parents`
- Không có quyền xem thời khóa biểu của học sinh khác

### 400 Bad Request
- Dữ liệu không hợp lệ (validation errors)
- Thiếu thông tin bắt buộc

### 500 Internal Server Error
- Lỗi server

## Ví dụ sử dụng với cURL

### Lấy danh sách con
```bash
curl -X GET "http://localhost:3000/api/parents/children" \
  -H "Authorization: Bearer your_jwt_token"
```

### Xem thời khóa biểu của con
```bash
curl -X GET "http://localhost:3000/api/parents/children/child_id/schedule?academicYear=2024-2025&startOfWeek=2024-01-15&endOfWeek=2024-01-21" \
  -H "Authorization: Bearer your_jwt_token"
```

### Gửi góp ý
```bash
curl -X POST "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "description": "Hệ thống rất tốt, giao diện dễ sử dụng."
  }'
```

### Lấy danh sách góp ý
```bash
curl -X GET "http://localhost:3000/api/parents/feedback?page=1&limit=10" \
  -H "Authorization: Bearer your_jwt_token"
``` 