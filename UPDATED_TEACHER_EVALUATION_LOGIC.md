# 🔄 Logic Mới - Đánh Giá Tiết Học

## 📋 **Thay Đổi Logic:**

### **❌ Trước đây:**
- Chỉ đánh giá được lesson có status `'completed'`
- Lesson phải hoàn thành trước khi đánh giá

### **✅ Bây giờ:**
- Chỉ đánh giá được lesson có status `'scheduled'`
- Sau khi đánh giá thành công → lesson tự động chuyển sang `'completed'`

---

## 🎯 **Workflow Mới:**

1. **Lesson được tạo** → status: `'scheduled'`
2. **Giáo viên đánh giá** → API chấp nhận lesson `'scheduled'`
3. **Đánh giá thành công** → lesson tự động chuyển sang `'completed'`
4. **Lesson đã completed** → không thể đánh giá lại

---

## 🚀 **cURL Commands Cập Nhật**

### **Kiểm tra lesson có thể đánh giá không:**
```bash
# Lấy lessons có status 'scheduled' để đánh giá
curl -X GET "http://localhost:3000/api/schedules/lessons?status=scheduled" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ"
```

### **Đánh giá lesson scheduled:**
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

### **Kiểm tra lesson đã chuyển sang completed:**
```bash
# Sau khi đánh giá thành công, kiểm tra lesson status
curl -X GET "http://localhost:3000/api/schedules/lessons/685cbfa0f3b618a9802fb0ef" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ"
```

---

## 🔍 **Test Scenarios**

### **Scenario 1: Đánh giá lesson scheduled (SUCCESS)**
```bash
# 1. Tìm lesson scheduled
curl -X GET "http://localhost:3000/api/schedules/lessons?status=scheduled" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Đánh giá lesson
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/LESSON_ID/evaluate' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Test Lesson",
    "content": "Test content",
    "rating": "A"
}'

# Expected: 201 Created + lesson chuyển sang completed
```

### **Scenario 2: Đánh giá lesson completed (FAIL)**
```bash
# Cố gắng đánh giá lesson đã completed
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/COMPLETED_LESSON_ID/evaluate' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Test Lesson",
    "content": "Test content", 
    "rating": "A"
}'

# Expected: 400 Bad Request - "Can only evaluate scheduled lessons"
```

### **Scenario 3: Đánh giá lại lesson đã đánh giá (FAIL)**
```bash
# Cố gắng đánh giá lại lesson đã có evaluation
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/EVALUATED_LESSON_ID/evaluate' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Test Lesson",
    "content": "Test content",
    "rating": "A"
}'

# Expected: 409 Conflict - "Lesson has already been evaluated"
```

---

## 📊 **Response Examples**

### **Success Response:**
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

### **Error Responses:**

**Lesson không phải scheduled:**
```json
{
    "success": false,
    "message": "Can only evaluate scheduled lessons"
}
```

**Lesson đã được đánh giá:**
```json
{
    "success": false,
    "message": "Lesson has already been evaluated"
}
```

---

## 🎯 **Workflow Summary**

1. **Lesson Status**: `scheduled` → có thể đánh giá
2. **Đánh giá thành công** → Lesson Status: `completed`
3. **Lesson Status**: `completed` → không thể đánh giá lại
4. **Mỗi lesson chỉ được đánh giá 1 lần**

**✅ Logic mới đã được cập nhật thành công!** 