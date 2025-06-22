# Period Type Management API Documentation

## Tổng quan

Hệ thống quản lý thời khóa biểu đã được cập nhật với các tính năng phân loại tiết học mới:

- **Regular (Chính quy)**: Tiết học bình thường theo thời khóa biểu
- **Makeup (Dạy bù)**: Tiết học bù cho các tiết bị vắng
- **Extracurricular (Ngoại khóa)**: Hoạt động ngoại khóa
- **Fixed (Cố định)**: Tiết cố định như chào cờ, sinh hoạt lớp

## 🔥 Tính năng mới

### 1. Phân loại tiết học tự động
- Tất cả tiết học được tạo sẽ có `periodType` mặc định là `regular`
- Tiết chào cờ và sinh hoạt lớp tự động được đánh dấu `fixed`
- Hỗ trợ thêm tiết `makeup` và `extracurricular` thủ công

### 2. Thống kê theo loại tiết học
- Đếm số lượng tiết theo từng loại
- Tính tỷ lệ hoàn thành cho từng loại
- Báo cáo chi tiết tiến độ học tập

### 3. Quản lý slot trống
- Tự động phát hiện slot trống trong thời khóa biểu
- Hỗ trợ thêm tiết dạy bù hoặc ngoại khóa vào slot trống
- Kiểm tra xung đột giáo viên

## 📋 API Endpoints

### 1. Lấy thống kê theo loại tiết học

```http
GET /api/schedules/period-type-statistics
```

**Query Parameters:**
- `className` (required): Tên lớp (e.g., "12A4")
- `academicYear` (required): Năm học (e.g., "2024-2025")

**Response:**
```json
{
  "success": true,
  "data": {
    "class": {
      "id": "64f8b9c123456789abcdef01",
      "name": "12A4",
      "academicYear": "2024-2025"
    },
    "statistics": {
      "regular": {
        "total": 30,
        "completed": 20,
        "absent": 2,
        "pending": 8,
        "completionRate": "66.67"
      },
      "makeup": {
        "total": 2,
        "completed": 1,
        "absent": 0,
        "pending": 1,
        "completionRate": "50.00"
      },
      "extracurricular": {
        "total": 1,
        "completed": 1,
        "absent": 0,
        "pending": 0,
        "completionRate": "100.00"
      },
      "fixed": {
        "total": 2,
        "completed": 2,
        "absent": 0,
        "pending": 0,
        "completionRate": "100.00"
      }
    },
    "generatedAt": "2024-12-19T10:30:00.000Z"
  }
}
```

### 2. Lấy danh sách tiết học theo loại

```http
GET /api/schedules/periods-by-type
```

**Query Parameters:**
- `className` (required): Tên lớp
- `academicYear` (required): Năm học
- `periodType` (required): Loại tiết học (`regular`, `makeup`, `extracurricular`, `fixed`)

**Response:**
```json
{
  "success": true,
  "data": {
    "class": {
      "id": "64f8b9c123456789abcdef01",
      "name": "12A4",
      "academicYear": "2024-2025"
    },
    "periodType": "regular",
    "totalPeriods": 30,
    "periods": [
      {
        "dayOfWeek": 2,
        "dayName": "Monday",
        "periodNumber": 2,
        "subject": {
          "id": "64f8b9c123456789abcdef02",
          "name": "Toán học",
          "code": "MATH",
          "department": "Toán"
        },
        "teacher": {
          "id": "64f8b9c123456789abcdef03",
          "name": "Nguyễn Văn A",
          "email": "teacher.a@school.edu.vn"
        },
        "status": "completed",
        "timeStart": "07:50",
        "timeEnd": "08:35"
      }
    ],
    "generatedAt": "2024-12-19T10:30:00.000Z"
  }
}
```

### 3. Nhận biết loại tiết học

```http
GET /api/schedules/identify-period-type
```

**Query Parameters:**
- `className` (required): Tên lớp
- `academicYear` (required): Năm học
- `dayOfWeek` (required): Thứ trong tuần (2=Thứ 2, 3=Thứ 3, ..., 7=Thứ 7)
- `periodNumber` (required): Số tiết (1-7)

**Response:**
```json
{
  "success": true,
  "data": {
    "class": {
      "id": "64f8b9c123456789abcdef01",
      "name": "12A4",
      "academicYear": "2024-2025"
    },
    "dayOfWeek": 2,
    "periodNumber": 1,
    "exists": true,
    "periodType": "fixed",
    "isRegular": false,
    "isMakeup": false,
    "isExtracurricular": false,
    "isFixed": true,
    "details": {
      "subject": null,
      "teacher": {
        "id": "64f8b9c123456789abcdef03",
        "name": "Nguyễn Văn A",
        "email": "teacher.a@school.edu.vn"
      },
      "status": "completed",
      "specialType": "flag_ceremony"
    }
  }
}
```

### 4. Kiểm tra slot trống

```http
GET /api/schedules/available-slots
```

**Query Parameters:**
- `className` (required): Tên lớp
- `academicYear` (required): Năm học

