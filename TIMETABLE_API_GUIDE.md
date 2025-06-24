# 🎓 Hướng dẫn API Hệ thống Thời khóa biểu

## 📋 Tổng quan hệ thống

Hệ thống thời khóa biểu được thiết kế để quản lý **38 tuần học** với các tính năng:

- ✅ **38 tuần học** hoàn chỉnh (từ tháng 8 đến tháng 5)
- ✅ **10 tiết/ngày** (5 tiết sáng, 5 tiết chiều)
- ✅ **7 ngày/tuần** (bao gồm Chủ nhật)
- ✅ **Quản lý chi tiết từng tiết học**: ai dạy, môn gì, tiết nào
- ✅ **Đánh giá và theo dõi tiến độ**
- ✅ **Tiết học ngoại khóa và dạy bù**

## 🗂️ Schema Design

### 1. **Schedule Model** (Thời khóa biểu chính)
```javascript
{
  class: ObjectId,           // Reference to Class
  academicYear: "2024-2025", // Năm học
  totalWeeks: 38,            // 38 tuần học
  weeks: [                   // Array 38 tuần
    {
      weekNumber: 1,         // Tuần số 1-38
      startDate: Date,       // Ngày bắt đầu tuần
      endDate: Date,         // Ngày kết thúc tuần
      days: [                // 7 ngày trong tuần
        {
          dayOfWeek: 2,      // 1=CN, 2=T2, ..., 7=T7
          dayName: "Monday",
          date: Date,        // Ngày cụ thể
          periods: [ObjectId] // References to Period documents
        }
      ]
    }
  ]
}
```

### 2. **Period Model** (Chi tiết từng tiết học)
```javascript
{
  periodId: "abc123_week01_day2_period01", // ID tự động
  class: ObjectId,           // Lớp học
  schedule: ObjectId,        // Thời khóa biểu
  subject: ObjectId,         // Môn học
  teacher: ObjectId,         // Giáo viên
  
  // Vị trí trong thời khóa biểu
  weekNumber: 1,             // Tuần 1-38
  dayOfWeek: 2,              // Thứ 2-7, CN=1
  dayName: "Monday",
  periodNumber: 1,           // Tiết 1-10
  date: Date,                // Ngày cụ thể
  
  // Thời gian
  session: "morning",        // morning/afternoon
  timeStart: "07:00",
  timeEnd: "07:45",
  
  // Loại tiết học
  periodType: "regular",     // regular/makeup/extracurricular/fixed/empty
  status: "not_started",     // not_started/completed/absent/makeup
  
  // Thông tin bổ sung
  notes: String,
  makeupInfo: {...},         // Thông tin tiết bù
  extracurricularInfo: {...} // Thông tin ngoại khóa
}
```

## 🚀 API Endpoints

### 📅 **1. Khởi tạo thời khóa biểu**

#### Khởi tạo cho tất cả lớp trong khối
```bash
POST /api/schedules/initialize
Authorization: Bearer <token>
Content-Type: application/json

{
  "academicYear": "2024-2025",
  "gradeLevel": 12
}
```

#### Khởi tạo cho một lớp cụ thể
```bash
POST /api/schedules/initialize-class
Authorization: Bearer <token>

{
  "classId": "64f8b9c123456789abcdef01",
  "academicYear": "2024-2025"
}
```

### 👀 **2. Xem thời khóa biểu**

#### Xem lịch học của lớp theo tuần
```bash
GET /api/schedules/class?className=12A1&academicYear=2024-2025&weekNumber=1
Authorization: Bearer <token>
```

#### 🆕 Xem lịch học theo ngày cụ thể
```bash
GET /api/schedules/day-schedule?className=12A1&academicYear=2024-2025&date=2024-12-16
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-12-16T00:00:00.000Z",
    "className": "12A1",
    "academicYear": "2024-2025",
    "dayOfWeek": 2,
    "periods": [
      {
        "id": "64f8b9c123456789abcdef02",
        "periodId": "abc123_week16_day2_period01",
        "periodNumber": 1,
        "subject": {
          "subjectName": "Toán học",
          "subjectCode": "MATH"
        },
        "teacher": {
          "name": "Nguyễn Văn A",
          "email": "teacher@school.com"
        },
        "periodType": "regular",
        "status": "not_started",
        "timeStart": "07:00",
        "timeEnd": "07:45"
      }
    ],
    "stats": {
      "totalPeriods": 10,
      "regularPeriods": 8,
      "emptyPeriods": 2,
      "completedPeriods": 0,
      "upcomingPeriods": 10
    }
  }
}
```

