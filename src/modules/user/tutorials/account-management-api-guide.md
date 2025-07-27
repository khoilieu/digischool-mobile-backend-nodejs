# Hướng Dẫn API Quản Lý Tài Khoản

## Tổng Quan

Module này cung cấp các API để quản lý tài khoản học sinh và giáo viên trong hệ thống. Các API này hỗ trợ:

- Lấy danh sách tài khoản với filter theo role (học sinh/giáo viên)
- Tìm kiếm tài khoản theo tên, email, mã số
- Filter theo khối học và lớp
- Xem thông tin chi tiết tài khoản
- Phân trang kết quả

## Các API Endpoints

### 1. Lấy Danh Sách Tài Khoản Cho Trang Quản Lý

**Endpoint:** `GET /api/users/management/accounts`

**Mô tả:** Lấy danh sách tài khoản với các filter và tìm kiếm

**Query Parameters:**
- `role` (optional): Loại tài khoản ('student' hoặc 'teacher')
- `search` (optional): Từ khóa tìm kiếm (tên, email, mã số)
- `gradeLevel` (optional): Khối học (10, 11, 12)
- `className` (optional): Tên lớp
- `page` (optional): Trang hiện tại (mặc định: 1)
- `limit` (optional): Số lượng kết quả mỗi trang (mặc định: 20)

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách tài khoản thành công",
  "data": {
    "accounts": [
      {
        "id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "name": "Nguyen Van A",
        "email": "nguyenvana@example.com",
        "avatar": null,
        "active": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "type": "student",
        "code": "HS-101",
        "class": "10A1",
        "gradeLevel": 10
      },
      {
        "id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "name": "Tran Thi B",
        "email": "tranthib@example.com",
        "avatar": null,
        "active": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "type": "teacher",
        "code": "GV-201",
        "subject": "Toán",
        "subjectCode": "MATH"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "pages": 8
    }
  }
}
```

**Ví dụ Request:**
```bash
# Lấy tất cả học sinh
curl -X GET "http://localhost:3000/api/users/management/accounts?role=student" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Tìm kiếm giáo viên
curl -X GET "http://localhost:3000/api/users/management/accounts?role=teacher&search=Toán" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter theo khối và lớp
curl -X GET "http://localhost:3000/api/users/management/accounts?role=student&gradeLevel=10&className=10A1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Lấy Danh Sách Lớp Theo Khối

**Endpoint:** `GET /api/users/management/classes`

**Mô tả:** Lấy danh sách các lớp và số lượng học sinh trong từng lớp theo khối

**Query Parameters:**
- `gradeLevel` (required): Khối học (10, 11, 12)

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách lớp thành công",
  "data": [
    {
      "className": "10A1",
      "studentCount": 35
    },
    {
      "className": "10A2",
      "studentCount": 32
    },
    {
      "className": "10A3",
      "studentCount": 38
    }
  ]
}
```

**Ví dụ Request:**
```bash
curl -X GET "http://localhost:3000/api/users/management/classes?gradeLevel=10" 
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Lấy Thông Tin Chi Tiết Tài Khoản

**Endpoint:** `GET /api/users/management/accounts/:id`

**Mô tả:** Lấy thông tin chi tiết của một tài khoản

**Path Parameters:**
- `id` (required): ID của tài khoản

**Response cho học sinh:**
```json
{
  "success": true,
  "message": "Lấy thông tin tài khoản thành công",
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Nguyen Van A",
    "email": "nguyenvana@example.com",
    "phone": "0814747265",
    "address": "Ninh Kieu, Can Tho",
    "dateOfBirth": "2003-01-01T00:00:00.000Z",
    "gender": "male",
    "avatar": null,
    "active": true,
    "role": "student",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "studentId": "HS-101",
    "class": {
      "name": "10A3",
      "gradeLevel": 10,
      "academicYear": "2024-2025"
    },
    "subjects": [],
    "roleInfo": {
      "type": "student"
    }
  }
}
```

**Response cho giáo viên:**
```json
{
  "success": true,
  "message": "Lấy thông tin tài khoản thành công",
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "name": "Tran Thi B",
    "email": "tranthib@example.com",
    "phone": "0814747266",
    "address": "Ninh Kieu, Can Tho",
    "dateOfBirth": "1985-05-15T00:00:00.000Z",
    "gender": "female",
    "avatar": null,
    "active": true,
    "role": "teacher",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "teacherId": "GV-201",
    "subject": "Toán",
    "subjectCode": "MATH",
    "subjects": [],
    "roleInfo": {
      "type": "teacher",
      "isHomeroom": false
    }
  }
}
```

