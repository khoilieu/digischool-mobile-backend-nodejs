# 📚 API Tutorial: Giáo viên xin nghỉ (Teacher Leave Request)

## 🎯 Tổng quan

API này cho phép giáo viên xin nghỉ các tiết học và manager duyệt/từ chối đơn xin nghỉ.

## 🔐 Authentication

Tất cả API đều yêu cầu JWT token trong header:

```
Authorization: Bearer <your_jwt_token>
```

## 📋 Danh sách API Endpoints

### 1. 🆕 Tạo đơn xin nghỉ (Teacher)

**POST** `/api/teacher-leave-requests/`

**Quyền**: `teacher`

**Request Body**:

```json
{
  "lessonIds": ["64f1a2b3c4d5e6f7a8b9c0d1", "64f1a2b3c4d5e6f7a8b9c0d2"],
  "reason": "Tôi bị ốm và không thể dạy được"
}
```

**Validation**:

- `lessonIds`: Array 1-10 lesson IDs
- `reason`: 1-300 ký tự

**Response Success (201)**:

```json
{
  "success": true,
  "message": "Successfully created 2 teacher leave requests and notifications sent to managers",
  "data": {
    "success": true,
    "created": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
        "teacherId": "64f1a2b3c4d5e6f7a8b9c0d4",
        "lessonId": "64f1a2b3c4d5e6f7a8b9c0d1",
        "classId": "64f1a2b3c4d5e6f7a8b9c0d5",
        "subjectId": "64f1a2b3c4d5e6f7a8b9c0d6",
        "date": "2024-01-15T07:00:00.000Z",
        "period": 1,
        "reason": "Tôi bị ốm và không thể dạy được",
        "status": "pending",
        "createdAt": "2024-01-10T10:30:00.000Z",
        "updatedAt": "2024-01-10T10:30:00.000Z"
      }
    ],
    "errors": [],
    "summary": {
      "totalRequested": 2,
      "created": 2,
      "failed": 0
    }
  }
}
```

**Response Error (400)**:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "reason",
      "message": "Reason is required",
      "value": ""
    }
  ]
}
```

---

### 2. 📋 Xem đơn xin nghỉ của mình (Teacher)

**GET** `/api/teacher-leave-requests/my-requests`

**Quyền**: `teacher`

**Query Parameters**:

- `status` (optional): `pending`, `approved`, `rejected`
- `startDate` (optional): `2024-01-01`
- `endDate` (optional): `2024-01-31`
- `page` (optional): `1` (default)
- `limit` (optional): `20` (default)

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Teacher leave requests retrieved successfully",
  "data": {
    "requests": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
        "teacherId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
          "name": "Nguyễn Văn A",
          "email": "teacher@example.com"
        },
        "lessonId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
          "lessonId": "10A_20240115_001",
          "type": "regular",
          "topic": "Bài 1: Giới thiệu",
          "scheduledDate": "2024-01-15T07:00:00.000Z"
        },
        "subjectId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
          "subjectName": "Toán học",
          "subjectCode": "MATH"
        },
        "classId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
          "className": "10A"
        },
        "date": "2024-01-15T07:00:00.000Z",
        "period": 1,
        "reason": "Tôi bị ốm và không thể dạy được",
        "status": "pending",
        "createdAt": "2024-01-10T10:30:00.000Z",
        "updatedAt": "2024-01-10T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    },
    "summary": {
      "pending": 2,
      "approved": 2,
      "rejected": 1
    }
  }
}
```

---

### 3. 🔍 Xem tiết học có thể xin nghỉ (Teacher)

**GET** `/api/teacher-leave-requests/available-lessons`

**Quyền**: `teacher`

**Query Parameters**:

- `startDate` (required): `2024-01-15`
- `endDate` (required): `2024-01-31`

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Available lessons for leave request retrieved successfully",
  "data": {
    "lessons": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "lessonId": "10A_20240115_001",
        "type": "regular",
        "topic": "Bài 1: Giới thiệu",
        "scheduledDate": "2024-01-15T07:00:00.000Z",
        "subject": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
          "subjectName": "Toán học",
          "subjectCode": "MATH"
        },
        "class": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
          "className": "10A"
        },
        "timeSlot": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
          "period": 1,
          "startTime": "07:00",
          "endTime": "07:45"
        }
      }
    ],
    "summary": {
      "total": 10,
      "available": 8,
      "alreadyRequested": 2
    }
  }
}
```

---

### 4. 📋 Xem đơn cần duyệt (Manager)

**GET** `/api/teacher-leave-requests/pending/all`

**Quyền**: `manager`, `admin`

**Query Parameters**:

- `startDate` (optional): `2024-01-01`
- `endDate` (optional): `2024-01-31`
- `page` (optional): `1` (default)
- `limit` (optional): `50` (default)

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Pending teacher leave requests retrieved successfully",
  "data": {
    "requests": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
        "teacherId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
          "name": "Nguyễn Văn A",
          "email": "teacher@example.com",
          "fullName": "Nguyễn Văn A"
        },
        "lessonId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
          "lessonId": "10A_20240115_001",
          "type": "regular",
          "topic": "Bài 1: Giới thiệu",
          "scheduledDate": "2024-01-15T07:00:00.000Z"
        },
        "subjectId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
          "subjectName": "Toán học",
          "subjectCode": "MATH"
        },
        "classId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
          "className": "10A"
        },
        "date": "2024-01-15T07:00:00.000Z",
        "period": 1,
        "reason": "Tôi bị ốm và không thể dạy được",
        "status": "pending",
        "createdAt": "2024-01-10T10:30:00.000Z",
        "updatedAt": "2024-01-10T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 3,
      "pages": 1
    }
  }
}
```

---

### 5. ✅ Duyệt đơn xin nghỉ (Manager)

**POST** `/api/teacher-leave-requests/:requestId/approve`

**Quyền**: `manager`, `admin`

**URL Parameters**:

- `requestId`: ID của đơn xin nghỉ

**Request Body**: Không cần body

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Teacher leave request approved successfully. Lesson status updated to absent.",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "teacherId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
      "name": "Nguyễn Văn A",
      "email": "teacher@example.com",
      "fullName": "Nguyễn Văn A"
    },
    "lessonId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "lessonId": "10A_20240115_001",
      "type": "regular",
      "topic": "Bài 1: Giới thiệu",
      "scheduledDate": "2024-01-15T07:00:00.000Z"
    },
    "subjectId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
      "subjectName": "Toán học",
      "subjectCode": "MATH"
    },
    "classId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
      "className": "10A"
    },
    "date": "2024-01-15T07:00:00.000Z",
    "period": 1,
    "reason": "Tôi bị ốm và không thể dạy được",
    "status": "approved",
    "managerId": "64f1a2b3c4d5e6f7a8b9c0d8",
    "processedAt": "2024-01-10T11:00:00.000Z",
    "createdAt": "2024-01-10T10:30:00.000Z",
    "updatedAt": "2024-01-10T11:00:00.000Z"
  }
}
```

---

### 6. ❌ Từ chối đơn xin nghỉ (Manager)

**POST** `/api/teacher-leave-requests/:requestId/reject`

**Quyền**: `manager`, `admin`

**URL Parameters**:

- `requestId`: ID của đơn xin nghỉ

**Request Body**: Không cần body

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Teacher leave request rejected successfully and notification sent to teacher",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "teacherId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
      "name": "Nguyễn Văn A",
      "email": "teacher@example.com",
      "fullName": "Nguyễn Văn A"
    },
    "lessonId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "lessonId": "10A_20240115_001",
      "type": "regular",
      "topic": "Bài 1: Giới thiệu",
      "scheduledDate": "2024-01-15T07:00:00.000Z"
    },
    "subjectId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
      "subjectName": "Toán học",
      "subjectCode": "MATH"
    },
    "classId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
      "className": "10A"
    },
    "date": "2024-01-15T07:00:00.000Z",
    "period": 1,
    "reason": "Tôi bị ốm và không thể dạy được",
    "status": "rejected",
    "managerId": "64f1a2b3c4d5e6f7a8b9c0d8",
    "processedAt": "2024-01-10T11:00:00.000Z",
    "createdAt": "2024-01-10T10:30:00.000Z",
    "updatedAt": "2024-01-10T11:00:00.000Z"
  }
}
```

---

