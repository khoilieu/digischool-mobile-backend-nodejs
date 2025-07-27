# Hướng dẫn sử dụng API Module Phụ Huynh

## Tổng quan

Module phụ huynh cung cấp 4 API chính:
1. **Lấy danh sách con** - Xem tất cả con của phụ huynh
2. **Xem thời khóa biểu của con** - Xem thời khóa biểu giống như con họ thấy
3. **Gửi góp ý** - Gửi feedback cho hệ thống với rating và mô tả
4. **Lấy danh sách góp ý** - Xem lại các góp ý đã gửi

## 1. Lấy danh sách con của phụ huynh

### Endpoint
```
GET /api/parents/children
```

### Headers
```
Authorization: Bearer <your_jwt_token>
```

### Response
```json
{
  "success": true,
  "message": "Lấy danh sách con thành công",
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Nguyễn Văn A",
      "studentId": "HS001",
      "email": "student@example.com",
      "dateOfBirth": "2010-01-01T00:00:00.000Z",
      "gender": "male",
      "class_id": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "className": "10A1",
        "gradeLevel": "10",
        "academicYear": "2024-2025",
        "homeroomTeacher": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
          "name": "Cô Nguyễn Thị B",
          "email": "teacher@example.com"
        }
      }
    }
  ]
}
```

### Ví dụ với cURL
```bash
curl -X GET "http://localhost:3000/api/parents/children" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 2. Xem thời khóa biểu của con

### Endpoint
```
GET /api/parents/children/:childId/schedule
```

### Parameters
- `childId` (path): ID của con
- `academicYear` (query): Năm học (ví dụ: "2024-2025")
- `startOfWeek` (query): Ngày bắt đầu tuần (định dạng: YYYY-MM-DD)
- `endOfWeek` (query): Ngày kết thúc tuần (định dạng: YYYY-MM-DD)

### Headers
```
Authorization: Bearer <your_jwt_token>
```

### Response
```json
{
  "success": true,
  "message": "Lấy thời khóa biểu thành công",
  "data": {
    "child": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Nguyễn Văn A",
      "studentId": "HS001",
      "class": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "className": "10A1",
        "gradeLevel": "10",
        "academicYear": "2024-2025"
      }
    },
    "schedule": {
      "weeklySchedule": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
        "class": "64f8a1b2c3d4e5f6a7b8c9d1",
        "academicYear": "64f8a1b2c3d4e5f6a7b8c9d4",
        "weekNumber": 1,
        "lessons": [
          {
            "_id": "64f8a1b2c3d4e5f6a7b8c9d5",
            "subject": {
              "_id": "64f8a1b2c3d4e5f6a7b8c9d6",
              "name": "Toán",
              "code": "MATH"
            },
            "teacher": {
              "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
              "name": "Cô Nguyễn Thị B"
            },
            "timeSlot": {
              "_id": "64f8a1b2c3d4e5f6a7b8c9d7",
              "period": 1,
              "startTime": "07:00",
              "endTime": "07:45"
            },
            "scheduledDate": "2024-01-15T00:00:00.000Z",
            "type": "lesson",
            "description": "Bài học về phương trình bậc hai"
          }
        ]
      }
    }
  }
}
```

### Ví dụ với cURL
```bash
curl -X GET "http://localhost:3000/api/parents/children/64f8a1b2c3d4e5f6a7b8c9d0/schedule?academicYear=2024-2025&startOfWeek=2024-01-15&endOfWeek=2024-01-21" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 3. Gửi góp ý cho hệ thống

### Endpoint
```
POST /api/parents/feedback
```

### Headers
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Request Body
```json
{
  "rating": 4,
  "description": "Hệ thống rất tốt, giao diện dễ sử dụng. Tuy nhiên cần cải thiện tốc độ tải trang và thêm tính năng thông báo real-time."
}
```

