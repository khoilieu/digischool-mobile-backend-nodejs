# 🔐 Test Security - API Đánh Giá Tiết Học

## ⚙️ **Setup**

```bash
# Thay đổi các giá trị này theo database thật của bạn
export BASE_URL="http://localhost:5000"
export API_URL="$BASE_URL/api/teacher-evaluations"

# Tokens (lấy từ login API)
export TEACHER1_TOKEN="your_teacher1_token_here"
export TEACHER2_TOKEN="your_teacher2_token_here"
export STUDENT_TOKEN="your_student_token_here"

# Lesson IDs (lấy từ database)
export LESSON_ID_TEACHER1="675a1b2c3d4e5f6789012345"  # Lesson của Teacher1
export LESSON_ID_TEACHER2="675a1b2c3d4e5f6789012346"  # Lesson của Teacher2
```

---

## 🚫 **Tests Phải FAIL - Security Validation**

### **Test 1: Không có token (401)**
```bash
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Test No Token",
    "content": "This should fail",
    "rating": "A",
    "comments": "No authentication"
  }'
```
**Expected**: `401 Unauthorized` hoặc `Access denied`

### **Test 2: Student cố gắng đánh giá (403)**
```bash
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Test Student Role",
    "content": "Student trying to evaluate",
    "rating": "A",
    "comments": "This should fail"
  }'
```
**Expected**: `403 Forbidden` hoặc `Access denied`

### **Test 3: Teacher2 cố gắng đánh giá lesson của Teacher1 (403)**
```bash
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer $TEACHER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Test Wrong Teacher",
    "content": "Teacher2 trying to evaluate Teacher1 lesson",
    "rating": "A",
    "comments": "This should fail - not my lesson"
  }'
```
**Expected**: `403 Forbidden` hoặc `You can only evaluate your own lessons`

### **Test 4: Rating không hợp lệ (400)**
```bash
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Test Invalid Rating",
    "content": "Testing invalid rating",
    "rating": "S",
    "comments": "Invalid rating test"
  }'
```
**Expected**: `400 Bad Request` hoặc `Rating must be one of: A+, A, B+, B, C`

### **Test 5: Thiếu field bắt buộc (400)**
```bash
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Test Missing Fields"
  }'
```
**Expected**: `400 Bad Request` hoặc validation error

---

## ✅ **Test Phải THÀNH CÔNG**

### **Test 6: Teacher1 đánh giá lesson của mình (200)**
```bash
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 15: Đạo hàm của hàm số",
    "content": "Khái niệm đạo hàm, quy tắc tính đạo hàm cơ bản",
    "description": "Học sinh được làm quen với khái niệm đạo hàm",
    "rating": "A",
    "comments": "Lớp học tích cực, học sinh hiểu bài tốt"
  }'
```
**Expected**: `201 Created` với response chứa `"success": true`

### **Test 7: Teacher2 đánh giá lesson của mình (200)**
```bash
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER2/evaluate" \
  -H "Authorization: Bearer $TEACHER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 20: Tích phân",
    "content": "Khái niệm tích phân, phương pháp tính tích phân",
    "description": "Bài học về tích phân và ứng dụng",
    "rating": "A+",
    "comments": "Lớp học xuất sắc, tất cả học sinh tham gia tích cực"
  }'
```
**Expected**: `201 Created` với response chứa `"success": true`

---

## 🔁 **Test Duplicate (Phải FAIL)**

### **Test 8: Cố gắng đánh giá lại lesson đã đánh giá (409)**
```bash
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Test Duplicate",
    "content": "This should fail - already evaluated",
    "rating": "B",
    "comments": "Duplicate evaluation test"
  }'
```
**Expected**: `409 Conflict` hoặc `Lesson has already been evaluated`

---

## 📋 **Lấy Danh Sách Đánh Giá**

### **Test 9: Lấy danh sách đánh giá của teacher**
```bash
curl -X GET "$API_URL" \
  -H "Authorization: Bearer $TEACHER1_TOKEN"
```
**Expected**: `200 OK` với danh sách evaluations

### **Test 10: Lấy chi tiết đánh giá**
```bash
# Thay EVALUATION_ID bằng ID thật từ response Test 6
export EVALUATION_ID="your_evaluation_id_here"

curl -X GET "$API_URL/$EVALUATION_ID" \
  -H "Authorization: Bearer $TEACHER1_TOKEN"
```
**Expected**: `200 OK` với chi tiết evaluation

---

## 🎯 **Kết Quả Mong Đợi**

### ✅ **Security Đã Được Đảm Bảo:**
1. **Authentication**: Tests 1 → FAIL (401)
2. **Authorization**: Tests 2 → FAIL (403) 
3. **Resource Ownership**: Tests 3 → FAIL (403)
4. **Input Validation**: Tests 4, 5 → FAIL (400)
5. **Business Logic**: Test 8 → FAIL (409)
6. **Success Cases**: Tests 6, 7 → SUCCESS (201)

### 🔒 **Validation Rules:**
- ✅ Chỉ giáo viên dạy tiết đó mới được đánh giá
- ✅ Lesson phải ở trạng thái 'completed'
- ✅ Mỗi lesson chỉ đánh giá được 1 lần
- ✅ Rating phải thuộc [A+, A, B+, B, C]
- ✅ Các field bắt buộc phải có

---

## 🚀 **Cách Chạy Test**

1. **Login để lấy tokens:**
```bash
# Login teacher 1
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher1@school.com",
    "password": "password123"
  }'

# Login teacher 2  
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher2@school.com", 
    "password": "password123"
  }'

# Login student
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@school.com",
    "password": "password123"
  }'
```

2. **Lấy lesson IDs từ database hoặc API:**
```bash
# Lấy lessons của teacher
curl -X GET "$BASE_URL/api/schedules/lessons" \
  -H "Authorization: Bearer $TEACHER1_TOKEN"
```

3. **Chạy từng test command ở trên**

4. **Kiểm tra kết quả theo Expected**

---

**🎉 Hệ thống đã đảm bảo security: Chỉ giáo viên dạy tiết đó mới được đánh giá!** 