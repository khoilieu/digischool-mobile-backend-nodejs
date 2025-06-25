# Leave Request System - Full cURL Commands

## 🔑 Authentication Tokens
```bash
# Replace these with your actual tokens
STUDENT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDg1NjUwNSwiZXhwIjoxNzUwOTQyOTA1fQ.v5tVkxXZyvR9kKA_tvOEJkOfkPciKZWnMi4qR0b5e_A"
TEACHER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTU3ZjgxMDY3MmZlYTU4NjU4MjdiMCIsImlhdCI6MTc1MDg1NjUwNSwiZXhwIjoxNzUwOTQyOTA1fQ.v5tVkxXZyvR9kKA_tvOEJkOfkPciKZWnMi4qR0b5e_A"
MANAGER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDg1NjUwNSwiZXhwIjoxNzUwOTQyOTA1fQ.v5tVkxXZyvR9kKA_tvOEJkOfkPciKZWnMi4qR0b5e_A"

BASE_URL="http://localhost:3000/api/leave-requests"
```

## 📚 Student APIs

### 1. Get Available Lessons (Xem tiết có thể xin vắng)
```bash
curl -X GET "${BASE_URL}/available-lessons?startDate=2024-08-12&endDate=2024-08-19" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

### 2. Create Leave Requests (Tạo đơn xin vắng nhiều tiết)
```bash
curl -X POST "${BASE_URL}/create" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonIds": [
      "685bfa6564e5ad3189451698",
      "685bfa6564e5ad3189451699"
    ],
    "phoneNumber": "0987654321",
    "reason": "Có việc gia đình đột xuất cần xin phép vắng mặt. Em sẽ học bù sau khi trở lại trường."
  }' | jq
```

### 3. Get My Leave Requests (Xem đơn của mình)
```bash
# Get all requests
curl -X GET "${BASE_URL}/my-requests" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Get pending requests only
curl -X GET "${BASE_URL}/my-requests?status=pending" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Get requests with pagination
curl -X GET "${BASE_URL}/my-requests?page=1&limit=10" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Get requests by date range
curl -X GET "${BASE_URL}/my-requests?startDate=2024-08-01&endDate=2024-08-31" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

### 4. Cancel Leave Request (Hủy đơn xin vắng)
```bash
# Replace REQUEST_ID with actual request ID
REQUEST_ID="675a1b2c3d4e5f6789012347"

curl -X DELETE "${BASE_URL}/${REQUEST_ID}/cancel" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

## 👨‍🏫 Teacher APIs

### 5. Get Pending Requests (Xem đơn cần duyệt)
```bash
# Get all pending requests
curl -X GET "${BASE_URL}/pending" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Get pending requests with pagination
curl -X GET "${BASE_URL}/pending?page=1&limit=20" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Get pending requests by date range
curl -X GET "${BASE_URL}/pending?startDate=2024-08-12&endDate=2024-08-19" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

### 6. Approve Leave Request (Duyệt đơn xin vắng)
```bash
# Replace REQUEST_ID with actual request ID
REQUEST_ID="675a1b2c3d4e5f6789012347"

curl -X PUT "${BASE_URL}/${REQUEST_ID}/approve" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Đồng ý cho phép nghỉ học. Nhớ học bù khi trở lại."
  }' | jq
```

### 7. Reject Leave Request (Từ chối đơn xin vắng)
```bash
# Replace REQUEST_ID with actual request ID
REQUEST_ID="675a1b2c3d4e5f6789012348"

curl -X PUT "${BASE_URL}/${REQUEST_ID}/reject" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Không thể phê duyệt vì đây là tiết kiểm tra giữa kỳ quan trọng. Vui lòng sắp xếp lại thời gian."
  }' | jq
```

### 8. Batch Process Requests (Xử lý nhiều đơn cùng lúc)
```bash
curl -X POST "${BASE_URL}/batch-process" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "requestId": "675a1b2c3d4e5f6789012347",
        "action": "approve",
        "comment": "Đồng ý cho phép nghỉ học"
      },
      {
        "requestId": "675a1b2c3d4e5f6789012348",
        "action": "reject",
        "comment": "Không thể phê duyệt vì là tiết kiểm tra"
      },
      {
        "requestId": "675a1b2c3d4e5f6789012349",
        "action": "approve",
        "comment": "OK, nhớ học bù"
      }
    ]
  }' | jq
```

