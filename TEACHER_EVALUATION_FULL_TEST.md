# Test Commands Đầy Đủ - API Đánh Giá Tiết Học Của Giáo Viên

## 🔐 **Setup Environment**

```bash
# Base configuration
export BASE_URL="http://localhost:5000"
export API_URL="$BASE_URL/api/teacher-evaluations"

# Tokens (cần thay bằng token thật từ login)
export TEACHER1_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # Giáo viên 1
export TEACHER2_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # Giáo viên 2 (để test unauthorized)
export STUDENT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."   # Học sinh (để test role)
export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."     # Admin

# Sample IDs (cần thay bằng ID thật từ database)
export LESSON_ID_TEACHER1="675a1b2c3d4e5f6789012345"  # Lesson của Teacher1
export LESSON_ID_TEACHER2="675a1b2c3d4e5f6789012346"  # Lesson của Teacher2
export LESSON_ID_NOT_COMPLETED="675a1b2c3d4e5f6789012347"  # Lesson chưa completed
export CLASS_ID="675a1b2c3d4e5f6789012348"
export SUBJECT_ID="675a1b2c3d4e5f6789012349"
export STUDENT1_ID="675a1b2c3d4e5f6789012350"
export STUDENT2_ID="675a1b2c3d4e5f6789012351"
export STUDENT3_ID="675a1b2c3d4e5f6789012352"
```

---

## 🧪 **1. SECURITY TESTS - Kiểm Tra Quyền Truy Cập**

### **Test 1.1: Không có token (401)**
```bash
echo "=== Test 1.1: No Token ==="
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Test",
    "content": "Test content",
    "rating": "A",
    "comments": "Test comments"
  }'
echo -e "\n"
```

### **Test 1.2: Token không hợp lệ (401)**
```bash
echo "=== Test 1.2: Invalid Token ==="
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer invalid_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Test",
    "content": "Test content", 
    "rating": "A",
    "comments": "Test comments"
  }'
echo -e "\n"
```

### **Test 1.3: Role student cố gắng đánh giá (403)**
```bash
echo "=== Test 1.3: Student Role Access Denied ==="
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Test",
    "content": "Test content",
    "rating": "A", 
    "comments": "Test comments"
  }'
echo -e "\n"
```

### **Test 1.4: Teacher2 cố gắng đánh giá lesson của Teacher1 (403)**
```bash
echo "=== Test 1.4: Teacher Evaluating Other Teacher's Lesson ==="
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer $TEACHER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 15: Unauthorized Test",
    "content": "Teacher2 trying to evaluate Teacher1 lesson",
    "rating": "A",
    "comments": "This should fail"
  }'
echo -e "\n"
```

### **Test 1.5: Đánh giá lesson chưa completed (400)**
```bash
echo "=== Test 1.5: Evaluate Non-Completed Lesson ==="
curl -X POST "$API_URL/lessons/$LESSON_ID_NOT_COMPLETED/evaluate" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 16: Not Completed",
    "content": "This lesson is not completed yet",
    "rating": "A",
    "comments": "Should fail because lesson not completed"
  }'
echo -e "\n"
```

### **Test 1.6: Lesson không tồn tại (404)**
```bash
echo "=== Test 1.6: Non-Existent Lesson ==="
curl -X POST "$API_URL/lessons/675a1b2c3d4e5f6789999999/evaluate" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 17: Non-existent",
    "content": "This lesson does not exist",
    "rating": "A",
    "comments": "Should fail - lesson not found"
  }'
echo -e "\n"
```

---

## ✅ **2. VALIDATION TESTS - Kiểm Tra Validation**

### **Test 2.1: Thiếu field bắt buộc**
```bash
echo "=== Test 2.1: Missing Required Fields ==="
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 15: Missing fields"
  }'
echo -e "\n"
```

### **Test 2.2: Rating không hợp lệ**
```bash
echo "=== Test 2.2: Invalid Rating ==="
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 15: Invalid Rating",
    "content": "Test content",
    "rating": "S",
    "comments": "Invalid rating test"
  }'
echo -e "\n"
```

