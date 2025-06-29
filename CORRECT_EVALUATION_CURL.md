# ✅ cURL Đánh Giá Đúng Với Student IDs

## 📋 **Danh sách học sinh đã lấy được:**
Từ API `/api/schedules/lesson/685cbfa0f3b618a9802fb0ef/students`:

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
    },
    {
        "id": "685584df62669cca8757dfea", // ✅ Nguyễn Văn Phúc
        "name": "Nguyễn Văn Phúc",
        "studentId": "STU202512017", 
        "className": "12A1"
    },
    {
        "id": "685584ec62669cca8757dff9", // ✅ Phạm Thị Thảo
        "name": "Phạm Thị Thảo",
        "studentId": "STU202512020",
        "className": "12A1"
    },
    {
        "id": "685584e462669cca8757dfef", // ✅ Trần Thị Quỳnh
        "name": "Trần Thị Quỳnh",
        "studentId": "STU202512018",
        "className": "12A1"
    }
]
```

---

## 🚀 **cURL Command Đúng:**

### **Version 1: Đơn giản (chỉ các trường bắt buộc)**
```bash
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbfa0f3b618a9802fb0ef/evaluate' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai và ứng dụng",
    "content": "Định nghĩa phương trình bậc hai, công thức nghiệm, biệt thức delta",
    "rating": "A+"
}'
```

### **Version 2: Với student data (sử dụng IDs đúng)**
```bash
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbfa0f3b618a9802fb0ef/evaluate' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai và ứng dụng",
    "content": "Định nghĩa phương trình bậc hai, công thức nghiệm, biệt thức delta, mối quan hệ giữa nghiệm và hệ số",
    "description": "Học sinh nắm vững lý thuyết phương trình bậc hai, biết cách giải và ứng dụng vào bài toán thực tế",
    "rating": "A+",
    "absentStudents": [
        {
            "student": "685584e862669cca8757dff4",
            "isExcused": true,
            "reason": "Ốm"
        }
    ],
    "oralTests": [
        {
            "student": "685c1c4888697d34ad3439da",
            "score": 9.5,
            "question": "Giải phương trình x² - 5x + 6 = 0"
        },
        {
            "student": "685584df62669cca8757dfea",
            "score": 8.0,
            "question": "Tính biệt thức delta của phương trình 2x² - 3x + 1 = 0"
        }
    ],
    "violations": [
        {
            "student": "685584ec62669cca8757dff9",
            "description": "Nói chuyện riêng trong giờ học",
            "type": "disruptive",
            "severity": "minor"
        }
    ]
}'
```

---

## 🔍 **Lý do lỗi trước đây:**

**❌ Lỗi cũ**: Bạn dùng student ID không thuộc lớp này
**✅ Giải pháp**: Dùng student IDs từ danh sách API `/lesson/:lessonId/students`

---

## 📊 **Expected Results:**

### **✅ Success Response:**
```json
{
  "success": true,
  "message": "Tạo đánh giá tiết học thành công",
  "data": {
    "evaluationId": "...",
    "lesson": {
      "lessonId": "58283b_20240812_1490_269",
      "scheduledDate": "2024-08-12T00:00:00.000Z",
      "status": "completed"    // ✅ Tự động chuyển sang completed
    },
    "class": {
      "className": "12A1"
    },
    "subject": {
      "subjectName": "Chemistry",
      "subjectCode": "HH"
    },
    "summary": {
      "totalPresent": 4,
      "totalAbsent": 1,
      "totalExcusedAbsent": 1,
      "totalOralTests": 2,
      "averageOralScore": 8.75,
      "totalViolations": 1
    },
    "status": "draft",
    "createdAt": "..."
  }
}
```

---

## 🎯 **PowerShell Version (Windows):**

```powershell
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ"
    "Content-Type" = "application/json"
}

$body = @{
    "curriculumLesson" = "Tiết 25: Phương trình bậc hai và ứng dụng"
    "content" = "Định nghĩa phương trình bậc hai, công thức nghiệm"
    "rating" = "A+"
    "absentStudents" = @(
        @{
            "student" = "685584e862669cca8757dff4"
            "isExcused" = $true
        }
    )
    "oralTests" = @(
        @{
            "student" = "685c1c4888697d34ad3439da"
            "score" = 9.5
        }
    )
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3000/api/teacher-evaluations/lessons/685cbfa0f3b618a9802fb0ef/evaluate" -Method POST -Headers $headers -Body $body
```

---

## 🚀 **Hãy thử Version 1 trước:**

```bash
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbfa0f3b618a9802fb0ef/evaluate' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai",
    "content": "Định nghĩa phương trình bậc hai, công thức nghiệm",
    "rating": "A+"
}'
```

**✅ Sẽ thành công vì không có student data để validate!**

Sau đó thử Version 2 với student IDs đúng! 🎯 