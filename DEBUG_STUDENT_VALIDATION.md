# 🔍 Debug Student Validation

## 🚀 **Test Command với Debug Log:**

```bash
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbfa0f3b618a9802fb0ef/evaluate' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai",
    "content": "Định nghĩa phương trình bậc hai, công thức nghiệm",
    "rating": "A+",
    "absentStudents": [
        {
            "student": "685c1c4888697d34ad3439da",
            "isExcused": true
        }
    ]
}'
```

## 📊 **Expected Debug Output:**

Server console sẽ hiển thị:
```
🔍 Debug validation:
- Class ID: [CLASS_ID]
- Unique Student IDs: ['685c1c4888697d34ad3439da']
- Found students: [NUMBER]
- Students found: [ARRAY_OF_STUDENTS]
- Missing student IDs: [MISSING_IDS] (nếu có)
```

## 🎯 **Từ danh sách students đã lấy được:**

```json
"students": [
    {
        "id": "685c1c4888697d34ad3439da", // ✅ Liêu Vinh KHôi
        "name": "Liêu Vinh KHôi",
        "studentId": "ST2024003",
        "className": "12A1"
    },
    {
        "id": "685584e862669cca8757dff4", // ✅ Lê Minh Sơn
        "name": "Lê Minh Sơn", 
        "studentId": "STU202512019",
        "className": "12A1"
    }
    // ... other students
]
```

**Student ID `685c1c4888697d34ad3439da` có trong danh sách → không nên bị lỗi**

## 🔍 **Possible Issues:**

1. **Class ID mismatch**: Lesson có class ID khác với student's class_id
2. **Student role**: Student không có role 'student'
3. **ObjectId format**: String vs ObjectId comparison issue
4. **Database inconsistency**: Student data không đồng bộ

## 🚀 **Hãy chạy command và xem debug log!**

Sau đó paste debug output để tôi phân tích vấn đề chính xác. 