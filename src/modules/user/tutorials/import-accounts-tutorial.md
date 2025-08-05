# Import Tài Khoản Tutorial - Postman Guide

## Tổng quan

Hệ thống hỗ trợ import tài khoản từ file Excel cho 3 loại role: **Students**, **Teachers**, và **Parents**. Tất cả các trường khóa ngoại sẽ được kiểm tra và báo lỗi nếu không tìm thấy trong database.

## API Endpoints

### Import Students
```
POST /api/users/import-students
```

### Import Teachers
```
POST /api/users/import-teachers
```

### Import Parents
```
POST /api/users/import-parents
```

## Quyền truy cập

Chỉ **Manager** mới có quyền import tài khoản.

## Hướng dẫn sử dụng Postman

### 1. Thiết lập Request

#### **Method:** POST
#### **URL:** `{{base_url}}/api/users/import-students`

### 2. Headers
```
Content-Type: multipart/form-data
Authorization: Bearer {{access_token}}
```

### 3. Body (form-data)
| Key | Type | Value | Description |
|-----|------|-------|-------------|
| file | File | Chọn file Excel | File Excel cần import |

### 4. Ví dụ cấu hình Postman

#### **Tab Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Tab Body:**
- Chọn **form-data**
- Thêm key: `file` (Type: File)
- Chọn file Excel từ máy tính

### 5. Environment Variables

Tạo environment với các biến:
```
base_url: http://localhost:3000
access_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. Collection Setup

Tạo collection với 3 requests:

#### **Request 1: Import Students**
```
Method: POST
URL: {{base_url}}/api/users/import-students
```

#### **Request 2: Import Teachers**
```
Method: POST
URL: {{base_url}}/api/users/import-teachers
```

#### **Request 3: Import Parents**
```
Method: POST
URL: {{base_url}}/api/users/import-parents
```

## Format Excel Files

### 1. Import Students

**File:** `students_import_template.xlsx`

| Column | Field Name | Required | Type | Description |
|--------|------------|----------|------|-------------|
| A | name | ✅ | Text | Tên học sinh |
| B | email | ✅ | Email | Email đăng nhập |
| C | dateOfBirth | ❌ | Date | Ngày sinh (YYYY-MM-DD) |
| D | gender | ❌ | Text | Giới tính (male/female/other) |
| E | phone | ❌ | Text | Số điện thoại |
| F | address | ❌ | Text | Địa chỉ |
| G | school | ✅ | Text | Tên trường học |
| H | studentId | ✅ | Text | Mã học sinh (unique) |
| I | className | ✅ | Text | Tên lớp học |
| J | academicYear | ❌ | Text | Năm học (YYYY-YYYY) |
| K | active | ❌ | Boolean | Trạng thái hoạt động |

**Ví dụ dữ liệu:**
```
name,email,dateOfBirth,gender,phone,address,school,studentId,className,academicYear,active
Nguyễn Văn A,nguyen.van.a@yopmail.com,2008-05-15,male,0901234567,123 Đường ABC Quận 1 TP.HCM,THPT Phan Văn Trị,STU001,10A1,2024-2025,true
Trần Thị B,tran.thi.b@yopmail.com,2008-08-20,female,0901234568,456 Đường XYZ Quận 2 TP.HCM,THPT Phan Văn Trị,STU002,10A1,2024-2025,true
```

### 2. Import Teachers

**File:** `teachers_import_template.xlsx`

| Column | Field Name | Required | Type | Description |
|--------|------------|----------|------|-------------|
| A | name | ✅ | Text | Tên giáo viên |
| B | email | ✅ | Email | Email đăng nhập |
| C | dateOfBirth | ❌ | Date | Ngày sinh (YYYY-MM-DD) |
| D | gender | ❌ | Text | Giới tính (male/female/other) |
| E | phone | ❌ | Text | Số điện thoại |
| F | address | ❌ | Text | Địa chỉ |
| G | school | ✅ | Text | Tên trường học |
| H | teacherId | ✅ | Text | Mã giáo viên (unique) |
| I | subjectName | ✅ | Text | Tên môn học |
| J | active | ❌ | Boolean | Trạng thái hoạt động |

**Ví dụ dữ liệu:**
```
name,email,dateOfBirth,gender,phone,address,school,teacherId,subjectName,active
Nguyễn Thị D,nguyen.thi.d@yopmail.com,1985-12-15,female,0901234570,123 Đường ABC Quận 1 TP.HCM,THPT Phan Văn Trị,TCH001,Toán,true
Trần Văn E,tran.van.e@yopmail.com,1990-08-20,male,0901234571,456 Đường XYZ Quận 2 TP.HCM,THPT Phan Văn Trị,TCH002,Văn,true
```

### 3. Import Parents

**File:** `parents_import_template.xlsx`

| Column | Field Name | Required | Type | Description |
|--------|------------|----------|------|-------------|
| A | name | ✅ | Text | Tên phụ huynh |
| B | email | ❌ | Email | Email đăng nhập (tự động tạo nếu không có) |
| C | dateOfBirth | ❌ | Date | Ngày sinh (YYYY-MM-DD) |
| D | gender | ❌ | Text | Giới tính (male/female/other) |
| E | phone | ✅ | Text | Số điện thoại |
| F | address | ❌ | Text | Địa chỉ |
| G | school | ✅ | Text | Tên trường học |
| H | parentId | ✅ | Text | Mã phụ huynh (unique) |
| I | childStudentId | ✅ | Text | Mã học sinh của con |
| J | active | ❌ | Boolean | Trạng thái hoạt động |

**Ví dụ dữ liệu:**
```
name,email,dateOfBirth,gender,phone,address,school,parentId,childStudentId,active
Nguyễn Văn G,nguyen.van.g@yopmail.com,1975-05-15,male,0901234573,123 Đường ABC Quận 1 TP.HCM,THPT Phan Văn Trị,PAR001,STU001,true
Trần Thị H,tran.thi.h@yopmail.com,1980-08-20,female,0901234574,456 Đường XYZ Quận 2 TP.HCM,THPT Phan Văn Trị,PAR002,STU002,true
```

## Quy tắc Validation

### 1. Trường bắt buộc
- **Students**: `name`, `email`, `studentId`, `className`, `school`
- **Teachers**: `name`, `email`, `teacherId`, `subjectName`, `school`
- **Parents**: `name`, `phone`, `parentId`, `childStudentId`, `school`

### 2. Trường unique
- **Students**: `email`, `studentId`
- **Teachers**: `email`, `teacherId`
- **Parents**: `email`, `parentId`

### 3. Trường khóa ngoại
Tất cả các trường khóa ngoại sẽ được kiểm tra và báo lỗi nếu không tìm thấy:

| Trường | Kiểm tra trong collection | Thông báo lỗi |
|--------|---------------------------|---------------|
| `school` | School | `School '{tên trường}' not found in database` |
| `subjectName` | Subject | `Subject '{tên môn học}' not found in database` |
| `className` | Class | `Class {tên lớp} not found for academic year {năm học}` |
| `childStudentId` | User (student) | `Child with studentId '{mã học sinh}' not found or is not a student` |

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Import completed",
  "data": {
    "success": [
      {
        "row": 2,
        "email": "nguyen.van.a@yopmail.com",
        "name": "Nguyễn Văn A",
        "studentId": "STU001",
        "className": "10A1",
        "school": "THPT Phan Văn Trị",
        "status": "awaiting_first_login",
        "tempPassword": "Abc123!@#"
      }
    ],
    "failed": [],
    "total": 1
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Import failed",
  "data": {
    "success": [],
    "failed": [
      {
        "row": 2,
        "data": {
          "name": "Nguyễn Văn A",
          "email": "nguyen.van.a@yopmail.com",
          "studentId": "STU001",
          "className": "10A1",
          "school": "THPT Phan Văn Trị"
        },
        "error": "School 'THPT Phan Văn Trị' not found in database"
      }
    ],
    "total": 1
  }
}
```

