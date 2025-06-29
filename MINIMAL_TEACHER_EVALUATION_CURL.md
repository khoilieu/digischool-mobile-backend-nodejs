# 📝 cURL Tối Thiểu - Đánh Giá Tiết Học

## 🎯 **Form Tối Thiểu - Chỉ 3 Trường Bắt Buộc**

```bash
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbfa0f3b618a9802fb0ef/evaluate' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai",
    "content": "Học về phương trình bậc hai và cách giải",
    "rating": "A+"
}'
```

---

## 🎯 **Form Của Bạn - Với Các Trường Tùy Chọn**

```bash
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbfa0f3b618a9802fb0ef/evaluate' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai và ứng dụng",
    "content": "Định nghĩa phương trình bậc hai, công thức nghiệm, biệt thức delta, mối quan hệ giữa nghiệm và hệ số, ứng dụng giải bài toán thực tế",
    "description": "Học sinh nắm vững lý thuyết phương trình bậc hai, biết cách giải và ứng dụng vào bài toán thực tế. Rèn luyện kỹ năng tính toán và phân tích.",
    "rating": "A+",
    "absentStudents": [
        {
            "student": "685c1c4888697d34ad3439da",
            "isExcused": true
        }
    ],
    "oralTests": [
        {
            "student": "685c1c4888697d34ad3439da",
            "score": 9.5
        },
        {
            "student": "685c1c4888697d34ad3439da",
            "score": 7.5
        }
    ],
    "violations": [
        {
            "student": "685c1c4888697d34ad3439da",
            "description": "Sử dụng điện thoại trong giờ học để chơi game, không chú ý nghe bài"
        }
    ]
}'
```

---

## 📋 **Các Trường Dữ Liệu**

### **✅ Bắt Buộc (3 trường):**
- `curriculumLesson` - Tên tiết học (tối đa 100 ký tự)
- `content` - Nội dung bài học (tối đa 1000 ký tự)
- `rating` - Đánh giá: `"A+"`, `"A"`, `"B+"`, `"B"`, `"C"`

### **📋 Tùy Chọn:**
- `description` - Mô tả bài học (tối đa 500 ký tự)
- `comments` - Nhận xét chung (tối đa 1000 ký tự)
- `absentStudents` - Học sinh vắng
- `oralTests` - Kiểm tra miệng
- `violations` - Vi phạm

---

## 🔍 **Chi Tiết Trường Tùy Chọn**

### **Học Sinh Vắng:**
```json
{
    "student": "student_id",
    "isExcused": true,
    "reason": "lý do (tùy chọn)"
}
```

### **Kiểm Tra Miệng:**
```json
{
    "student": "student_id",
    "score": 8.5,
    "question": "câu hỏi (tùy chọn)",
    "comment": "nhận xét (tùy chọn)"
}
```

### **Vi Phạm:**
```json
{
    "student": "student_id",
    "description": "mô tả vi phạm",
    "type": "late/disruptive/unprepared/other (tùy chọn)",
    "severity": "minor/moderate/serious (tùy chọn)",
    "action": "biện pháp (tùy chọn)"
}
```

---

## 🎯 **Các Ví Dụ Khác**

### **Chỉ Có Học Sinh Vắng:**
```bash
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbfa0f3b618a9802fb0ef/evaluate' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai",
    "content": "Học về phương trình bậc hai",
    "rating": "A",
    "absentStudents": [
        {
            "student": "685c1c4888697d34ad3439da",
            "isExcused": true
        }
    ]
}'
```

### **Chỉ Có Kiểm Tra Miệng:**
```bash
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbfa0f3b618a9802fb0ef/evaluate' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai",
    "content": "Học về phương trình bậc hai",
    "rating": "A",
    "oralTests": [
        {
            "student": "685c1c4888697d34ad3439da",
            "score": 8.5
        }
    ]
}'
```

### **Chỉ Có Vi Phạm:**
```bash
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbfa0f3b618a9802fb0ef/evaluate' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai",
    "content": "Học về phương trình bậc hai",
    "rating": "A",
    "violations": [
        {
            "student": "685c1c4888697d34ad3439da",
            "description": "Đến muộn"
        }
    ]
}'
```

---

## 📊 **Response Mong Đợi**

```json
{
    "success": true,
    "message": "Tạo đánh giá tiết học thành công",
    "data": {
        "evaluationId": "675a1b2c3d4e5f6789012400",
        "lesson": {
            "lessonId": "L001",
            "scheduledDate": "2024-01-15T07:00:00.000Z",
            "actualDate": "2024-01-15T07:00:00.000Z",
            "topic": "Phương trình bậc hai"
        },
        "class": "12A1",
        "subject": {
            "name": "Toán học",
            "code": "MATH"
        },
        "lessonContent": {
            "curriculumLesson": "Tiết 25: Phương trình bậc hai và ứng dụng",
            "content": "Định nghĩa phương trình bậc hai...",
            "description": "Học sinh nắm vững lý thuyết..."
        },
        "evaluation": {
            "rating": "A+",
            "comments": "",
            "details": {}
        },
        "summary": {
            "totalPresent": 28,
            "totalAbsent": 1,
            "totalExcusedAbsent": 1,
            "totalOralTests": 2,
            "averageOralScore": 8.5,
            "totalViolations": 1
        },
        "absentStudents": [...],
        "oralTests": [...],
        "violations": [...],
        "status": "draft",
        "createdAt": "2024-01-15T08:00:00.000Z"
    }
}
```

---

**🎯 Bây giờ cURL của bạn sẽ hoạt động với form tối thiểu hoặc đầy đủ!** 