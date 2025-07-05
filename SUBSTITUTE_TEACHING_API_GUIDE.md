# Hướng dẫn API Module Dạy Thay (Substitute Teaching)

## Tổng quan

Module dạy thay cho phép giáo viên tạo yêu cầu dạy thay cho các tiết học của mình và các giáo viên khác có thể phản hồi approve hoặc reject.

## Flow hoạt động

1. **Tạo yêu cầu**: Giáo viên chọn tiết học (status = 'scheduled'), chọn các giáo viên cùng dạy môn đó và không bị trùng lịch, nêu lý do
2. **Gửi email**: Hệ thống gửi email thông báo đến các giáo viên được chọn và manager
3. **Phản hồi**: Các giáo viên được chọn có thể approve hoặc reject
4. **Approve**: Khi một giáo viên approve, hệ thống tự động:
   - Cập nhật giáo viên dạy tiết đó
   - Hủy các yêu cầu dạy thay khác mà giáo viên này đang được đề xuất
   - Gửi email thông báo đến tất cả bên liên quan
   - Gửi email thông báo cho học sinh lớp đó về việc đổi giáo viên
   - Không cho phép các giáo viên khác approve nữa
5. **Reject**: Khi giáo viên reject, gửi email thông báo đến giáo viên yêu cầu

## Endpoints

### 1. Tạo yêu cầu dạy thay

```bash
POST /api/schedules/substitute-request
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "lessonId": "675a1b2c3d4e5f6789012345",
  "candidateTeachers": [
    "64f8b9c123456789abcdef01",
    "64f8b9c123456789abcdef02"
  ],
  "reason": "Tôi bị ốm không thể dạy được tiết này. Mong các thầy cô giúp đỡ."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Substitute request created successfully",
  "data": {
    "_id": "675a1b2c3d4e5f6789012346",
    "requestId": "SUB_20241219_ABC123",
    "lesson": {
      "_id": "675a1b2c3d4e5f6789012345",
      "class": {
        "className": "12A4"
      },
      "subject": {
        "subjectName": "Toán học"
      },
      "timeSlot": {
        "period": 3,
        "startTime": "09:00",
        "endTime": "09:45"
      },
      "scheduledDate": "2024-12-20T00:00:00.000Z"
    },
    "requestingTeacher": {
      "name": "Nguyễn Văn A",
      "email": "teacher.a@school.edu.vn"
    },
    "candidateTeachers": [
      {
        "teacher": {
          "name": "Trần Thị B",
          "email": "teacher.b@school.edu.vn"
        },
        "status": "pending"
      }
    ],
    "reason": "Tôi bị ốm không thể dạy được tiết này. Mong các thầy cô giúp đỡ.",
    "status": "pending",
    "requestDate": "2024-12-19T10:30:00.000Z"
  }
}
```

### 2. Lấy danh sách giáo viên có thể dạy thay

```bash
GET /api/schedules/substitute-request/available-teachers/:lessonId
```

**Response:**
```json
{
  "success": true,
  "message": "Available teachers retrieved successfully",
  "data": [
    {
      "_id": "64f8b9c123456789abcdef01",
      "name": "Trần Thị B",
      "email": "teacher.b@school.edu.vn",
      "subject": {
        "subjectName": "Toán học"
      }
    },
    {
      "_id": "64f8b9c123456789abcdef02",
      "name": "Lê Văn C",
      "email": "teacher.c@school.edu.vn",
      "subjects": [
        {
          "subjectName": "Toán học"
        }
      ]
    }
  ]
}
```

### 3. Xem yêu cầu dạy thay của giáo viên

```bash
GET /api/schedules/substitute-request/my-requests?status=pending
```

**Response:**
```json
{
  "success": true,
  "message": "Teacher requests retrieved successfully",
  "data": [
    {
      "_id": "675a1b2c3d4e5f6789012346",
      "requestId": "SUB_20241219_ABC123",
      "lesson": {
        "lessonId": "12A4_20241220_001",
        "scheduledDate": "2024-12-20T00:00:00.000Z",
        "class": {
          "className": "12A4"
        },
        "subject": {
          "subjectName": "Toán học"
        },
        "timeSlot": {
          "period": 3,
          "startTime": "09:00",
          "endTime": "09:45"
        }
      },
      "requestingTeacher": {
        "name": "Nguyễn Văn A",
        "email": "teacher.a@school.edu.vn"
      },
      "candidateTeachers": [
        {
          "teacher": {
            "name": "Trần Thị B",
            "email": "teacher.b@school.edu.vn"
          },
          "status": "pending"
        }
      ],
      "reason": "Tôi bị ốm không thể dạy được tiết này. Mong các thầy cô giúp đỡ.",
      "status": "pending",
      "requestDate": "2024-12-19T10:30:00.000Z"
    }
  ]
}
```

