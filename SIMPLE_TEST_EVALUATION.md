# 🧪 Test Đánh Giá Đơn Giản

## 🔍 **Vấn đề hiện tại:**
- Lỗi: "Some students do not belong to this class"
- Student ID `685c1c4888697d34ad3439da` không thuộc lớp của lesson

## 🚀 **Test 1: Đánh giá không có student data**

```bash
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbfa0f3b618a9802fb0ef/evaluate' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai",
    "content": "Định nghĩa phương trình bậc hai, công thức nghiệm",
    "description": "Học sinh nắm vững lý thuyết",
    "rating": "A+"
}'
```

**Expected**: ✅ Success - không có student data nên không bị lỗi validation

## 🚀 **Test 2: Kiểm tra lesson info**

```bash
curl -X GET "http://localhost:3000/api/schedules/lessons/685cbfa0f3b618a9802fb0ef" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ"
```

**Expected**: Lấy được thông tin lesson với class ID

## 🚀 **Test 3: Lấy danh sách học sinh của lớp**

```bash
# Thay CLASS_ID bằng class ID từ lesson
curl -X GET "http://localhost:3000/api/users?role=student&class_id=CLASS_ID" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU4MDAzMDY3MmZlYTU4NjU4MjdkMSIsImlhdCI6MTc1MTE3NzY4NiwiZXhwIjoxNzUxMjY0MDg2fQ.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ"
```

**Expected**: Danh sách học sinh thuộc lớp đó

## 🚀 **Test 4: Đánh giá với student ID đúng**

```bash
# Sử dụng student ID từ danh sách ở Test 3
curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbfa0f3b618a9802fb0ef/evaluate' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI2ODU1ODAwMzA2NzJmZWE1ODY1ODI3ZDEiLCJpYXQiOjE3NTExNzc2ODYsImV4cCI6MTc1MTI2NDA4Nn0.hDUwrqxQ9a06dnxMHy-8Ky7Wv_pPATD0LOC8sf5-MGQ' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai",
    "content": "Định nghĩa phương trình bậc hai",
    "rating": "A+",
    "absentStudents": [
        {
            "student": "CORRECT_STUDENT_ID",
            "isExcused": true
        }
    ]
}'
```

## 🔧 **Debug Steps:**

1. **Chạy Test 1** → Nếu thành công = API hoạt động bình thường
2. **Chạy Test 2** → Lấy class ID của lesson
3. **Chạy Test 3** → Lấy student IDs thuộc lớp đó
4. **Chạy Test 4** → Dùng student ID đúng

## 💡 **Lý do lỗi:**
- Student ID `685c1c4888697d34ad3439da` không thuộc lớp của lesson `685cbfa0f3b618a9802fb0ef`
- Cần dùng student ID từ cùng lớp với lesson

**Hãy chạy Test 1 trước để xem API có hoạt động không!** 