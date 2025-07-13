# Hướng dẫn sử dụng API Swap (Đổi tiết) - Postman

## Tổng quan

API Swap cho phép giáo viên yêu cầu đổi tiết học của mình với tiết học khác có giáo viên dạy trong cùng lớp và cùng tuần. Yêu cầu này cần được manager/admin phê duyệt.

## Base URL

```
http://localhost:8080/api/schedules/lesson-request
```

## Authentication

Tất cả API đều yêu cầu Bearer Token. Thêm header:

```
Authorization: Bearer <your_jwt_token>
```

## 1. Tạo yêu cầu đổi tiết

### Endpoint

```
POST /swap/create
```

### Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

### Body

```json
{
  "originalLessonId": "64f8a1b2c3d4e5f6a7b8c9d1",
  "replacementLessonId": "64f8a1b2c3d4e5f6a7b8c9d4",
  "reason": "Tôi cần đổi tiết để tham gia họp phụ huynh"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "message": "Swap request created successfully",
  "request": {
    "requestId": "SWP-2024-001",
    "requestType": "swap",
    "status": "pending",
    "requestingTeacher": {
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@example.com",
      "fullName": "Nguyễn Văn A"
    },
    "originalLesson": {
      "lessonId": "LSN-2024-001",
      "scheduledDate": "2024-01-15T07:00:00.000Z",
      "timeSlot": {
        "period": 1,
        "name": "Tiết 1",
        "startTime": "07:00",
        "endTime": "07:45"
      },
      "topic": "Đạo hàm",
      "status": "scheduled",
      "type": "regular"
    },
    "replacementLesson": {
      "lessonId": "LSN-2024-002",
      "scheduledDate": "2024-01-16T08:00:00.000Z",
      "timeSlot": {
        "period": 2,
        "name": "Tiết 2",
        "startTime": "08:00",
        "endTime": "08:45"
      },
      "topic": "Cơ học",
      "status": "scheduled",
      "type": "regular"
    },
    "reason": "Tôi cần đổi tiết để tham gia họp phụ huynh",
    "additionalInfo": {
      "classInfo": {
        "className": "12A1",
        "gradeLevel": 12
      },
      "subjectInfo": {
        "subjectName": "Toán học",
        "subjectCode": "MATH"
      },
      "academicYear": {
        "name": "2024-2025",
        "startDate": "2024-09-01T00:00:00.000Z",
        "endDate": "2025-06-30T23:59:59.999Z"
      },
      "weekInfo": {
        "startOfWeek": "2024-01-15T00:00:00.000Z",
        "endOfWeek": "2024-01-21T23:59:59.999Z"
      }
    },
    "createdAt": "2024-01-14T10:30:00.000Z"
  }
}
```

## 2. Hủy yêu cầu đổi tiết

### Endpoint

```
POST /swap/:requestId/cancel
```

### Headers

```
Authorization: Bearer <token>
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Swap request cancelled successfully",
  "data": {
    "requestId": "SWP-2024-001",
    "status": "cancelled",
    "processedBy": "64f8a1b2c3d4e5f6a7b8c9d5",
    "processedAt": "2024-01-14T11:30:00.000Z"
  }
}
```

**Lưu ý:** Chỉ giáo viên yêu cầu (requesting teacher) mới có thể hủy yêu cầu đổi tiết.

## 3. Duyệt yêu cầu đổi tiết (Admin/Manager)

### Endpoint

```
POST /:requestId/approve
```

### Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

### Body

```json
{
  "comment": "Đồng ý cho phép đổi tiết"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Swap request approved successfully",
  "request": {
    "requestId": "SWP-2024-001",
    "requestType": "swap",
    "status": "approved",
    "processedBy": "64f8a1b2c3d4e5f6a7b8c9d5",
    "processedAt": "2024-01-14T11:00:00.000Z",
    "swapInfo": {
      "replacementTeacher": {
        "name": "Nguyễn Văn B",
        "email": "teacherB@school.com"
      },
      "replacementTeacherResponse": {
        "status": "approved",
        "responseDate": "2024-01-14T11:00:00.000Z"
      }
    },
    "originalLesson": {
      "lessonId": "LSN-2024-001",
      "scheduledDate": "2024-01-15T07:00:00.000Z",
      "timeSlot": {
        "period": 1,
        "name": "Tiết 1",
        "startTime": "07:00",
        "endTime": "07:45"
      },
      "topic": "Cơ học",
      "status": "scheduled",
      "type": "regular"
    },
    "replacementLesson": {
      "lessonId": "LSN-2024-002",
      "scheduledDate": "2024-01-16T08:00:00.000Z",
      "timeSlot": {
        "period": 2,
        "name": "Tiết 2",
        "startTime": "08:00",
        "endTime": "08:45"
      },
      "topic": "Đạo hàm",
      "status": "scheduled",
      "type": "regular"
    }
  }
}
```

