# Hướng Dẫn API Quản Lý Tiến Trình Dạy Học

## Tổng Quan

Module này cung cấp các API để quản lý tiến trình dạy học theo từng khối, học kỳ và tuần. Hệ thống cho phép:

- Theo dõi số tiết dạy thực tế của từng môn học tại từng lớp
- So sánh với số tiết yêu cầu đã cấu hình
- Hiển thị màu sắc theo trạng thái: đỏ (thiếu), xanh (đủ), vàng (dư)
- Cấu hình số tiết yêu cầu cho từng môn học

## Các API Endpoints

### 1. Lấy Dữ Liệu Tiến Trình Dạy Học

**Endpoint:** `GET /api/statistics/teaching-progress`

**Mô tả:** Lấy dữ liệu tiến trình dạy học theo khối, học kỳ, tuần

**Query Parameters:**
- `gradeLevel` (required): Khối học (10, 11, 12)
- `semester` (required): Học kỳ (1, 2)
- `weekNumber` (required): Số tuần (1-20)
- `academicYear` (required): Năm học (ví dụ: "2024-2025")

**Response:**
```json
{
  "success": true,
  "message": "Lấy dữ liệu tiến trình dạy học thành công",
  "data": {
    "gradeLevel": 10,
    "semester": 1,
    "weekNumber": 5,
    "academicYear": "2024-2025",
    "classes": ["10A1", "10A2", "10A3", "10A4", "10A5"],
    "requirements": {
      "Toán": 4,
      "Ngữ Văn": 4,
      "Vật lý": 3,
      "Hóa học": 2,
      "Sinh học": 3,
      "Lịch sử": 2,
      "Địa lý": 2,
      "GDCD": 2,
      "Ngoại ngữ": 3,
      "Thể dục": 2,
      "GDQP": 2,
      "Tin học": 2,
      "Công nghệ": 2
    },
    "progressData": [
      {
        "subject": "Toán",
        "data": [3, 4, 3, 4, 3]
      },
      {
        "subject": "Ngữ Văn",
        "data": [4, 4, 4, 4, 4]
      }
    ],
    "weekDates": {
      "startDate": "2024-10-07T00:00:00.000Z",
      "endDate": "2024-10-13T23:59:59.999Z"
    }
  }
}
```

**Ví dụ Request:**
```bash
curl -X GET "http://localhost:3000/api/statistics/teaching-progress?gradeLevel=10&semester=1&weekNumber=5&academicYear=2024-2025" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Lấy Cấu Hình Số Tiết Yêu Cầu

**Endpoint:** `GET /api/statistics/lesson-requirements`

**Mô tả:** Lấy cấu hình số tiết yêu cầu cho từng môn học

**Query Parameters:**
- `gradeLevel` (required): Khối học (10, 11, 12)
- `semester` (required): Học kỳ (1, 2)
- `academicYear` (required): Năm học

**Response:**
```json
{
  "success": true,
  "message": "Lấy cấu hình số tiết yêu cầu thành công",
  "data": {
    "Toán": 4,
    "Ngữ Văn": 4,
    "Vật lý": 3,
    "Hóa học": 2,
    "Sinh học": 3,
    "Lịch sử": 2,
    "Địa lý": 2,
    "GDCD": 2,
    "Ngoại ngữ": 3,
    "Thể dục": 2,
    "GDQP": 2,
    "Tin học": 2,
    "Công nghệ": 2
  }
}
```

**Ví dụ Request:**
```bash
curl -X GET "http://localhost:3000/api/statistics/lesson-requirements?gradeLevel=10&semester=1&academicYear=2024-2025" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Khởi Tạo Cấu Hình Mặc Định

**Endpoint:** `POST /api/statistics/lesson-requirements/initialize`

**Mô tả:** Khởi tạo cấu hình mặc định cho số tiết yêu cầu (dùng lần đầu)

**Query Parameters:**
- `gradeLevel` (required): Khối học (10, 11, 12)
- `semester` (required): Học kỳ (1, 2)
- `academicYear` (required): Năm học

**Response:**
```json
{
  "success": true,
  "message": "Khởi tạo cấu hình mặc định thành công",
  "data": [
    {
      "subject": "Toán",
      "requiredLessons": 4,
      "action": "created"
    },
    {
      "subject": "Ngữ Văn",
      "requiredLessons": 4,
      "action": "created"
    }
  ]
}
```

**Ví dụ Request:**
```bash
curl -X POST "http://localhost:3000/api/statistics/lesson-requirements/initialize?gradeLevel=10&semester=1&academicYear=2024-2025" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Cập Nhật Cấu Hình Số Tiết Yêu Cầu

**Endpoint:** `PUT /api/statistics/lesson-requirements`

**Mô tả:** Cập nhật cấu hình số tiết yêu cầu cho từng môn học

**Query Parameters:**
- `gradeLevel` (required): Khối học (10, 11, 12)
- `semester` (required): Học kỳ (1, 2)
- `academicYear` (required): Năm học

**Request Body:**
```json
{
  "requirements": {
    "Toán": 4,
    "Ngữ Văn": 4,
    "Vật lý": 3,
    "Hóa học": 2,
    "Sinh học": 3,
    "Lịch sử": 2,
    "Địa lý": 2,
    "GDCD": 2,
    "Ngoại ngữ": 3,
    "Thể dục": 2,
    "GDQP": 2,
    "Tin học": 2,
    "Công nghệ": 2
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cập nhật cấu hình số tiết yêu cầu thành công",
  "data": [
    {
      "subject": "Toán",
      "requiredLessons": 4,
      "action": "updated"
    },
    {
      "subject": "Ngữ Văn",
      "requiredLessons": 4,
      "action": "updated"
    }
  ]
}
```

**Ví dụ Request:**
```bash
curl -X PUT "http://localhost:3000/api/statistics/lesson-requirements?gradeLevel=10&semester=1&academicYear=2024-2025" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requirements": {
      "Toán": 4,
      "Ngữ Văn": 4,
      "Vật lý": 3,
      "Hóa học": 2,
      "Sinh học": 3,
      "Lịch sử": 2,
      "Địa lý": 2,
      "GDCD": 2,
      "Ngoại ngữ": 3,
      "Thể dục": 2,
      "GDQP": 2,
      "Tin học": 2,
      "Công nghệ": 2
    }
  }'
