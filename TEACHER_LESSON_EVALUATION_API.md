# API Đánh Giá Tiết Học Của Giáo Viên

## Tổng quan

API này cho phép giáo viên đánh giá các tiết học đã hoàn thành với đầy đủ thông tin:
- ✅ **Thông tin bài học**: Tiết chương trình, nội dung, mô tả
- ✅ **Đánh giá chất lượng**: Xếp hạng [A+, A, B+, B, C], nhận xét chi tiết
- ✅ **Học sinh vắng**: ID học sinh, vắng có phép/không phép, lý do
- ✅ **Kiểm tra miệng**: ID học sinh, điểm số (0-10), câu hỏi, nhận xét
- ✅ **Vi phạm**: ID học sinh, mô tả vi phạm, loại, mức độ nghiêm trọng
- ✅ **Thống kê tự động**: Tổng hợp số liệu, điểm trung bình

## Base URL
```
/api/teacher-evaluations
```

## Authentication
Tất cả API đều yêu cầu:
- Header: `Authorization: Bearer <token>`
- Role: `teacher`, `homeroom_teacher`, `admin`, hoặc `manager`

---

## 📝 **1. Tạo Đánh Giá Tiết Học Mới**

### Endpoint
```http
POST /api/teacher-evaluations/lessons/{lessonId}/evaluate
```

### Request Body
```json
{
  "curriculumLesson": "Tiết 15: Đạo hàm của hàm số",
  "content": "Khái niệm đạo hàm, quy tắc tính đạo hàm cơ bản, ứng dụng đạo hàm trong giải toán",
  "description": "Học sinh được làm quen với khái niệm đạo hàm và các quy tắc cơ bản",
  "rating": "A",
  "comments": "Lớp học tích cực, học sinh hiểu bài tốt. Cần củng cố thêm phần bài tập ứng dụng.",
  "evaluationDetails": {
    "studentEngagement": "good",
    "comprehensionLevel": "good",
    "objectiveCompletion": "fully"
  },
  "absentStudents": [
    {
      "student": "675a1b2c3d4e5f6789012345",
      "isExcused": true,
      "reason": "Bệnh, có giấy xin phép"
    },
    {
      "student": "675a1b2c3d4e5f6789012346",
      "isExcused": false,
      "reason": "Vắng không phép"
    }
  ],
  "oralTests": [
    {
      "student": "675a1b2c3d4e5f6789012347",
      "score": 8.5,
      "question": "Tính đạo hàm của hàm số f(x) = x² + 3x - 1",
      "comment": "Trả lời chính xác, trình bày rõ ràng"
    },
    {
      "student": "675a1b2c3d4e5f6789012348",
      "score": 6.0,
      "question": "Nêu định nghĩa đạo hàm",
      "comment": "Trả lời đúng nhưng chưa đầy đủ"
    }
  ],
  "violations": [
    {
      "student": "675a1b2c3d4e5f6789012349",
      "description": "Nói chuyện riêng trong giờ học",
      "type": "disruptive",
      "severity": "minor",
      "action": "Nhắc nhở"
    }
  ]
}
```

### Validation Rules
- `curriculumLesson`: **Required**, String ≤100 chars
- `content`: **Required**, String ≤1000 chars  
- `description`: Optional, String ≤500 chars
- `rating`: **Required**, Enum ['A+', 'A', 'B+', 'B', 'C']
- `comments`: **Required**, String ≤1000 chars
- `absentStudents[].student`: MongoDB ObjectId
- `absentStudents[].isExcused`: Boolean
- `oralTests[].score`: Number 0-10
- `violations[].description`: **Required**, String ≤500 chars