## 7. Từ chối yêu cầu đổi tiết (Admin/Manager)

### Endpoint

```
POST /:requestId/reject
```

### Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

### Body

```json
{
  "comment": "Không thể đổi tiết vì lịch học đã được sắp xếp"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Swap request rejected",
  "request": {
    "requestId": "SWP-2024-001",
    "requestType": "swap",
    "status": "rejected",
    "processedBy": "64f8a1b2c3d4e5f6a7b8c9d5",
    "processedAt": "2024-01-14T11:30:00.000Z",
    "swapInfo": {
      "replacementTeacher": {
        "name": "Nguyễn Văn B",
        "email": "teacherB@school.com"
      },
      "replacementTeacherResponse": {
        "status": "rejected",
        "responseDate": "2024-01-14T11:30:00.000Z",
        "rejectionReason": "Không thể đổi tiết vì lý do cá nhân"
      }
    },
    "originalLesson": {
      "lessonId": "LSN-2024-001",
      "scheduledDate": "2024-01-15T07:00:00.000Z",
      "timeSlot": {
        "period": 1,
        "name": "Tiết 1",
        "startTime": "07:00",
        "endTime": "07:45"
      },
      "topic": "Đạo hàm",
      "status": "scheduled",
      "type": "regular"
    },
    "replacementLesson": {
      "lessonId": "LSN-2024-002",
      "scheduledDate": "2024-01-16T08:00:00.000Z",
      "timeSlot": {
        "period": 2,
        "name": "Tiết 2",
        "startTime": "08:00",
        "endTime": "08:45"
      },
      "topic": "Cơ học",
      "status": "scheduled",
      "type": "regular"
    }
  }
}
```

## 8. Lấy chi tiết yêu cầu đổi tiết

### Endpoint

```
GET /:requestId
```

### Headers

```
Authorization: Bearer <token>
```

### Response (200 OK)

```json
{
  "success": true,
  "request": {
    "requestId": "SWP-2024-001",
    "requestType": "swap",
    "status": "approved",
    "requestingTeacher": {
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@example.com",
      "fullName": "Nguyễn Văn A"
    },
    "originalLesson": {
      "lessonId": "LSN-2024-001",
      "scheduledDate": "2024-01-15T07:00:00.000Z",
      "timeSlot": {
        "period": 1,
        "name": "Tiết 1",
        "startTime": "07:00",
        "endTime": "07:45"
      },
      "topic": "Cơ học",
      "status": "scheduled",
      "type": "regular"
    },
    "replacementLesson": {
      "lessonId": "LSN-2024-002",
      "scheduledDate": "2024-01-16T08:00:00.000Z",
      "timeSlot": {
        "period": 2,
        "name": "Tiết 2",
        "startTime": "08:00",
        "endTime": "08:45"
      },
      "topic": "Đạo hàm",
      "status": "scheduled",
      "type": "regular"
    },
    "reason": "Tôi cần đổi tiết để tham gia họp phụ huynh",
    "additionalInfo": {
      "classInfo": {
        "className": "12A1",
        "gradeLevel": 12
      },
      "subjectInfo": {
        "subjectName": "Toán học",
        "subjectCode": "MATH"
      },
      "academicYear": {
        "name": "2024-2025",
        "startDate": "2024-09-01T00:00:00.000Z",
        "endDate": "2025-06-30T23:59:59.999Z"
      },
      "weekInfo": {
        "startOfWeek": "2024-01-15T00:00:00.000Z",
        "endOfWeek": "2024-01-21T23:59:59.999Z"
      }
    },
    "processedBy": "64f8a1b2c3d4e5f6a7b8c9d5",
    "processedAt": "2024-01-14T11:00:00.000Z",
    "swapInfo": {
      "replacementTeacher": {
        "name": "Nguyễn Văn B",
        "email": "teacherB@school.com"
      },
      "replacementTeacherResponse": {
        "status": "approved",
        "responseDate": "2024-01-14T11:00:00.000Z"
      }
    },
    "createdAt": "2024-01-14T10:30:00.000Z"
  }
}
```

## 9. Lấy danh sách yêu cầu của giáo viên (tất cả loại)

### Endpoint

```
GET /my-requests?status=pending&page=1&limit=10
```

### Headers