### 7. 🗑️ Xóa đơn xin nghỉ (Teacher)

**DELETE** `/api/teacher-leave-requests/:requestId`

**Quyền**: `teacher` (chỉ đơn của mình)

**URL Parameters**:

- `requestId`: ID của đơn xin nghỉ

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Teacher leave request deleted successfully",
  "data": {
    "success": true,
    "message": "Teacher leave request deleted successfully"
  }
}
```

---

### 8. 📄 Xem chi tiết đơn xin nghỉ

**GET** `/api/teacher-leave-requests/:requestId`

**Quyền**: `teacher` (đơn của mình), `manager`, `admin` (tất cả)

**URL Parameters**:

- `requestId`: ID của đơn xin nghỉ

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Teacher leave request detail retrieved successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "teacherId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
      "name": "Nguyễn Văn A",
      "email": "teacher@example.com",
      "fullName": "Nguyễn Văn A"
    },
    "lessonId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "lessonId": "10A_20240115_001",
      "type": "regular",
      "topic": "Bài 1: Giới thiệu",
      "scheduledDate": "2024-01-15T07:00:00.000Z"
    },
    "subjectId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
      "subjectName": "Toán học",
      "subjectCode": "MATH"
    },
    "classId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
      "className": "10A"
    },
    "date": "2024-01-15T07:00:00.000Z",
    "period": 1,
    "reason": "Tôi bị ốm và không thể dạy được",
    "status": "pending",
    "createdAt": "2024-01-10T10:30:00.000Z",
    "updatedAt": "2024-01-10T10:30:00.000Z"
  }
}
```

---

## 🧪 Test Cases cho Postman

### Test Case 1: Teacher tạo đơn xin nghỉ

1. **Method**: POST
2. **URL**: `{{base_url}}/api/teacher-leave-requests/`
3. **Headers**:
   ```
   Authorization: Bearer {{teacher_token}}
   Content-Type: application/json
   ```
4. **Body**:
   ```json
   {
     "lessonIds": ["64f1a2b3c4d5e6f7a8b9c0d1"],
     "reason": "Tôi bị ốm và không thể dạy được"
   }
   ```

### Test Case 2: Teacher xem đơn của mình

1. **Method**: GET
2. **URL**: `{{base_url}}/api/teacher-leave-requests/my-requests`
3. **Headers**:
   ```
   Authorization: Bearer {{teacher_token}}
   ```

### Test Case 3: Manager xem đơn cần duyệt

1. **Method**: GET
2. **URL**: `{{base_url}}/api/teacher-leave-requests/pending/all`
3. **Headers**:
   ```
   Authorization: Bearer {{manager_token}}
   ```

### Test Case 4: Manager duyệt đơn

1. **Method**: POST
2. **URL**: `{{base_url}}/api/teacher-leave-requests/{{request_id}}/approve`
3. **Headers**:
   ```
   Authorization: Bearer {{manager_token}}
   ```

### Test Case 5: Manager từ chối đơn

1. **Method**: POST
2. **URL**: `{{base_url}}/api/teacher-leave-requests/{{request_id}}/reject`
3. **Headers**:
   ```
   Authorization: Bearer {{manager_token}}
   ```

---

## 🔧 Postman Environment Variables

Tạo environment với các variables:

```json
{
  "base_url": "http://localhost:3000",
  "teacher_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "manager_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "request_id": "64f1a2b3c4d5e6f7a8b9c0d3"
}
```

---

## ⚠️ Lưu ý quan trọng

1. **Authentication**: Tất cả API đều yêu cầu JWT token hợp lệ
2. **Authorization**: Mỗi role chỉ có thể truy cập API tương ứng
3. **Validation**: Dữ liệu đầu vào được validate nghiêm ngặt
4. **Lesson Status**: Sau khi approve, lesson status sẽ chuyển thành `absent`
5. **Email Notification**: Hệ thống tự động gửi email thông báo
6. **Error Handling**: Tất cả lỗi đều có response format chuẩn

---

## 🚀 Quick Start

1. **Import collection vào Postman**
2. **Set up environment variables**
3. **Test theo thứ tự**: Tạo đơn → Xem đơn → Duyệt đơn
4. **Check email notifications** (nếu có setup email service)

Happy testing! 🎉
