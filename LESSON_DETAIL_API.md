# Lesson Detail API Documentation

## Overview
API để xem chi tiết đầy đủ của một tiết học cụ thể với thông tin phong phú và phân quyền chặt chẽ.

## Endpoint
```
GET /api/schedules/lesson/:lessonId
```

## Authentication & Authorization
- **Authentication**: Yêu cầu Bearer Token
- **Authorization**: `teacher`, `manager`, `student` có thể truy cập
- **Permission Logic**:
  - **Manager/Admin**: Xem được tất cả tiết học
  - **Teacher**: Xem được tiết học mình dạy hoặc lớp mình chủ nhiệm
  - **Student**: Xem được tiết học của lớp mình (tạm thời cho phép tất cả)

## URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lessonId` | String | Yes | ID của tiết học cần xem chi tiết |

## Example Request

```bash
curl --location 'http://localhost:3000/api/schedules/lesson/675a1b2c3d4e5f6789012345' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "message": "Lesson detail retrieved successfully",
  "data": {
    "lessonId": "582827_20241219_0001_123",
    "_id": "675a1b2c3d4e5f6789012345",
    "type": "regular",
    "status": "scheduled",
    "scheduledDate": "2024-12-19T00:00:00.000Z",
    "timeSlot": {
      "period": 2,
      "startTime": "07:50",
      "endTime": "08:35",
      "session": "morning"
    },
    "class": {
      "_id": "675a1b2c3d4e5f6789012346",
      "className": "12A1",
      "gradeLevel": 12,
      "academicYear": "2024-2025"
    },
    "subject": {
      "_id": "675a1b2c3d4e5f6789012348",
      "name": "Mathematics",
      "code": "MATH",
      "weeklyHours": 5
    },
    "teacher": {
      "_id": "675a1b2c3d4e5f6789012349",
      "name": "Nguyễn Văn Nam",
      "email": "nguyenvannam@school.edu.vn"
    },
    "topic": "Đạo hàm của hàm số",
    "notes": "Bài kiểm tra 15 phút đầu tiết",
    "permissions": {
      "canView": true,
      "canEdit": true,
      "canMarkAttendance": true
    }
  }
}
```

## Key Features

### 1. Comprehensive Information
- Basic lesson details (ID, type, status, dates)
- Schedule context (time slot, period, session)
- Academic context (class, subject, teacher details)
- Lesson content (topic, objectives, materials, homework)
- Progress tracking (evaluation, attendance)

### 2. Rich Context
- Lesson sequence (previous/next lessons)
- Day schedule context
- Weekly statistics
- Position in subject curriculum

### 3. Smart Authorization
- Role-based access control
- Ownership verification
- Permission matrix for actions

## Error Responses

### 404 Not Found
```json
{
  "success": false,
  "message": "Lesson not found"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "message": "Access denied. You do not have permission to view this lesson."
  }
}
```

## Lesson Types

| Type | Description | Special Fields |
|------|-------------|----------------|
| `regular` | Tiết học thường | Standard lesson content |
| `fixed` | Tiết cố định | `fixedInfo` (chào cờ, sinh hoạt) |
| `makeup` | Tiết bù | `makeupInfo` (lý do, tiết gốc) |
| `extracurricular` | Ngoại khóa | `extracurricularInfo` |
| `empty` | Tiết trống | Minimal information |
| `self_study` | Tự học | Study materials only |

## Lesson Status

| Status | Description |
|--------|-------------|
| `scheduled` | Đã lên lịch |
| `completed` | Đã hoàn thành |
| `cancelled` | Đã hủy |
| `postponed` | Đã hoãn |
| `in_progress` | Đang diễn ra |

## Permission Matrix

| Role | canView | canEdit | canDelete | canMarkAttendance | canAddEvaluation | canModifyContent |
|------|---------|---------|-----------|-------------------|------------------|------------------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Teacher (Own)** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Teacher (Other)** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Homeroom Teacher** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Student** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Use Cases

### 1. Teacher Preparation
- View lesson details before class
- Check materials and objectives
- Review previous lesson context
- Plan homework assignments

### 2. Student Information
- Check lesson topic and materials
- View homework assignments
- See lesson sequence and progress
- Access study resources

### 3. Administrative Oversight
- Monitor lesson completion
- Track attendance patterns
- Review teacher evaluations
- Analyze subject progress

### 4. Parent Communication
- Share lesson details with parents
- Show homework assignments
- Display progress tracking
- Provide context for student performance

## Notes

- API sử dụng **Lesson-based architecture** mới
- Thông tin được **populate đầy đủ** từ các collection liên quan
- **Phân quyền chặt chẽ** theo role và ownership
- **Context phong phú** giúp hiểu rõ vị trí lesson trong chương trình
- **Audit trail đầy đủ** cho việc theo dõi thay đổi
- Format JSON chuẩn, dễ dàng tích hợp với frontend 