### 9. Get Teacher Requests (Xem tất cả đơn đã xử lý)
```bash
# Get all requests handled by teacher
curl -X GET "${BASE_URL}/teacher-requests" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Get approved requests only
curl -X GET "${BASE_URL}/teacher-requests?status=approved" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Get rejected requests only
curl -X GET "${BASE_URL}/teacher-requests?status=rejected" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Get requests with date range and pagination
curl -X GET "${BASE_URL}/teacher-requests?startDate=2024-08-01&endDate=2024-08-31&page=1&limit=15" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

## 🔍 Common APIs

### 10. Get Request Detail (Xem chi tiết đơn)
```bash
# Replace REQUEST_ID with actual request ID
REQUEST_ID="675a1b2c3d4e5f6789012347"

# Student viewing their own request
curl -X GET "${BASE_URL}/${REQUEST_ID}" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Teacher viewing request for their lesson
curl -X GET "${BASE_URL}/${REQUEST_ID}" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Manager viewing any request
curl -X GET "${BASE_URL}/${REQUEST_ID}" \
  -H "Authorization: Bearer ${MANAGER_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

## 📊 Admin/Manager APIs

### 11. Get Statistics (Thống kê tổng quan)
```bash
# Get overall statistics
curl -X GET "${BASE_URL}/stats/overview" \
  -H "Authorization: Bearer ${MANAGER_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Get statistics by teacher
curl -X GET "${BASE_URL}/stats/overview?teacherId=68557f810672fea5865827b0" \
  -H "Authorization: Bearer ${MANAGER_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Get statistics by student
curl -X GET "${BASE_URL}/stats/overview?studentId=684d29a49a30d85d58cf0cdf" \
  -H "Authorization: Bearer ${MANAGER_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Get statistics by class
curl -X GET "${BASE_URL}/stats/overview?classId=6855825a0672fea58658281d" \
  -H "Authorization: Bearer ${MANAGER_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Get statistics by date range
curl -X GET "${BASE_URL}/stats/overview?startDate=2024-08-01&endDate=2024-08-31" \
  -H "Authorization: Bearer ${MANAGER_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Get comprehensive statistics
curl -X GET "${BASE_URL}/stats/overview?teacherId=68557f810672fea5865827b0&startDate=2024-08-01&endDate=2024-08-31" \
  -H "Authorization: Bearer ${MANAGER_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

## 🧪 Test Scenarios

### Scenario 1: Complete Student Flow
```bash
# Step 1: Get available lessons
echo "=== Step 1: Getting available lessons ==="
curl -X GET "${BASE_URL}/available-lessons?startDate=2024-08-12&endDate=2024-08-19" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Step 2: Create leave requests (use actual lesson IDs from step 1)
echo -e "\n=== Step 2: Creating leave requests ==="
curl -X POST "${BASE_URL}/create" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonIds": ["685bfa6564e5ad3189451698"],
    "phoneNumber": "0987654321",
    "reason": "Có việc gia đình đột xuất cần xin phép vắng mặt."
  }' | jq

# Step 3: Check my requests
echo -e "\n=== Step 3: Checking my requests ==="
curl -X GET "${BASE_URL}/my-requests" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

### Scenario 2: Complete Teacher Flow
```bash
# Step 1: Get pending requests
echo "=== Step 1: Getting pending requests ==="
curl -X GET "${BASE_URL}/pending" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" | jq

# Step 2: Approve a request (use actual request ID from step 1)
echo -e "\n=== Step 2: Approving a request ==="
REQUEST_ID="675a1b2c3d4e5f6789012347"
curl -X PUT "${BASE_URL}/${REQUEST_ID}/approve" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Đồng ý cho phép nghỉ học"}' | jq

# Step 3: Check all handled requests
echo -e "\n=== Step 3: Checking all handled requests ==="
curl -X GET "${BASE_URL}/teacher-requests" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

### Scenario 3: Manager Overview
```bash
# Get comprehensive statistics
echo "=== Manager Overview: Statistics ==="
curl -X GET "${BASE_URL}/stats/overview?startDate=2024-08-01&endDate=2024-12-31" \
  -H "Authorization: Bearer ${MANAGER_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

## ❌ Error Testing

### Test 1: Invalid Authentication
```bash
echo "=== Test: No token ==="
curl -X GET "${BASE_URL}/my-requests" \
  -H "Content-Type: application/json" | jq

echo -e "\n=== Test: Invalid token ==="
curl -X GET "${BASE_URL}/my-requests" \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json" | jq
```

