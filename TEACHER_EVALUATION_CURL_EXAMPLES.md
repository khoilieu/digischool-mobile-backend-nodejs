# cURL Examples - API Đánh Giá Tiết Học Của Giáo Viên

## 🔐 Authentication
Tất cả requests đều cần token của giáo viên:
```bash
export TEACHER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export BASE_URL="http://localhost:5000/api/teacher-evaluations"
```

---

## 📝 **1. Tạo Đánh Giá Tiết Học Mới**

### Đánh giá cơ bản (chỉ thông tin bắt buộc):
```bash
curl -X POST "$BASE_URL/lessons/675a1b2c3d4e5f6789012345/evaluate" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 15: Đạo hàm của hàm số",
    "content": "Khái niệm đạo hàm, quy tắc tính đạo hàm cơ bản, ứng dụng đạo hàm trong giải toán",
    "rating": "A",
    "comments": "Lớp học tích cực, học sinh hiểu bài tốt. Cần củng cố thêm phần bài tập ứng dụng."
  }'
```

### Đánh giá đầy đủ (có tất cả thông tin):
```bash
curl -X POST "$BASE_URL/lessons/675a1b2c3d4e5f6789012345/evaluate" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
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
        "student": "675a1b2c3d4e5f6789012346",
        "isExcused": true,
        "reason": "Bệnh, có giấy xin phép"
      },
      {
        "student": "675a1b2c3d4e5f6789012347",
        "isExcused": false,
        "reason": "Vắng không phép"
      }
    ],
    "oralTests": [
      {
        "student": "675a1b2c3d4e5f6789012348",
        "score": 8.5,
        "question": "Tính đạo hàm của hàm số f(x) = x² + 3x - 1",
        "comment": "Trả lời chính xác, trình bày rõ ràng"
      },
      {
        "student": "675a1b2c3d4e5f6789012349",
        "score": 6.0,
        "question": "Nêu định nghĩa đạo hàm",
        "comment": "Trả lời đúng nhưng chưa đầy đủ"
      }
    ],
    "violations": [
      {
        "student": "675a1b2c3d4e5f6789012350",
        "description": "Nói chuyện riêng trong giờ học",
        "type": "disruptive",
        "severity": "minor",
        "action": "Nhắc nhở"
      }
    ]
  }'
```

---

## ✏️ **2. Cập Nhật Đánh Giá**

### Cập nhật rating và comments:
```bash
curl -X PUT "$BASE_URL/675a1b2c3d4e5f6789012351" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": "A+",
    "comments": "Cập nhật: Lớp học xuất sắc, tất cả học sinh đều hiểu bài"
  }'
```

### Cập nhật chi tiết đánh giá:
```bash
curl -X PUT "$BASE_URL/675a1b2c3d4e5f6789012351" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "evaluationDetails": {
      "studentEngagement": "excellent",
      "comprehensionLevel": "excellent",
      "objectiveCompletion": "fully"
    }
  }'
```

### Cập nhật nội dung bài học:
```bash
curl -X PUT "$BASE_URL/675a1b2c3d4e5f6789012351" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 15-16: Đạo hàm và ứng dụng",
    "content": "Khái niệm đạo hàm, quy tắc tính đạo hàm, ứng dụng tìm cực trị",
    "description": "Bài học mở rộng với thêm phần ứng dụng"
  }'
```

---

## 📋 **3. Lấy Danh Sách Đánh Giá**

### Lấy tất cả đánh giá:
```bash
curl -X GET "$BASE_URL" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### Lọc theo rating A và A+:
```bash
curl -X GET "$BASE_URL?rating=A" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### Lọc theo trạng thái completed:
```bash
curl -X GET "$BASE_URL?status=completed" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### Lọc theo lớp học:
```bash
curl -X GET "$BASE_URL?classId=675a1b2c3d4e5f6789012345" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### Lọc theo môn học:
```bash
curl -X GET "$BASE_URL?subjectId=675a1b2c3d4e5f6789012346" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### Lọc theo khoảng thời gian:
```bash
curl -X GET "$BASE_URL?startDate=2024-12-01&endDate=2024-12-31" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### Pagination:
```bash
curl -X GET "$BASE_URL?page=2&limit=10" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### Kết hợp nhiều filter:
```bash
curl -X GET "$BASE_URL?rating=A&status=completed&classId=675a1b2c3d4e5f6789012345&page=1&limit=5" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

---

## 🔍 **4. Lấy Chi Tiết Đánh Giá**

```bash
curl -X GET "$BASE_URL/675a1b2c3d4e5f6789012351" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

---

## ✅ **5. Hoàn Thành Đánh Giá**

```bash
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/complete" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

---

## 📤 **6. Submit Đánh Giá**