### Response Success (201)
```json
{
  "success": true,
  "message": "Tạo đánh giá tiết học thành công",
  "data": {
    "evaluationId": "675a1b2c3d4e5f6789012350",
    "lesson": {
      "lessonId": "582827_20241219_0001",
      "scheduledDate": "2024-12-19T00:00:00.000Z",
      "actualDate": "2024-12-19T07:00:00.000Z",
      "topic": "Đạo hàm của hàm số"
    },
    "class": "12A1",
    "subject": {
      "name": "Toán học",
      "code": "MATH"
    },
    "lessonContent": {
      "curriculumLesson": "Tiết 15: Đạo hàm của hàm số",
      "content": "Khái niệm đạo hàm, quy tắc tính đạo hàm cơ bản...",
      "description": "Học sinh được làm quen với khái niệm đạo hàm..."
    },
    "evaluation": {
      "rating": "A",
      "comments": "Lớp học tích cực, học sinh hiểu bài tốt...",
      "details": {
        "studentEngagement": "good",
        "comprehensionLevel": "good",
        "objectiveCompletion": "fully"
      }
    },
    "summary": {
      "totalPresent": 28,
      "totalAbsent": 2,
      "totalExcusedAbsent": 1,
      "totalOralTests": 2,
      "averageOralScore": 7.3,
      "totalViolations": 1
    },
    "absentStudents": [
      {
        "student": {
          "id": "675a1b2c3d4e5f6789012345",
          "name": "Nguyễn Văn A",
          "studentId": "HS001"
        },
        "isExcused": true,
        "reason": "Bệnh, có giấy xin phép",
        "recordedAt": "2024-12-20T10:30:00.000Z"
      }
    ],
    "oralTests": [
      {
        "student": {
          "id": "675a1b2c3d4e5f6789012347",
          "name": "Trần Thị B",
          "studentId": "HS003"
        },
        "score": 8.5,
        "question": "Tính đạo hàm của hàm số f(x) = x² + 3x - 1",
        "comment": "Trả lời chính xác, trình bày rõ ràng",
        "testedAt": "2024-12-20T10:30:00.000Z"
      }
    ],
    "violations": [
      {
        "student": {
          "id": "675a1b2c3d4e5f6789012349",
          "name": "Lê Văn C",
          "studentId": "HS005"
        },
        "description": "Nói chuyện riêng trong giờ học",
        "type": "disruptive",
        "severity": "minor",
        "action": "Nhắc nhở",
        "recordedAt": "2024-12-20T10:30:00.000Z"
      }
    ],
    "status": "draft",
    "createdAt": "2024-12-20T10:30:00.000Z"
  }
}
```

---

## ✏️ **2. Cập Nhật Đánh Giá**

### Endpoint
```http
PUT /api/teacher-evaluations/{evaluationId}
```

### Request Body (tất cả field đều optional)
```json
{
  "rating": "A+",
  "comments": "Cập nhật: Lớp học xuất sắc, tất cả học sinh đều hiểu bài",
  "evaluationDetails": {
    "studentEngagement": "excellent",
    "comprehensionLevel": "excellent"
  }
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Cập nhật đánh giá thành công",
  "data": {
    "evaluationId": "675a1b2c3d4e5f6789012350",
    "lessonContent": {
      "curriculumLesson": "Tiết 15: Đạo hàm của hàm số",
      "content": "Khái niệm đạo hàm, quy tắc tính đạo hàm cơ bản...",
      "description": "Học sinh được làm quen với khái niệm đạo hàm..."
    },
    "evaluation": {
      "rating": "A+",
      "comments": "Cập nhật: Lớp học xuất sắc, tất cả học sinh đều hiểu bài",
      "details": {
        "studentEngagement": "excellent",
        "comprehensionLevel": "excellent",
        "objectiveCompletion": "fully"
      }
    },
    "summary": {
      "totalPresent": 28,
      "totalAbsent": 2,
      "totalExcusedAbsent": 1,
      "totalOralTests": 2,
      "averageOralScore": 7.3,
      "totalViolations": 1
    },
    "status": "draft",
    "updatedAt": "2024-12-20T14:15:00.000Z"
  }
}
```

---

## 📋 **3. Lấy Danh Sách Đánh Giá Của Giáo Viên**

### Endpoint
```http
GET /api/teacher-evaluations
```

### Query Parameters
- `classId`: Optional, MongoDB ObjectId (Lọc theo lớp)
- `subjectId`: Optional, MongoDB ObjectId (Lọc theo môn học)
- `status`: Optional, Enum ['draft', 'completed', 'submitted'] (Lọc theo trạng thái)
- `rating`: Optional, Enum ['A+', 'A', 'B+', 'B', 'C'] (Lọc theo xếp hạng)
- `startDate`: Optional, ISO 8601 date (Từ ngày)
- `endDate`: Optional, ISO 8601 date (Đến ngày)
- `page`: Optional, Integer ≥1 (Trang hiện tại, default: 1)
- `limit`: Optional, Integer 1-100 (Số item/trang, default: 20)

