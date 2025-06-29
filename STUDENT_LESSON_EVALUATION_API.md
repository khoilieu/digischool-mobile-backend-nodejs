# API Đánh Giá Tiết Học Của Học Sinh

## Tổng quan

API này cho phép học sinh đánh giá các tiết học đã hoàn thành với các điều kiện sau:
- ✅ Học sinh phải thuộc lớp của tiết học đó
- ✅ Tiết học phải có trạng thái `completed` (đã hoàn thành)
- ✅ Học sinh phải có mặt trong tiết học (không vắng mặt)
- ✅ Mỗi học sinh chỉ được đánh giá 1 lần cho mỗi tiết học
- ✅ Đánh giá của học sinh tách biệt với đánh giá của giáo viên

## Base URL
```
/api/student-evaluations
```

## Authentication
Tất cả API đều yêu cầu:
- Header: `Authorization: Bearer <token>`
- Role: `student` (chỉ học sinh mới được truy cập)

---

## 📝 **1. Tạo Đánh Giá Tiết Học**

### Endpoint
```http
POST /api/student-evaluations/lessons/{lessonId}/evaluate
```

### Request Body
```json
{
  "teachingClarity": 4,
  "teachingSupport": 5,
  "teacherInteraction": 4,
  "completedWell": true,
  "reason": "Không hiểu bài tập về nhà",
  "comments": "Tiết học rất hay, giáo viên giải thích dễ hiểu"
}
```

### Validation Rules
- `teachingClarity`: **Required**, Integer 1-5 (Cảm nhận về việc giải thích bài học)
- `teachingSupport`: **Required**, Integer 1-5 (Cảm nhận về sự hướng dẫn)
- `teacherInteraction`: **Required**, Integer 1-5 (Cảm nhận về việc tương tác với GV)
- `completedWell`: **Required**, Boolean (Học sinh có hoàn thành tốt tiết học không)
- `reason`: Optional, String ≤200 chars (Lý do nếu không hoàn thành tốt)
- `comments`: Optional, String ≤500 chars (Ghi chú thêm)

### Response Success (201)
```json
{
  "success": true,
  "message": "Đánh giá tiết học thành công",
  "data": {
    "evaluationId": "675a1b2c3d4e5f6789012345",
    "lesson": {
      "lessonId": "582827_20241219_0001",
      "scheduledDate": "2024-12-19T00:00:00.000Z",
      "topic": "Đạo hàm của hàm số"
    },
    "class": "12A1",
    "subject": {
      "name": "Toán học",
      "code": "MATH"
    },
    "teacher": {
      "name": "Nguyễn Văn Nam",
      "email": "nguyenvannam@school.edu.vn"
    },
    "evaluation": {
      "teachingClarity": 4,
      "teachingSupport": 5,
      "teacherInteraction": 4,
      "overallRating": 4.3
    },
    "studentSelfAssessment": {
      "completedWell": true,
      "reason": null
    },
    "comments": "Tiết học rất hay, giáo viên giải thích dễ hiểu",
    "evaluatedAt": "2024-12-20T10:30:00.000Z"
  }
}
```

### Response Error (403)
```json
{
  "success": false,
  "message": "Student does not belong to this class"
}
```

---

## ✏️ **2. Cập Nhật Đánh Giá**

### Endpoint
```http
PUT /api/student-evaluations/{evaluationId}
```

### Request Body (tất cả field đều optional)
```json
{
  "teachingClarity": 5,
  "teachingSupport": 4,
  "comments": "Cập nhật: Giáo viên rất nhiệt tình"
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Cập nhật đánh giá thành công",
  "data": {
    "evaluationId": "675a1b2c3d4e5f6789012345",
    "lesson": {
      "lessonId": "582827_20241219_0001",
      "scheduledDate": "2024-12-19T00:00:00.000Z",
      "topic": "Đạo hàm của hàm số"
    },
    "evaluation": {
      "teachingClarity": 5,
      "teachingSupport": 4,
      "teacherInteraction": 4,
      "overallRating": 4.3
    },
    "studentSelfAssessment": {
      "completedWell": true,
      "reason": null
    },
    "comments": "Cập nhật: Giáo viên rất nhiệt tình",
    "evaluatedAt": "2024-12-20T10:30:00.000Z",
    "updatedAt": "2024-12-20T14:15:00.000Z"
  }
}
```

---

## 📋 **3. Lấy Danh Sách Đánh Giá Của Học Sinh**

### Endpoint
```http
GET /api/student-evaluations
```

### Query Parameters
- `classId`: Optional, MongoDB ObjectId (Lọc theo lớp)
- `subjectId`: Optional, MongoDB ObjectId (Lọc theo môn học)
- `teacherId`: Optional, MongoDB ObjectId (Lọc theo giáo viên)
- `startDate`: Optional, ISO 8601 date (Từ ngày)
- `endDate`: Optional, ISO 8601 date (Đến ngày)
- `page`: Optional, Integer ≥1 (Trang hiện tại, default: 1)
- `limit`: Optional, Integer 1-100 (Số item/trang, default: 20)