### Validation Rules
- `rating`: Số nguyên từ 1-5 (bắt buộc)
- `description`: Chuỗi từ 10-1000 ký tự (bắt buộc)

### Response
```json
{
  "success": true,
  "message": "Góp ý đã được gửi thành công",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d8",
    "user": "64f8a1b2c3d4e5f6a7b8c9d9",
    "rating": 4,
    "description": "Hệ thống rất tốt, giao diện dễ sử dụng. Tuy nhiên cần cải thiện tốc độ tải trang và thêm tính năng thông báo real-time.",
    "status": "pending",
    "adminResponse": null,
    "respondedBy": null,
    "respondedAt": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Ví dụ với cURL
```bash
curl -X POST "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "description": "Hệ thống rất tốt, giao diện dễ sử dụng. Tuy nhiên cần cải thiện tốc độ tải trang và thêm tính năng thông báo real-time."
  }'
```

## 4. Lấy danh sách góp ý của phụ huynh

### Endpoint
```
GET /api/parents/feedback
```

### Query Parameters
- `page` (optional): Số trang (mặc định: 1)
- `limit` (optional): Số lượng item mỗi trang (mặc định: 10, tối đa: 100)

### Headers
```
Authorization: Bearer <your_jwt_token>
```

### Response
```json
{
  "success": true,
  "message": "Lấy danh sách góp ý thành công",
  "data": {
    "feedbacks": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d8",
        "rating": 4,
        "description": "Hệ thống rất tốt, giao diện dễ sử dụng...",
        "status": "pending",
        "adminResponse": null,
        "respondedBy": null,
        "respondedAt": null,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d9",
        "rating": 5,
        "description": "Tuyệt vời! Con tôi rất thích sử dụng hệ thống này.",
        "status": "reviewed",
        "adminResponse": "Cảm ơn phụ huynh đã góp ý. Chúng tôi sẽ tiếp tục cải thiện hệ thống.",
        "respondedBy": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9da",
          "name": "Admin",
          "email": "admin@example.com"
        },
        "respondedAt": "2024-01-16T09:00:00.000Z",
        "createdAt": "2024-01-15T08:00:00.000Z",
        "updatedAt": "2024-01-16T09:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "pages": 1
    }
  }
}
```

### Ví dụ với cURL
```bash
curl -X GET "http://localhost:3000/api/parents/feedback?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Xử lý lỗi

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

### 400 Bad Request (Validation Error)
```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    "Đánh giá tối thiểu là 1 sao",
    "Mô tả phải có ít nhất 10 ký tự"
  ]
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Lỗi khi lấy danh sách con: Phụ huynh không tồn tại"
}
```

## Lưu ý quan trọng

1. **Xác thực**: Tất cả API đều yêu cầu token JWT hợp lệ
2. **Phân quyền**: Chỉ phụ huynh (role: parents) mới có thể truy cập
3. **Bảo mật**: Phụ huynh chỉ có thể xem thông tin của con mình
4. **Validation**: Dữ liệu đầu vào được validate nghiêm ngặt
5. **Pagination**: API lấy danh sách hỗ trợ phân trang
6. **Status**: Feedback có 3 trạng thái: pending, reviewed, resolved

## Tích hợp với Frontend

### React/JavaScript
```javascript
// Lấy danh sách con
const getChildren = async () => {
  const response = await fetch('/api/parents/children', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data;
};

// Gửi feedback
const sendFeedback = async (rating, description) => {
  const response = await fetch('/api/parents/feedback', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ rating, description })
  });
  const data = await response.json();
  return data;
};
```

### Vue.js
```javascript
// Lấy thời khóa biểu của con
async getChildSchedule(childId, academicYear, weekNumber) {
  try {
    const response = await this.$http.get(
      `/api/parents/children/${childId}/schedule`,
      {
        params: { academicYear, weekNumber },
        headers: { Authorization: `Bearer ${this.token}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error:', error);
  }
}
``` 