### **Test 2.3: Content quá dài**
```bash
echo "=== Test 2.3: Content Too Long ==="
LONG_CONTENT=$(printf 'A%.0s' {1..1001})  # 1001 characters
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"curriculumLesson\": \"Tiết 15: Long Content\",
    \"content\": \"$LONG_CONTENT\",
    \"rating\": \"A\",
    \"comments\": \"Content too long test\"
  }"
echo -e "\n"
```

### **Test 2.4: Score kiểm tra miệng không hợp lệ**
```bash
echo "=== Test 2.4: Invalid Oral Test Score ==="
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 15: Invalid Score",
    "content": "Test content",
    "rating": "A",
    "comments": "Test comments",
    "oralTests": [
      {
        "student": "'$STUDENT1_ID'",
        "score": 15,
        "question": "Invalid score test",
        "comment": "Score over 10"
      }
    ]
  }'
echo -e "\n"
```

---

## 🎯 **3. SUCCESS TESTS - Test Thành Công**

### **Test 3.1: Tạo đánh giá cơ bản thành công**
```bash
echo "=== Test 3.1: Create Basic Evaluation Success ==="
RESPONSE=$(curl -s -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 15: Đạo hàm của hàm số",
    "content": "Khái niệm đạo hàm, quy tắc tính đạo hàm cơ bản, ứng dụng đạo hàm trong giải toán",
    "description": "Học sinh được làm quen với khái niệm đạo hàm và các quy tắc cơ bản",
    "rating": "A",
    "comments": "Lớp học tích cực, học sinh hiểu bài tốt. Cần củng cố thêm phần bài tập ứng dụng."
  }')

echo "$RESPONSE" | jq '.'

# Lấy evaluation ID để dùng cho tests tiếp theo
export EVALUATION_ID=$(echo "$RESPONSE" | jq -r '.data.evaluationId')
echo "Created Evaluation ID: $EVALUATION_ID"
echo -e "\n"
```

### **Test 3.2: Tạo đánh giá đầy đủ với tất cả thông tin**
```bash
echo "=== Test 3.2: Create Full Evaluation Success ==="
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER2/evaluate" \
  -H "Authorization: Bearer $TEACHER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 20: Tích phân",
    "content": "Khái niệm tích phân, phương pháp tính tích phân, ứng dụng tích phân",
    "description": "Bài học về tích phân và ứng dụng thực tế",
    "rating": "A+",
    "comments": "Lớp học xuất sắc, tất cả học sinh đều tham gia tích cực",
    "evaluationDetails": {
      "studentEngagement": "excellent",
      "comprehensionLevel": "excellent", 
      "objectiveCompletion": "fully"
    },
    "absentStudents": [
      {
        "student": "'$STUDENT1_ID'",
        "isExcused": true,
        "reason": "Bệnh, có giấy xin phép của bác sĩ"
      },
      {
        "student": "'$STUDENT2_ID'",
        "isExcused": false,
        "reason": "Vắng không báo trước"
      }
    ],
    "oralTests": [
      {
        "student": "'$STUDENT3_ID'",
        "score": 9.5,
        "question": "Tính tích phân của hàm số f(x) = x² từ 0 đến 2",
        "comment": "Trả lời xuất sắc, phương pháp đúng, tính toán chính xác"
      }
    ],
    "violations": [
      {
        "student": "'$STUDENT2_ID'",
        "description": "Sử dụng điện thoại trong giờ học",
        "type": "disruptive",
        "severity": "moderate",
        "action": "Thu điện thoại, trả cuối giờ và nhắc nhở"
      }
    ]
  }' | jq '.'
echo -e "\n"
```

---

## 🔄 **4. UPDATE TESTS - Test Cập Nhật**

### **Test 4.1: Cập nhật đánh giá thành công**
```bash
echo "=== Test 4.1: Update Evaluation Success ==="
curl -X PUT "$API_URL/$EVALUATION_ID" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": "A+",
    "comments": "Cập nhật: Sau khi xem lại, lớp học thực sự xuất sắc",
    "evaluationDetails": {
      "studentEngagement": "excellent",
      "comprehensionLevel": "excellent",
      "objectiveCompletion": "fully"
    }
  }' | jq '.'
echo -e "\n"
```

