# Parents Module - Feedback Management

Module này cung cấp các API để quản lý feedback từ phụ huynh và cho phép admin/manager xử lý feedback.

## API Endpoints

### Cho Phụ huynh

#### 1. Lấy danh sách con
```
GET /api/parents/children
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách con thành công",
  "data": [
    {
      "_id": "student_id",
      "name": "Tên học sinh",
      "studentId": "HS001",
      "email": "student@example.com",
      "class_id": {
        "_id": "class_id",
        "className": "10A1",
        "gradeLevel": 10,
        "academicYear": "2024-2025",
        "homeroomTeacher": {
          "_id": "teacher_id",
          "name": "Tên giáo viên",
          "email": "teacher@example.com"
        }
      }
    }
  ]
}
```

#### 2. Xem thời khóa biểu của con
```
GET /api/parents/children/:childId/schedule?academicYear=2024-2025&startOfWeek=2024-01-15&endOfWeek=2024-01-21
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Lấy thời khóa biểu thành công",
  "data": {
    "child": {
      "_id": "student_id",
      "name": "Tên học sinh",
      "studentId": "HS001",
      "class": {
        "_id": "class_id",
        "className": "10A1",
        "gradeLevel": 10,
        "academicYear": "2024-2025"
      }
    },
    "schedule": [...],
    "dateRange": {
      "startOfWeek": "2024-01-15",
      "endOfWeek": "2024-01-21"
    }
  }
}
```

#### 3. Gửi feedback
```
POST /api/parents/feedback
```
**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "rating": 5,
  "description": "Nội dung feedback..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Góp ý đã được gửi thành công",
  "data": {
    "_id": "feedback_id",
    "user": "parent_id",
    "rating": 5,
    "description": "Nội dung feedback...",
    "status": "pending",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

#### 4. Lấy danh sách feedback của phụ huynh
```
GET /api/parents/my-feedback?page=1&limit=10
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách góp ý thành công",
  "data": {
    "feedbacks": [
      {
        "_id": "feedback_id",
        "user": "parent_id",
        "rating": 5,
        "description": "Nội dung feedback...",
        "status": "pending",
        "adminResponse": "Phản hồi từ admin...",
        "respondedBy": {
          "_id": "admin_id",
          "name": "Admin Name",
          "email": "admin@example.com"
        },
        "respondedAt": "2024-01-16T10:00:00.000Z",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-16T10:00:00.000Z"
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

### Cho Admin/Manager

#### 1. Lấy tất cả feedback (với filter)
```
GET /api/parents/feedback?status=pending&rating=5&page=1&limit=10
```
**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status`: `all`, `pending`, `reviewed`, `resolved` (optional)
- `rating`: 0-5 (optional, 0 = tất cả)
- `page`: số trang (optional, default: 1)
- `limit`: số lượng per page (optional, default: 10)

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
          "name": "Tên phụ huynh",
          "email": "parent@example.com"
        },
        "rating": 5,
        "description": "Nội dung feedback...",
        "status": "pending",
        "adminResponse": "Phản hồi từ admin...",
        "respondedBy": {
          "_id": "admin_id",
          "name": "Admin Name",
          "email": "admin@example.com"
        },
        "respondedAt": "2024-01-16T10:00:00.000Z",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-16T10:00:00.000Z"
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

#### 2. Lấy thống kê feedback
```
GET /api/parents/feedback/stats
```
**Headers:** `Authorization: Bearer <token>`

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

#### 3. Cập nhật trạng thái feedback
```
PATCH /api/parents/feedback/:feedbackId/status
```
**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "status": "resolved",
  "adminResponse": "Phản hồi từ admin..."
}
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
      "name": "Tên phụ huynh",
      "email": "parent@example.com"
    },
    "rating": 5,
    "description": "Nội dung feedback...",
    "status": "resolved",
    "adminResponse": "Phản hồi từ admin...",
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

#### 4. Lấy chi tiết feedback
```
GET /api/parents/feedback/:feedbackId
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Lấy chi tiết feedback thành công",
  "data": {
    "_id": "feedback_id",
    "user": {
      "_id": "parent_id",
      "name": "Tên phụ huynh",
      "email": "parent@example.com"
    },
    "rating": 5,
    "description": "Nội dung feedback...",
    "status": "resolved",
    "adminResponse": "Phản hồi từ admin...",
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

## Validation Rules

### Feedback Creation
- `rating`: Required, integer 1-5
- `description`: Required, string 10-1000 characters

### Feedback Status Update
- `status`: Required, enum ['pending', 'reviewed', 'resolved']
- `adminResponse`: Optional, string max 2000 characters

### Query Parameters
- `status`: Optional, enum ['all', 'pending', 'reviewed', 'resolved']
- `rating`: Optional, integer 0-5 (0 = all)
- `page`: Optional, integer >= 1, default: 1
- `limit`: Optional, integer 1-100, default: 10

## Permissions

### Phụ huynh
- Có thể xem danh sách con
- Có thể xem thời khóa biểu của con
- Có thể gửi feedback
- Có thể xem feedback của mình

### Admin/Manager/Principal
- Có thể xem tất cả feedback
- Có thể lọc feedback theo status và rating
- Có thể xem thống kê feedback
- Có thể cập nhật trạng thái feedback
- Có thể phản hồi feedback
- Có thể xem chi tiết feedback

## Database Schema

### Feedback Model
```javascript
{
  user: ObjectId, // Reference to User (parent)
  rating: Number, // 1-5
  description: String, // Required, trimmed
  status: String, // 'pending', 'reviewed', 'resolved'
  adminResponse: String, // Optional, trimmed
  respondedBy: ObjectId, // Reference to User (admin)
  respondedAt: Date, // When admin responded
  createdAt: Date, // Auto-generated
  updatedAt: Date // Auto-generated
}
```

## Indexes
- `{ user: 1, createdAt: -1 }` - For querying user's feedback
- `{ status: 1, createdAt: -1 }` - For filtering by status 