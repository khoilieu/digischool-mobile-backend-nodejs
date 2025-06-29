# Ví Dụ cURL Commands - API Đánh Giá Tiết Học Của Học Sinh

## Chuẩn bị
```bash
# Thiết lập token học sinh
export STUDENT_TOKEN="your_student_jwt_token_here"
export BASE_URL="http://localhost:5000/api"

# Thiết lập lesson ID để test
export LESSON_ID="675a1b2c3d4e5f6789012345"
export EVALUATION_ID="675a1b2c3d4e5f6789012346"
```

---

## 1. 🔍 Kiểm tra có thể đánh giá tiết học không

```bash
curl -X GET "${BASE_URL}/student-evaluations/lessons/${LESSON_ID}/can-evaluate" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

**Response Success:**
```json
{
  "success": true,
  "canEvaluate": true,
  "message": "Học sinh có thể đánh giá tiết học này",
  "data": {
    "lesson": {
      "lessonId": "582827_20241219_0001",
      "scheduledDate": "2024-12-19T00:00:00.000Z",
      "actualDate": "2024-12-19T07:00:00.000Z",
      "topic": "Đạo hàm của hàm số",
      "status": "completed"
    },
    "class": "12A1",
    "subject": {
      "name": "Toán học",
      "code": "MATH"
    },
    "teacher": {
      "name": "Nguyễn Văn Nam",
      "email": "nguyenvannam@school.edu.vn"
    }
  }
}
```

---

## 2. 📝 Tạo đánh giá tiết học mới

```bash
curl -X POST "${BASE_URL}/student-evaluations/lessons/${LESSON_ID}/evaluate" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "teachingClarity": 4,
    "teachingSupport": 5,
    "teacherInteraction": 4,
    "completedWell": true,
    "comments": "Tiết học rất hay, giáo viên giải thích dễ hiểu. Tôi đã hiểu được cách tính đạo hàm cơ bản."
  }' | jq
```

**Response Success:**
```json
{
  "success": true,
  "message": "Đánh giá tiết học thành công",
  "data": {
    "evaluationId": "675a1b2c3d4e5f6789012345",
    "lesson": {
      "lessonId": "582827_20241219_0001",
      "scheduledDate": "2024-12-19T00:00:00.000Z",
      "topic": "Đạo hàm của hàm số"
    },
    "class": "12A1",
    "subject": {
      "name": "Toán học",
      "code": "MATH"
    },
    "teacher": {
      "name": "Nguyễn Văn Nam",
      "email": "nguyenvannam@school.edu.vn"
    },
    "evaluation": {
      "teachingClarity": 4,
      "teachingSupport": 5,
      "teacherInteraction": 4,
      "overallRating": 4.3
    },
    "studentSelfAssessment": {
      "completedWell": true,
      "reason": null
    },
    "comments": "Tiết học rất hay, giáo viên giải thích dễ hiểu. Tôi đã hiểu được cách tính đạo hàm cơ bản.",
    "evaluatedAt": "2024-12-20T10:30:00.000Z"
  }
}
```

---

## 3. ✏️ Cập nhật đánh giá

```bash
curl -X PUT "${BASE_URL}/student-evaluations/${EVALUATION_ID}" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "teachingClarity": 5,
    "comments": "Cập nhật: Sau khi về nhà làm bài tập, tôi thấy giáo viên giải thích rất rõ ràng và chi tiết."
  }' | jq
```

---

## 4. 📋 Lấy danh sách đánh giá của học sinh

```bash
# Lấy tất cả đánh giá
curl -X GET "${BASE_URL}/student-evaluations" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" | jq

# Lấy đánh giá với filter và pagination
curl -X GET "${BASE_URL}/student-evaluations?page=1&limit=5&startDate=2024-12-01&endDate=2024-12-31" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" | jq

# Lọc theo môn học
curl -X GET "${BASE_URL}/student-evaluations?subjectId=675a1b2c3d4e5f6789012347" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" | jq
```

---

## 5. 🔍 Lấy chi tiết một đánh giá

```bash
curl -X GET "${BASE_URL}/student-evaluations/${EVALUATION_ID}" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

---

## 6. 📚 Lấy danh sách tiết học có thể đánh giá