```bash
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/submit" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

---

## 👥 **7. Thêm Học Sinh Vắng**

### Vắng có phép:
```bash
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/absent-students" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012346",
    "isExcused": true,
    "reason": "Bệnh, có giấy báo của bác sĩ"
  }'
```

### Vắng không phép:
```bash
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/absent-students" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012347",
    "isExcused": false,
    "reason": "Vắng không báo trước"
  }'
```

### Vắng không rõ lý do:
```bash
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/absent-students" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012348",
    "isExcused": false
  }'
```

---

## 🗣️ **8. Thêm Kiểm Tra Miệng**

### Kiểm tra cơ bản:
```bash
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/oral-tests" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012348",
    "score": 8.5
  }'
```

### Kiểm tra đầy đủ thông tin:
```bash
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/oral-tests" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012348",
    "score": 9.0,
    "question": "Tính đạo hàm của hàm số f(x) = x³ - 2x² + 3x - 1",
    "comment": "Trả lời xuất sắc, phương pháp đúng, trình bày rõ ràng"
  }'
```

### Nhiều điểm kiểm tra:
```bash
# Học sinh 1
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/oral-tests" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012348",
    "score": 8.0,
    "question": "Nêu định nghĩa đạo hàm",
    "comment": "Trả lời chính xác"
  }'

# Học sinh 2  
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/oral-tests" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012349",
    "score": 6.5,
    "question": "Tính đạo hàm của x²",
    "comment": "Trả lời đúng nhưng chậm"
  }'

# Học sinh 3
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/oral-tests" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012350",
    "score": 9.5,
    "question": "Ứng dụng đạo hàm tìm cực trị",
    "comment": "Xuất sắc, hiểu sâu"
  }'
```

---

## ⚠️ **9. Thêm Vi Phạm**

### Vi phạm nhẹ:
```bash
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/violations" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012350",
    "description": "Nói chuyện riêng trong giờ học",
    "type": "disruptive",
    "severity": "minor",
    "action": "Nhắc nhở lần 1"
  }'
```

### Vi phạm vừa:
```bash
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/violations" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012351",
    "description": "Sử dụng điện thoại trong giờ học",
    "type": "disruptive",
    "severity": "moderate",
    "action": "Thu điện thoại, trả cuối giờ"
  }'
```

### Vi phạm nghiêm trọng:
```bash
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/violations" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012352",
    "description": "Cãi lại giáo viên, có thái độ thiếu tôn trọng",
    "type": "disrespectful",
    "severity": "serious",
    "action": "Gọi phụ huynh, báo cáo ban giám hiệu"
  }'
```

### Các loại vi phạm khác:
```bash
# Đi muộn
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/violations" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012353",
    "description": "Đến lớp muộn 15 phút không có lý do",
    "type": "late",
    "severity": "minor",
    "action": "Ghi vào sổ đầu bài"
  }'

# Không chuẩn bị bài
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/violations" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012354",
    "description": "Không làm bài tập về nhà, không mang sách vở",
    "type": "unprepared",
    "severity": "moderate",
    "action": "Phải hoàn thành bài tập trong giờ ra chơi"
  }'

# Gian lận
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/violations" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012355",
    "description": "Chép bài của bạn trong giờ kiểm tra",
    "type": "cheating",
    "severity": "serious",
    "action": "Hủy bài kiểm tra, làm lại vào buổi khác"
  }'
```

---

## 📊 **10. Lấy Thống Kê Đánh Giá**

### Thống kê tổng quát:
```bash
curl -X GET "$BASE_URL/stats/summary" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### Thống kê theo khoảng thời gian:
```bash
curl -X GET "$BASE_URL/stats/summary?startDate=2024-12-01&endDate=2024-12-31" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### Thống kê theo môn học:
```bash
curl -X GET "$BASE_URL/stats/summary?subjectId=675a1b2c3d4e5f6789012346" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### Thống kê theo lớp:
```bash
curl -X GET "$BASE_URL/stats/summary?classId=675a1b2c3d4e5f6789012345" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### Thống kê chi tiết (kết hợp tất cả filter):
```bash
curl -X GET "$BASE_URL/stats/summary?startDate=2024-12-01&endDate=2024-12-31&subjectId=675a1b2c3d4e5f6789012346&classId=675a1b2c3d4e5f6789012345" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

---

## 🧪 **Test Cases Scenarios**