### 4. Xem chi tiết yêu cầu dạy thay

```bash
GET /api/schedules/substitute-request/:requestId
```

**Response:**
```json
{
  "success": true,
  "message": "Request retrieved successfully",
  "data": {
    "_id": "675a1b2c3d4e5f6789012346",
    "requestId": "SUB_20241219_ABC123",
    "lesson": {
      "_id": "675a1b2c3d4e5f6789012345",
      "lessonId": "12A4_20241220_001",
      "class": {
        "className": "12A4"
      },
      "subject": {
        "subjectName": "Toán học"
      },
      "timeSlot": {
        "period": 3,
        "startTime": "09:00",
        "endTime": "09:45"
      },
      "scheduledDate": "2024-12-20T00:00:00.000Z",
      "teacher": {
        "name": "Nguyễn Văn A",
        "email": "teacher.a@school.edu.vn"
      }
    },
    "requestingTeacher": {
      "name": "Nguyễn Văn A",
      "email": "teacher.a@school.edu.vn"
    },
    "candidateTeachers": [
      {
        "teacher": {
          "name": "Trần Thị B",
          "email": "teacher.b@school.edu.vn"
        },
        "status": "pending"
      }
    ],
    "reason": "Tôi bị ốm không thể dạy được tiết này. Mong các thầy cô giúp đỡ.",
    "status": "pending",
    "requestDate": "2024-12-19T10:30:00.000Z"
  }
}
```

### 5. Approve yêu cầu dạy thay

```bash
POST /api/schedules/substitute-request/:requestId/approve
```

**Response:**
```json
{
  "success": true,
  "message": "Request approved successfully",
  "data": {
    "_id": "675a1b2c3d4e5f6789012346",
    "requestId": "SUB_20241219_ABC123",
    "status": "approved",
    "approvedTeacher": {
      "name": "Trần Thị B",
      "email": "teacher.b@school.edu.vn"
    },
    "approvalDate": "2024-12-19T11:00:00.000Z",
    "candidateTeachers": [
      {
        "teacher": {
          "name": "Trần Thị B",
          "email": "teacher.b@school.edu.vn"
        },
        "status": "approved",
        "responseDate": "2024-12-19T11:00:00.000Z"
      }
    ]
  }
}
```

### 6. Reject yêu cầu dạy thay

```bash
POST /api/schedules/substitute-request/:requestId/reject
```

**Body:**
```json
{
  "reason": "Tôi đã có lịch dạy khác vào thời gian này"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Request rejected successfully",
  "data": {
    "_id": "675a1b2c3d4e5f6789012346",
    "requestId": "SUB_20241219_ABC123",
    "status": "pending",
    "candidateTeachers": [
      {
        "teacher": {
          "name": "Trần Thị B",
          "email": "teacher.b@school.edu.vn"
        },
        "status": "rejected",
        "responseDate": "2024-12-19T11:00:00.000Z",
        "rejectionReason": "Tôi đã có lịch dạy khác vào thời gian này"
      }
    ]
  }
}
```

### 7. Hủy yêu cầu dạy thay

```bash
POST /api/schedules/substitute-request/:requestId/cancel
```

**Response:**
```json
{
  "success": true,
  "message": "Request cancelled successfully",
  "data": {
    "_id": "675a1b2c3d4e5f6789012346",
    "requestId": "SUB_20241219_ABC123",
    "status": "cancelled"
  }
}
```

### 8. Xem tất cả yêu cầu (Manager/Admin)

