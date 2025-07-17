# 📚 API Tutorial: Học sinh xin vắng (Student Leave Request)

## 🎯 Tổng quan

API này cho phép học sinh xin vắng các tiết học và giáo viên duyệt/từ chối đơn xin vắng.

## 🔐 Authentication

Tất cả API đều yêu cầu JWT token trong header:

```
Authorization: Bearer <your_jwt_token>
```

## 📋 Danh sách API Endpoints

### 1. 🆕 Tạo đơn xin vắng (Student)

**POST** `/api/student-leave-requests/create`

**Quyền**: `student`

**Request Body**:

```json
{
  "lessonIds": ["64f1a2b3c4d5e6f7a8b9c0d1", "64f1a2b3c4d5e6f7a8b9c0d2"],
  "phoneNumber": "0123456789",
  "reason": "Tôi bị ốm và không thể đi học được"
}
```

**Validation**:

- `lessonIds`: Array 1-10 lesson IDs
- `phoneNumber`: 10-15 ký tự số
- `reason`: 10-500 ký tự

**Response Success (201)**:

```json
{
  "success": true,
  "message": "Successfully created 2 leave requests and notifications sent to teachers",
  "data": {
    "success": true,
    "created": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
        "studentId": "64f1a2b3c4d5e6f7a8b9c0d4",
        "lessonId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
          "lessonId": "10A_20240115_001",
          "type": "regular",
          "topic": "Bài 1: Giới thiệu",
          "scheduledDate": "2024-01-15T07:00:00.000Z"
        },
        "classId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
          "className": "10A"
        },
        "subjectId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
          "subjectName": "Toán học",
          "subjectCode": "MATH"
        },
        "teacherId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
          "name": "Nguyễn Văn A",
          "email": "teacher@example.com"
        },
        "date": "2024-01-15T07:00:00.000Z",
        "period": 1,
        "phoneNumber": "0123456789",
        "reason": "Tôi bị ốm và không thể đi học được",
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

### 2. 📋 Xem đơn xin vắng của mình (Student)

**GET** `/api/student-leave-requests/my-requests`

**Quyền**: `student`

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
  "message": "Leave requests retrieved successfully",
  "data": {
    "requests": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
        "studentId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
          "name": "Nguyễn Văn A",
          "email": "student@example.com"
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
        "teacherId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
          "name": "Nguyễn Văn A",
          "email": "teacher@example.com"
        },
        "date": "2024-01-15T07:00:00.000Z",
        "period": 1,
        "phoneNumber": "0123456789",
        "reason": "Tôi bị ốm và không thể đi học được",
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

### 3. 🔍 Xem tiết học có thể xin vắng (Student)

**GET** `/api/student-leave-requests/available-lessons?startDate=2024-01-15&endDate=2024-01-31`

**Quyền**: `student`

**Query Parameters**:

- `startDate` (required): `2024-01-15`
- `endDate` (required): `2024-01-31`

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Available lessons retrieved successfully",
  "data": {
    "lessons": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "lessonId": "10A_20240115_001",
        "date": "2024-01-15T07:00:00.000Z",
        "period": 1,
        "timeSlot": {
          "startTime": "07:00",
          "endTime": "07:45"
        },
        "subject": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
          "name": "Toán học",
          "code": "MATH"
        },
        "teacher": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
          "name": "Nguyễn Văn A"
        },
        "type": "regular",
        "topic": "Bài 1: Giới thiệu"
      }
    ],
    "dateRange": {
      "startDate": "2024-01-15",
      "endDate": "2024-01-31"
    },
    "total": 10
  }
}
```

---

### 4. 📋 Xem đơn cần duyệt (Teacher)

**GET** `/api/student-leave-requests/pending`

**Example** /api/student-leave-requests/pending?startDate=2024-01-01&endDate=2024-01-31&page=1&limit=50

**Quyền**: `teacher`, `homeroom_teacher`

**Query Parameters**:

