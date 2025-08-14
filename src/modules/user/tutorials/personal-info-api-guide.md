# API Cập Nhật Thông Tin Cá Nhân

## Tổng quan

API này cho phép user cập nhật thông tin cá nhân của chính mình. Tất cả các role (student, teacher, manager, admin, parent) đều có thể sử dụng API này để cập nhật các thông tin cá nhân cơ bản.

## Endpoint

```
PUT /api/users/personal-info
```

## Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

## Request Body

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|--------|--------------|----------|-------|
| name | String | Không | Tên người dùng (2-100 ký tự) |
| dateOfBirth | String (YYYY-MM-DD) | Không | Ngày sinh (tuổi từ 5-80) |
| gender | String | Không | Giới tính ('male', 'female', 'other') |
| phone | String | Không | Số điện thoại (10-15 ký tự) |
| address | String | Không | Địa chỉ (tối đa 500 ký tự) |

## Response

### Success (200)

```json
{
  "success": true,
  "message": "Cập nhật thông tin cá nhân thành công",
  "data": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "email": "user@example.com",
    "name": "Nguyễn Văn A",
    "role": ["student"],
    "roleInfo": {
      "type": "student",
      "role": ["student"]
    },
    "dateOfBirth": "2005-01-15T00:00:00.000Z",
    "gender": "male",
    "phone": "0123456789",
    "address": "123 Đường ABC, Quận 1, TP.HCM",
    "subject": null,
    "class": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
      "className": "10A1"
    },
    "school": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b5",
      "schoolName": "Trường THPT ABC"
    },
    "isNewUser": false,
    "active": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error (400) - Validation Error

```json
{
  "success": false,
  "errors": [
    {
      "type": "field",
      "value": "123",
      "msg": "Số điện thoại phải có từ 10 đến 15 ký tự",
      "path": "phone",
      "location": "body"
    }
  ]
}
```

### Error (401) - Unauthorized

```json
{
  "success": false,
  "message": "No token provided"
}
```

### Error (404) - User Not Found

```json
{
  "success": false,
  "message": "User not found"
}
```

## Ví dụ sử dụng

### cURL

```bash
curl -X PUT \
  http://localhost:3000/api/users/personal-info \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "phone": "0123456789",
    "address": "123 Đường ABC, Quận 1, TP.HCM"
  }'
```

### JavaScript (Fetch)

```javascript
const updatePersonalInfo = async (data) => {
  try {
    const response = await fetch('/api/users/personal-info', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Cập nhật thành công:', result.data);
    } else {
      console.error('Lỗi:', result.message);
    }
  } catch (error) {
    console.error('Lỗi kết nối:', error);
  }
};

// Sử dụng
updatePersonalInfo({
  phone: "0123456789",
  address: "123 Đường ABC, Quận 1, TP.HCM"
});
```

### React Native (Axios)

```javascript
import axios from 'axios';

const updatePersonalInfo = async (data) => {
  try {
    const response = await axios.put('/api/users/personal-info', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('Cập nhật thành công:', response.data.data);
      return response.data.data;
    }
  } catch (error) {
    if (error.response) {
      console.error('Lỗi validation:', error.response.data);
    } else {
      console.error('Lỗi kết nối:', error.message);
    }
    throw error;
  }
};
```

## Lưu ý

1. **Bảo mật**: API này chỉ cho phép user cập nhật thông tin cá nhân của chính mình (dựa trên token authentication).

2. **Validation**: Chỉ các trường được phép update mới được validate:
   - `phone`: 10-15 ký tự, chỉ chứa số, dấu cách, dấu gạch ngang và dấu ngoặc
   - `address`: Tối đa 500 ký tự

3. **Trường được phép update**: Chỉ các trường `phone` và `address` được phép cập nhật. Các trường khác sẽ bị bỏ qua hoặc trả về lỗi.

4. **Response format**: Response trả về đầy đủ thông tin user sau khi cập nhật, bao gồm cả các thông tin liên quan (subject, class, school).

5. **Error handling**: API trả về các mã lỗi phù hợp với từng trường hợp:
   - 400: Lỗi validation
   - 401: Chưa đăng nhập hoặc token không hợp lệ
   - 404: Không tìm thấy user
   - 500: Lỗi server 