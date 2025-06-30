# Teacher Leave Request API - cURL Commands

## Prerequisites
1. Server đang chạy trên localhost:3000
2. Có token của teacher và manager
3. Có lesson IDs hợp lệ

## Authentication

### 1. Login as Teacher
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }'
```

### 2. Login as Manager
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@example.com",
    "password": "password123"
  }'
```

## Teacher Commands

### 1. Lấy các tiết có thể xin nghỉ
```bash
curl -X GET "http://localhost:3000/api/teacher-leave-requests/available-lessons?startDate=2024-12-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

### 2. Tạo đơn xin nghỉ (nhiều tiết)
```bash
curl -X POST http://localhost:3000/api/teacher-leave-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN" \
  -d '{
    "lessonIds": [
      "LESSON_ID_1_FROM_AVAILABLE_LESSONS",
      "LESSON_ID_2_FROM_AVAILABLE_LESSONS",
      "LESSON_ID_3_FROM_AVAILABLE_LESSONS"
    ],
    "reason": "Có việc gia đình khẩn cấp cần xử lý, không thể có mặt trong các tiết dạy này",
    "emergencyContact": {
      "phone": "0123456789",
      "relationship": "Vợ"
    }
  }'
```

### 2.1. Tạo đơn xin nghỉ cho một tiết (single lesson)
```bash
curl -X POST http://localhost:3000/api/teacher-leave-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN" \
  -d '{
    "lessonIds": ["SINGLE_LESSON_ID"],
    "reason": "Có việc gia đình khẩn cấp cần xử lý, không thể có mặt trong tiết dạy này",
    "emergencyContact": {
      "phone": "0123456789",
      "relationship": "Vợ"
    }
  }'
```

### 3. Lấy danh sách đơn xin nghỉ của mình
```bash
# Tất cả đơn
curl -X GET "http://localhost:3000/api/teacher-leave-requests/my-requests" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"

# Chỉ đơn pending
curl -X GET "http://localhost:3000/api/teacher-leave-requests/my-requests?status=pending" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"

# Với phân trang
curl -X GET "http://localhost:3000/api/teacher-leave-requests/my-requests?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"

# Theo khoảng thời gian
curl -X GET "http://localhost:3000/api/teacher-leave-requests/my-requests?startDate=2024-12-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

### 4. Xem chi tiết đơn xin nghỉ
```bash
curl -X GET "http://localhost:3000/api/teacher-leave-requests/REQUEST_ID" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

### 5. Xóa đơn xin nghỉ (chỉ khi pending)
```bash
curl -X DELETE "http://localhost:3000/api/teacher-leave-requests/REQUEST_ID" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

## Manager Commands

### 1. Lấy danh sách đơn cần duyệt
```bash
# Tất cả đơn pending
curl -X GET "http://localhost:3000/api/teacher-leave-requests/pending/all" \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN"

# Với phân trang
curl -X GET "http://localhost:3000/api/teacher-leave-requests/pending/all?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN"

# Theo khoảng thời gian
curl -X GET "http://localhost:3000/api/teacher-leave-requests/pending/all?startDate=2024-12-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN"
```

### 2. Duyệt đơn xin nghỉ
```bash
# Approve không comment
curl -X POST "http://localhost:3000/api/teacher-leave-requests/REQUEST_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -d '{}'

# Approve với comment
curl -X POST "http://localhost:3000/api/teacher-leave-requests/REQUEST_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -d '{
    "comment": "Đồng ý cho nghỉ vì lý do chính đáng. Vui lòng sắp xếp bài học bù."
  }'
```

### 3. Từ chối đơn xin nghỉ
```bash
curl -X POST "http://localhost:3000/api/teacher-leave-requests/REQUEST_ID/reject" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -d '{
    "comment": "Không thể nghỉ vì gần kỳ thi quan trọng và không có giáo viên thay thế."
  }'
```

## Complete Workflow Example

### Step 1: Teacher logs in
```bash
TEACHER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "teacher@example.com", "password": "password123"}' | \
  jq -r '.data.token')

echo "Teacher Token: $TEACHER_TOKEN"
```

### Step 2: Teacher gets available lessons
```bash
curl -X GET "http://localhost:3000/api/teacher-leave-requests/available-lessons?startDate=2024-12-01&endDate=2024-12-31" \
  -H "Authorization: Bearer $TEACHER_TOKEN" | jq '.'
```

### Step 3: Teacher creates leave request
```bash
# Use lesson IDs from step 2 (can be single or multiple)
LESSON_ID_1="YOUR_LESSON_ID_1_HERE"
LESSON_ID_2="YOUR_LESSON_ID_2_HERE"

LEAVE_REQUEST=$(curl -s -X POST http://localhost:3000/api/teacher-leave-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d "{
    \"lessonIds\": [\"$LESSON_ID_1\", \"$LESSON_ID_2\"],
    \"reason\": \"Có việc gia đình khẩn cấp cần xử lý, không thể có mặt trong các tiết dạy này\",
    \"emergencyContact\": {
      \"phone\": \"0123456789\",
      \"relationship\": \"Vợ\"
    }
  }")

echo "Leave Request Created:"
echo $LEAVE_REQUEST | jq '.'

# Get first request ID for further testing
REQUEST_ID=$(echo $LEAVE_REQUEST | jq -r '.data.created[0]._id')
echo "First Request ID: $REQUEST_ID"
```

### Step 4: Manager logs in
```bash
MANAGER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "manager@example.com", "password": "password123"}' | \
  jq -r '.data.token')

echo "Manager Token: $MANAGER_TOKEN"
```