## Quy trình Import trong Postman

### 1. Chuẩn bị dữ liệu
- Tạo file Excel theo format chuẩn
- Đảm bảo các trường bắt buộc được điền đầy đủ
- Kiểm tra các trường unique không bị trùng lặp
- Đảm bảo các trường khóa ngoại đã tồn tại trong database

### 2. Thiết lập Postman Request
1. **Mở Postman**
2. **Tạo request mới** hoặc chọn request có sẵn
3. **Chọn Method:** POST
4. **Nhập URL:** `{{base_url}}/api/users/import-students`
5. **Thiết lập Headers:**
   - `Content-Type: multipart/form-data`
   - `Authorization: Bearer {{access_token}}`
6. **Thiết lập Body:**
   - Chọn tab **Body**
   - Chọn **form-data**
   - Thêm key: `file` (Type: File)
   - Chọn file Excel từ máy tính

### 3. Gửi Request và xử lý kết quả
1. **Click Send** để gửi request
2. **Kiểm tra Status Code:**
   - `200`: Thành công
   - `400`: Lỗi validation
   - `401`: Chưa đăng nhập hoặc token hết hạn
   - `403`: Không có quyền (không phải manager)
3. **Xem Response Body:**
   - Kiểm tra số lượng thành công/thất bại
   - Xem chi tiết lỗi trong trường `failed`
   - Lưu lại `tempPassword` để thông báo cho người dùng

### 4. Ví dụ thực tế

#### **Request Setup:**
```
Method: POST
URL: http://localhost:3000/api/users/import-students
Headers:
  Content-Type: multipart/form-data
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Body (form-data):
  file: students_import_template.xlsx
```