```bash
# Lấy tất cả tiết học có thể đánh giá
curl -X GET "${BASE_URL}/student-evaluations/lessons/evaluable" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" | jq

# Lọc theo thời gian và môn học
curl -X GET "${BASE_URL}/student-evaluations/lessons/evaluable?startDate=2024-12-01&endDate=2024-12-31&subjectId=675a1b2c3d4e5f6789012347" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" | jq

# Với pagination
curl -X GET "${BASE_URL}/student-evaluations/lessons/evaluable?page=1&limit=10" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" | jq
```

---

## 🧪 Test Cases - Các Trường Hợp Lỗi

### 1. Đánh giá tiết học chưa hoàn thành
```bash
# Giả sử LESSON_ID_NOT_COMPLETED là lesson có status 'scheduled'
export LESSON_ID_NOT_COMPLETED="675a1b2c3d4e5f6789012999"

curl -X POST "${BASE_URL}/student-evaluations/lessons/${LESSON_ID_NOT_COMPLETED}/evaluate" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "teachingClarity": 4,
    "teachingSupport": 5,
    "teacherInteraction": 4,
    "completedWell": true
  }' | jq
```

**Expected Response (403):**
```json
{
  "success": false,
  "message": "Lesson is not completed yet"
}
```

### 2. Đánh giá với rating không hợp lệ
```bash
curl -X POST "${BASE_URL}/student-evaluations/lessons/${LESSON_ID}/evaluate" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "teachingClarity": 6,
    "teachingSupport": 0,
    "teacherInteraction": 3.5,
    "completedWell": true
  }' | jq
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Validation errors",
  "errors": [
    {
      "field": "teachingClarity",
      "message": "Teaching clarity rating must be an integer between 1 and 5"
    }
  ]
}
```

### 3. Đánh giá lần thứ 2 (đã đánh giá rồi)
```bash
# Thực hiện lại request tạo đánh giá cho cùng một lesson
curl -X POST "${BASE_URL}/student-evaluations/lessons/${LESSON_ID}/evaluate" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "teachingClarity": 3,
    "teachingSupport": 3,
    "teacherInteraction": 3,
    "completedWell": false,
    "reason": "Không hiểu bài"
  }' | jq
```

**Expected Response (403):**
```json
{
  "success": false,
  "message": "Student has already evaluated this lesson"
}
```

### 4. Cập nhật đánh giá của người khác
```bash
# Giả sử EVALUATION_ID_OTHER_STUDENT là đánh giá của học sinh khác
export EVALUATION_ID_OTHER_STUDENT="675a1b2c3d4e5f6789012888"

curl -X PUT "${BASE_URL}/student-evaluations/${EVALUATION_ID_OTHER_STUDENT}" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "teachingClarity": 1,
    "comments": "Hack attempt"
  }' | jq
```

**Expected Response (403):**
```json
{
  "success": false,
  "message": "You can only update your own evaluations"
}
```

---

## 📊 Các Scenarios Thực Tế

### Scenario 1: Học sinh đánh giá tích cực
```bash
curl -X POST "${BASE_URL}/student-evaluations/lessons/${LESSON_ID}/evaluate" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "teachingClarity": 5,
    "teachingSupport": 5,
    "teacherInteraction": 4,
    "completedWell": true,
    "comments": "Cô giáo dạy rất hay, giải thích từng bước một cách chi tiết. Em đã hiểu được bài học và có thể làm được các bài tập tương tự."
  }' | jq
```

### Scenario 2: Học sinh đánh giá tiêu cực với lý do
```bash
curl -X POST "${BASE_URL}/student-evaluations/lessons/${LESSON_ID}/evaluate" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "teachingClarity": 2,
    "teachingSupport": 2,
    "teacherInteraction": 3,
    "completedWell": false,
    "reason": "Giáo viên nói quá nhanh, em không kịp ghi chép và không hiểu được nội dung bài học",
    "comments": "Em mong giáo viên có thể nói chậm hơn và giải thích kỹ hơn các khái niệm khó."
  }' | jq
```

### Scenario 3: Học sinh đánh giá trung bình
```bash
curl -X POST "${BASE_URL}/student-evaluations/lessons/${LESSON_ID}/evaluate" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "teachingClarity": 3,
    "teachingSupport": 4,
    "teacherInteraction": 3,
    "completedWell": true,
    "comments": "Tiết học bình thường, em hiểu được phần cơ bản nhưng vẫn còn một số chỗ chưa rõ."
  }' | jq
```

---

## 🔧 Utility Scripts

