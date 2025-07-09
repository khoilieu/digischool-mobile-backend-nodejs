# Hướng dẫn sử dụng API Substitute (Dạy thay) - Postman

## Tổng quan

API Substitute cho phép giáo viên yêu cầu giáo viên khác cùng bộ môn dạy thay cho tiết học của mình. Giáo viên được yêu cầu có thể chấp nhận hoặc từ chối yêu cầu.

## Base URL

```
http://localhost:8080/api/schedules/lesson-request
```

## Authentication

Tất cả API đều yêu cầu Bearer Token. Thêm header:

```
Authorization: Bearer <your_jwt_token>
```

## 1. Tạo yêu cầu dạy thay

### Endpoint

```
POST /substitute/create
```

### Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

### Body

```json
{
  "lessonId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "candidateTeacherIds": [
    "64f8a1b2c3d4e5f6a7b8c9d1",
    "64f8a1b2c3d4e5f6a7b8c9d2"
  ],
  "reason": "Tôi cần nghỉ ốm vào ngày mai"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "message": "Substitute request created successfully",
  "request": {
    "requestId": "SUB-2024-001",
    "requestType": "substitute",
    "status": "pending",
    "lesson": {
      "lessonId": "LSN-2024-001",
      "scheduledDate": "2024-01-15T07:00:00.000Z",
      "timeSlot": {
        "period": 1,
        "startTime": "07:00",
        "endTime": "07:45"
      },
      "class": {
        "className": "12A1"
      },
      "subject": {
        "subjectName": "Toán học"
      }
    },
    "requestingTeacher": {
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@example.com"
    },
    "candidateTeachers": [
      {
        "teacher": {
          "name": "Trần Thị B",
          "email": "tranthib@example.com"
        },
        "status": "pending"
      },
      {
        "teacher": {
          "name": "Lê Văn C",
          "email": "levanc@example.com"
        },
        "status": "pending"
      }
    ],
    "reason": "Tôi cần nghỉ ốm vào ngày mai",
    "createdAt": "2024-01-14T10:30:00.000Z"
  }
}
```

## 2. Lấy danh sách giáo viên có thể dạy thay

### Endpoint

```
GET /substitute/available-teachers/:lessonId
```

### Headers

```
Authorization: Bearer <token>
```

### Response (200 OK)

```json
{
  "success": true,
  "availableTeachers": [
    {
      "teacher": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "name": "Trần Thị B",
        "email": "tranthib@example.com",
        "subjects": ["Toán học"]
      },
      "hasConflict": false,
      "conflictDetails": null
    },
    {
      "teacher": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
        "name": "Lê Văn C",
        "email": "levanc@example.com",
        "subjects": ["Toán học"]
      },
      "hasConflict": true,
      "conflictDetails": {
        "conflictingLesson": "LSN-2024-002",
        "conflictTime": "07:00-07:45"
      }
    }
  ]
}
```

## 3. Lấy danh sách yêu cầu dạy thay của giáo viên

### Endpoint

```
GET /substitute/my-requests?status=pending&page=1&limit=10
```

### Query Parameters

- `status` (optional): pending, approved, rejected, cancelled
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số item mỗi trang (default: 20)

### Response (200 OK)