#### **Response Success:**
```json
{
  "success": true,
  "message": "Import completed",
  "data": {
    "success": [
      {
        "row": 2,
        "email": "nguyen.van.a@yopmail.com",
        "name": "Nguyễn Văn A",
        "studentId": "STU001",
        "className": "10A1",
        "school": "THPT Phan Văn Trị",
        "status": "awaiting_first_login",
        "tempPassword": "Abc123!@#"
      }
    ],
    "failed": [],
    "total": 1
  }
}
```

#### **Response Error:**
```json
{
  "success": false,
  "message": "Import failed",
  "data": {
    "success": [],
    "failed": [
      {
        "row": 2,
        "data": {
          "name": "Nguyễn Văn A",
          "email": "nguyen.van.a@yopmail.com",
          "studentId": "STU001",
          "className": "10A1",
          "school": "THPT Phan Văn Trị"
        },
        "error": "School 'THPT Phan Văn Trị' not found in database"
      }
    ],
    "total": 1
  }
}
```

## Lưu ý quan trọng

### 1. Tài khoản được tạo
- Tất cả tài khoản được tạo với `isNewUser: true`
- Người dùng phải đăng nhập lần đầu và set password mới
- Email chào mừng sẽ được gửi với mật khẩu tạm thời

### 2. Trường khóa ngoại
- **KHÔNG** tự động tạo mới các trường khóa ngoại
- Phải đảm bảo dữ liệu đã tồn tại trong database trước khi import
- Nếu không tìm thấy, dòng đó sẽ bị bỏ qua và báo lỗi

### 3. Role assignment
- **Students**: Role `["student"]`
- **Teachers**: Role `["teacher"]` (homeroom_teacher sẽ được set khi import TKB)
- **Parents**: Role `["parent"]`

### 4. Email tự động
- **Parents**: Nếu không có email, hệ thống sẽ tự động tạo email theo format: `{tên}.parent@yopmail.com`

## Troubleshooting trong Postman

### Lỗi thường gặp và cách khắc phục

#### **1. Lỗi 401 - Unauthorized**
**Nguyên nhân:** Token không hợp lệ hoặc hết hạn
**Cách khắc phục:**
- Đăng nhập lại để lấy token mới
- Cập nhật `access_token` trong environment
- Kiểm tra format: `Bearer {token}`

#### **2. Lỗi 403 - Forbidden**
**Nguyên nhân:** Không có quyền manager
**Cách khắc phục:**
- Đăng nhập bằng tài khoản có role manager
- Kiểm tra quyền trong database

#### **3. Lỗi 400 - Bad Request**
**Nguyên nhân:** File không đúng format hoặc thiếu dữ liệu
**Cách khắc phục:**
- Kiểm tra file Excel có đúng format không
- Đảm bảo field name là `file`
- Kiểm tra Content-Type: `multipart/form-data`

#### **4. Lỗi trong Response Body**

**"School not found"**
- Kiểm tra tên trường học trong database
- Đảm bảo chính xác về chữ hoa/thường
- Tạo trường học trước khi import

**"Subject not found"**
- Kiểm tra tên môn học trong database
- Đảm bảo chính xác về chữ hoa/thường
- Tạo môn học trước khi import

**"Class not found"**
- Kiểm tra tên lớp và năm học
- Đảm bảo lớp đã được tạo trong hệ thống
- Tạo lớp trước khi import

**"Child not found"**
- Kiểm tra mã học sinh của con
- Đảm bảo học sinh đã được tạo trước
- Import học sinh trước khi import phụ huynh

**"Email already exists"**
- Kiểm tra email không bị trùng lặp
- Sử dụng email khác hoặc xóa tài khoản cũ
- Kiểm tra trong database

**"ID already exists"**
- Kiểm tra mã ID không bị trùng lặp
- Sử dụng mã ID khác hoặc xóa tài khoản cũ
- Kiểm tra trong database

### 5. Tips sử dụng Postman

#### **Pre-request Script (Tự động lấy token):**
```javascript
// Tự động lấy token nếu cần
if (!pm.environment.get("access_token")) {
    // Gọi API login để lấy token
    pm.sendRequest({
        url: pm.environment.get("base_url") + "/api/auth/login",
        method: "POST",
        header: {
            "Content-Type": "application/json"
        },
        body: {
            mode: "raw",
            raw: JSON.stringify({
                email: "manager@school.com",
                password: "password123"
            })
        }
    }, function (err, response) {
        if (response.code === 200) {
            const data = response.json();
            pm.environment.set("access_token", data.data.token);
        }
    });
}
```

#### **Tests Script (Kiểm tra response):**
```javascript
// Kiểm tra response
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
});

pm.test("Import completed successfully", function () {
    const jsonData = pm.response.json();
    if (jsonData.success) {
        pm.expect(jsonData.data.total).to.be.at.least(0);
        console.log("Success count:", jsonData.data.success.length);
        console.log("Failed count:", jsonData.data.failed.length);
    }
});
```

#### **Environment Variables Setup:**
```
base_url: http://localhost:3000
access_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
manager_email: manager@school.com
manager_password: password123
``` 