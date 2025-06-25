# Teacher Schedule API Documentation

## Overview
API để lấy lịch dạy của giáo viên theo khoảng thời gian sử dụng Lesson-based architecture mới.
**Đặc biệt**: API hiển thị **đầy đủ 10 tiết mỗi ngày** (từ tiết 1 đến tiết 10), bao gồm cả tiết trống.

## Endpoint
```
GET /api/schedules/teacher
```

## Authentication & Authorization
- **Authentication**: Yêu cầu Bearer Token
- **Authorization**: Chỉ `teacher` và `manager` có thể truy cập
- **Permission Logic**:
  - **Teacher**: Chỉ có thể xem lịch của chính mình
  - **Manager**: Có thể xem lịch của bất kỳ giáo viên nào

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teacherId` | String | Yes | ID của giáo viên |
| `academicYear` | String | Yes | Năm học (ví dụ: "2024-2025") |
| `startOfWeek` | String | Yes | Ngày bắt đầu tuần (YYYY-MM-DD) |
| `endOfWeek` | String | Yes | Ngày kết thúc tuần (YYYY-MM-DD) |

## Response Format

### Schedule Structure
Mỗi ngày sẽ có **đầy đủ 10 tiết** (từ tiết 1 đến tiết 10):

```json
{
  "success": true,
  "teacher": {
    "_id": "teacherId",
    "name": "Tên giáo viên",
    "email": "email@example.com",
    "role": ["teacher"],
    "subject": "subjectId"
  },
  "schedule": [
    {
      "date": "2024-12-19",
      "dayOfWeek": 4,
      "dayName": "Thursday",
      "dayNameVN": "Thứ 5",
      "periods": [
        {
          "period": 1,
          "hasLesson": true,
          "lessonId": "lesson123",
          "type": "regular",
          "status": "scheduled",
          "timeSlot": {
            "period": 1,
            "startTime": "07:00",
            "endTime": "07:45"
          },
          "class": {
            "_id": "classId",
            "className": "12A1",
            "gradeLevel": 12
          },
          "subject": {
            "_id": "subjectId",
            "name": "Mathematics",
            "code": "MATH",
            "department": "Science"
          },
          "topic": "Đạo hàm",
          "notes": "Bài kiểm tra 15 phút"
        },
        {
          "period": 2,
          "hasLesson": false,
          "lessonId": null,
          "type": "empty",
          "status": "free",
          "timeSlot": {
            "period": 2,
            "startTime": "07:50",
            "endTime": "08:35"
          },
          "class": null,
          "subject": null,
          "notes": "Tiết trống"
        }
        // ... tiết 3-10 tương tự
      ]
    }
  ],
  "statistics": {
    "totalLessons": 25,
    "freePeriods": 45,
    "completedLessons": 10,
    "scheduledLessons": 15,
    "cancelledLessons": 0,
    "completionRate": "40.00%",
    "dailyWorkload": {
      "Thursday": {
        "date": "2024-12-19",
        "totalPeriods": 10,
        "totalLessons": 6,
        "freePeriods": 4,
        "morningLessons": 4,
        "afternoonLessons": 2,
        "completedLessons": 2,
        "periodBreakdown": {
          "morning": [
            { "period": 1, "hasLesson": true, "subject": "MATH" },
            { "period": 2, "hasLesson": false, "subject": null },
            { "period": 3, "hasLesson": true, "subject": "PHYS" },
            { "period": 4, "hasLesson": true, "subject": "MATH" },
            { "period": 5, "hasLesson": true, "subject": "CHEM" }
          ],
          "afternoon": [
            { "period": 6, "hasLesson": false, "subject": null },
            { "period": 7, "hasLesson": true, "subject": "MATH" },
            { "period": 8, "hasLesson": true, "subject": "PHYS" },
            { "period": 9, "hasLesson": false, "subject": null },
            { "period": 10, "hasLesson": false, "subject": null }
          ]
        }
      }
    }
  },
  "metadata": {
    "totalDays": 7,
    "daysWithLessons": 5,
    "periodsPerDay": 10,
    "totalPeriods": 70,
    "architecture": "lesson-based",
    "displayFormat": "full-10-periods"
  }
}
```

## Key Features

### 1. Đầy đủ 10 tiết mỗi ngày
- API luôn trả về **đúng 10 tiết** cho mỗi ngày (từ tiết 1 đến tiết 10)
- Tiết có lesson: `hasLesson: true` với đầy đủ thông tin
- Tiết trống: `hasLesson: false` với `type: "empty"`, `status: "free"`, `notes: "Tiết trống"`

### 2. Thông tin chi tiết mỗi tiết
- **Có lesson**: Đầy đủ thông tin lớp, môn học, giáo viên, nội dung
- **Tiết trống**: Vẫn có thông tin khung giờ, đánh dấu rõ là tiết trống

### 3. Thống kê chi tiết
- `totalPeriods`: Tổng số tiết (luôn = số ngày × 10)
- `totalLessons`: Số tiết có dạy
- `freePeriods`: Số tiết trống
- `periodBreakdown`: Phân tích chi tiết buổi sáng/chiều

## Example Request

### Manager xem lịch giáo viên
```bash
curl --location 'http://localhost:3000/api/schedules/teacher?teacherId=68557c6a0672fea58658278c&academicYear=2024-2025&startOfWeek=2024-12-19&endOfWeek=2024-12-25' \
--header 'Authorization: Bearer YOUR_MANAGER_TOKEN'
```

### Teacher xem lịch của chính mình
```bash
curl --location 'http://localhost:3000/api/schedules/teacher?teacherId=TEACHER_ID&academicYear=2024-2025&startOfWeek=2024-12-19&endOfWeek=2024-12-25' \
--header 'Authorization: Bearer TEACHER_TOKEN'
```

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### 403 Forbidden (Teacher accessing other's schedule)
```json
{
  "success": false,
  "message": "Access denied. Teachers can only view their own schedule."
}
```

### 404 Teacher Not Found
```json
{
  "success": false,
  "error": {
    "message": "Teacher with ID 123 not found"
  }
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "teacherId, academicYear, startOfWeek, and endOfWeek are required"
}
```

## Time Slots Reference

| Tiết | Thời gian | Buổi |
|------|-----------|------|
| 1 | 07:00 - 07:45 | Sáng |
| 2 | 07:50 - 08:35 | Sáng |
| 3 | 08:40 - 09:25 | Sáng |
| 4 | 09:45 - 10:30 | Sáng (sau giờ ra chơi) |
| 5 | 10:35 - 11:20 | Sáng |
| 6 | 12:30 - 13:15 | Chiều |
| 7 | 13:20 - 14:05 | Chiều |
| 8 | 14:10 - 14:55 | Chiều |
| 9 | 15:00 - 15:45 | Chiều |
| 10 | 15:50 - 16:35 | Chiều |

## Notes

- API sử dụng **Lesson-based architecture** mới
- Hiển thị **đầy đủ 10 tiết** mỗi ngày để dễ dàng theo dõi lịch trình
- Hỗ trợ phân quyền: teacher chỉ xem được lịch của mình, manager xem được tất cả
- Thống kê chi tiết giúp phân tích khối lượng công việc
- Format JSON chuẩn, dễ dàng tích hợp với frontend 