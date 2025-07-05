# Lesson Completion and Evaluation API Guide

## Overview

Hướng dẫn sử dụng API hoàn thành tiết học và đánh giá tiết học đã được cập nhật theo yêu cầu mới:

1. **API Complete Lesson**: Cho phép giáo viên hoàn thành tiết học (chuyển từ `scheduled` sang `completed`)
2. **API Evaluation**: Chỉ cho phép đánh giá các tiết học đã `completed`, không tự động thay đổi status

## 1. API Complete Lesson

### Endpoint
```
PATCH /api/schedules/lesson/:lessonId/complete
```

### Authentication
- **Required**: Bearer Token
- **Roles**: `teacher`

### Authorization
- Chỉ **giáo viên đảm nhiệm** (`teacher`) hoặc **giáo viên dạy thay** (`substituteTeacher`) mới có thể complete tiết học

### Request Parameters
- `lessonId` (path parameter): ID của tiết học cần complete

### Request Body
```json
{}
```
*Không cần body data*

### Response Success (200)
```json
{
  "success": true,
  "message": "Lesson completed successfully",
  "data": {
    "lessonId": "675a1b2c3d4e5f6789012345",
    "lessonCode": "A4_20241219_0001",
    "type": "regular",
    "status": "completed",
    "scheduledDate": "2024-12-19T00:00:00.000Z",
    "actualDate": "2024-12-19T07:30:00.000Z",
    "class": "12A4",
    "subject": {
      "name": "Toán học",
      "code": "MATH"
    },
    "teacher": {
      "name": "Nguyễn Văn A",
      "email": "teacher@example.com"
    },
    "substituteTeacher": null,
    "notes": null,
    "completedBy": "main_teacher",
    "makeupInfo": null
  }
}
```

### Special Handling for Makeup Lessons
Khi complete một tiết makeup, hệ thống sẽ tự động:
- Tìm tiết gốc thông qua `makeupInfo.originalLesson`
- Kiểm tra trạng thái tiết gốc
- Chỉ cập nhật tiết gốc nếu status là `cancelled`, `postponed`, hoặc `absent`
- Chuyển tiết gốc sang `completed` với `actualDate` và `notes` tương ứng

### Response với Makeup Lesson Information
```json
{
  "success": true,
  "message": "Lesson completed successfully",
  "data": {
    "lessonId": "675a1b2c3d4e5f6789012345",
    "lessonCode": "A4_20241219_0001",
    "type": "makeup",
    "status": "completed",
    "scheduledDate": "2024-12-19T00:00:00.000Z",
    "actualDate": "2024-12-19T07:30:00.000Z",
    "class": "12A4",
    "subject": {
      "name": "Toán học",
      "code": "MATH"
    },
    "teacher": {
      "name": "Nguyễn Văn A",
      "email": "teacher@example.com"
    },
    "substituteTeacher": null,
    "notes": null,
    "completedBy": "main_teacher",
    "makeupInfo": {
      "originalLesson": "675a1b2c3d4e5f6789012344",
      "reason": "Makeup for cancelled lesson",
      "originalDate": "2024-12-18T00:00:00.000Z"
    },
    "originalLessonUpdate": {
      "updated": true,
      "originalLesson": {
        "id": "675a1b2c3d4e5f6789012344",
        "lessonId": "A4_20241218_0001",
        "previousStatus": "cancelled",
        "currentStatus": "completed"
      }
    }
  }
}
```

### Debug Information
Response sẽ bao gồm `originalLessonUpdate` để theo dõi việc cập nhật tiết gốc:

**Trường hợp thành công:**
```json
"originalLessonUpdate": {
  "updated": true,
  "originalLesson": {
    "id": "675a1b2c3d4e5f6789012344",
    "lessonId": "A4_20241218_0001", 
    "previousStatus": "cancelled",
    "currentStatus": "completed"
  }
}
```

**Trường hợp không cập nhật:**
```json
"originalLessonUpdate": {
  "updated": false,
  "reason": "Original lesson status was scheduled"
}
```

### Troubleshooting Makeup Lessons

1. **Kiểm tra makeupInfo:**
   - Đảm bảo `makeupInfo.originalLesson` có giá trị
   - Kiểm tra originalLesson có tồn tại trong database

2. **Kiểm tra trạng thái tiết gốc:**
   - Chỉ cập nhật nếu status là `cancelled`, `postponed`, hoặc `absent`
   - Nếu tiết gốc đã `completed` hoặc `scheduled`, sẽ không cập nhật

3. **Kiểm tra logs:**
   - Server sẽ log chi tiết quá trình xử lý makeup lesson
   - Tìm các log có emoji 🔄, 📝, ✅, ⚠️, ❌

### Error Responses

#### 404 - Lesson Not Found
```json
{
  "success": false,
  "message": "Lesson not found"
}
```