- `startDate` (optional): `2024-01-01`
- `endDate` (optional): `2024-01-31`
- `page` (optional): `1` (default)
- `limit` (optional): `50` (default)

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Pending leave requests retrieved successfully",
  "data": {
    "requests": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
        "studentId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
          "name": "Nguyễn Văn A",
          "email": "student@example.com"
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
        "teacherId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
          "name": "Nguyễn Văn A",
          "email": "teacher@example.com"
        },
        "date": "2024-01-15T07:00:00.000Z",
        "period": 1,
        "phoneNumber": "0123456789",
        "reason": "Tôi bị ốm và không thể đi học được",
        "status": "pending",
        "createdAt": "2024-01-10T10:30:00.000Z",
        "updatedAt": "2024-01-10T10:30:00.000Z"
      }
    ],
    "requestsByDate": {
      "2024-01-15": [
        {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
          "studentId": {
            "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
            "name": "Nguyễn Văn A",
            "email": "student@example.com"
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
          "teacherId": {
            "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
            "name": "Nguyễn Văn A",
            "email": "teacher@example.com"
          },
          "date": "2024-01-15T07:00:00.000Z",
          "period": 1,
          "phoneNumber": "0123456789",
          "reason": "Tôi bị ốm và không thể đi học được",
          "status": "pending",
          "createdAt": "2024-01-10T10:30:00.000Z",
          "updatedAt": "2024-01-10T10:30:00.000Z"
        }
      ]
    },
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

### 5. 📋 Xem tất cả đơn xin vắng đã xử lý (Teacher)

**GET** `/api/student-leave-requests/teacher-requests`

**Quyền**: `teacher`, `homeroom_teacher`

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
        "studentId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
          "name": "Nguyễn Văn A",
          "email": "student@example.com"
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
        "teacherId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
          "name": "Nguyễn Văn A",
          "email": "teacher@example.com"
        },
        "date": "2024-01-15T07:00:00.000Z",
        "period": 1,
        "phoneNumber": "0123456789",
        "reason": "Tôi bị ốm và không thể đi học được",
        "status": "approved",
        "processedAt": "2024-01-10T11:00:00.000Z",
        "createdAt": "2024-01-10T10:30:00.000Z",
        "updatedAt": "2024-01-10T11:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

---

### 6. ✅ Duyệt đơn xin vắng (Teacher)

**POST** `/api/student-leave-requests/:requestId/approve`

**Quyền**: `teacher`, `homeroom_teacher`

**URL Parameters**:

- `requestId`: ID của đơn xin vắng

**Request Body** (optional):

```json
{
  "comment": "Đồng ý cho phép nghỉ học"
}
```

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Leave request approved successfully and notification sent to student",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "studentId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
      "name": "Nguyễn Văn A",
      "email": "student@example.com",
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
    "teacherId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
      "name": "Nguyễn Văn A",
      "email": "teacher@example.com",
      "fullName": "Nguyễn Văn A"
    },
    "date": "2024-01-15T07:00:00.000Z",
    "period": 1,
    "phoneNumber": "0123456789",
    "reason": "Tôi bị ốm và không thể đi học được",
    "status": "approved",
    "processedAt": "2024-01-10T11:00:00.000Z",
    "createdAt": "2024-01-10T10:30:00.000Z",
    "updatedAt": "2024-01-10T11:00:00.000Z"
  }
}
```

---

### 7. ❌ Từ chối đơn xin vắng (Teacher)

**POST** `/api/student-leave-requests/:requestId/reject`

**Quyền**: `teacher`, `homeroom_teacher`

**URL Parameters**:

- `requestId`: ID của đơn xin vắng

**Request Body**:

```json
{
  "comment": "Lý do không hợp lệ, vui lòng cung cấp giấy tờ y tế"
}
```

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Leave request rejected successfully and notification sent to student",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "studentId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
      "name": "Nguyễn Văn A",
      "email": "student@example.com",
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
    "teacherId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
      "name": "Nguyễn Văn A",
      "email": "teacher@example.com",
      "fullName": "Nguyễn Văn A"
    },
    "date": "2024-01-15T07:00:00.000Z",
    "period": 1,
    "phoneNumber": "0123456789",
    "reason": "Tôi bị ốm và không thể đi học được",
    "status": "rejected",
    "processedAt": "2024-01-10T11:00:00.000Z",
    "createdAt": "2024-01-10T10:30:00.000Z",
    "updatedAt": "2024-01-10T11:00:00.000Z"
  }
}
```

---

### 8. 🔄 Xử lý hàng loạt (Teacher)

**POST** `/api/student-leave-requests/batch-process`

**Quyền**: `teacher`, `homeroom_teacher`

**Request Body**:

```json
{
  "requests": [
    {
      "requestId": "64f1a2b3c4d5e6f7a8b9c0d3",
      "action": "approve",
      "comment": "Đồng ý cho phép nghỉ học"
    },
    {
      "requestId": "64f1a2b3c4d5e6f7a8b9c0d4",
      "action": "reject",
      "comment": "Lý do không hợp lệ"
    }
  ]
}
```

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Processed 2 requests successfully",
  "data": {
    "processed": [
      {
        "requestId": "64f1a2b3c4d5e6f7a8b9c0d3",
        "action": "approve",
        "success": true,
        "request": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
          "status": "approved",
          "processedAt": "2024-01-10T11:00:00.000Z"
        }
      },
      {
        "requestId": "64f1a2b3c4d5e6f7a8b9c0d4",
        "action": "reject",
        "success": true,
        "request": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
          "status": "rejected",
          "processedAt": "2024-01-10T11:00:00.000Z"
        }
      }
    ],
    "errors": [],
    "summary": {
      "total": 2,
      "processed": 2,
      "failed": 0
    }
  }
}
```

---

### 9. 🗑️ Hủy đơn xin vắng (Student)

**DELETE** `/api/student-leave-requests/:requestId/cancel`

**Quyền**: `student` (chỉ đơn của mình)

**URL Parameters**:

- `requestId`: ID của đơn xin vắng

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Leave request cancelled successfully"
}
```

---

### 10. 📄 Xem chi tiết đơn xin vắng

**GET** `/api/student-leave-requests/:requestId`

**Quyền**: `student` (đơn của mình), `teacher`, `homeroom_teacher` (đơn của lớp mình), `manager`, `admin` (tất cả)

**URL Parameters**:

- `requestId`: ID của đơn xin vắng

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Leave request detail retrieved successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "studentId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
      "name": "Nguyễn Văn A",
      "email": "student@example.com"
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
    "teacherId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
      "name": "Nguyễn Văn A",
      "email": "teacher@example.com"
    },
    "date": "2024-01-15T07:00:00.000Z",
    "period": 1,
    "phoneNumber": "0123456789",
    "reason": "Tôi bị ốm và không thể đi học được",
    "status": "pending",
    "createdAt": "2024-01-10T10:30:00.000Z",
    "updatedAt": "2024-01-10T10:30:00.000Z"
  }
}
```

---

### 11. 📊 Thống kê đơn xin vắng (Admin/Manager)

**GET** `/api/student-leave-requests/stats/overview`

**Quyền**: `admin`, `manager`

**Query Parameters**:

- `teacherId` (optional): `64f1a2b3c4d5e6f7a8b9c0d7`
- `studentId` (optional): `64f1a2b3c4d5e6f7a8b9c0d4`
- `classId` (optional): `64f1a2b3c4d5e6f7a8b9c0d5`
- `startDate` (optional): `2024-01-01`
- `endDate` (optional): `2024-01-31`

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Leave request statistics retrieved successfully",
  "data": {
    "total": 100,
    "pending": 20,
    "approved": 70,
    "rejected": 10,
    "approvalRate": "70.00",
    "rejectionRate": "10.00"
  }
}
```

---

## 🧪 Test Cases cho Postman

### Test Case 1: Student tạo đơn xin vắng

1. **Method**: POST
2. **URL**: `{{base_url}}/api/student-leave-requests/create`
3. **Headers**:
   ```
   Authorization: Bearer {{student_token}}
   Content-Type: application/json
   ```
4. **Body**:
   ```json
   {
     "lessonIds": ["64f1a2b3c4d5e6f7a8b9c0d1"],
     "phoneNumber": "0123456789",
     "reason": "Tôi bị ốm và không thể đi học được"
   }
   ```

### Test Case 2: Student xem đơn của mình

1. **Method**: GET
2. **URL**: `{{base_url}}/api/student-leave-requests/my-requests`
3. **Headers**:
   ```
   Authorization: Bearer {{student_token}}
   ```

### Test Case 3: Student xem tiết học có thể xin vắng

1. **Method**: GET
2. **URL**: `{{base_url}}/api/student-leave-requests/available-lessons?startDate=2024-01-15&endDate=2024-01-31`
3. **Headers**:
   ```
   Authorization: Bearer {{student_token}}
   ```

### Test Case 4: Teacher xem đơn cần duyệt

