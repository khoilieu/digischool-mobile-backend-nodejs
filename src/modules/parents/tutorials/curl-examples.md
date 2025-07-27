# CURL Examples - Module Phụ Huynh

## Chuẩn bị

Thay thế các giá trị sau trong các lệnh curl:
- `YOUR_JWT_TOKEN`: Token JWT của phụ huynh
- `CHILD_ID`: ID của con
- `ACADEMIC_YEAR`: Năm học (ví dụ: "2024-2025")
- `START_OF_WEEK`: Ngày bắt đầu tuần (định dạng: YYYY-MM-DD)
- `END_OF_WEEK`: Ngày kết thúc tuần (định dạng: YYYY-MM-DD)

## 1. Lấy danh sách con của phụ huynh

```bash
curl -X GET "http://localhost:3000/api/parents/children" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response thành công:**
```json
{
  "success": true,
  "message": "Lấy danh sách con thành công",
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Nguyễn Văn A",
      "studentId": "HS001",
      "email": "student@example.com",
      "dateOfBirth": "2010-01-01T00:00:00.000Z",
      "gender": "male",
      "class_id": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "className": "10A1",
        "gradeLevel": "10",
        "academicYear": "2024-2025",
        "homeroomTeacher": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
          "name": "Cô Nguyễn Thị B",
          "email": "teacher@example.com"
        }
      }
    }
  ]
}
```

## 2. Xem thời khóa biểu của con

```bash
curl -X GET "http://localhost:3000/api/parents/children/CHILD_ID/schedule?academicYear=ACADEMIC_YEAR&startOfWeek=START_OF_WEEK&endOfWeek=END_OF_WEEK" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Ví dụ cụ thể:**
```bash
curl -X GET "http://localhost:3000/api/parents/children/64f8a1b2c3d4e5f6a7b8c9d0/schedule?academicYear=2024-2025&startOfWeek=2024-01-15&endOfWeek=2024-01-21" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response thành công:**
```json
{
  "success": true,
  "message": "Lấy thời khóa biểu thành công",
  "data": {
    "child": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Nguyễn Văn A",
      "studentId": "HS001",
      "class": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "className": "10A1",
        "gradeLevel": "10",
        "academicYear": "2024-2025"
      }
    },
    "schedule": {
      "weeklySchedule": {
        "lessons": [
          {
            "subject": "Toán",
            "teacher": "Cô Nguyễn Thị B",
            "timeSlot": {
              "period": 1,
              "startTime": "07:00",
              "endTime": "07:45"
            },
            "scheduledDate": "2024-01-15T00:00:00.000Z",
            "type": "lesson"
          }
        ]
      }
    }
  }
}
```

## 3. Gửi góp ý cho hệ thống

### Gửi góp ý với rating 5 sao
```bash
curl -X POST "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "description": "Hệ thống rất tuyệt vời! Con tôi rất thích sử dụng và tôi cũng thấy rất tiện lợi. Giao diện đẹp, dễ sử dụng và thông tin được cập nhật thường xuyên."
  }'
```

### Gửi góp ý với rating 4 sao
```bash
curl -X POST "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "description": "Hệ thống rất tốt, giao diện dễ sử dụng. Tuy nhiên cần cải thiện tốc độ tải trang và thêm tính năng thông báo real-time cho phụ huynh."
  }'
```

### Gửi góp ý với rating 3 sao
```bash
curl -X POST "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 3,
    "description": "Hệ thống có thể sử dụng được nhưng cần cải thiện nhiều điểm. Tốc độ tải trang chậm, đôi khi bị lỗi khi xem thời khóa biểu."
  }'