**Ví dụ Request:**
```bash
curl -X GET "http://localhost:3000/api/users/management/accounts/64f8a1b2c3d4e5f6a7b8c9d0" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Cách Sử Dụng Trong Frontend

### 1. Lấy danh sách tài khoản

```javascript
// Lấy tất cả học sinh
const fetchStudents = async () => {
  const response = await fetch(
    '/api/users/management/accounts?role=student'
  );
  const data = await response.json();
  return data.data.accounts;
};

// Lấy tất cả giáo viên
const fetchTeachers = async () => {
  const response = await fetch(
    '/api/users/management/accounts?role=teacher'
  );
  const data = await response.json();
  return data.data.accounts;
};

// Tìm kiếm tài khoản
const searchAccounts = async (searchTerm, role) => {
  const response = await fetch(
    `/api/users/management/accounts?role=${role}&search=${searchTerm}`
  );
  const data = await response.json();
  return data.data.accounts;
};

// Filter theo khối và lớp
const filterAccounts = async (role, gradeLevel, className) => {
  const params = new URLSearchParams({
    role,
    ...(gradeLevel && { gradeLevel }),
    ...(className && { className })
  });
  
  const response = await fetch(
    `/api/users/management/accounts?${params}`
  );
  const data = await response.json();
  return data.data.accounts;
};
```

### 2. Lấy danh sách lớp

```javascript
const fetchClassesByGrade = async (gradeLevel) => {
  const response = await fetch(
    `/api/users/management/classes?gradeLevel=${gradeLevel}`
  );
  const data = await response.json();
  return data.data;
};
```

### 3. Lấy thông tin chi tiết

```javascript
const fetchAccountDetail = async (accountId) => {
  const response = await fetch(
    `/api/users/management/accounts/${accountId}`
  );
  const data = await response.json();
  return data.data;
};
```

### 4. Xử lý phân trang

```javascript
const fetchAccountsWithPagination = async (params) => {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.role && { role: params.role }),
    ...(params.search && { search: params.search }),
    ...(params.gradeLevel && { gradeLevel: params.gradeLevel }),
    ...(params.className && { className: params.className })
  });

  const response = await fetch(
    `/api/users/management/accounts?${queryParams}`
  );
  const data = await response.json();
  return data.data;
};
```

## Logic Filter và Tìm Kiếm

### Filter theo Role:
- `student`: Chỉ lấy học sinh
- `teacher`: Lấy cả giáo viên và giáo viên chủ nhiệm

### Tìm kiếm:
- Tìm theo tên (không phân biệt hoa thường)
- Tìm theo email
- Tìm theo mã học sinh (studentId)
- Tìm theo mã giáo viên (teacherId)

### Filter theo khối và lớp:
- `gradeLevel`: 10, 11, 12
- `className`: Tên lớp cụ thể

## Lưu Ý Quan Trọng

1. **Authentication**: Tất cả API đều yêu cầu token xác thực
2. **Authorization**: Chỉ admin và manager mới có quyền truy cập
3. **Validation**: Các tham số được validate đầy đủ
4. **Pagination**: Mặc định 20 kết quả mỗi trang
5. **Active Users**: Chỉ lấy tài khoản có trạng thái active = true
6. **Data Format**: Dữ liệu được format phù hợp với UI

## Error Handling

Các lỗi thường gặp:

- **400 Bad Request**: Tham số không hợp lệ
- **401 Unauthorized**: Token không hợp lệ
- **403 Forbidden**: Không có quyền truy cập
- **404 Not Found**: Tài khoản không tồn tại
- **500 Internal Server Error**: Lỗi server

## Database Schema

### User Model (các trường chính):
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  address: String,
  dateOfBirth: Date,
  gender: String,
  avatar: String,
  role: String, // 'student', 'teacher', 'homeroom_teacher'
  studentId: String,
  teacherId: String,
  class_id: ObjectId, // Reference to Class
  className: String,
  gradeLevel: Number,
  subject: ObjectId, // Reference to Subject
  active: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

Các API được tối ưu với index database để truy vấn nhanh. 