# cURL Đơn Giản - API Thông Tin User Hiện Tại

## Endpoint
```
GET /api/auth/me
```

## Cách Sử Dụng Cơ Bản

### 1. Lấy thông tin user
```bash
curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Với biến môi trường
```bash
export TOKEN="your_actual_token_here"

curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Workflow hoàn chỉnh
```bash
# Bước 1: Login
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }')

# Bước 2: Lấy token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
echo "Token: $TOKEN"

# Bước 3: Lấy thông tin user
curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

## Response Ví Dụ

### Student Response
```json
{
  "success": true,
  "data": {
    "id": "student_id",
    "email": "student@example.com",
    "name": "Nguyễn Văn A",
    "role": ["student"],
    "studentId": "SV001",
    "class": {
      "id": "class_id",
      "className": "12A1",
      "classCode": "12A1"
    },
    "subjects": [],
    "roleInfo": {
      "type": "student",
      "permissions": ["view_schedule", "view_grades"]
    }
  }
}
```

### Teacher Response
```json
{
  "success": true,
  "data": {
    "id": "teacher_id",
    "email": "teacher@example.com", 
    "name": "Cô Nguyễn Thị B",
    "role": ["teacher"],
    "teacherId": "GV001",
    "class": null,
    "subjects": [
      {
        "id": "subject_id",
        "subjectName": "Toán học",
        "subjectCode": "MATH"
      }
    ],
    "roleInfo": {
      "type": "teacher",
      "permissions": ["manage_lessons", "create_reminders"]
    }
  }
}
```

## Test Nhanh

### Kiểm tra role
```bash
curl -s -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.data.roleInfo.type'
```

### Lấy permissions
```bash
curl -s -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.data.roleInfo.permissions'
```

### Chỉ lấy thông tin cơ bản
```bash
curl -s -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.data | {name, email, role, class, subjects}'
```

## Error Cases

### Token không hợp lệ
```bash
curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer invalid_token"

# Response: {"success": false, "message": "Invalid token"}
```

### Không có token
```bash
curl -X GET "http://localhost:3000/api/auth/me"

# Response: {"success": false, "message": "No token provided"}
```

## Lưu Ý

1. **Bắt buộc**: Cần token hợp lệ trong header Authorization
2. **Format**: Bearer TOKEN_HERE
3. **Response**: Khác nhau tùy theo role (student/teacher/manager)
4. **Security**: Không trả về password hay thông tin nhạy cảm
5. **Populate**: Class và subjects được populate đầy đủ thông tin 