```

**Response thành công:**
```json
{
  "success": true,
  "message": "Góp ý đã được gửi thành công",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d8",
    "user": "64f8a1b2c3d4e5f6a7b8c9d9",
    "rating": 4,
    "description": "Hệ thống rất tốt, giao diện dễ sử dụng. Tuy nhiên cần cải thiện tốc độ tải trang và thêm tính năng thông báo real-time cho phụ huynh.",
    "status": "pending",
    "adminResponse": null,
    "respondedBy": null,
    "respondedAt": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## 4. Lấy danh sách góp ý của phụ huynh

### Lấy trang đầu tiên (mặc định 10 items)
```bash
curl -X GET "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Lấy trang cụ thể với số lượng tùy chỉnh
```bash
curl -X GET "http://localhost:3000/api/parents/feedback?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response thành công:**
```json
{
  "success": true,
  "message": "Lấy danh sách góp ý thành công",
  "data": {
    "feedbacks": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d8",
        "rating": 4,
        "description": "Hệ thống rất tốt, giao diện dễ sử dụng...",
        "status": "pending",
        "adminResponse": null,
        "respondedBy": null,
        "respondedAt": null,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

## Test các trường hợp lỗi

### 1. Không có token (401 Unauthorized)
```bash
curl -X GET "http://localhost:3000/api/parents/children" \
  -H "Content-Type: application/json"
```

### 2. Token không hợp lệ (401 Unauthorized)
```bash
curl -X GET "http://localhost:3000/api/parents/children" \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json"
```

### 3. Validation error - Rating không hợp lệ (400 Bad Request)
```bash
curl -X POST "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 6,
    "description": "Test description"
  }'
```

### 4. Validation error - Description quá ngắn (400 Bad Request)
```bash
curl -X POST "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "description": "Test"
  }'
```

### 5. Thiếu tham số bắt buộc (400 Bad Request)
```bash
curl -X GET "http://localhost:3000/api/parents/children/CHILD_ID/schedule?academicYear=2024-2025" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Script test tự động

Tạo file `test_parent_api.sh`:

```bash
#!/bin/bash

# Cấu hình
BASE_URL="http://localhost:3000"
TOKEN="YOUR_JWT_TOKEN"
CHILD_ID="CHILD_ID"
ACADEMIC_YEAR="2024-2025"
START_OF_WEEK="2024-01-15"
END_OF_WEEK="2024-01-21"

echo "🧪 Testing Parent API Module..."

# Test 1: Lấy danh sách con
echo "📋 Test 1: Lấy danh sách con"
curl -s -X GET "$BASE_URL/api/parents/children" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n"

# Test 2: Xem thời khóa biểu của con
echo "📅 Test 2: Xem thời khóa biểu của con"
curl -s -X GET "$BASE_URL/api/parents/children/$CHILD_ID/schedule?academicYear=$ACADEMIC_YEAR&startOfWeek=$START_OF_WEEK&endOfWeek=$END_OF_WEEK" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n"

# Test 3: Gửi feedback
echo "💬 Test 3: Gửi feedback"
curl -s -X POST "$BASE_URL/api/parents/feedback" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "description": "Hệ thống rất tuyệt vời! Con tôi rất thích sử dụng và tôi cũng thấy rất tiện lợi."
  }' | jq '.'

echo -e "\n"

# Test 4: Lấy danh sách feedback
echo "📝 Test 4: Lấy danh sách feedback"
curl -s -X GET "$BASE_URL/api/parents/feedback?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n✅ Testing completed!"
```

**Chạy script:**
```bash
chmod +x test_parent_api.sh
./test_parent_api.sh
```

## Lưu ý

1. **Cài đặt jq** để format JSON output:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install jq
   
   # macOS
   brew install jq
   
   # Windows (với Chocolatey)
   choco install jq
   ```

2. **Thay thế các giá trị** trong script trước khi chạy:
   - `YOUR_JWT_TOKEN`: Token JWT thực tế
   - `CHILD_ID`: ID con thực tế
   - `ACADEMIC_YEAR`: Năm học hiện tại
   - `START_OF_WEEK`: Ngày bắt đầu tuần (YYYY-MM-DD)
   - `END_OF_WEEK`: Ngày kết thúc tuần (YYYY-MM-DD)

3. **Kiểm tra server** đang chạy trên `localhost:3000` trước khi test

4. **Logs** sẽ hiển thị trong console của server để debug nếu có lỗi 