```

### 5. Lấy Danh Sách Lớp Theo Khối

**Endpoint:** `GET /api/statistics/classes-by-grade`

**Mô tả:** Lấy danh sách các lớp theo khối học

**Query Parameters:**
- `gradeLevel` (required): Khối học (10, 11, 12)
- `academicYear` (required): Năm học

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách lớp theo khối thành công",
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "className": "10A1",
      "gradeLevel": 10
    },
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "className": "10A2",
      "gradeLevel": 10
    }
  ]
}
```

**Ví dụ Request:**
```bash
curl -X GET "http://localhost:3000/api/statistics/classes-by-grade?gradeLevel=10&academicYear=2024-2025" \
  -H "Authorization: Bearer YOUR_TOKEN"
```



## Logic Màu Sắc

Dựa trên số tiết thực tế so với số tiết yêu cầu:

- **Màu đỏ (#F04438)**: Số tiết thực tế < Số tiết yêu cầu (thiếu tiết)
- **Màu xanh (#2CB654)**: Số tiết thực tế = Số tiết yêu cầu (đủ tiết)
- **Màu vàng (#F9A825)**: Số tiết thực tế > Số tiết yêu cầu (dư tiết - dạy bù)

## Cách Sử Dụng Trong Frontend

### 1. Khởi tạo dữ liệu

```javascript
// Lấy dữ liệu tiến trình
const fetchProgressData = async () => {
  const response = await fetch(
    `/api/statistics/teaching-progress?gradeLevel=10&semester=1&weekNumber=5&academicYear=2024-2025`
  );
  const data = await response.json();
  return data.data;
};

// Lấy cấu hình số tiết yêu cầu (sẽ trả về mặc định nếu chưa có)
const fetchRequirements = async () => {
  const response = await fetch(
    `/api/statistics/lesson-requirements?gradeLevel=10&semester=1&academicYear=2024-2025`
  );
  const data = await response.json();
  return data.data;
};
```

### 2. Tính toán màu sắc

```javascript
const getCellColor = (subject, actualLessons, requirements) => {
  const required = requirements[subject] || 0;
  
  if (actualLessons === required) {
    return '#2CB654'; // Xanh - đủ tiết
  } else if (actualLessons > required) {
    return '#F9A825'; // Vàng - dư tiết
  } else {
    return '#F04438'; // Đỏ - thiếu tiết
  }
};
```

### 3. Khởi tạo cấu hình mặc định (lần đầu)

```javascript
const initializeRequirements = async () => {
  const response = await fetch(
    `/api/statistics/lesson-requirements/initialize?gradeLevel=10&semester=1&academicYear=2024-2025`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
};
```

### 4. Cập nhật cấu hình

```javascript
const updateRequirements = async (requirements) => {
  const response = await fetch(
    `/api/statistics/lesson-requirements?gradeLevel=10&semester=1&academicYear=2024-2025`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ requirements })
    }
  );
  return response.json();
};
```

## Lưu Ý Quan Trọng

1. **Authentication**: Tất cả API đều yêu cầu token xác thực
2. **Authorization**: Chỉ admin và manager mới có quyền truy cập
3. **Validation**: Các tham số bắt buộc phải được cung cấp đầy đủ
4. **Data Consistency**: Dữ liệu được lấy từ bảng `lessons` với status là 'completed'
5. **Performance**: API được tối ưu với index database để truy vấn nhanh
6. **Default Configuration**: Khi chưa có cấu hình, hệ thống sẽ trả về cấu hình mặc định
7. **Initialization**: Sử dụng API `initialize` để tạo cấu hình mặc định lần đầu

## Error Handling

Các lỗi thường gặp:

- **400 Bad Request**: Thiếu tham số bắt buộc
- **401 Unauthorized**: Token không hợp lệ
- **403 Forbidden**: Không có quyền truy cập
- **404 Not Found**: Không tìm thấy dữ liệu
- **500 Internal Server Error**: Lỗi server

## Database Schema

### LessonRequirement Model

```javascript
{
  subject: ObjectId,        // Reference to Subject
  gradeLevel: Number,       // 10, 11, 12
  requiredLessons: Number,  // Số tiết yêu cầu
  academicYear: String,     // Năm học
  semester: Number,         // 1, 2
  isActive: Boolean,        // Trạng thái hoạt động
  createdAt: Date,
  updatedAt: Date
}
```

Indexes được tạo để tối ưu hiệu suất truy vấn. 