# Forgot Password CURL Commands

## 1. Gửi yêu cầu Forgot Password

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Reset password email has been sent",
    "email": "test@example.com"
  }
}
```

## 2. Login với One-Time Password (1pwd)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "A3b#kL9@xM2z"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "675a1234567890abcdef1234",
      "email": "test@example.com",
      "name": "test",
      "role": ["manager"],
      "isNewUser": true
    },
    "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "loginType": "reset_token",
    "redirectTo": "set-password"
  }
}
```

## 3. Set Password (Đặt mật khẩu mới)

```bash
curl -X POST http://localhost:3000/api/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "password": "newpassword123",
    "confirmPassword": "newpassword123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password set successfully",
    "user": {
      "id": "675a1234567890abcdef1234",
      "email": "test@example.com",
      "name": "test",
      "role": ["manager"],
      "isNewUser": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "redirectTo": "home"
  }
}
```

## 4. Verify Login với mật khẩu mới

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "newpassword123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "675a1234567890abcdef1234",
      "email": "test@example.com",
      "name": "test",
      "role": ["manager"],
      "isNewUser": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "redirectTo": "home"
  }
}
```

## Test Cases

### Test Case 1: Email không hợp lệ
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email"
  }'
```

### Test Case 2: Email trống
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": ""
  }'
```

### Test Case 3: Reset token hết hạn (sau 15 phút)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456"
  }'
```

### Test Case 4: Reset token sai
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrong_token"
  }'
```

### Test Case 5: Password không match
```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "password": "newpassword123",
    "confirmPassword": "different_password"
  }'
```

## Automation Script

Tạo file `test_forgot_password.sh`:

```bash
#!/bin/bash

EMAIL="test@example.com"
NEW_PASSWORD="newpassword123"

echo "=== Testing Forgot Password Flow ==="

# Step 1: Request forgot password
echo "1. Requesting forgot password..."
FORGOT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\"}")

echo "Response: $FORGOT_RESPONSE"

# Wait for user to check email and input reset token
echo "2. Please check your email and enter the 6-digit reset token:"
read -p "Reset Token: " RESET_TOKEN

# Step 3: Login with reset token
echo "3. Login with reset token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$RESET_TOKEN\"}")

echo "Login Response: $LOGIN_RESPONSE"

# Extract token from response
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Exiting..."
  exit 1
fi

echo "Token: $TOKEN"

# Step 4: Reset password
echo "4. Setting new password..."
RESET_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"password\": \"$NEW_PASSWORD\", \"confirmPassword\": \"$NEW_PASSWORD\"}")

echo "Reset Response: $RESET_RESPONSE"

# Step 5: Verify with new password
echo "5. Verifying login with new password..."
VERIFY_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$NEW_PASSWORD\"}")

echo "Verify Response: $VERIFY_RESPONSE"

echo "=== Test Complete ==="
```

## Sử dụng với Postman

### Import Collection
Tạo file `forgot_password_postman.json`:

```json
{
  "info": {
    "name": "Forgot Password API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Forgot Password",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"test@example.com\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/auth/forgot-password",
          "host": ["{{base_url}}"],
          "path": ["api", "auth", "forgot-password"]
        }
      }
    },
    {
      "name": "2. Login with Reset Token",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"123456\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/auth/login",
          "host": ["{{base_url}}"],
          "path": ["api", "auth", "login"]
        }
      }
    },
    {
      "name": "3. Reset Password",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"password\": \"newpassword123\",\n  \"confirmPassword\": \"newpassword123\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/auth/reset-password",
          "host": ["{{base_url}}"],
          "path": ["api", "auth", "reset-password"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "token",
      "value": ""
    }
  ]
}
``` 