### Scenario 1: Workflow hoàn chỉnh một đánh giá
```bash
# 1. Tạo đánh giá mới
EVALUATION_ID=$(curl -s -X POST "$BASE_URL/lessons/675a1b2c3d4e5f6789012345/evaluate" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 15: Đạo hàm",
    "content": "Khái niệm đạo hàm cơ bản",
    "rating": "A",
    "comments": "Lớp học tốt"
  }' | jq -r '.data.evaluationId')

echo "Created evaluation: $EVALUATION_ID"

# 2. Thêm học sinh vắng
curl -X POST "$BASE_URL/$EVALUATION_ID/absent-students" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012346",
    "isExcused": false,
    "reason": "Vắng không phép"
  }'

# 3. Thêm kiểm tra miệng
curl -X POST "$BASE_URL/$EVALUATION_ID/oral-tests" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012347",
    "score": 8.5,
    "question": "Tính đạo hàm",
    "comment": "Tốt"
  }'

# 4. Thêm vi phạm
curl -X POST "$BASE_URL/$EVALUATION_ID/violations" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012348",
    "description": "Nói chuyện riêng",
    "type": "disruptive",
    "severity": "minor"
  }'

# 5. Cập nhật đánh giá
curl -X PUT "$BASE_URL/$EVALUATION_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": "A+",
    "comments": "Cập nhật: Lớp học xuất sắc"
  }'

# 6. Hoàn thành đánh giá
curl -X POST "$BASE_URL/$EVALUATION_ID/complete" \
  -H "Authorization: Bearer $TEACHER_TOKEN"

# 7. Submit đánh giá
curl -X POST "$BASE_URL/$EVALUATION_ID/submit" \
  -H "Authorization: Bearer $TEACHER_TOKEN"

# 8. Xem chi tiết đánh giá cuối cùng
curl -X GET "$BASE_URL/$EVALUATION_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### Scenario 2: Test error cases
```bash
# Test 1: Tạo đánh giá với rating không hợp lệ
curl -X POST "$BASE_URL/lessons/675a1b2c3d4e5f6789012345/evaluate" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 15",
    "content": "Nội dung",
    "rating": "S",
    "comments": "Nhận xét"
  }'

# Test 2: Thêm điểm kiểm tra miệng không hợp lệ
curl -X POST "$BASE_URL/675a1b2c3d4e5f6789012351/oral-tests" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "675a1b2c3d4e5f6789012348",
    "score": 15
  }'

# Test 3: Cập nhật đánh giá đã submit (sẽ lỗi)
curl -X PUT "$BASE_URL/675a1b2c3d4e5f6789012351" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": "B"
  }'
```

### Scenario 3: Batch operations
```bash
EVALUATION_ID="675a1b2c3d4e5f6789012351"

# Thêm nhiều học sinh vắng cùng lúc
curl -X POST "$BASE_URL/$EVALUATION_ID/absent-students" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId": "675a1b2c3d4e5f6789012346", "isExcused": true, "reason": "Bệnh"}' &

curl -X POST "$BASE_URL/$EVALUATION_ID/absent-students" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId": "675a1b2c3d4e5f6789012347", "isExcused": false, "reason": "Vắng không phép"}' &

curl -X POST "$BASE_URL/$EVALUATION_ID/absent-students" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId": "675a1b2c3d4e5f6789012348", "isExcused": true, "reason": "Có việc gia đình"}' &

wait
echo "Added all absent students"
```

---

## 🎯 **Performance Testing**

### Load test - Tạo nhiều đánh giá:
```bash
#!/bin/bash
for i in {1..10}; do
  curl -X POST "$BASE_URL/lessons/675a1b2c3d4e5f6789012345/evaluate" \
    -H "Authorization: Bearer $TEACHER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"curriculumLesson\": \"Tiết $i: Test load\",
      \"content\": \"Nội dung test $i\",
      \"rating\": \"A\",
      \"comments\": \"Test performance $i\"
    }" &
done
wait
echo "Created 10 evaluations concurrently"
```

### Stress test - Pagination:
```bash
# Test pagination với limit lớn
curl -X GET "$BASE_URL?limit=100&page=1" \
  -H "Authorization: Bearer $TEACHER_TOKEN"

# Test với nhiều filter
curl -X GET "$BASE_URL?rating=A&status=completed&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=50" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

---

## 🔍 **Debug & Troubleshooting**

### Check server logs:
```bash
# Verbose mode để xem response headers
curl -v -X GET "$BASE_URL" \
  -H "Authorization: Bearer $TEACHER_TOKEN"

# Save response để debug
curl -X GET "$BASE_URL/675a1b2c3d4e5f6789012351" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -o evaluation_detail.json

# Pretty print JSON response
curl -s -X GET "$BASE_URL" \
  -H "Authorization: Bearer $TEACHER_TOKEN" | jq '.'
```

### Validate token:
```bash
# Test với token không hợp lệ
curl -X GET "$BASE_URL" \
  -H "Authorization: Bearer invalid_token"

# Test không có token
curl -X GET "$BASE_URL"
```

---

Các ví dụ cURL này cover tất cả các tính năng của API đánh giá tiết học! 🚀