```
Authorization: Bearer <token>
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
      "requestId": "SWP-2024-001",
      "requestType": "swap",
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

## Luồng hoạt động

### 1. Giáo viên tạo yêu cầu đổi tiết

1. Gọi API `GET /swap/teacher-lessons` để lấy tiết học của mình
2. Gọi API `GET /swap/available-lessons` để lấy tiết có thể đổi
3. Gọi API `POST /swap/create` để tạo yêu cầu
4. Hệ thống gửi email thông báo cho manager

### 2. Manager xử lý yêu cầu

1. Gọi API `GET /pending?requestType=swap` để xem yêu cầu đang chờ
2. Manager có thể:
   - Duyệt: `PATCH /:requestId/approve`
   - Từ chối: `PATCH /:requestId/reject`
3. Hệ thống gửi email thông báo kết quả

### 3. Khi yêu cầu được duyệt

1. Hệ thống hoán đổi thông tin giữa 2 tiết học
2. Hệ thống gửi email thông báo cho học sinh
3. Cập nhật lịch học trong database

## Lưu ý quan trọng

1. **Quyền truy cập**:

   - Chỉ giáo viên có thể tạo yêu cầu đổi tiết
   - Chỉ admin/manager mới có thể duyệt/từ chối
   - Giáo viên chỉ có thể đổi tiết của mình

2. **Validation**:

   - Original lesson phải thuộc về giáo viên tạo yêu cầu
   - Replacement lesson phải có giáo viên dạy
   - Cả 2 tiết phải cùng lớp và cùng tuần
   - Chỉ tiết "scheduled" mới có thể đổi

3. **Email notifications**:

   - Tự động gửi email khi tạo yêu cầu
   - Tự động gửi email khi duyệt/từ chối
   - Tự động gửi email thông báo cho học sinh

4. **Hoán đổi tiết học**:
   - Khi được duyệt, hệ thống sẽ hoán đổi thông tin giữa 2 tiết
   - Giáo viên, môn học, chủ đề sẽ được hoán đổi
   - Thời gian và lớp học không thay đổi

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
    "name": "Swap Request API",
    "description": "API cho chức năng đổi tiết"
  },
  "item": [
    {
      "name": "Get Teacher Lessons for Swap",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/swap/teacher-lessons?teacherId=64f8a1b2c3d4e5f6a7b8c9d0&academicYear=2024-2025&startOfWeek=2024-01-15&endOfWeek=2024-01-21",
          "host": ["{{baseUrl}}"],
          "path": ["swap", "teacher-lessons"],
          "query": [
            {
              "key": "teacherId",
              "value": "64f8a1b2c3d4e5f6a7b8c9d0"
            },
            {
              "key": "academicYear",
              "value": "2024-2025"
            },
            {
              "key": "startOfWeek",
              "value": "2024-01-15"
            },
            {
              "key": "endOfWeek",
              "value": "2024-01-21"
            }
          ]
        }
      }
    },
    {
      "name": "Get Available Lessons for Swap",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/swap/available-lessons?classId=64f8a1b2c3d4e5f6a7b8c9d2&academicYear=2024-2025&startOfWeek=2024-01-15&endOfWeek=2024-01-21&subjectId=64f8a1b2c3d4e5f6a7b8c9d3",
          "host": ["{{baseUrl}}"],
          "path": ["swap", "available-lessons"],
          "query": [
            {
              "key": "classId",
              "value": "64f8a1b2c3d4e5f6a7b8c9d2"
            },
            {
              "key": "academicYear",
              "value": "2024-2025"
            },
            {
              "key": "startOfWeek",
              "value": "2024-01-15"
            },
            {
              "key": "endOfWeek",
              "value": "2024-01-21"
            },
            {
              "key": "subjectId",
              "value": "64f8a1b2c3d4e5f6a7b8c9d3"
            }
          ]
        }
      }
    },
    {
      "name": "Create Swap Request",
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
          "raw": "{\n  \"originalLessonId\": \"64f8a1b2c3d4e5f6a7b8c9d1\",\n  \"replacementLessonId\": \"64f8a1b2c3d4e5f6a7b8c9d4\",\n  \"reason\": \"Tôi cần đổi tiết để tham gia họp phụ huynh\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/swap/create",
          "host": ["{{baseUrl}}"],
          "path": ["swap", "create"]
        }
      }
    },
    {
      "name": "Get Pending Swap Requests",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/pending?requestType=swap&page=1&limit=20",
          "host": ["{{baseUrl}}"],
          "path": ["pending"],
          "query": [
            {
              "key": "requestType",
              "value": "swap"
            },
            {
              "key": "page",
              "value": "1"
            },
            {
              "key": "limit",
              "value": "20"
            }
          ]
        }
      }
    },
    {
      "name": "Approve Swap Request",
      "request": {
        "method": "PATCH",
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
          "raw": "{\n  \"comment\": \"Đồng ý cho phép đổi tiết\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/{{requestId}}/approve",
          "host": ["{{baseUrl}}"],
          "path": ["{{requestId}}", "approve"]
        }
      }
    },
    {
      "name": "Reject Swap Request",
      "request": {
        "method": "PATCH",
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
          "raw": "{\n  \"comment\": \"Không thể đổi tiết vì lịch học đã được sắp xếp\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/{{requestId}}/reject",
          "host": ["{{baseUrl}}"],
          "path": ["{{requestId}}", "reject"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:8080/api/schedules/lesson-request"
    },
    {
      "key": "token",
      "value": "your_jwt_token_here"
    },
    {
      "key": "requestId",
      "value": "SWP-2024-001"
    }
  ]
}
```
