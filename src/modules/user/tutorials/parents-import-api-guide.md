# Parents Import API Guide

## Tổng quan

API import parents cho phép manager import danh sách phụ huynh từ file Excel vào hệ thống EcoSchool. Mỗi phụ huynh sẽ được tạo tài khoản với mật khẩu tạm thời và gửi qua email.

## Cấu trúc dữ liệu

### User Model mới cho Parents

```javascript
{
  role: ['parent'],
  name: String,           // Họ tên phụ huynh
  email: String,          // Email (unique)
  passwordHash: String,   // Mật khẩu đã hash
  dateOfBirth: Date,      // Ngày sinh
  gender: String,         // Giới tính (male/female/other)
  children: [ObjectId],   // Mảng ID của các con (reference to User)
  phone: String,          // Số điện thoại
  address: String,        // Địa chỉ
  isNewUser: Boolean,     // Trạng thái user mới
  active: Boolean         // Trạng thái hoạt động
}
```

### File Excel Template

File Excel cần có các cột sau:

| Cột | Tên | Bắt buộc | Mô tả |
|-----|-----|----------|-------|
| name | Họ tên phụ huynh | ✅ | Tên đầy đủ của phụ huynh |
| dateOfBirth | Ngày sinh | ❌ | Định dạng YYYY-MM-DD |
| gender | Giới tính | ❌ | male/female/other |
| childId | ID học sinh | ✅ | _id của học sinh trong hệ thống |
| phone | Số điện thoại | ✅ | Số điện thoại liên lạc |
| email | Email | ❌ | Nếu không có sẽ tự động tạo |
| address | Địa chỉ | ❌ | Địa chỉ nhà |

## API Endpoints

### 1. Import Parents từ File Excel

**Endpoint:** `POST /api/users/import-parents`

**Headers:**
```
Authorization: Bearer <manager_token>
Content-Type: multipart/form-data
```

**Body:** Form data với file Excel

**Response:**
```json
{
  "success": true,
  "message": "Parent import completed",
  "data": {
    "success": [
      {
        "row": 2,
        "email": "nguyenvanphuc.parents@yopmail.com",
        "name": "Nguyễn Văn Phúc",
        "childrenCount": 1,
        "childrenNames": ["Nguyễn Văn Phúc"],
        "status": "awaiting_first_login",
        "tempPassword": "Kj9#mN2$pL5"
      }
    ],
    "failed": [],
    "total": 1
  }
}
```

### 2. Import Parents từ Base64

**Endpoint:** `POST /api/users/import-parents-base64`

**Headers:**
```
Authorization: Bearer <manager_token>
Content-Type: application/json
```

**Body:**
```json
{
  "base64Data": "UEsDBBQAAAAIAA..."
}
```

**Response:** Tương tự như import từ file

## Logic xử lý

### 1. Validation
- Kiểm tra các trường bắt buộc: `name`, `childId`, `phone`
- Kiểm tra `childId` có tồn tại trong hệ thống và là học sinh không
- Kiểm tra email đã tồn tại chưa

### 2. Grouping Parents
- Nếu cùng một phụ huynh có nhiều con, sẽ gộp thành một tài khoản
- Mỗi email chỉ tạo một tài khoản parent

### 3. Email Generation
- Nếu không cung cấp email, hệ thống sẽ tự động tạo theo format:
  - Loại bỏ dấu tiếng Việt
  - Chuyển thành chữ thường
  - Thêm `.parents@yopmail.com`

### 4. Password Generation
- Tạo mật khẩu tạm thời 12 ký tự
- Bao gồm: chữ hoa, chữ thường, số, ký tự đặc biệt
- Hash mật khẩu trước khi lưu

### 5. Email Notification
- Gửi email chào mừng với mật khẩu tạm thời
- Liệt kê tên các con trong email
- Hướng dẫn đăng nhập lần đầu

## Ví dụ sử dụng

### Tạo file Excel mẫu

```javascript
const XLSX = require('xlsx');

const parentsData = [
  {
    name: 'Nguyễn Văn Phúc',
    dateOfBirth: '1980-05-15',
    gender: 'male',
    childId: '685584df62669cca8757dfea', // _id của học sinh Nguyễn Văn Phúc
    phone: '0901234567',
    email: 'nguyenvanphuc.parents@yopmail.com',
    address: '123 Đường ABC, Quận 1, TP.HCM'
  },
  // Phụ huynh có 2 con - Liêu Văn Khôi
  {
    name: 'Liêu Văn Khôi',
    dateOfBirth: '1975-12-03',
    gender: 'male',
    childId: '685c1c4888697d34ad3439da', // _id của học sinh Liêu Vinh Khôi
    phone: '0901234579',
    email: 'lieuvankhoi.parents@yopmail.com',
    address: '159 Đường HIJ, Quận Bình Thạnh, TP.HCM'
  },
  {
    name: 'Liêu Văn Khôi', // Cùng phụ huynh
    dateOfBirth: '1975-12-03',
    gender: 'male',
    childId: '6860c3ebc2402acd3a9752e9', // _id của học sinh Khôi Liêu
    phone: '0901234579',
    email: 'lieuvankhoi.parents@yopmail.com',
    address: '159 Đường HIJ, Quận Bình Thạnh, TP.HCM'
  }
];

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(parentsData);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Parents');
XLSX.writeFile(workbook, 'parents_import.xlsx');
```

### Gọi API

```javascript
// Import từ file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('/api/users/import-parents', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + managerToken
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));

// Import từ base64
fetch('/api/users/import-parents-base64', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + managerToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    base64Data: base64String
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

## Xử lý lỗi

### Các lỗi thường gặp

1. **Missing required fields**
   - Thiếu các trường bắt buộc: name, childId, phone

2. **Child not found**
   - ID học sinh không tồn tại trong hệ thống hoặc không phải là học sinh

3. **Email already exists**
   - Email đã được sử dụng bởi user khác

4. **Invalid file format**
   - File không phải định dạng Excel hợp lệ

5. **No data found**
   - File Excel không có dữ liệu

### Response lỗi

```json
{
  "success": false,
  "message": "Error description",
  "data": {
    "success": [],
    "failed": [
      {
        "row": 2,
        "data": { "name": "Test", "childId": "INVALID" },
        "error": "Child with ID 'INVALID' not found or is not a student"
      }
    ],
    "total": 1
  }
}
```

## Lưu ý quan trọng

1. **Quyền truy cập**: Chỉ manager mới có thể import parents
2. **Email tự động**: Nếu không cung cấp email, hệ thống sẽ tự tạo
3. **Mật khẩu tạm thời**: Được gửi qua email, user phải đổi khi đăng nhập lần đầu
4. **Multiple children**: Một phụ huynh có thể có nhiều con, tạo nhiều hàng trong Excel
5. **Validation**: Hệ thống kiểm tra tính hợp lệ của dữ liệu trước khi import
6. **Rollback**: Nếu có lỗi, các bản ghi đã tạo sẽ không bị xóa (cần xử lý thủ công)

## Testing

### Test cases cần kiểm tra

1. Import thành công với dữ liệu hợp lệ
2. Import với phụ huynh có nhiều con
3. Import với email tự động tạo
4. Import với email đã tồn tại
5. Import với childId không tồn tại
6. Import với thiếu trường bắt buộc
7. Import file Excel không hợp lệ
8. Import với quyền không đủ (không phải manager) 