### Example Request
```http
GET /api/teacher-evaluations?rating=A&status=completed&page=1&limit=10
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy danh sách đánh giá thành công",
  "data": {
    "evaluations": [
      {
        "evaluationId": "675a1b2c3d4e5f6789012350",
        "lesson": {
          "lessonId": "582827_20241219_0001",
          "scheduledDate": "2024-12-19T00:00:00.000Z",
          "actualDate": "2024-12-19T07:00:00.000Z",
          "topic": "Đạo hàm của hàm số"
        },
        "class": "12A1",
        "subject": {
          "name": "Toán học",
          "code": "MATH"
        },
        "lessonContent": {
          "curriculumLesson": "Tiết 15: Đạo hàm của hàm số",
          "content": "Khái niệm đạo hàm, quy tắc tính đạo hàm cơ bản...",
          "description": "Học sinh được làm quen với khái niệm đạo hàm..."
        },
        "evaluation": {
          "rating": "A+",
          "comments": "Lớp học xuất sắc, tất cả học sinh đều hiểu bài",
          "details": {
            "studentEngagement": "excellent",
            "comprehensionLevel": "excellent",
            "objectiveCompletion": "fully"
          }
        },
        "summary": {
          "totalPresent": 28,
          "totalAbsent": 2,
          "totalExcusedAbsent": 1,
          "totalOralTests": 2,
          "averageOralScore": 7.3,
          "totalViolations": 1
        },
        "status": "completed",
        "createdAt": "2024-12-20T10:30:00.000Z",
        "updatedAt": "2024-12-20T14:15:00.000Z"
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
GET /api/teacher-evaluations/{evaluationId}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy chi tiết đánh giá thành công",
  "data": {
    "evaluationId": "675a1b2c3d4e5f6789012350",
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
    "lessonContent": {
      "curriculumLesson": "Tiết 15: Đạo hàm của hàm số",
      "content": "Khái niệm đạo hàm, quy tắc tính đạo hàm cơ bản, ứng dụng đạo hàm trong giải toán",
      "description": "Học sinh được làm quen với khái niệm đạo hàm và các quy tắc cơ bản"
    },
    "evaluation": {
      "rating": "A+",
      "comments": "Lớp học xuất sắc, tất cả học sinh đều hiểu bài",
      "details": {
        "studentEngagement": "excellent",
        "comprehensionLevel": "excellent",
        "objectiveCompletion": "fully"
      }
    },
    "absentStudents": [
      {
        "student": {
          "id": "675a1b2c3d4e5f6789012345",
          "name": "Nguyễn Văn A",
          "studentId": "HS001",
          "email": "nguyenvana@student.edu.vn"
        },
        "isExcused": true,
        "reason": "Bệnh, có giấy xin phép",
        "recordedAt": "2024-12-20T10:30:00.000Z"
      }
    ],
    "oralTests": [
      {
        "student": {
          "id": "675a1b2c3d4e5f6789012347",
          "name": "Trần Thị B",
          "studentId": "HS003",
          "email": "tranthib@student.edu.vn"
        },
        "score": 8.5,
        "question": "Tính đạo hàm của hàm số f(x) = x² + 3x - 1",
        "comment": "Trả lời chính xác, trình bày rõ ràng",
        "testedAt": "2024-12-20T10:30:00.000Z"
      }
    ],
    "violations": [
      {
        "student": {
          "id": "675a1b2c3d4e5f6789012349",
          "name": "Lê Văn C",
          "studentId": "HS005",
          "email": "levanc@student.edu.vn"
        },
        "description": "Nói chuyện riêng trong giờ học",
        "type": "disruptive",
        "severity": "minor",
        "action": "Nhắc nhở",
        "recordedAt": "2024-12-20T10:30:00.000Z"
      }
    ],
    "summary": {
      "totalPresent": 28,
      "totalAbsent": 2,
      "totalExcusedAbsent": 1,
      "totalOralTests": 2,
      "averageOralScore": 7.3,
      "totalViolations": 1
    },
    "status": "completed",
    "completedAt": "2024-12-20T14:15:00.000Z",
    "submittedAt": null,
    "createdAt": "2024-12-20T10:30:00.000Z",
    "updatedAt": "2024-12-20T14:15:00.000Z"
  }
}
```

---

## ✅ **5. Hoàn Thành Đánh Giá**

