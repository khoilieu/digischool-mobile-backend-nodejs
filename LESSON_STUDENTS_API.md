# 📚 API Lấy Danh Sách Học Sinh Của Tiết Học

## 🎯 **Mục đích:**
- Lấy danh sách học sinh của một tiết học cụ thể
- Chỉ giáo viên dạy tiết đó mới được xem
- Hiển thị ID, tên, lớp của học sinh

## 🔐 **Bảo mật:**
- ✅ Chỉ giáo viên được truy cập
- ✅ Chỉ giáo viên dạy tiết đó mới xem được
- ✅ Kiểm tra quyền sở hữu lesson

---

## 📋 **API Endpoint**

### **GET** `/api/schedules/lesson/:lessonId/students`

**Mô tả**: Lấy danh sách học sinh của một tiết học cụ thể

**Headers Required**:
```
Authorization: Bearer <teacher_token>
```

**Parameters**:
- `lessonId` (string, required): ID của tiết học

---

## 🚀 **cURL Example**

```bash
curl -X GET "http://localhost:3000/api/schedules/lesson/685cbfa0f3b618a9802fb0ef/students" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ"
```

---

## 📊 **Response Examples**

### **✅ Success Response (200 OK)**

```json
{
  "success": true,
  "message": "Lấy danh sách học sinh thành công",
  "data": {
    "lesson": {
      "lessonId": "L001",
      "topic": "Phương trình bậc hai",
      "scheduledDate": "2024-01-15T07:00:00.000Z",
      "status": "scheduled"
    },
    "class": {
      "className": "12A1",
      "grade": "12"
    },
    "subject": {
      "subjectName": "Toán học",
      "subjectCode": "MATH"
    },
    "teacher": {
      "name": "Nguyễn Văn A"
    },
    "students": [
      {
        "id": "685c1c4888697d34ad3439da",
        "name": "Trần Thị B",
        "studentId": "12A1001",
        "className": "12A1"
      },
      {
        "id": "685c1c4888697d34ad3439db",
        "name": "Lê Văn C",
        "studentId": "12A1002",
        "className": "12A1"
      },
      {
        "id": "685c1c4888697d34ad3439dc",
        "name": "Phạm Thị D",
        "studentId": "12A1003",
        "className": "12A1"
      }
    ],
    "totalStudents": 3
  }
}
```

### **❌ Error Responses**

**Lesson không tìm thấy (404 Not Found)**:
```json
{
  "success": false,
  "message": "Lesson not found"
}
```

**Không có quyền xem (403 Forbidden)**:
```json
{
  "success": false,
  "message": "You can only view students of your own lessons"
}
```

**Không có token (401 Unauthorized)**:
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

**Không phải giáo viên (403 Forbidden)**:
```json
{
  "success": false,
  "message": "Access denied. Teacher role required."
}
```

---

## 🔍 **Use Cases**

### **1. Lấy danh sách để đánh giá tiết học**
```bash
# Bước 1: Lấy danh sách học sinh
curl -X GET "http://localhost:3000/api/schedules/lesson/685cbfa0f3b618a9802fb0ef/students" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Bước 2: Sử dụng student IDs để đánh giá
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbfa0f3b618a9802fb0ef/evaluate' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Test Lesson",
    "content": "Test content",
    "rating": "A",
    "absentStudents": [
        {
            "student": "685c1c4888697d34ad3439da",
            "isExcused": true
        }
    ]
}'
```

### **2. Hiển thị danh sách trên UI**
- Lấy danh sách học sinh để hiển thị dropdown
- Cho phép giáo viên chọn học sinh vắng, kiểm tra miệng, vi phạm
- Hiển thị thông tin lớp và môn học

### **3. Validation trước khi đánh giá**
- Đảm bảo student IDs đúng thuộc lớp
- Tránh lỗi "Some students do not belong to this class"

---

## 🛠️ **Integration với Teacher Evaluation**

```javascript
// Frontend workflow
async function evaluateLesson(lessonId) {
  try {
    // 1. Lấy danh sách học sinh
    const studentsResponse = await fetch(`/api/schedules/lesson/${lessonId}/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const studentsData = await studentsResponse.json();
    
    // 2. Hiển thị form với danh sách học sinh
    const students = studentsData.data.students;
    displayEvaluationForm(students);
    
    // 3. Submit đánh giá với student IDs đúng
    const evaluationData = {
      curriculumLesson: "...",
      content: "...",
      rating: "A",
      absentStudents: selectedAbsentStudents, // Từ danh sách students
      oralTests: selectedOralTests,           // Từ danh sách students
      violations: selectedViolations          // Từ danh sách students
    };
    
    await submitEvaluation(lessonId, evaluationData);
    
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

## 🎯 **Workflow Hoàn Chỉnh**

1. **Giáo viên login** → Nhận token
2. **Chọn lesson cần đánh giá** → Lấy lessonId
3. **Gọi API lấy danh sách học sinh** → `/api/schedules/lesson/:lessonId/students`
4. **Hiển thị form đánh giá** → Với danh sách học sinh đúng
5. **Submit đánh giá** → `/api/teacher-evaluations/lessons/:lessonId/evaluate`

**✅ Không còn lỗi "Some students do not belong to this class"!**

---

## 📝 **Response Fields Explanation**

| Field | Type | Description |
|-------|------|-------------|
| `lesson.lessonId` | String | Mã tiết học |
| `lesson.topic` | String | Chủ đề bài học |
| `lesson.scheduledDate` | Date | Thời gian dự kiến |
| `lesson.status` | String | Trạng thái: scheduled/completed/cancelled |
| `class.className` | String | Tên lớp (VD: 12A1) |
| `class.grade` | String | Khối lớp (VD: 12) |
| `subject.subjectName` | String | Tên môn học |
| `subject.subjectCode` | String | Mã môn học |
| `teacher.name` | String | Tên giáo viên |
| `students[].id` | String | ID học sinh (dùng cho đánh giá) |
| `students[].name` | String | Tên học sinh |
| `students[].studentId` | String | Mã số học sinh |
| `students[].className` | String | Tên lớp |
| `totalStudents` | Number | Tổng số học sinh |

**🚀 API đã sẵn sàng sử dụng!** 