### Step 5: Manager views pending requests
```bash
curl -X GET "http://localhost:3000/api/teacher-leave-requests/pending/all" \
  -H "Authorization: Bearer $MANAGER_TOKEN" | jq '.'
```

### Step 6: Manager approves the request
```bash
curl -X POST "http://localhost:3000/api/teacher-leave-requests/$REQUEST_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -d '{
    "comment": "Đồng ý cho nghỉ vì lý do chính đáng. Vui lòng sắp xếp bài học bù."
  }' | jq '.'
```

### Step 7: Teacher checks request status
```bash
curl -X GET "http://localhost:3000/api/teacher-leave-requests/$REQUEST_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN" | jq '.'
```

## Error Testing

### 1. Test validation errors
```bash
# Missing required fields
curl -X POST http://localhost:3000/api/teacher-leave-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{
    "reason": "Short"
  }'

# Empty lesson IDs array
curl -X POST http://localhost:3000/api/teacher-leave-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{
    "lessonIds": [],
    "reason": "Valid reason with more than 10 characters",
    "emergencyContact": {
      "phone": "0123456789"
    }
  }'

# Too many lesson IDs (over 10)
curl -X POST http://localhost:3000/api/teacher-leave-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{
    "lessonIds": ["id1","id2","id3","id4","id5","id6","id7","id8","id9","id10","id11"],
    "reason": "Valid reason with more than 10 characters",
    "emergencyContact": {
      "phone": "0123456789"
    }
  }'

# Invalid lesson ID
curl -X POST http://localhost:3000/api/teacher-leave-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{
    "lessonIds": ["invalid_id"],
    "reason": "Valid reason with more than 10 characters",
    "emergencyContact": {
      "phone": "0123456789"
    }
  }'
```

### 2. Test authorization errors
```bash
# Try to approve with teacher token
curl -X POST "http://localhost:3000/api/teacher-leave-requests/$REQUEST_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{}'

# Try to delete someone else's request
curl -X DELETE "http://localhost:3000/api/teacher-leave-requests/SOMEONE_ELSE_REQUEST_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### 3. Test business logic errors
```bash
# Try to create duplicate request
curl -X POST http://localhost:3000/api/teacher-leave-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d "{
    \"lessonIds\": [\"$LESSON_ID_1\"],
    \"reason\": \"Another reason for the same lesson\",
    \"emergencyContact\": {
      \"phone\": \"0123456789\"
    }
  }"

# Try to request leave for non-scheduled lesson (e.g., completed, cancelled, absent)
curl -X POST http://localhost:3000/api/teacher-leave-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{
    "lessonIds": ["LESSON_ID_WITH_NON_SCHEDULED_STATUS"],
    "reason": "Trying to request leave for completed lesson",
    "emergencyContact": {
      "phone": "0123456789"
    }
  }'

# Try to reject without comment
curl -X POST "http://localhost:3000/api/teacher-leave-requests/$REQUEST_ID/reject" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -d '{}'
```

## Response Examples

### Successful Creation (Multiple Lessons)
```json
{
  "success": true,
  "message": "Successfully created 2 teacher leave requests and notifications sent to managers",
  "data": {
    "success": true,
    "created": [
      {
        "_id": "675a1b2c3d4e5f6789012346",
        "teacherId": "675a1b2c3d4e5f6789012347",
        "lessonId": {
          "_id": "675a1b2c3d4e5f6789012345",
          "lessonId": "LESSON_001",
          "type": "regular",
          "topic": "Chương 1: Giới thiệu"
        },
        "status": "pending",
        "reason": "Có việc gia đình khẩn cấp cần xử lý",
        "emergencyContact": {
          "phone": "0123456789",
          "relationship": "Vợ"
        },
        "createdAt": "2024-01-10T10:30:00.000Z"
      },
      {
        "_id": "675a1b2c3d4e5f6789012348",
        "teacherId": "675a1b2c3d4e5f6789012347",
        "lessonId": {
          "_id": "675a1b2c3d4e5f6789012347",
          "lessonId": "LESSON_002",
          "type": "regular",
          "topic": "Chương 2: Phát triển"
        },
        "status": "pending",
        "reason": "Có việc gia đình khẩn cấp cần xử lý",
        "emergencyContact": {
          "phone": "0123456789",
          "relationship": "Vợ"
        },
        "createdAt": "2024-01-10T10:30:00.000Z"
      }
    ],
    "errors": [],
    "summary": {
      "totalRequested": 2,
      "created": 2,
      "failed": 0
    }
  }
}
```

### Successful Approval
```json
{
  "success": true,
  "message": "Teacher leave request approved successfully. Notifications sent to teacher and students.",
  "data": {
    "_id": "675a1b2c3d4e5f6789012346",
    "status": "approved",
    "managerComment": "Đồng ý cho nghỉ vì lý do chính đáng",
    "processedAt": "2024-01-10T14:30:00.000Z"
  }
}
```

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "reason",
      "message": "Reason must be between 10-500 characters",
      "value": "Short"
    }
  ]
}
```

### Authorization Error
```json
{
  "success": false,
  "message": "You can only request leave for lessons you are teaching"
}
```

## Notes
- Replace `YOUR_TEACHER_TOKEN`, `YOUR_MANAGER_TOKEN`, `REQUEST_ID`, and `LESSON_ID` with actual values
- All timestamps are in ISO format
- Email notifications are sent asynchronously
- Check server logs for email sending status 