### Script để test toàn bộ workflow
```bash
#!/bin/bash

# student-evaluation-test.sh
set -e

echo "🚀 Testing Student Evaluation API Workflow..."

# 1. Kiểm tra có thể đánh giá không
echo "1. Checking if lesson can be evaluated..."
LESSON_INFO=$(curl -s -X GET "${BASE_URL}/student-evaluations/lessons/${LESSON_ID}/can-evaluate" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}")

CAN_EVALUATE=$(echo $LESSON_INFO | jq -r '.canEvaluate')

if [ "$CAN_EVALUATE" = "true" ]; then
  echo "✅ Lesson can be evaluated"
  
  # 2. Tạo đánh giá
  echo "2. Creating evaluation..."
  EVALUATION_RESPONSE=$(curl -s -X POST "${BASE_URL}/student-evaluations/lessons/${LESSON_ID}/evaluate" \
    -H "Authorization: Bearer ${STUDENT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
      "teachingClarity": 4,
      "teachingSupport": 5,
      "teacherInteraction": 4,
      "completedWell": true,
      "comments": "Test evaluation from script"
    }')
  
  EVALUATION_ID=$(echo $EVALUATION_RESPONSE | jq -r '.data.evaluationId')
  echo "✅ Evaluation created with ID: $EVALUATION_ID"
  
  # 3. Cập nhật đánh giá
  echo "3. Updating evaluation..."
  curl -s -X PUT "${BASE_URL}/student-evaluations/${EVALUATION_ID}" \
    -H "Authorization: Bearer ${STUDENT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
      "teachingClarity": 5,
      "comments": "Updated evaluation from script"
    }' > /dev/null
  echo "✅ Evaluation updated"
  
  # 4. Lấy chi tiết đánh giá
  echo "4. Getting evaluation detail..."
  curl -s -X GET "${BASE_URL}/student-evaluations/${EVALUATION_ID}" \
    -H "Authorization: Bearer ${STUDENT_TOKEN}" | jq '.data.evaluation'
  echo "✅ Evaluation detail retrieved"
  
else
  echo "❌ Cannot evaluate lesson: $(echo $LESSON_INFO | jq -r '.message')"
fi

echo "🎉 Test completed!"
```

### Script để lấy thống kê đánh giá
```bash
#!/bin/bash

# get-evaluation-stats.sh
echo "📊 Getting evaluation statistics..."

# Lấy tất cả đánh giá của học sinh
ALL_EVALUATIONS=$(curl -s -X GET "${BASE_URL}/student-evaluations?limit=100" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}")

TOTAL_EVALUATIONS=$(echo $ALL_EVALUATIONS | jq '.pagination.totalItems')
echo "Total evaluations: $TOTAL_EVALUATIONS"

# Tính điểm trung bình
AVG_OVERALL=$(echo $ALL_EVALUATIONS | jq '.data.evaluations | map(.evaluation.overallRating) | add / length')
echo "Average overall rating: $AVG_OVERALL"

# Đếm số lượng đánh giá theo môn
echo "Evaluations by subject:"
echo $ALL_EVALUATIONS | jq -r '.data.evaluations | group_by(.subject.code) | .[] | "\(.[0].subject.code): \(length) evaluations"'
```

---

## 📝 Notes

- Thay thế `${STUDENT_TOKEN}` bằng JWT token thực của học sinh
- Thay thế `${LESSON_ID}` bằng ID của lesson đã completed và học sinh có tham gia
- Sử dụng `jq` để format JSON output đẹp hơn
- Tất cả API đều yêu cầu authentication với role `student`
- Kiểm tra response status code để xác định success/error

## 🔍 Debugging Tips

1. **Kiểm tra token hợp lệ:**
   ```bash
   curl -X GET "${BASE_URL}/auth/me" \
     -H "Authorization: Bearer ${STUDENT_TOKEN}" | jq
   ```

2. **Kiểm tra lesson status:**
   ```bash
   curl -X GET "${BASE_URL}/schedules/lessons/${LESSON_ID}" \
     -H "Authorization: Bearer ${STUDENT_TOKEN}" | jq '.data.status'
   ```

3. **Kiểm tra attendance:**
   ```bash
   curl -X GET "${BASE_URL}/schedules/lessons/${LESSON_ID}" \
     -H "Authorization: Bearer ${STUDENT_TOKEN}" | jq '.data.attendance'
   ``` 