```json
{
  "success": true,
  "requests": [
    {
      "requestId": "SUB-2024-001",
      "requestType": "substitute",
      "status": "pending",
      "lesson": {
        "lessonId": "LSN-2024-001",
        "scheduledDate": "2024-01-15T07:00:00.000Z",
        "topic": "Đạo hàm",
        "status": "scheduled"
      },
      "requestingTeacher": {
        "name": "Nguyễn Văn A",
        "email": "nguyenvana@example.com"
      },
      "candidateTeachers": [
        {
          "teacher": {
            "name": "Trần Thị B",
            "email": "tranthib@example.com"
          },
          "status": "pending"
        }
      ],
      "createdAt": "2024-01-14T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

## 4. Phê duyệt yêu cầu dạy thay

### Endpoint

```
POST /substitute/:requestId/approve
```

### Headers

```
Authorization: Bearer <token>
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Substitute request approved successfully",
  "request": {
    "requestId": "SUB-2024-001",
    "status": "approved",
    "approvedTeacher": {
      "name": "Trần Thị B",
      "email": "tranthib@example.com"
    },
    "approvedAt": "2024-01-14T11:00:00.000Z"
  }
}
```

## 5. Từ chối yêu cầu dạy thay

### Endpoint

```
POST /substitute/:requestId/reject
```

### Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

### Body

```json
{
  "reason": "Tôi có lịch dạy khác vào thời gian này"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Substitute request rejected",
  "request": {
    "requestId": "SUB-2024-001",
    "status": "rejected",
    "rejectedBy": {
      "name": "Trần Thị B",
      "email": "tranthib@example.com"
    },
    "rejectionReason": "Tôi có lịch dạy khác vào thời gian này",
    "rejectedAt": "2024-01-14T11:30:00.000Z"
  }
}
```

## 6. Hủy yêu cầu dạy thay

### Endpoint

```
POST /substitute/:requestId/cancel
```

### Headers

```
Authorization: Bearer <token>
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Substitute request cancelled",
  "request": {
    "requestId": "SUB-2024-001",
    "status": "cancelled",
    "cancelledAt": "2024-01-14T12:00:00.000Z"
  }
}
```

## 7. Lấy chi tiết yêu cầu dạy thay

### Endpoint

```
GET /substitute/:requestId
```

### Response (200 OK)

```json
{
  "success": true,
  "request": {
    "requestId": "SUB-2024-001",
    "requestType": "substitute",
    "status": "approved",
    "lesson": {
      "lessonId": "LSN-2024-001",
      "scheduledDate": "2024-01-15T07:00:00.000Z",
      "timeSlot": {
        "period": 1,
        "startTime": "07:00",
        "endTime": "07:45"
      },
      "class": {
        "className": "12A1"
      },
      "subject": {
        "subjectName": "Toán học"
      }
    },
    "requestingTeacher": {
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@example.com"
    },
    "approvedTeacher": {
      "name": "Trần Thị B",
      "email": "tranthib@example.com"
    },
    "reason": "Tôi cần nghỉ ốm vào ngày mai",
    "createdAt": "2024-01-14T10:30:00.000Z",
    "approvedAt": "2024-01-14T11:00:00.000Z"
  }
}
```

## 8. Lấy tất cả yêu cầu dạy thay (Admin/Manager)

### Endpoint

```
GET /substitute/all?status=pending&page=1&limit=20
```

### Query Parameters

- `status` (optional): pending, approved, rejected, cancelled
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số item mỗi trang (default: 20)

### Response (200 OK)

```json
{
  "success": true,
  "requests": [
    {
      "requestId": "SUB-2024-001",
      "requestType": "substitute",
      "status": "pending",
      "lesson": {
        "lessonId": "LSN-2024-001",
        "scheduledDate": "2024-01-15T07:00:00.000Z",
        "class": {
          "className": "12A1"
        },
        "subject": {
          "subjectName": "Toán học"
        }
      },
      "requestingTeacher": {
        "name": "Nguyễn Văn A",
        "email": "nguyenvana@example.com"
      },
      "candidateTeachers": [
        {
          "teacher": {
            "name": "Trần Thị B",
            "email": "tranthib@example.com"
          },
          "status": "pending"
        }
      ],
      "createdAt": "2024-01-14T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

## 9. Lấy thống kê yêu cầu dạy thay (Admin/Manager)

### Endpoint

```
GET /substitute/stats
```

### Response (200 OK)

```json
{
  "success": true,
  "stats": {
    "total": 50,
    "pending": 10,
    "approved": 30,
    "rejected": 8,
    "cancelled": 2
  }
}
```

## Luồng hoạt động

### 1. Giáo viên tạo yêu cầu dạy thay

1. Gọi API `POST /substitute/create`
2. Hệ thống gửi email thông báo cho các giáo viên được đề xuất
3. Hệ thống gửi email thông báo cho manager

### 2. Giáo viên được đề xuất phản hồi

1. Giáo viên nhận email thông báo
2. Giáo viên có thể:
   - Chấp nhận: `POST /substitute/:requestId/approve`
   - Từ chối: `POST /substitute/:requestId/reject`
3. Hệ thống gửi email thông báo kết quả

### 3. Khi yêu cầu được chấp nhận

1. Hệ thống cập nhật lesson với substituteTeacher
2. Hệ thống gửi email thông báo cho học sinh
3. Hệ thống hủy các yêu cầu khác của giáo viên đã chấp nhận

## Lưu ý quan trọng

1. **Quyền truy cập**:

   - Chỉ giáo viên có thể tạo yêu cầu dạy thay
   - Chỉ giáo viên được đề xuất mới có thể chấp nhận/từ chối
   - Admin/Manager có thể xem tất cả yêu cầu

2. **Validation**:

   - Lesson phải ở trạng thái "scheduled"
   - Chỉ giáo viên được phân công mới có thể tạo yêu cầu
   - Candidate teachers phải là giáo viên hợp lệ

3. **Email notifications**:

   - Tự động gửi email khi tạo yêu cầu
   - Tự động gửi email khi chấp nhận/từ chối
   - Tự động gửi email thông báo cho học sinh

4. **Conflict handling**:
   - Hệ thống kiểm tra xung đột thời gian
   - Hiển thị thông tin xung đột trong API getAvailableTeachers

## Error Codes

| Code | Message               | Description                     |
| ---- | --------------------- | ------------------------------- |
| 400  | Validation errors     | Dữ liệu đầu vào không hợp lệ    |
| 401  | Unauthorized          | Token không hợp lệ hoặc hết hạn |
| 403  | Access denied         | Không có quyền truy cập         |
| 404  | Request not found     | Không tìm thấy yêu cầu          |
| 500  | Internal server error | Lỗi hệ thống                    |

## Postman Collection

Bạn có thể import collection sau vào Postman:

```json
{
  "info": {
    "name": "Substitute Request API",
    "description": "API cho chức năng dạy thay"
  },
  "item": [
    {
      "name": "Create Substitute Request",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"lessonId\": \"64f8a1b2c3d4e5f6a7b8c9d0\",\n  \"candidateTeacherIds\": [\n    \"64f8a1b2c3d4e5f6a7b8c9d1\",\n    \"64f8a1b2c3d4e5f6a7b8c9d2\"\n  ],\n  \"reason\": \"Tôi cần nghỉ ốm vào ngày mai\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/substitute/create",
          "host": ["{{baseUrl}}"],
          "path": ["substitute", "create"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api/schedules/lesson-request"
    },
    {
      "key": "token",
      "value": "your_jwt_token_here"
    }
  ]
}
```