### 🔍 **3. Xem chi tiết tiết học**

#### Chi tiết tiết học với metadata đầy đủ
```bash
GET /api/schedules/periods/64f8b9c123456789abcdef02/detailed
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64f8b9c123456789abcdef02",
    "location": {
      "weekNumber": 16,
      "dayOfWeek": 2,
      "dayName": "Monday",
      "dayNameVN": "Thứ 2",
      "date": "2024-12-16",
      "periodNumber": 1
    },
    "basic": {
      "session": "morning",
      "sessionVN": "Sáng",
      "timeStart": "07:00",
      "timeEnd": "07:45",
      "duration": "45 phút"
    },
    "academic": {
      "subject": {
        "subjectName": "Toán học",
        "subjectCode": "MATH"
      },
      "teacher": {
        "name": "Nguyễn Văn A",
        "email": "teacher@school.com"
      }
    },
    "status": {
      "current": "not_started",
      "currentVN": "Chưa học"
    },
    "metadata": {
      "canEdit": true,
      "canMarkCompleted": true,
      "canMarkAbsent": true
    },
    "audit": {
      "createdBy": {...},
      "createdAt": "2024-12-01T00:00:00.000Z"
    }
  }
}
```

### 📊 **4. Đánh giá tiết học**

#### Đánh giá tiết học
```bash
POST /api/schedules/64f8b9c123456789abcdef01/evaluate
Authorization: Bearer <token>

{
  "periodId": "64f8b9c123456789abcdef02",
  "evaluation": {
    "rating": 4,
    "teachingMethod": "excellent",
    "studentEngagement": "good",
    "contentDelivery": "clear",
    "comments": "Tiết học rất tốt, học sinh tích cực tham gia"
  }
}
```

#### Xem đánh giá tiết học
```bash
GET /api/schedules/64f8b9c123456789abcdef01/evaluation?periodId=64f8b9c123456789abcdef02
Authorization: Bearer <token>
```

### ⚡ **5. Cập nhật trạng thái tiết học**

#### Đánh dấu tiết học hoàn thành
```bash
PATCH /api/schedules/64f8b9c123456789abcdef01/mark-completed
Authorization: Bearer <token>

{
  "periodId": "64f8b9c123456789abcdef02",
  "actualDate": "2024-12-16",
  "notes": "Hoàn thành chương trình theo kế hoạch"
}
```

#### Đánh dấu tiết học vắng
```bash
PATCH /api/schedules/64f8b9c123456789abcdef01/mark-absent
Authorization: Bearer <token>

{
  "periodId": "64f8b9c123456789abcdef02",
  "reason": "Giáo viên bận đột xuất",
  "notes": "Cần sắp xếp tiết bù"
}
```

### 🎯 **6. Tạo tiết học ngoại khóa**

```bash
POST /api/schedules/64f8b9c123456789abcdef01/periods/extracurricular
Authorization: Bearer <token>

{
  "periodId": "64f8b9c123456789abcdef03", // Tiết rỗng
  "teacherId": "64f8b9c123456789abcdef04",
  "extracurricularInfo": {
    "activityName": "Câu lạc bộ Toán học",
    "activityType": "club",
    "location": "Phòng 201",
    "maxParticipants": 30
  }
}
```

### 🔄 **7. Tạo tiết dạy bù**

```bash
POST /api/schedules/64f8b9c123456789abcdef01/periods/makeup
Authorization: Bearer <token>

{
  "periodId": "64f8b9c123456789abcdef05", // Tiết rỗng
  "teacherId": "64f8b9c123456789abcdef04",
  "subjectId": "64f8b9c123456789abcdef06",
  "makeupInfo": {
    "originalDate": "2024-12-15",
    "reason": "Giáo viên nghỉ ốm",
    "originalPeriodNumber": 3,
    "originalWeekNumber": 15,
    "originalDayOfWeek": 1
  }
}
```