```bash
GET /api/schedules/substitute-request/all?status=pending&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "message": "All requests retrieved successfully",
  "data": [
    {
      "_id": "675a1b2c3d4e5f6789012346",
      "requestId": "SUB_20241219_ABC123",
      "lesson": {
        "class": {
          "className": "12A4"
        },
        "subject": {
          "subjectName": "Toán học"
        },
        "timeSlot": {
          "period": 3,
          "startTime": "09:00",
          "endTime": "09:45"
        },
        "scheduledDate": "2024-12-20T00:00:00.000Z"
      },
      "requestingTeacher": {
        "name": "Nguyễn Văn A",
        "email": "teacher.a@school.edu.vn"
      },
      "status": "pending",
      "requestDate": "2024-12-19T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

### 9. Thống kê yêu cầu dạy thay (Manager/Admin)

```bash
GET /api/schedules/substitute-request/stats
```

**Response:**
```json
{
  "success": true,
  "message": "Request statistics retrieved successfully",
  "data": {
    "pending": 3,
    "approved": 15,
    "rejected": 2,
    "cancelled": 1,
    "total": 21,
    "lastMonth": 8
  }
}
```

## Thông báo Email

### 1. Email yêu cầu dạy thay (gửi đến giáo viên được chọn)

**Subject:** Yêu cầu dạy thay - EcoSchool

**Nội dung:**
- Thông tin tiết học (môn, lớp, ngày, giờ)
- Giáo viên yêu cầu
- Lý do dạy thay
- Hướng dẫn phản hồi

### 2. Email thông báo cho Manager

**Subject:** Thông báo yêu cầu dạy thay - EcoSchool

**Nội dung:**
- Mã yêu cầu
- Thông tin đầy đủ về yêu cầu
- Danh sách giáo viên được đề xuất

### 3. Email thông báo approve

**Subject:** Yêu cầu dạy thay đã được chấp nhận - EcoSchool

**Nội dung:**
- Thông tin tiết học
- Giáo viên dạy thay
- Gửi đến: giáo viên yêu cầu, manager, các giáo viên khác

### 4. Email thông báo reject

**Subject:** Yêu cầu dạy thay bị từ chối - EcoSchool

**Nội dung:**
- Thông tin tiết học
- Lý do từ chối
- Gửi đến: giáo viên yêu cầu

### 5. Email thông báo cho học sinh

**Subject:** Thông báo thay đổi giáo viên - EcoSchool

**Nội dung:**
- Thông tin tiết học
- Giáo viên ban đầu và giáo viên dạy thay
- Lưu ý về việc chuẩn bị bài học
- Gửi đến: tất cả học sinh trong lớp

## Quy tắc Business Logic

1. **Tạo yêu cầu:**
   - Chỉ giáo viên được phân công dạy tiết đó mới có thể tạo yêu cầu
   - Tiết học phải có status = 'scheduled'
   - Giáo viên được chọn phải dạy cùng môn học
   - Giáo viên được chọn không được trùng lịch dạy

2. **Phản hồi:**
   - Chỉ giáo viên được chọn mới có thể approve/reject
   - Một khi đã approve/reject thì không thể thay đổi
   - Khi một giáo viên approve, các giáo viên khác tự động không thể approve

3. **Cập nhật tiết học:**
   - Khi approve, giáo viên dạy tiết đó sẽ được thay đổi
   - Trạng thái tiết học vẫn giữ nguyên 'scheduled'
   - Các yêu cầu dạy thay khác của giáo viên này sẽ bị hủy tự động
   - Học sinh trong lớp sẽ nhận được email thông báo

4. **Quyền truy cập:**
   - Giáo viên: chỉ xem được yêu cầu liên quan đến mình
   - Manager/Admin: xem được tất cả yêu cầu

## Lỗi phổ biến

### 400 Bad Request
```json
{
  "success": false,
  "message": "Can only create substitute requests for scheduled lessons"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Teacher not authorized to approve this request"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Substitute request not found"
}
```

## Ví dụ sử dụng với curl

### Tạo yêu cầu dạy thay:
```bash
curl -X POST "http://localhost:3000/api/schedules/substitute-request" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonId": "675a1b2c3d4e5f6789012345",
    "candidateTeachers": ["64f8b9c123456789abcdef01", "64f8b9c123456789abcdef02"],
    "reason": "Tôi bị ốm không thể dạy được tiết này. Mong các thầy cô giúp đỡ."
  }'
```

### Approve yêu cầu:
```bash
curl -X POST "http://localhost:3000/api/schedules/substitute-request/675a1b2c3d4e5f6789012346/approve" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Reject yêu cầu:
```bash
curl -X POST "http://localhost:3000/api/schedules/substitute-request/675a1b2c3d4e5f6789012346/reject" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Tôi đã có lịch dạy khác vào thời gian này"
  }'
``` 