### Test 2: Authorization Errors
```bash
echo "=== Test: Student accessing teacher endpoint ==="
curl -X GET "${BASE_URL}/pending" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" | jq

echo -e "\n=== Test: Student accessing admin endpoint ==="
curl -X GET "${BASE_URL}/stats/overview" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

### Test 3: Validation Errors
```bash
echo "=== Test: Invalid lesson IDs ==="
curl -X POST "${BASE_URL}/create" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonIds": ["invalid_id"],
    "phoneNumber": "0987654321",
    "reason": "Valid reason"
  }' | jq

echo -e "\n=== Test: Missing required fields ==="
curl -X POST "${BASE_URL}/create" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonIds": ["685bfa6564e5ad3189451698"],
    "phoneNumber": "0987654321"
  }' | jq

echo -e "\n=== Test: Invalid phone number ==="
curl -X POST "${BASE_URL}/create" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonIds": ["685bfa6564e5ad3189451698"],
    "phoneNumber": "invalid_phone",
    "reason": "Valid reason here"
  }' | jq

echo -e "\n=== Test: Reason too short ==="
curl -X POST "${BASE_URL}/create" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonIds": ["685bfa6564e5ad3189451698"],
    "phoneNumber": "0987654321",
    "reason": "Short"
  }' | jq

echo -e "\n=== Test: Reject without comment ==="
curl -X PUT "${BASE_URL}/675a1b2c3d4e5f6789012347/reject" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}' | jq

echo -e "\n=== Test: Invalid date range ==="
curl -X GET "${BASE_URL}/available-lessons?startDate=2024-08-19&endDate=2024-08-12" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

## 🚀 Quick Test Script

Save this as `test-leave-requests.sh`:

```bash
#!/bin/bash

# Set tokens
STUDENT_TOKEN="your_student_token_here"
TEACHER_TOKEN="your_teacher_token_here"
MANAGER_TOKEN="your_manager_token_here"
BASE_URL="http://localhost:3000/api/leave-requests"

echo "🚀 Testing Leave Request System..."

# Test 1: Get available lessons
echo -e "\n📅 Test 1: Get available lessons"
curl -s -X GET "${BASE_URL}/available-lessons?startDate=2024-08-12&endDate=2024-08-19" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" | jq -r '.success'

# Test 2: Create leave request
echo -e "\n📝 Test 2: Create leave request"
curl -s -X POST "${BASE_URL}/create" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonIds": ["685bfa6564e5ad3189451698"],
    "phoneNumber": "0987654321",
    "reason": "Test leave request from curl script"
  }' | jq -r '.success'

# Test 3: Get my requests
echo -e "\n📊 Test 3: Get my requests"
curl -s -X GET "${BASE_URL}/my-requests" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" | jq -r '.success'

# Test 4: Get pending requests (teacher)
echo -e "\n👨‍🏫 Test 4: Get pending requests"
curl -s -X GET "${BASE_URL}/pending" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" | jq -r '.success'

# Test 5: Get statistics (manager)
echo -e "\n📈 Test 5: Get statistics"
curl -s -X GET "${BASE_URL}/stats/overview" \
  -H "Authorization: Bearer ${MANAGER_TOKEN}" | jq -r '.success'

echo -e "\n✅ All tests completed!"
```

## 📋 Notes

1. **Replace tokens**: Update the tokens with your actual authentication tokens
2. **Replace IDs**: Use actual lesson IDs and request IDs from your database
3. **Check server**: Make sure your server is running on `http://localhost:3000`
4. **Install jq**: For pretty JSON formatting: `sudo apt-get install jq` (Linux) or `brew install jq` (Mac)
5. **Date formats**: Use ISO date format (YYYY-MM-DD) for date parameters

## 🔧 Troubleshooting

### Common Issues:
1. **401 Unauthorized**: Check if token is valid and not expired
2. **403 Forbidden**: Check if user role has permission for the endpoint
3. **404 Not Found**: Check if lesson ID or request ID exists
4. **400 Bad Request**: Check request body format and required fields
5. **500 Server Error**: Check server logs for detailed error information

### Debug Commands:
```bash
# Check server health
curl -X GET "http://localhost:3000/api/health" | jq

# Check if leave-requests routes are loaded
curl -X GET "http://localhost:3000/api/leave-requests/my-requests" \
  -H "Authorization: Bearer invalid_token" | jq
# Should return 401, not 404 (which means route exists)
``` 