### 🔍 **8. Tìm kiếm và lọc**

#### Tìm kiếm periods với filter phức tạp
```bash
GET /api/schedules/search-periods?teacher=64f8b9c123456789abcdef04&subject=64f8b9c123456789abcdef06&status=completed&weekNumber=16
Authorization: Bearer <token>
```

#### Lấy lịch giảng dạy của giáo viên theo tuần
```bash
GET /api/schedules/teacher-weekly?teacherId=64f8b9c123456789abcdef04&weekNumber=16&academicYear=2024-2025
Authorization: Bearer <token>
```

### 📈 **9. Thống kê và báo cáo**

#### Tiến độ học tập của lớp
```bash
GET /api/schedules/progress?className=12A1&academicYear=2024-2025
Authorization: Bearer <token>
```

#### Thống kê theo loại tiết học
```bash
GET /api/schedules/period-type-statistics?scheduleId=64f8b9c123456789abcdef01
Authorization: Bearer <token>
```

#### Báo cáo điểm danh
```bash
GET /api/schedules/attendance-report?className=12A1&academicYear=2024-2025&startDate=2024-12-01&endDate=2024-12-31
Authorization: Bearer <token>
```

### 🔧 **10. Bulk Operations**

#### Bulk update nhiều tiết học
```bash
PUT /api/schedules/bulk-update-periods
Authorization: Bearer <token>

{
  "periods": [
    {
      "periodId": "64f8b9c123456789abcdef02",
      "updates": {
        "status": "completed",
        "notes": "Hoàn thành tốt"
      }
    },
    {
      "periodId": "64f8b9c123456789abcdef03",
      "updates": {
        "status": "absent",
        "notes": "Giáo viên nghỉ ốm"
      }
    }
  ]
}
```

## 🎯 Các tính năng nổi bật

### 1. **PeriodId tự động**
- Format: `{scheduleId}_week{weekNumber}_day{dayOfWeek}_period{periodNumber}`
- Ví dụ: `abc123_week16_day2_period01`

### 2. **Phân loại tiết học**
- `regular`: Tiết học bình thường
- `makeup`: Tiết dạy bù
- `extracurricular`: Hoạt động ngoại khóa
- `fixed`: Tiết cố định (chào cờ, sinh hoạt lớp)
- `empty`: Tiết rỗng

### 3. **Trạng thái tiết học**
- `not_started`: Chưa học
- `completed`: Đã hoàn thành
- `absent`: Vắng tiết
- `makeup`: Tiết bù

### 4. **Tối ưu hóa database**
- Indexes cho performance
- Bulk operations
- Pagination
- Population tự động

## 🚀 Cách sử dụng

### Bước 1: Khởi tạo thời khóa biểu
```bash
# Tạo thời khóa biểu cho khối 12
curl -X POST http://localhost:3000/api/schedules/initialize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"academicYear": "2024-2025", "gradeLevel": 12}'
```

### Bước 2: Xem lịch học
```bash
# Xem lịch học ngày 16/12/2024
curl -X GET "http://localhost:3000/api/schedules/day-schedule?className=12A1&academicYear=2024-2025&date=2024-12-16" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Bước 3: Quản lý tiết học
```bash
# Đánh dấu tiết học hoàn thành
curl -X PATCH http://localhost:3000/api/schedules/SCHEDULE_ID/mark-completed \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"periodId": "PERIOD_ID", "notes": "Hoàn thành tốt"}'
```

## 🔐 Phân quyền

- **admin**: Toàn quyền
- **manager**: Quản lý thời khóa biểu
- **teacher**: Cập nhật tiết học của mình
- **student**: Xem lịch học

## 💡 Tips sử dụng

1. **Khởi tạo thời khóa biểu**: Chỉ cần làm 1 lần cho mỗi năm học
2. **Theo dõi tiến độ**: Sử dụng API progress để theo dõi
3. **Bulk operations**: Sử dụng cho cập nhật nhiều tiết cùng lúc
4. **Search**: Tận dụng filter để tìm kiếm chính xác
5. **Pagination**: Sử dụng page/limit cho data lớn 