1. **Method**: GET
2. **URL**: `{{base_url}}/api/student-leave-requests/pending`
3. **Headers**:
   ```
   Authorization: Bearer {{teacher_token}}
   ```

### Test Case 5: Teacher duyệt đơn

1. **Method**: POST
2. **URL**: `{{base_url}}/api/student-leave-requests/{{request_id}}/approve`
3. **Headers**:
   ```
   Authorization: Bearer {{teacher_token}}
   Content-Type: application/json
   ```
4. **Body** (optional):
   ```json
   {
     "comment": "Đồng ý cho phép nghỉ học"
   }
   ```

### Test Case 6: Teacher từ chối đơn

1. **Method**: POST
2. **URL**: `{{base_url}}/api/student-leave-requests/{{request_id}}/reject`
3. **Headers**:
   ```
   Authorization: Bearer {{teacher_token}}
   Content-Type: application/json
   ```
4. **Body**:
   ```json
   {
     "comment": "Lý do không hợp lệ, vui lòng cung cấp giấy tờ y tế"
   }
   ```

### Test Case 7: Teacher xử lý hàng loạt

1. **Method**: POST
2. **URL**: `{{base_url}}/api/student-leave-requests/batch-process`
3. **Headers**:
   ```
   Authorization: Bearer {{teacher_token}}
   Content-Type: application/json
   ```
4. **Body**:
   ```json
   {
     "requests": [
       {
         "requestId": "{{request_id_1}}",
         "action": "approve",
         "comment": "Đồng ý cho phép nghỉ học"
       },
       {
         "requestId": "{{request_id_2}}",
         "action": "reject",
         "comment": "Lý do không hợp lệ"
       }
     ]
   }
   ```

### Test Case 8: Student hủy đơn

1. **Method**: DELETE
2. **URL**: `{{base_url}}/api/student-leave-requests/{{request_id}}/cancel`
3. **Headers**:
   ```
   Authorization: Bearer {{student_token}}
   ```

### Test Case 9: Admin xem thống kê

1. **Method**: GET
2. **URL**: `{{base_url}}/api/student-leave-requests/stats/overview?startDate=2024-01-01&endDate=2024-01-31`
3. **Headers**:
   ```
   Authorization: Bearer {{admin_token}}
   ```

---

## 🔧 Postman Environment Variables

Tạo environment với các variables:

```json
{
  "base_url": "http://localhost:3000",
  "student_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "teacher_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "request_id": "64f1a2b3c4d5e6f7a8b9c0d3",
  "request_id_1": "64f1a2b3c4d5e6f7a8b9c0d3",
  "request_id_2": "64f1a2b3c4d5e6f7a8b9c0d4"
}
```

---

## ⚠️ Lưu ý quan trọng

1. **Authentication**: Tất cả API đều yêu cầu JWT token hợp lệ
2. **Authorization**: Mỗi role chỉ có thể truy cập API tương ứng
3. **Validation**: Dữ liệu đầu vào được validate nghiêm ngặt
4. **Security**: Học sinh chỉ có thể xin vắng tiết học của lớp mình
5. **Email Notification**: Hệ thống tự động gửi email thông báo
6. **Error Handling**: Tất cả lỗi đều có response format chuẩn
7. **Date Range**: Khi xem tiết học có thể xin vắng, khoảng thời gian tối đa là 30 ngày
8. **Batch Processing**: Giáo viên có thể xử lý tối đa 20 đơn cùng lúc
9. **Phone Number**: Số điện thoại phải có định dạng hợp lệ (10-15 ký tự số)
10. **Comment Required**: Khi từ chối đơn, bắt buộc phải có lý do

---

## 🔄 Workflow

### Student Workflow:

1. **Xem tiết học có thể xin vắng** → 2. **Tạo đơn xin vắng** → 3. **Xem trạng thái đơn** → 4. **Hủy đơn** (nếu cần)

### Teacher Workflow:

1. **Xem đơn cần duyệt** → 2. **Duyệt/Từ chối đơn** → 3. **Xem đơn đã xử lý**

### Admin/Manager Workflow:

1. **Xem thống kê tổng quan** → 2. **Theo dõi hiệu suất xử lý**

---

## 🚀 Quick Start

1. **Import collection vào Postman**
2. **Set up environment variables**
3. **Test theo thứ tự**: Tạo đơn → Xem đơn → Duyệt đơn
4. **Check email notifications** (nếu có setup email service)

Happy testing! 🎉