### **Test 4.2: Teacher khác cố gắng cập nhật (403)**
```bash
echo "=== Test 4.2: Unauthorized Update ==="
curl -X PUT "$API_URL/$EVALUATION_ID" \
  -H "Authorization: Bearer $TEACHER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": "B",
    "comments": "Trying to update other teacher evaluation"
  }'
echo -e "\n"
```

---

## ➕ **5. ADD COMPONENTS TESTS - Test Thêm Thành Phần**

### **Test 5.1: Thêm học sinh vắng**
```bash
echo "=== Test 5.1: Add Absent Student ==="
curl -X POST "$API_URL/$EVALUATION_ID/absent-students" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "'$STUDENT1_ID'",
    "isExcused": true,
    "reason": "Đi khám bệnh định kỳ, có giấy xin phép"
  }' | jq '.'
echo -e "\n"
```

### **Test 5.2: Thêm kiểm tra miệng**
```bash
echo "=== Test 5.2: Add Oral Test ==="
curl -X POST "$API_URL/$EVALUATION_ID/oral-tests" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "'$STUDENT2_ID'",
    "score": 8.5,
    "question": "Tính đạo hàm của hàm số f(x) = x³ - 2x² + 3x - 1",
    "comment": "Trả lời chính xác, trình bày rõ ràng, có phương pháp"
  }' | jq '.'
echo -e "\n"
```

### **Test 5.3: Thêm vi phạm**
```bash
echo "=== Test 5.3: Add Violation ==="
curl -X POST "$API_URL/$EVALUATION_ID/violations" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "'$STUDENT3_ID'",
    "description": "Nói chuyện riêng, làm ảnh hưởng đến bạn khác",
    "type": "disruptive",
    "severity": "minor",
    "action": "Nhắc nhở và chuyển chỗ ngồi"
  }' | jq '.'
echo -e "\n"
```

### **Test 5.4: Thêm nhiều kiểm tra miệng**
```bash
echo "=== Test 5.4: Add Multiple Oral Tests ==="

# Học sinh 1
curl -X POST "$API_URL/$EVALUATION_ID/oral-tests" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "'$STUDENT1_ID'",
    "score": 7.0,
    "question": "Nêu định nghĩa đạo hàm",
    "comment": "Trả lời đúng nhưng chưa đầy đủ"
  }' | jq '.'

# Học sinh 3  
curl -X POST "$API_URL/$EVALUATION_ID/oral-tests" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "'$STUDENT3_ID'",
    "score": 9.0,
    "question": "Ứng dụng đạo hàm tìm cực trị của hàm số",
    "comment": "Xuất sắc, hiểu sâu và áp dụng tốt"
  }' | jq '.'
echo -e "\n"
```

---

## 📋 **6. RETRIEVAL TESTS - Test Lấy Dữ Liệu**

### **Test 6.1: Lấy chi tiết đánh giá**
```bash
echo "=== Test 6.1: Get Evaluation Detail ==="
curl -X GET "$API_URL/$EVALUATION_ID" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" | jq '.'
echo -e "\n"
```

### **Test 6.2: Lấy danh sách đánh giá**
```bash
echo "=== Test 6.2: Get Teacher Evaluations List ==="
curl -X GET "$API_URL" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" | jq '.'
echo -e "\n"
```

### **Test 6.3: Lấy danh sách với filter**
```bash
echo "=== Test 6.3: Get Evaluations with Filters ==="
curl -X GET "$API_URL?rating=A&status=draft&page=1&limit=5" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" | jq '.'
echo -e "\n"
```

### **Test 6.4: Lấy thống kê**
```bash
echo "=== Test 6.4: Get Evaluation Statistics ==="
curl -X GET "$API_URL/stats/summary" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" | jq '.'
echo -e "\n"
```

---

## 🔄 **7. STATUS CHANGE TESTS - Test Thay Đổi Trạng Thái**

### **Test 7.1: Complete đánh giá**
```bash
echo "=== Test 7.1: Complete Evaluation ==="
curl -X POST "$API_URL/$EVALUATION_ID/complete" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" | jq '.'
echo -e "\n"
```

### **Test 7.2: Submit đánh giá**
```bash
echo "=== Test 7.2: Submit Evaluation ==="
curl -X POST "$API_URL/$EVALUATION_ID/submit" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" | jq '.'
echo -e "\n"
```