**Response:**
```json
{
  "success": true,
  "data": {
    "class": {
      "id": "64f8b9c123456789abcdef01",
      "name": "12A4",
      "academicYear": "2024-2025"
    },
    "totalAvailableSlots": 5,
    "availableSlots": [
      {
        "dayOfWeek": 3,
        "dayName": "Tuesday",
        "periodNumber": 6,
        "session": "afternoon",
        "timeStart": "13:30",
        "timeEnd": "14:15"
      }
    ],
    "generatedAt": "2024-12-19T10:30:00.000Z"
  }
}
```

### 5. Thêm tiết dạy bù

```http
POST /api/schedules/:scheduleId/periods/makeup
```

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "dayOfWeek": 3,
  "periodNumber": 6,
  "teacherId": "64f8b9c123456789abcdef03",
  "subjectId": "64f8b9c123456789abcdef02",
  "makeupInfo": {
    "originalDate": "2024-12-15",
    "reason": "Giáo viên bị ốm",
    "originalPeriodNumber": 2
  },
  "timeSlot": {
    "session": "afternoon",
    "start": "13:30",
    "end": "14:15"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Makeup period added successfully",
  "data": {
    "schedule": { /* schedule object */ },
    "addedPeriod": {
      "dayOfWeek": 3,
      "periodNumber": 6,
      "periodType": "makeup",
      "teacher": "Nguyễn Văn A",
      "subject": "Toán học",
      "makeupInfo": {
        "originalDate": "2024-12-15T00:00:00.000Z",
        "reason": "Giáo viên bị ốm",
        "originalPeriodNumber": 2
      }
    }
  }
}
```

### 6. Thêm hoạt động ngoại khóa

```http
POST /api/schedules/:scheduleId/periods/extracurricular
```

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "dayOfWeek": 4,
  "periodNumber": 7,
  "teacherId": "64f8b9c123456789abcdef03",
  "extracurricularInfo": {
    "activityName": "Câu lạc bộ Khoa học",
    "activityType": "science",
    "location": "Phòng thí nghiệm",
    "maxParticipants": 20
  },
  "timeSlot": {
    "session": "afternoon",
    "start": "14:20",
    "end": "15:05"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Extracurricular period added successfully",
  "data": {
    "schedule": { /* schedule object */ },
    "addedPeriod": {
      "dayOfWeek": 4,
      "periodNumber": 7,
      "periodType": "extracurricular",
      "teacher": "Nguyễn Văn A",
      "extracurricularInfo": {
        "activityName": "Câu lạc bộ Khoa học",
        "activityType": "science",
        "location": "Phòng thí nghiệm",
        "maxParticipants": 20
      }
    }
  }
}
```

## 🔒 Phân quyền

- **GET endpoints**: Yêu cầu authentication (teacher, manager, admin)
- **POST endpoints**: Yêu cầu role teacher, manager, hoặc admin

## 📝 Ghi chú

### Period Types
- `regular`: Tiết học chính quy trong thời khóa biểu
- `makeup`: Tiết dạy bù cho các tiết bị vắng
- `extracurricular`: Hoạt động ngoại khóa
- `fixed`: Tiết cố định (chào cờ, sinh hoạt lớp)

### Activity Types cho Extracurricular
- `club`: Câu lạc bộ
- `sport`: Thể thao
- `art`: Nghệ thuật
- `science`: Khoa học
- `community_service`: Phục vụ cộng đồng
- `competition`: Thi đấu
- `other`: Khác

### Time Slots
```
Morning:
- Period 1: 07:00-07:45
- Period 2: 07:50-08:35
- Period 3: 08:40-09:25
- Period 4: 09:45-10:30
- Period 5: 10:35-11:20

Afternoon:
- Period 6: 13:30-14:15
- Period 7: 14:20-15:05
```

### Days of Week
- 2: Monday (Thứ 2)
- 3: Tuesday (Thứ 3)
- 4: Wednesday (Thứ 4)
- 5: Thursday (Thứ 5)
- 6: Friday (Thứ 6)
- 7: Saturday (Thứ 7)

## 🧪 Testing

Chạy test script để kiểm tra các tính năng:

```bash
node test-period-type-management.js
```

## 🚀 Ví dụ sử dụng

### 1. Lấy thống kê tiết học của lớp 12A4
```bash
curl -X GET "http://localhost:3000/api/schedules/period-type-statistics?className=12A4&academicYear=2024-2025" \
  -H "Authorization: Bearer <token>"
```

### 2. Tìm slot trống để thêm tiết dạy bù
```bash
curl -X GET "http://localhost:3000/api/schedules/available-slots?className=12A4&academicYear=2024-2025" \
  -H "Authorization: Bearer <token>"
```

### 3. Thêm tiết dạy bù
```bash
curl -X POST "http://localhost:3000/api/schedules/64f8b9c123456789abcdef01/periods/makeup" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "dayOfWeek": 3,
    "periodNumber": 6,
    "teacherId": "64f8b9c123456789abcdef03",
    "subjectId": "64f8b9c123456789abcdef02",
    "makeupInfo": {
      "originalDate": "2024-12-15",
      "reason": "Giáo viên bị ốm",
      "originalPeriodNumber": 2
    }
  }'
``` 