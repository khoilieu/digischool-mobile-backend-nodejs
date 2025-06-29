# API Lấy Thông Tin User Hiện Tại

## Mô Tả
API này cho phép lấy thông tin đầy đủ của user hiện tại dựa trên token. Hỗ trợ tất cả các loại user: student, teacher, manager.

## Endpoint
```
GET /api/auth/me
```

## Headers
```
Authorization: Bearer YOUR_TOKEN
```

## Response

### Thành Công (200)
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "Tên User",
    "role": ["student"],
    "phone": "0123456789",
    "address": "Địa chỉ",
    "dateOfBirth": "1990-01-01T00:00:00.000Z",
    "gender": "male",
    "avatar": "avatar_url",
    "studentId": "SV001",
    "teacherId": null,
    "managerId": null,
    "isNewUser": false,
    "active": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    
    "class": {
      "id": "class_id",
      "className": "12A1",
      "classCode": "12A1",
      "description": "Lớp 12A1"
    },
    
    "subjects": [],
    
    "roleInfo": {
      "role": ["student"],
      "type": "student",
      "studentId": "SV001",
      "classId": "class_id",
      "permissions": [
        "view_schedule",
        "view_grades",
        "submit_assignments",
        "view_announcements"
      ]
    }
  }
}
```

### Lỗi (401)
```json
{
  "success": false,
  "message": "Invalid token"
}
```

## Ví Dụ cURL

### Cơ Bản
```bash
curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Với Token Thực Tế
```bash
export TOKEN="your_actual_token_here"

curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Lưu Response Vào File
```bash
curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -o user_info.json
```

### Chỉ Lấy Thông Tin Cần Thiết
```bash
curl -s -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.data | {id, name, email, role, class, subjects}'
```

## Response Theo Role

### Student
- **Thông tin cá nhân**: name, email, studentId
- **Lớp học**: class information với className, classCode
- **Permissions**: view_schedule, view_grades, submit_assignments

### Teacher  
- **Thông tin cá nhân**: name, email, teacherId
- **Môn dạy**: subjects array với đầy đủ thông tin môn học
- **Permissions**: manage_lessons, create_reminders, grade_students

### Manager
- **Thông tin cá nhân**: name, email, managerId  
- **Quyền hạn**: Full system permissions
- **Permissions**: manage_users, manage_classes, system_admin

## Workflow Test

### Bước 1: Login để lấy token
```bash
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
echo "Token: $TOKEN"
```

### Bước 2: Lấy thông tin user
```bash
curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Bước 3: Kiểm tra role và permissions
```bash
USER_INFO=$(curl -s -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

ROLE=$(echo $USER_INFO | jq -r '.data.roleInfo.type')
PERMISSIONS=$(echo $USER_INFO | jq -r '.data.roleInfo.permissions[]')

echo "User Role: $ROLE"
echo "Permissions: $PERMISSIONS"
```

## Error Handling

### Token Không Hợp Lệ
```bash
curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer invalid_token"

# Response:
# {
#   "success": false,
#   "message": "Invalid token"
# }
```

### Token Hết Hạn
```bash
curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer expired_token"

# Response:
# {
#   "success": false,
#   "message": "Token expired"
# }
```

### Không Có Token
```bash
curl -X GET "http://localhost:3000/api/auth/me"

# Response:
# {
#   "success": false,
#   "message": "No token provided"
# }
```

## Sử Dụng Trong Frontend

### JavaScript/Fetch
```javascript
const getCurrentUser = async () => {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('User Info:', data.data);
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error getting user info:', error);
    throw error;
  }
};
```

### Axios
```javascript
const axios = require('axios');

const getCurrentUser = async (token) => {
  try {
    const response = await axios.get('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Error:', error.response?.data?.message || error.message);
    throw error;
  }
};
```

## Lưu Ý

1. **Token Required**: API này yêu cầu token hợp lệ
2. **Role-based Data**: Thông tin trả về khác nhau tùy theo role
3. **Populated Data**: Class và subjects được populate đầy đủ
4. **Permissions**: Mỗi role có danh sách permissions riêng
5. **Security**: Không trả về password và sensitive data
6. **Cache**: Có thể cache thông tin user để giảm số lần gọi API

## Use Cases

1. **Profile Page**: Hiển thị thông tin cá nhân
2. **Authorization**: Kiểm tra permissions
3. **Navigation**: Hiển thị menu theo role
4. **Dashboard**: Personalized content
5. **Settings**: User preferences 