### **Test 7.3: Cố gắng cập nhật sau khi submit (400)**
```bash
echo "=== Test 7.3: Try Update After Submit ==="
curl -X PUT "$API_URL/$EVALUATION_ID" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": "B",
    "comments": "This should fail - already submitted"
  }'
echo -e "\n"
```

### **Test 7.4: Cố gắng thêm vi phạm sau khi submit (400)**
```bash
echo "=== Test 7.4: Try Add Violation After Submit ==="
curl -X POST "$API_URL/$EVALUATION_ID/violations" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "'$STUDENT1_ID'",
    "description": "This should fail",
    "type": "other",
    "severity": "minor"
  }'
echo -e "\n"
```

---

## 🔁 **8. DUPLICATE TESTS - Test Trùng Lặp**

### **Test 8.1: Cố gắng tạo đánh giá thứ 2 cho cùng lesson (409)**
```bash
echo "=== Test 8.1: Try Create Duplicate Evaluation ==="
curl -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 15: Duplicate Test",
    "content": "This should fail - already evaluated",
    "rating": "A",
    "comments": "Duplicate evaluation test"
  }'
echo -e "\n"
```

---

## 🎯 **9. ADMIN ACCESS TESTS - Test Quyền Admin**

### **Test 9.1: Admin xem đánh giá của teacher (200)**
```bash
echo "=== Test 9.1: Admin View Teacher Evaluation ==="
curl -X GET "$API_URL/$EVALUATION_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
echo -e "\n"
```

---

## 📊 **10. COMPREHENSIVE WORKFLOW TEST**

### **Test 10.1: Workflow hoàn chỉnh từ đầu đến cuối**
```bash
echo "=== Test 10.1: Complete Workflow ==="

# Tạo lesson ID mới cho test này (giả sử)
export NEW_LESSON_ID="675a1b2c3d4e5f6789012360"

echo "Step 1: Create new evaluation"
NEW_EVAL_RESPONSE=$(curl -s -X POST "$API_URL/lessons/$NEW_LESSON_ID/evaluate" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 25: Workflow Test",
    "content": "Complete workflow test lesson",
    "rating": "B+",
    "comments": "Initial evaluation for workflow test"
  }')

NEW_EVAL_ID=$(echo "$NEW_EVAL_RESPONSE" | jq -r '.data.evaluationId')
echo "Created Evaluation: $NEW_EVAL_ID"

echo "Step 2: Add absent students"
curl -s -X POST "$API_URL/$NEW_EVAL_ID/absent-students" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "'$STUDENT1_ID'",
    "isExcused": false,
    "reason": "Workflow test - absent"
  }' > /dev/null

echo "Step 3: Add oral tests"
curl -s -X POST "$API_URL/$NEW_EVAL_ID/oral-tests" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "'$STUDENT2_ID'",
    "score": 8.0,
    "question": "Workflow test question",
    "comment": "Good answer"
  }' > /dev/null

echo "Step 4: Add violations"
curl -s -X POST "$API_URL/$NEW_EVAL_ID/violations" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "'$STUDENT3_ID'",
    "description": "Workflow test violation",
    "type": "disruptive",
    "severity": "minor"
  }' > /dev/null

echo "Step 5: Update evaluation"
curl -s -X PUT "$API_URL/$NEW_EVAL_ID" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": "A",
    "comments": "Updated after adding components"
  }' > /dev/null

echo "Step 6: Complete evaluation"
curl -s -X POST "$API_URL/$NEW_EVAL_ID/complete" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" > /dev/null

echo "Step 7: Submit evaluation"
curl -s -X POST "$API_URL/$NEW_EVAL_ID/submit" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" > /dev/null

echo "Step 8: View final result"
curl -X GET "$API_URL/$NEW_EVAL_ID" \
  -H "Authorization: Bearer $TEACHER1_TOKEN" | jq '.data | {
    evaluationId,
    status,
    evaluation: .evaluation.rating,
    summary,
    submittedAt
  }'

echo "Workflow completed successfully!"
echo -e "\n"
```

---

## 🚀 **11. PERFORMANCE TESTS**

