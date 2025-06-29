# Forgot Password API Guide

## Tổng quan
API Forgot Password cho phép người dùng reset mật khẩu thông qua email. Hệ thống sẽ gửi một mật khẩu tạm thời phức tạp (1pwd) có hiệu lực 15 phút đến email được yêu cầu.

## Flow hoạt động
1. User nhập email và gọi API forgot-password
2. Hệ thống gửi mật khẩu tạm thời phức tạp (12 ký tự) đến email đó (không kiểm tra email có tồn tại hay không)
3. User sử dụng mật khẩu tạm thời đó để đăng nhập (thay vì password)
4. Sau khi đăng nhập thành công, user được redirect đến trang set-password
5. User sử dụng API `/api/auth/set-password` (giống flow tạo user mới) để đặt mật khẩu mới

## API Endpoints

### 1. Forgot Password - Gửi mã reset
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response Success:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Reset password email has been sent",
    "email": "user@example.com"
  }
}
```

**Response Error:**
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Please enter a valid email",
      "param": "email"
    }
  ]
}
```

### 2. Login với One-Time Password (1pwd)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "A3b#kL9@xM2z"
}
```

**Response Success:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "role": ["manager"],
      "isNewUser": true
    },
    "tempToken": "jwt_token_here",
    "loginType": "reset_token",
    "redirectTo": "set-password"
  }
}
```

### 3. Set Password - Đặt mật khẩu mới (sử dụng API hiện có)
```http
POST /api/auth/set-password
Content-Type: application/json

{
  "tempToken": "jwt_token_from_login_response",
  "password": "new_password_123",
  "confirmPassword": "new_password_123"
}
```

**Response Success:**
```json
{
  "success": true,
  "data": {
    "message": "Password set successfully",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "role": ["manager"],
      "isNewUser": false
    },
    "token": "new_jwt_token",
    "redirectTo": "home"
  }
}
```

## Cấu hình Email

Để sử dụng chức năng gửi email, cần cấu hình các biến môi trường sau trong file `.env`:

```env
# Email Configuration (sử dụng Gmail - cấu hình giống create user)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=EcoSchool <noreply@ecoschool.com>

# Hoặc sử dụng SMTP tùy chỉnh
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Cấu hình Gmail
1. Bật 2-Factor Authentication cho Gmail
2. Tạo App Password: Google Account → Security → 2-Step Verification → App passwords
3. Sử dụng App Password làm `SMTP_PASS`

## Ví dụ sử dụng với cURL

### 1. Gửi yêu cầu forgot password
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

### 2. Login với mã reset (giả sử nhận được mã 123456)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456"
  }'
```

### 3. Đặt mật khẩu mới
```bash
curl -X POST http://localhost:3000/api/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "tempToken": "YOUR_TEMP_TOKEN_FROM_LOGIN",
    "password": "newpassword123",
    "confirmPassword": "newpassword123"
  }'
```

## Lưu ý quan trọng

### Bảo mật
- Mật khẩu tạm thời có hiệu lực **15 phút**
- Mật khẩu được hash và lưu trữ an toàn
- Mật khẩu tạm thời có 12 ký tự với chữ hoa, chữ thường, số và ký tự đặc biệt
- Sau khi đặt mật khẩu mới, mật khẩu tạm thời sẽ bị xóa

### Xử lý lỗi
- Nếu email không hợp lệ: trả về lỗi validation
- Nếu mã reset hết hạn: trả về "Invalid or expired reset token"
- Nếu mã reset không đúng: trả về "Invalid or expired reset token"

### Tính năng đặc biệt
- **Không kiểm tra email tồn tại**: Theo yêu cầu, hệ thống sẽ gửi mã reset cho bất kỳ email nào
- **Tự động tạo user**: Nếu email chưa tồn tại, hệ thống sẽ tạo user tạm thời
- **Tích hợp với login hiện tại**: API login đã được cập nhật để hỗ trợ cả password thường và reset token
- **Sử dụng flow set-password**: Sau khi login với 1pwd, sử dụng API `/api/auth/set-password` giống như tạo user mới

## Testing

### Test gửi email
```javascript
// Test email service
const emailService = require('./src/modules/auth/services/email.service');

async function testEmail() {
  try {
    await emailService.testConnection();
    await emailService.sendResetPasswordEmail('test@example.com', '123456');
    console.log('Email test successful!');
  } catch (error) {
    console.error('Email test failed:', error);
  }
}

testEmail();
```

### Test flow hoàn chỉnh
1. Gọi `/api/auth/forgot-password` với email
2. Kiểm tra email nhận được mật khẩu tạm thời phức tạp (12 ký tự)
3. Gọi `/api/auth/login` với email và mật khẩu tạm thời (nhận được tempToken)
4. Sử dụng tempToken để gọi `/api/auth/set-password`
5. Verify mật khẩu mới bằng cách login bình thường

## Troubleshooting

### Lỗi gửi email
- Kiểm tra cấu hình EMAIL_USER và EMAIL_PASS trong `.env`
- Verify Gmail App Password (nếu sử dụng Gmail)
- Kiểm tra firewall/network restrictions
- Đảm bảo sử dụng cùng cấu hình với create user

### Lỗi token hết hạn
- Mã reset chỉ có hiệu lực 15 phút
- Yêu cầu forgot password mới nếu hết hạn

### Lỗi validation
- Email phải đúng định dạng
- Password phải ít nhất 6 ký tự
- confirmPassword phải trùng với password 