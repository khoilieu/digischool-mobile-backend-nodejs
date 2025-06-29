# 🧪 Test API Lấy Danh Sách Học Sinh

## 🚀 **Test Commands**

### **1. Test API lấy danh sách học sinh**
```bash
curl -X GET "http://localhost:3000/api/schedules/lesson/685cbfa0f3b618a9802fb0ef/students" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ"
```

**Expected Result**: 
- ✅ Status 200 OK
- ✅ Danh sách học sinh với ID, tên, lớp
- ✅ Thông tin lesson, class, subject, teacher

### **2. Test với lesson không tồn tại**
```bash
curl -X GET "http://localhost:3000/api/schedules/lesson/invalid_lesson_id/students" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ"
```

**Expected Result**: 
- ❌ Status 404 Not Found
- ❌ Message: "Lesson not found"

### **3. Test không có token**
```bash
curl -X GET "http://localhost:3000/api/schedules/lesson/685cbfa0f3b618a9802fb0ef/students"
```

**Expected Result**: 
- ❌ Status 401 Unauthorized
- ❌ Message: "Not authorized to access this route"

### **4. Test với token student (không phải teacher)**
```bash
# Cần thay bằng token của student
curl -X GET "http://localhost:3000/api/schedules/lesson/685cbfa0f3b618a9802fb0ef/students" \
  -H "Authorization: Bearer STUDENT_TOKEN_HERE"
```

**Expected Result**: 
- ❌ Status 403 Forbidden
- ❌ Message: "Access denied. Teacher role required."

---

## 🔗 **Workflow Test Hoàn Chỉnh**

### **Bước 1: Lấy danh sách học sinh**
```bash
curl -X GET "http://localhost:3000/api/schedules/lesson/685cbfa0f3b618a9802fb0ef/students" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI2ODU1ODAwMzA2NzJmZWE1ODY1ODI3ZDEiLCJpYXQiOjE3NTExNzc2ODYsImV4cCI6MTc1MTI2NDA4Nn0.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ"
```

### **Bước 2: Copy student ID từ response**
Từ response, copy `students[0].id` (ví dụ: `"685c1c4888697d34ad3439da"`)

### **Bước 3: Sử dụng student ID để đánh giá**
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
            "student": "STUDENT_ID_FROM_STEP_2",
            "isExcused": true
        }
    ]
}'
```

**Expected Result**: 
- ✅ Status 201 Created
- ✅ Không còn lỗi "Some students do not belong to this class"
- ✅ Lesson tự động chuyển sang "completed"

---

## 📋 **Checklist Test**

- [ ] **Test 1**: Lấy danh sách học sinh thành công
- [ ] **Test 2**: Lesson không tồn tại → 404 Error
- [ ] **Test 3**: Không có token → 401 Error  
- [ ] **Test 4**: Token student → 403 Error
- [ ] **Test 5**: Workflow hoàn chỉnh: Lấy students → Đánh giá thành công

---

## 🎯 **PowerShell Commands (Windows)**

### **Test 1: Lấy danh sách học sinh**
```powershell
$headers = @{"Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ"}
Invoke-RestMethod -Uri "http://localhost:3000/api/schedules/lesson/685cbfa0f3b618a9802fb0ef/students" -Method GET -Headers $headers
```

### **Test 2: Đánh giá với student ID đúng**
```powershell
$headers = @{"Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ"; "Content-Type"="application/json"}
$body = @{
    "curriculumLesson" = "Test Lesson"
    "content" = "Test content"
    "rating" = "A"
    "absentStudents" = @(
        @{
            "student" = "STUDENT_ID_HERE"
            "isExcused" = $true
        }
    )
} | ConvertTo-Json -Depth 3
Invoke-RestMethod -Uri "http://localhost:3000/api/teacher-evaluations/lessons/685cbfa0f3b618a9802fb0ef/evaluate" -Method POST -Headers $headers -Body $body
```

---

## 🚀 **Hướng dẫn test:**

1. **Chạy Test 1** để lấy danh sách học sinh
2. **Copy student ID** từ response
3. **Thay STUDENT_ID_HERE** trong Test 2 bằng ID thực
4. **Chạy Test 2** để đánh giá thành công

**✅ Không còn lỗi validation!** 