### Example Request
```http
GET /api/student-evaluations?subjectId=675a1b2c3d4e5f6789012347&page=1&limit=10
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy danh sách đánh giá thành công",
  "data": {
    "evaluations": [
      {
        "evaluationId": "675a1b2c3d4e5f6789012345",
        "lesson": {
          "lessonId": "582827_20241219_0001",
          "scheduledDate": "2024-12-19T00:00:00.000Z",
          "topic": "Đạo hàm của hàm số",
          "status": "completed"
        },
        "class": "12A1",
        "subject": {
          "name": "Toán học",
          "code": "MATH"
        },
        "teacher": {
          "name": "Nguyễn Văn Nam",
          "email": "nguyenvannam@school.edu.vn"
        },
        "evaluation": {
          "teachingClarity": 4,
          "teachingSupport": 5,
          "teacherInteraction": 4,
          "overallRating": 4.3
        },
        "studentSelfAssessment": {
          "completedWell": true,
          "reason": null
        },
        "comments": "Tiết học rất hay",
        "evaluatedAt": "2024-12-20T10:30:00.000Z"
      }
    ]
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 25,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 🔍 **4. Lấy Chi Tiết Một Đánh Giá**

### Endpoint
```http
GET /api/student-evaluations/{evaluationId}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy chi tiết đánh giá thành công",
  "data": {
    "evaluationId": "675a1b2c3d4e5f6789012345",
    "lesson": {
      "lessonId": "582827_20241219_0001",
      "scheduledDate": "2024-12-19T00:00:00.000Z",
      "actualDate": "2024-12-19T07:00:00.000Z",
      "topic": "Đạo hàm của hàm số",
      "status": "completed",
      "notes": "Hoàn thành chương trình theo kế hoạch"
    },
    "class": {
      "name": "12A1",
      "academicYear": "2024-2025"
    },
    "subject": {
      "name": "Toán học",
      "code": "MATH"
    },
    "teacher": {
      "name": "Nguyễn Văn Nam",
      "email": "nguyenvannam@school.edu.vn"
    },
    "evaluation": {
      "teachingClarity": 4,
      "teachingSupport": 5,
      "teacherInteraction": 4,
      "overallRating": 4.3
    },
    "studentSelfAssessment": {
      "completedWell": true,
      "reason": null
    },
    "comments": "Tiết học rất hay, giáo viên giải thích dễ hiểu",
    "evaluatedAt": "2024-12-20T10:30:00.000Z",
    "updatedAt": "2024-12-20T14:15:00.000Z"
  }
}
```

---

## ✅ **5. Kiểm Tra Có Thể Đánh Giá Tiết Học Không**

### Endpoint
```http
GET /api/student-evaluations/lessons/{lessonId}/can-evaluate
```

### Response Success (200) - Có thể đánh giá
```json
{
  "success": true,
  "canEvaluate": true,
  "message": "Học sinh có thể đánh giá tiết học này",
  "data": {
    "lesson": {
      "lessonId": "582827_20241219_0001",
      "scheduledDate": "2024-12-19T00:00:00.000Z",
      "actualDate": "2024-12-19T07:00:00.000Z",
      "topic": "Đạo hàm của hàm số",
      "status": "completed"
    },
    "class": "12A1",
    "subject": {
      "name": "Toán học",
      "code": "MATH"
    },
    "teacher": {
      "name": "Nguyễn Văn Nam",
      "email": "nguyenvannam@school.edu.vn"
    }
  }
}
```

### Response Error (403) - Không thể đánh giá
```json
{
  "success": false,
  "canEvaluate": false,
  "message": "Student has already evaluated this lesson"
}
```

---

## 📚 **6. Lấy Danh Sách Tiết Học Có Thể Đánh Giá**

### Endpoint
```http
GET /api/student-evaluations/lessons/evaluable
```

### Query Parameters
- `startDate`: Optional, ISO 8601 date (Từ ngày)
- `endDate`: Optional, ISO 8601 date (Đến ngày)
- `subjectId`: Optional, MongoDB ObjectId (Lọc theo môn học)
- `page`: Optional, Integer ≥1 (Trang hiện tại, default: 1)
- `limit`: Optional, Integer 1-100 (Số item/trang, default: 20)

### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy danh sách tiết học có thể đánh giá thành công",
  "data": {
    "lessons": [
      {
        "lessonId": "675a1b2c3d4e5f6789012346",
        "lessonCode": "582827_20241218_0002",
        "scheduledDate": "2024-12-18T00:00:00.000Z",
        "actualDate": "2024-12-18T08:30:00.000Z",
        "topic": "Tích phân của hàm số",
        "subject": {
          "name": "Toán học",
          "code": "MATH"
        },
        "teacher": {
          "name": "Nguyễn Văn Nam",
          "email": "nguyenvannam@school.edu.vn"
        },
        "canEvaluate": true
      }
    ]
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 8,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 🚫 **Các Trường Hợp Lỗi Phổ Biến**

### 1. Không có quyền truy cập (403)
```json
{
  "success": false,
  "message": "Access denied. Only students can access this endpoint."
}
```

### 2. Tiết học chưa hoàn thành (403)
```json
{
  "success": false,
  "message": "Lesson is not completed yet"
}
```

### 3. Học sinh không thuộc lớp (403)
```json
{
  "success": false,
  "message": "Student does not belong to this class"
}
```

### 4. Học sinh vắng mặt (403)
```json
{
  "success": false,
  "message": "Student was absent from this lesson"
}
```

### 5. Đã đánh giá rồi (403)
```json
{
  "success": false,
  "message": "Student has already evaluated this lesson"
}
```

### 6. Validation lỗi (400)
```json
{
  "success": false,
  "message": "Validation errors",
  "errors": [
    {
      "field": "teachingClarity",
      "message": "Teaching clarity rating must be an integer between 1 and 5"
    }
  ]
}
```

---

## 📊 **Schema Đánh Giá**

### Cấu trúc đánh giá học sinh
```json
{
  "evaluation": {
    "teachingClarity": 4,        // 1-5: Cảm nhận về việc giải thích bài học
    "teachingSupport": 5,        // 1-5: Cảm nhận về sự hướng dẫn
    "teacherInteraction": 4,     // 1-5: Cảm nhận về việc tương tác với GV
    "overallRating": 4.3         // Tự động tính từ 3 tiêu chí trên
  },
  "studentSelfAssessment": {
    "completedWell": true,       // Học sinh có hoàn thành tốt tiết học không
    "reason": "Không hiểu bài"   // Lý do nếu không hoàn thành tốt
  },
  "comments": "Ghi chú thêm từ học sinh"
}
```

---

## 🔐 **Bảo Mật & Ràng Buộc**

### Điều kiện để đánh giá:
1. ✅ User phải có role `student`
2. ✅ Lesson phải có status `completed`
3. ✅ Student phải thuộc class của lesson
4. ✅ Student phải có mặt trong lesson (không vắng)
5. ✅ Student chưa đánh giá lesson này trước đó

### Ràng buộc dữ liệu:
- Mỗi student chỉ được đánh giá 1 lần cho 1 lesson (unique index)
- Rating phải là số nguyên từ 1-5
- Comments tối đa 500 ký tự
- Reason tối đa 200 ký tự

### Phân quyền:
- Student chỉ có thể xem/sửa đánh giá của chính mình
- Teacher/Manager có thể xem thống kê đánh giá (API riêng)

---

## 📱 **Tích Hợp Frontend**

### Workflow đề xuất:
1. **Lấy danh sách tiết học có thể đánh giá**: `GET /lessons/evaluable`
2. **Kiểm tra có thể đánh giá**: `GET /lessons/{id}/can-evaluate`
3. **Hiển thị form đánh giá** với 3 câu hỏi rating + self-assessment
4. **Submit đánh giá**: `POST /lessons/{id}/evaluate`
5. **Cho phép cập nhật**: `PUT /{evaluationId}`

### UI Components gợi ý:
- ⭐ **Star Rating** cho 3 tiêu chí đánh giá
- ✅ **Toggle/Checkbox** cho "Hoàn thành tốt tiết học"
- 📝 **Text Area** cho comments và reason
- 📊 **Progress Bar** hiển thị overall rating

---

## 🧪 **Testing**

### Test Cases chính:
1. ✅ Student đánh giá lesson đã completed và có mặt
2. ❌ Student đánh giá lesson chưa completed
3. ❌ Student đánh giá lesson của lớp khác
4. ❌ Student đánh giá lesson mà mình vắng mặt
5. ❌ Student đánh giá lesson đã đánh giá rồi
6. ✅ Student cập nhật đánh giá của mình
7. ❌ Student cập nhật đánh giá của người khác

### Sample cURL Commands:

#### Tạo đánh giá:
```bash
curl -X POST "http://localhost:5000/api/student-evaluations/lessons/675a1b2c3d4e5f6789012345/evaluate" \
  -H "Authorization: Bearer <student_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "teachingClarity": 4,
    "teachingSupport": 5,
    "teacherInteraction": 4,
    "completedWell": true,
    "comments": "Tiết học rất hay!"
  }'
```

#### Lấy danh sách đánh giá:
```bash
curl -X GET "http://localhost:5000/api/student-evaluations?page=1&limit=10" \
  -H "Authorization: Bearer <student_token>"
```

---

Hệ thống đánh giá này đảm bảo tính toàn vẹn dữ liệu và bảo mật, chỉ cho phép học sinh đánh giá những tiết học mà họ thực sự tham gia và đã hoàn thành. 