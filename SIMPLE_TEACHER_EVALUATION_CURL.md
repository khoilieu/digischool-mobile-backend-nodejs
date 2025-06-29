# 📝 Form Đánh Giá Tiết Học Đơn Giản

## ⚙️ **Setup**

```bash
# Thay đổi các giá trị này theo thực tế
export BASE_URL="http://localhost:3000"
export TEACHER_TOKEN="your_actual_teacher_token_here"
export LESSON_ID="685cbf94f3b618a9802faf57"

# Student IDs (thay bằng ID thật)
export STUDENT1_ID="675a1b2c3d4e5f6789012350"
export STUDENT2_ID="675a1b2c3d4e5f6789012351"
export STUDENT3_ID="675a1b2c3d4e5f6789012352"
export STUDENT4_ID="675a1b2c3d4e5f6789012353"
export STUDENT5_ID="675a1b2c3d4e5f6789012354"
```

---

## 🎯 **Form Đánh Giá Đơn Giản**

### **Tạo Đánh Giá Tiết Học**

```bash
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbf94f3b618a9802faf57/evaluate' \
--header 'Authorization: Bearer $TEACHER_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai và ứng dụng",
    "content": "Định nghĩa phương trình bậc hai, công thức nghiệm, biệt thức delta, mối quan hệ giữa nghiệm và hệ số, ứng dụng giải bài toán thực tế",
    "description": "Học sinh nắm vững lý thuyết phương trình bậc hai, biết cách giải và ứng dụng vào bài toán thực tế. Rèn luyện kỹ năng tính toán và phân tích.",
    "rating": "A+",
    "absentStudents": [
        {
            "student": "$STUDENT1_ID",
            "isExcused": true,
            "reason": "Bệnh có giấy xin phép của bác sĩ - viêm họng cấp"
        },
        {
            "student": "$STUDENT2_ID",
            "isExcused": false,
            "reason": "Vắng không báo trước, không có lý do chính đáng"
        }
    ],
    "oralTests": [
        {
            "student": "$STUDENT3_ID",
            "score": 9.5,
            "question": "Giải phương trình x² - 5x + 6 = 0 và giải thích các bước thực hiện",
            "comment": "Trả lời xuất sắc! Nắm vững công thức, tính toán chính xác, giải thích rõ ràng từng bước. Có thể áp dụng linh hoạt."
        },
        {
            "student": "$STUDENT4_ID",
            "score": 7.5
        },
        {
            "student": "$STUDENT5_ID",
            "score": 8.0
        }
    ],
    "violations": [
        {
            "student": "$STUDENT2_ID",
            "description": "Sử dụng điện thoại trong giờ học để chơi game, không chú ý nghe bài"
        },
        {
            "student": "$STUDENT4_ID",
            "description": "Đến lớp muộn 10 phút không có lý do chính đáng"
        },
        {
            "student": "$STUDENT5_ID",
            "description": "Không chuẩn bị bài tập về nhà, không mang đủ dụng cụ học tập"
        }
    ]
}'
```

---

## 📝 **Các Trường Dữ Liệu**

### **✅ Bắt Buộc:**
- `curriculumLesson` - Tên tiết học
- `content` - Nội dung bài học  
- `rating` - Đánh giá (A+, A, B+, B, C)

### **📋 Không Bắt Buộc:**
- `description` - Mô tả bài học
- `comments` - Nhận xét chung
- `absentStudents` - Danh sách học sinh vắng
- `oralTests` - Danh sách kiểm tra miệng
- `violations` - Danh sách vi phạm

---

## 🔍 **Chi Tiết Các Trường**

### **Học Sinh Vắng (`absentStudents`):**
```json
{
    "student": "student_id",
    "isExcused": true/false,
    "reason": "lý do vắng"
}
```

### **Kiểm Tra Miệng (`oralTests`):**
```json
{
    "student": "student_id",
    "score": 8.5,
    "question": "câu hỏi (không bắt buộc)",
    "comment": "nhận xét (không bắt buộc)"
}
```

### **Vi Phạm (`violations`):**
```json
{
    "student": "student_id",
    "description": "mô tả vi phạm",
    "type": "late/disruptive/unprepared/other (không bắt buộc)",
    "severity": "minor/moderate/serious (không bắt buộc)",
    "action": "biện pháp xử lý (không bắt buộc)"
}
```

---

## 🎯 **Ví Dụ Form Tối Thiểu**

### **Chỉ Các Trường Bắt Buộc:**
```bash
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbf94f3b618a9802faf57/evaluate' \
--header 'Authorization: Bearer $TEACHER_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai",
    "content": "Học về phương trình bậc hai và cách giải",
    "rating": "A"
}'
```

### **Có Thêm Học Sinh Vắng:**
```bash
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbf94f3b618a9802faf57/evaluate' \
--header 'Authorization: Bearer $TEACHER_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai",
    "content": "Học về phương trình bậc hai và cách giải",
    "rating": "A",
    "absentStudents": [
        {
            "student": "$STUDENT1_ID",
            "isExcused": true,
            "reason": "Bệnh"
        }
    ]
}'
```

### **Có Thêm Kiểm Tra Miệng:**
```bash
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbf94f3b618a9802faf57/evaluate' \
--header 'Authorization: Bearer $TEACHER_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai", 
    "content": "Học về phương trình bậc hai và cách giải",
    "rating": "A",
    "oralTests": [
        {
            "student": "$STUDENT3_ID",
            "score": 8.5
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
            "totalAbsent": 2,
            "totalExcusedAbsent": 1,
            "totalOralTests": 3,
            "averageOralScore": 8.3,
            "totalViolations": 3
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

## 🚀 **Cách Sử Dụng**

1. **Thay đổi các biến environment:**
   - `TEACHER_TOKEN`: Token thật từ login
   - `LESSON_ID`: ID lesson thật
   - `STUDENT*_ID`: ID học sinh thật

2. **Chạy cURL command**

3. **Kiểm tra response**

---

**🎯 Form đơn giản này chỉ cần 3 trường bắt buộc, các trường khác tùy chọn theo nhu cầu!** 