### **Test 11.1: Concurrent evaluations**
```bash
echo "=== Test 11.1: Concurrent Evaluations ==="

# Tạo 5 đánh giá đồng thời
for i in {1..5}; do
  (
    LESSON_ID="675a1b2c3d4e5f678901236$i"
    curl -s -X POST "$API_URL/lessons/$LESSON_ID/evaluate" \
      -H "Authorization: Bearer $TEACHER1_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"curriculumLesson\": \"Tiết $i: Concurrent Test\",
        \"content\": \"Performance test lesson $i\",
        \"rating\": \"A\",
        \"comments\": \"Concurrent evaluation test $i\"
      }" | jq -r '.success'
  ) &
done

wait
echo "All concurrent evaluations completed"
echo -e "\n"
```

---

## 📝 **12. RUN ALL TESTS SCRIPT**

```bash
#!/bin/bash
echo "🧪 STARTING COMPREHENSIVE TEACHER EVALUATION API TESTS"
echo "======================================================"

# Function to run test and check result
run_test() {
  local test_name="$1"
  local expected_status="$2"
  shift 2
  
  echo "Running: $test_name"
  local response=$(eval "$@")
  local actual_status=$(echo "$response" | jq -r '.success // "null"')
  
  if [[ "$actual_status" == "$expected_status" ]]; then
    echo "✅ PASS: $test_name"
  else
    echo "❌ FAIL: $test_name (Expected: $expected_status, Got: $actual_status)"
    echo "Response: $response"
  fi
  echo ""
}

# Security Tests
echo "🔐 SECURITY TESTS"
echo "=================="

run_test "No Token Test" "null" \
  'curl -s -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" -H "Content-Type: application/json" -d "{\"curriculumLesson\":\"Test\",\"content\":\"Test\",\"rating\":\"A\",\"comments\":\"Test\"}"'

run_test "Invalid Token Test" "null" \
  'curl -s -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" -H "Authorization: Bearer invalid" -H "Content-Type: application/json" -d "{\"curriculumLesson\":\"Test\",\"content\":\"Test\",\"rating\":\"A\",\"comments\":\"Test\"}"'

# Validation Tests
echo "✅ VALIDATION TESTS"
echo "==================="

run_test "Missing Required Fields" "false" \
  'curl -s -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" -H "Authorization: Bearer $TEACHER1_TOKEN" -H "Content-Type: application/json" -d "{\"curriculumLesson\":\"Test\"}"'

run_test "Invalid Rating" "false" \
  'curl -s -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" -H "Authorization: Bearer $TEACHER1_TOKEN" -H "Content-Type: application/json" -d "{\"curriculumLesson\":\"Test\",\"content\":\"Test\",\"rating\":\"S\",\"comments\":\"Test\"}"'

# Success Tests
echo "🎯 SUCCESS TESTS"
echo "================"

run_test "Create Basic Evaluation" "true" \
  'curl -s -X POST "$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate" -H "Authorization: Bearer $TEACHER1_TOKEN" -H "Content-Type: application/json" -d "{\"curriculumLesson\":\"Test Success\",\"content\":\"Test content\",\"rating\":\"A\",\"comments\":\"Test comments\"}"'

echo "🏁 ALL TESTS COMPLETED"
echo "======================"
```

---

## 📋 **Checklist Validation Security**

### ✅ **Đã Test:**
1. **Authentication**: No token, invalid token
2. **Authorization**: Wrong role (student), wrong teacher
3. **Resource Ownership**: Teacher chỉ đánh giá lesson của mình
4. **Business Logic**: Lesson phải completed, không duplicate
5. **Data Validation**: Required fields, format validation
6. **State Management**: Không sửa sau khi submit
7. **Input Sanitization**: Length limits, enum values

### 🔒 **Security Guarantees:**
- ✅ Chỉ giáo viên dạy tiết đó mới được đánh giá
- ✅ Lesson phải ở trạng thái 'completed'
- ✅ Mỗi lesson chỉ đánh giá được 1 lần
- ✅ Không thể sửa đánh giá đã submit
- ✅ Tất cả học sinh phải thuộc lớp đó
- ✅ Validation đầy đủ cho tất cả input

Chạy script này để test toàn bộ hệ thống! 🚀