### Endpoint
```http
POST /api/teacher-evaluations/{evaluationId}/complete
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Hoàn thành đánh giá thành công",
  "data": {
    "evaluationId": "675a1b2c3d4e5f6789012350",
    "status": "completed",
    "completedAt": "2024-12-20T14:15:00.000Z"
  }
}
```

---

## 📤 **6. Submit Đánh Giá**

### Endpoint
```http
POST /api/teacher-evaluations/{evaluationId}/submit
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Submit đánh giá thành công",
  "data": {
    "evaluationId": "675a1b2c3d4e5f6789012350",
    "status": "submitted",
    "completedAt": "2024-12-20T14:15:00.000Z",
    "submittedAt": "2024-12-20T15:30:00.000Z"
  }
}
```

---

## 👥 **7. Thêm Học Sinh Vắng**

### Endpoint
```http
POST /api/teacher-evaluations/{evaluationId}/absent-students
```

### Request Body
```json
{
  "studentId": "675a1b2c3d4e5f6789012345",
  "isExcused": false,
  "reason": "Vắng không phép"
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Thêm học sinh vắng thành công",
  "data": {
    "evaluationId": "675a1b2c3d4e5f6789012350",
    "summary": {
      "totalPresent": 27,
      "totalAbsent": 3,
      "totalExcusedAbsent": 1,
      "totalOralTests": 2,
      "averageOralScore": 7.3,
      "totalViolations": 1
    }
  }
}
```

---

## 🗣️ **8. Thêm Kiểm Tra Miệng**

### Endpoint
```http
POST /api/teacher-evaluations/{evaluationId}/oral-tests
```

### Request Body
```json
{
  "studentId": "675a1b2c3d4e5f6789012347",
  "score": 9.0,
  "question": "Giải phương trình đạo hàm f'(x) = 0",
  "comment": "Trả lời xuất sắc, phương pháp đúng"
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Thêm kiểm tra miệng thành công",
  "data": {
    "evaluationId": "675a1b2c3d4e5f6789012350",
    "summary": {
      "totalPresent": 28,
      "totalAbsent": 2,
      "totalExcusedAbsent": 1,
      "totalOralTests": 3,
      "averageOralScore": 7.8,
      "totalViolations": 1
    }
  }
}
```

---

## ⚠️ **9. Thêm Vi Phạm**

### Endpoint
```http
POST /api/teacher-evaluations/{evaluationId}/violations
```

### Request Body
```json
{
  "studentId": "675a1b2c3d4e5f6789012349",
  "description": "Sử dụng điện thoại trong giờ học",
  "type": "disruptive",
  "severity": "moderate",
  "action": "Thu điện thoại, gọi phụ huynh"
}
```

### Violation Types
- `late`: Đi muộn
- `disruptive`: Gây rối
- `unprepared`: Không chuẩn bị bài
- `disrespectful`: Thiếu tôn trọng
- `cheating`: Gian lận
- `other`: Khác

### Severity Levels
- `minor`: Nhẹ
- `moderate`: Vừa
- `serious`: Nghiêm trọng

### Response Success (200)
```json
{
  "success": true,
  "message": "Thêm vi phạm thành công",
  "data": {
    "evaluationId": "675a1b2c3d4e5f6789012350",
    "summary": {
      "totalPresent": 28,
      "totalAbsent": 2,
      "totalExcusedAbsent": 1,
      "totalOralTests": 2,
      "averageOralScore": 7.3,
      "totalViolations": 2
    }
  }
}
```

---

## 📊 **10. Lấy Thống Kê Đánh Giá**

### Endpoint
```http
GET /api/teacher-evaluations/stats/summary
```

### Query Parameters
- `startDate`: Optional, ISO 8601 date (Từ ngày)
- `endDate`: Optional, ISO 8601 date (Đến ngày)
- `subjectId`: Optional, MongoDB ObjectId (Lọc theo môn học)
- `classId`: Optional, MongoDB ObjectId (Lọc theo lớp)

### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy thống kê đánh giá thành công",
  "data": {
    "totalEvaluations": 45,
    "avgOralScore": 7.2,
    "totalAbsences": 23,
    "totalViolations": 8,
    "ratingDistribution": {
      "A+": 12,
      "A": 18,
      "B+": 10,
      "B": 4,
      "C": 1
    }
  }
}
```

---

## 🚫 **Các Trường Hợp Lỗi Phổ Biến**

### 1. Không có quyền đánh giá (403)
```json
{
  "success": false,
  "message": "You can only evaluate your own lessons"
}
```

### 2. Lesson chưa hoàn thành (400)
```json
{
  "success": false,
  "message": "Can only evaluate completed lessons"
}
```

### 3. Đã đánh giá rồi (409)
```json
{
  "success": false,
  "message": "Lesson has already been evaluated"
}
```

### 4. Không thể sửa đánh giá đã submit (400)
```json
{
  "success": false,
  "message": "Cannot update submitted evaluation"
}
```

### 5. Rating không hợp lệ (400)
```json
{
  "success": false,
  "message": "Rating must be one of: A+, A, B+, B, C"
}
```

### 6. Điểm số không hợp lệ (400)
```json
{
  "success": false,
  "message": "Score must be a number between 0 and 10"
}
```

---

## 📱 **Workflow Theo Design**

Dựa trên hình ảnh UI, đây là workflow đề xuất:

### **Màn hình 1: Thông tin cơ bản**
```javascript
// API call để tạo đánh giá
POST /api/teacher-evaluations/lessons/{lessonId}/evaluate
{
  "curriculumLesson": "Tiết 15: Đạo hàm",
  "content": "Nội dung bài học...",
  "rating": "A",
  "comments": "Nhận xét..."
}
```

### **Màn hình 2: Học sinh vắng**
```javascript
// Thêm từng học sinh vắng
POST /api/teacher-evaluations/{evaluationId}/absent-students
{
  "studentId": "...",
  "isExcused": true/false,
  "reason": "..."
}
```

### **Màn hình 3: Học sinh vi phạm**
```javascript
// Thêm vi phạm
POST /api/teacher-evaluations/{evaluationId}/violations
{
  "studentId": "...",
  "description": "Mô tả vi phạm",
  "type": "disruptive",
  "severity": "minor"
}
```

### **Màn hình 4: Kiểm tra miệng**
```javascript
// Thêm điểm kiểm tra miệng
POST /api/teacher-evaluations/{evaluationId}/oral-tests
{
  "studentId": "...",
  "score": 8.5,
  "question": "Câu hỏi",
  "comment": "Nhận xét"
}
```

### **Màn hình 5: Chi tiết bài học**
```javascript
// Cập nhật thông tin chi tiết
PUT /api/teacher-evaluations/{evaluationId}
{
  "description": "Mô tả chi tiết bài học...",
  "evaluationDetails": {
    "studentEngagement": "excellent",
    "comprehensionLevel": "good"
  }
}
```

---

## 🎯 **Trạng Thái Đánh Giá**

| Trạng thái | Mô tả | Có thể sửa? | Có thể submit? |
|------------|-------|-------------|----------------|
| `draft` | Bản nháp | ✅ | ✅ |
| `completed` | Hoàn thành | ✅ | ✅ |
| `submitted` | Đã nộp | ❌ | ❌ |

---

## 🧪 **Testing**

### Test Cases chính:
1. ✅ Teacher tạo đánh giá cho lesson của mình
2. ❌ Teacher tạo đánh giá cho lesson của người khác  
3. ❌ Teacher tạo đánh giá cho lesson chưa completed
4. ✅ Teacher thêm học sinh vắng, kiểm tra miệng, vi phạm
5. ✅ Teacher cập nhật đánh giá ở trạng thái draft/completed
6. ❌ Teacher sửa đánh giá đã submitted
7. ✅ Auto-calculate summary statistics

### Sample cURL Commands:

#### Tạo đánh giá:
```bash
curl -X POST "http://localhost:5000/api/teacher-evaluations/lessons/675a1b2c3d4e5f6789012345/evaluate" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 15: Đạo hàm",
    "content": "Khái niệm đạo hàm và quy tắc tính đạo hàm",
    "rating": "A",
    "comments": "Lớp học tích cực, hiểu bài tốt"
  }'
```

#### Thêm học sinh vắng:
```bash
curl -X POST "http://localhost:5000/api/teacher-evaluations/675a1b2c3d4e5f6789012350/absent-students" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012345",
    "isExcused": false,
    "reason": "Vắng không phép"
  }'
```

---

Hệ thống đánh giá này cung cấp đầy đủ tính năng cho giáo viên đánh giá tiết học một cách chi tiết và chuyên nghiệp! 🎓