#### 403 - Unauthorized
```json
{
  "success": false,
  "message": "Only the assigned teacher or substitute teacher can complete this lesson"
}
```

#### 400 - Invalid Status
```json
{
  "success": false,
  "message": "Cannot complete lesson with status: completed. Only scheduled lessons can be completed."
}
```

## 2. API Teacher Evaluation (Modified)

### Endpoint
```
POST /api/schedules/teacher-evaluation/:lessonId
```

### Key Changes
1. **Chỉ đánh giá tiết `completed`**: Không thể đánh giá tiết `scheduled` nữa
2. **Không tự động chuyển status**: API không tự động chuyển tiết sang `completed`
3. **Cả 2 loại giáo viên có thể đánh giá**: Giáo viên đảm nhiệm và giáo viên dạy thay

### Authorization
- Giáo viên đảm nhiệm (`lesson.teacher`)
- Giáo viên dạy thay (`lesson.substituteTeacher`)

### Validation Updates
```javascript
// Kiểm tra trạng thái lesson
if (lesson.status !== 'completed') {
  return res.status(400).json({
    success: false,
    message: 'Can only evaluate completed lessons'
  });
}

// Kiểm tra quyền đánh giá
const isMainTeacher = lesson.teacher && lesson.teacher._id.toString() === teacherId.toString();
const isSubstituteTeacher = lesson.substituteTeacher && lesson.substituteTeacher._id.toString() === teacherId.toString();

if (!isMainTeacher && !isSubstituteTeacher) {
  return res.status(403).json({
    success: false,
    message: 'Only the assigned teacher or substitute teacher can evaluate this lesson'
  });
}
```

### Error Responses

#### 400 - Invalid Lesson Status
```json
{
  "success": false,
  "message": "Can only evaluate completed lessons"
}
```

#### 403 - Unauthorized Evaluation
```json
{
  "success": false,
  "message": "Only the assigned teacher or substitute teacher can evaluate this lesson"
}
```

## 3. Complete Workflow

### Quy trình hoàn chỉnh:

1. **Giáo viên dạy tiết học**
   - Tiết học có status `scheduled`
   - Giáo viên (chính hoặc thay) dạy tiết học

2. **Complete tiết học**
   ```bash
   PATCH /api/schedules/lesson/:lessonId/complete
   ```
   - Chuyển status từ `scheduled` sang `completed`
   - Cập nhật `actualDate`
   - Xử lý makeup lesson nếu cần

3. **Đánh giá tiết học**
   ```bash
   POST /api/schedules/teacher-evaluation/:lessonId
   ```
   - Chỉ có thể đánh giá tiết `completed`
   - Giáo viên chính hoặc thay có thể đánh giá
   - Không thay đổi status của lesson

## 4. CURL Examples

### Complete Lesson
```bash
curl -X PATCH "http://localhost:3000/api/schedules/lesson/675a1b2c3d4e5f6789012345/complete" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Evaluate Completed Lesson
```bash
curl -X POST "http://localhost:3000/api/schedules/teacher-evaluation/675a1b2c3d4e5f6789012345" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Bài 15: Hàm số bậc nhất",
    "content": "Khái niệm và tính chất của hàm số bậc nhất",
    "description": "Học sinh nắm được định nghĩa và vẽ đồ thị hàm số bậc nhất",
    "rating": "A",
    "comments": "Lớp học tích cực, đạt mục tiêu bài học",
    "evaluationDetails": {
      "teachingMethod": "Thuyết trình kết hợp thực hành",
      "studentParticipation": "Tốt"
    },
    "absentStudents": [],
    "oralTests": [],
    "violations": []
  }'
```

## 5. Status Flow

```
Lesson Status Flow:
scheduled → [Complete API] → completed → [Evaluation API] → evaluated

Makeup Lesson Flow:
1. Original lesson: scheduled → cancelled
2. Makeup lesson: scheduled → [Complete API] → completed
3. Original lesson: cancelled → completed (auto-updated)
4. Makeup lesson: completed → [Evaluation API] → evaluated
```

## 6. Permissions Summary

| Action | Main Teacher | Substitute Teacher | Manager | Admin |
|--------|-------------|-------------------|---------|-------|
| Complete Lesson | ✅ | ✅ | ❌ | ❌ |
| Evaluate Lesson | ✅ | ✅ | ❌ | ❌ |
| View Evaluation | ✅ | ✅ | ✅ | ✅ |

## 7. Notes

- **Makeup Lessons**: Khi complete makeup lesson, tiết gốc sẽ tự động được chuyển sang `completed`
- **Evaluation Timing**: Phải complete lesson trước khi đánh giá
- **Teacher Rights**: Cả giáo viên chính và giáo viên thay đều có quyền complete và evaluate
- **Status Immutability**: Một khi lesson đã `completed`, không thể revert về `scheduled`
- **No Body Required**: API complete lesson không cần body data 