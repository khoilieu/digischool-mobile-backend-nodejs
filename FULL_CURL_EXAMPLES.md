# Lesson Request API - Full CURL Examples

## Setup
```bash
# Set your base URL and token
BASE_URL="http://localhost:3000/api"
TOKEN="your_jwt_token_here"

# Or for production
# BASE_URL="https://your-domain.com/api"
```

## 1. Lấy danh sách tiết học của giáo viên để đổi tiết (Swap)

```bash
curl -X GET "${BASE_URL}/schedules/lesson-request/teacher-lessons?teacherId=675a1b2c3d4e5f6789012345&academicYear=675a1b2c3d4e5f6789012340&startOfWeek=2024-12-16&endOfWeek=2024-12-22&requestType=swap" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## 2. Lấy danh sách tiết học của giáo viên để dạy bù (Makeup)

```bash
curl -X GET "${BASE_URL}/schedules/lesson-request/teacher-lessons?teacherId=675a1b2c3d4e5f6789012345&academicYear=675a1b2c3d4e5f6789012340&startOfWeek=2024-12-16&endOfWeek=2024-12-22&requestType=makeup" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## 3. Lấy danh sách tiết trống có thể dùng

```bash
curl -X GET "${BASE_URL}/schedules/lesson-request/available-lessons?classId=675a1b2c3d4e5f6789012341&academicYear=675a1b2c3d4e5f6789012340&startOfWeek=2024-12-16&endOfWeek=2024-12-22&subjectId=675a1b2c3d4e5f6789012342" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## 4. Tạo yêu cầu đổi tiết (Swap Request)

```bash
curl -X POST "${BASE_URL}/schedules/lesson-request/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "originalLessonId": "675a1b2c3d4e5f6789012345",
    "replacementLessonId": "675a1b2c3d4e5f6789012346",
    "requestType": "swap",
    "reason": "Có việc đột xuất cần xử lý, cần đổi tiết để tham gia họp phụ huynh"
  }'
```

## 5. Tạo yêu cầu dạy bù (Makeup Request)

```bash
curl -X POST "${BASE_URL}/schedules/lesson-request/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "originalLessonId": "675a1b2c3d4e5f6789012347",
    "replacementLessonId": "675a1b2c3d4e5f6789012348",
    "requestType": "makeup",
    "reason": "Dạy bù tiết học đã vắng do ốm",
    "absentReason": "Giáo viên bị cảm cúm không thể dạy"
  }'
```

## 6. Lấy danh sách yêu cầu của giáo viên (tất cả)

```bash
curl -X GET "${BASE_URL}/schedules/lesson-request/my-requests" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## 7. Lấy danh sách yêu cầu đổi tiết của giáo viên

```bash
curl -X GET "${BASE_URL}/schedules/lesson-request/my-requests?requestType=swap" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## 8. Lấy danh sách yêu cầu dạy bù của giáo viên

```bash
curl -X GET "${BASE_URL}/schedules/lesson-request/my-requests?requestType=makeup" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## 9. Lấy danh sách yêu cầu pending của giáo viên

```bash
curl -X GET "${BASE_URL}/schedules/lesson-request/my-requests?status=pending" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## 10. Lấy danh sách yêu cầu với filter thời gian

```bash
curl -X GET "${BASE_URL}/schedules/lesson-request/my-requests?startDate=2024-12-01&endDate=2024-12-31&status=approved" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## 11. Lấy danh sách yêu cầu chờ duyệt (Manager) - Tất cả

```bash
curl -X GET "${BASE_URL}/schedules/lesson-request/pending" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## 12. Lấy danh sách yêu cầu đổi tiết chờ duyệt (Manager)

```bash
curl -X GET "${BASE_URL}/schedules/lesson-request/pending?requestType=swap" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## 13. Lấy danh sách yêu cầu dạy bù chờ duyệt (Manager)

```bash
curl -X GET "${BASE_URL}/schedules/lesson-request/pending?requestType=makeup" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## 14. Lấy danh sách yêu cầu theo lớp (Manager)

```bash
curl -X GET "${BASE_URL}/schedules/lesson-request/pending?classId=675a1b2c3d4e5f6789012341" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## 15. Lấy danh sách yêu cầu theo năm học (Manager)

```bash
curl -X GET "${BASE_URL}/schedules/lesson-request/pending?academicYear=675a1b2c3d4e5f6789012340" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## 16. Duyệt yêu cầu (Manager)

```bash
curl -X PATCH "${BASE_URL}/schedules/lesson-request/675a1b2c3d4e5f6789012349/approve" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Yêu cầu hợp lý, đã duyệt. Vui lòng chuẩn bị bài giảng cho tiết học mới."
  }'
```

## 17. Duyệt yêu cầu không có comment (Manager)

```bash
curl -X PATCH "${BASE_URL}/schedules/lesson-request/675a1b2c3d4e5f6789012349/approve" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 18. Từ chối yêu cầu (Manager)

```bash
curl -X PATCH "${BASE_URL}/schedules/lesson-request/675a1b2c3d4e5f6789012349/reject" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Không thể duyệt do trùng lịch với hoạt động quan trọng khác. Vui lòng chọn thời gian khác."
  }'
```

## 19. Lấy chi tiết yêu cầu

```bash
curl -X GET "${BASE_URL}/schedules/lesson-request/675a1b2c3d4e5f6789012349" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## 20. Endpoints thay thế (từ main routes)

### Lấy danh sách yêu cầu của giáo viên
```bash
curl -X GET "${BASE_URL}/lesson-requests/my-requests" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

### Tạo yêu cầu mới
```bash
curl -X POST "${BASE_URL}/lesson-requests/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "originalLessonId": "675a1b2c3d4e5f6789012345",
    "replacementLessonId": "675a1b2c3d4e5f6789012346",
    "requestType": "swap",
    "reason": "Lý do đổi tiết"
  }'
```

## Test Scenarios

### Scenario 1: Giáo viên tạo yêu cầu đổi tiết
```bash
# 1. Lấy danh sách tiết scheduled của giáo viên
curl -X GET "${BASE_URL}/schedules/lesson-request/teacher-lessons?teacherId=TEACHER_ID&academicYear=ACADEMIC_YEAR_ID&startOfWeek=2024-12-16&endOfWeek=2024-12-22&requestType=swap" \
  -H "Authorization: Bearer ${TOKEN}"

# 2. Lấy danh sách tiết trống
curl -X GET "${BASE_URL}/schedules/lesson-request/available-lessons?classId=CLASS_ID&academicYear=ACADEMIC_YEAR_ID&startOfWeek=2024-12-16&endOfWeek=2024-12-22&subjectId=SUBJECT_ID" \
  -H "Authorization: Bearer ${TOKEN}"

# 3. Tạo yêu cầu đổi tiết
curl -X POST "${BASE_URL}/schedules/lesson-request/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "originalLessonId": "ORIGINAL_LESSON_ID",
    "replacementLessonId": "REPLACEMENT_LESSON_ID",
    "requestType": "swap",
    "reason": "Có việc đột xuất"
  }'
```

### Scenario 2: Giáo viên tạo yêu cầu dạy bù
```bash
# 1. Lấy danh sách tiết absent của giáo viên
curl -X GET "${BASE_URL}/schedules/lesson-request/teacher-lessons?teacherId=TEACHER_ID&academicYear=ACADEMIC_YEAR_ID&startOfWeek=2024-12-16&endOfWeek=2024-12-22&requestType=makeup" \
  -H "Authorization: Bearer ${TOKEN}"

# 2. Lấy danh sách tiết trống
curl -X GET "${BASE_URL}/schedules/lesson-request/available-lessons?classId=CLASS_ID&academicYear=ACADEMIC_YEAR_ID&startOfWeek=2024-12-16&endOfWeek=2024-12-22&subjectId=SUBJECT_ID" \
  -H "Authorization: Bearer ${TOKEN}"

# 3. Tạo yêu cầu dạy bù
curl -X POST "${BASE_URL}/schedules/lesson-request/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "originalLessonId": "ABSENT_LESSON_ID",
    "replacementLessonId": "EMPTY_LESSON_ID",
    "requestType": "makeup",
    "reason": "Dạy bù tiết vắng",
    "absentReason": "Giáo viên ốm"
  }'
```

### Scenario 3: Manager xử lý yêu cầu
```bash
# 1. Xem danh sách yêu cầu chờ duyệt
curl -X GET "${BASE_URL}/schedules/lesson-request/pending" \
  -H "Authorization: Bearer ${TOKEN}"

# 2. Xem chi tiết yêu cầu
curl -X GET "${BASE_URL}/schedules/lesson-request/REQUEST_ID" \
  -H "Authorization: Bearer ${TOKEN}"

# 3. Duyệt yêu cầu
curl -X PATCH "${BASE_URL}/schedules/lesson-request/REQUEST_ID/approve" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Đã duyệt"
  }'
```

## Error Test Cases

### 1. Test validation errors
```bash
# Thiếu requestType
curl -X POST "${BASE_URL}/schedules/lesson-request/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "originalLessonId": "675a1b2c3d4e5f6789012345",
    "replacementLessonId": "675a1b2c3d4e5f6789012346",
    "reason": "Test"
  }'

# RequestType không hợp lệ
curl -X POST "${BASE_URL}/schedules/lesson-request/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "originalLessonId": "675a1b2c3d4e5f6789012345",
    "replacementLessonId": "675a1b2c3d4e5f6789012346",
    "requestType": "invalid",
    "reason": "Test"
  }'

# Reason quá ngắn
curl -X POST "${BASE_URL}/schedules/lesson-request/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "originalLessonId": "675a1b2c3d4e5f6789012345",
    "replacementLessonId": "675a1b2c3d4e5f6789012346",
    "requestType": "swap",
    "reason": "Short"
  }'
```

### 2. Test authorization
```bash
# Không có token
curl -X GET "${BASE_URL}/schedules/lesson-request/my-requests" \
  -H "Content-Type: application/json"

# Token không hợp lệ
curl -X GET "${BASE_URL}/schedules/lesson-request/my-requests" \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json"
```

## Response Examples

### Success Response (Create Request)
```json
{
  "success": true,
  "message": "Lesson swap request created successfully",
  "request": {
    "_id": "675a1b2c3d4e5f6789012349",
    "requestId": "SWAP_ABC123_XYZ789",
    "requestType": "swap",
    "requestingTeacher": {
      "_id": "675a1b2c3d4e5f6789012345",
      "name": "Nguyễn Văn A",
      "email": "teacher@example.com"
    },
    "originalLesson": {
      "_id": "675a1b2c3d4e5f6789012345",
      "lessonId": "12A1_20241216_P1",
      "scheduledDate": "2024-12-16T00:00:00.000Z",
      "status": "scheduled"
    },
    "replacementLesson": {
      "_id": "675a1b2c3d4e5f6789012346",
      "lessonId": "12A1_20241217_P2",
      "scheduledDate": "2024-12-17T00:00:00.000Z",
      "status": "scheduled"
    },
    "reason": "Có việc đột xuất cần xử lý",
    "status": "pending",
    "createdAt": "2024-12-16T10:30:00.000Z"
  }
}
```

### Error Response (Validation)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Request type is required",
      "param": "requestType",
      "location": "body"
    },
    {
      "msg": "Reason must be between 10 and 500 characters",
      "param": "reason",
      "location": "body"
    }
  ]
}
```

## Notes

1. **Thay thế các ID placeholders**:
   - `TEACHER_ID`: ID thực của giáo viên
   - `ACADEMIC_YEAR_ID`: ID thực của năm học
   - `CLASS_ID`: ID thực của lớp
   - `SUBJECT_ID`: ID thực của môn học
   - `LESSON_ID`: ID thực của tiết học

2. **Authorization**:
   - Giáo viên chỉ có thể tạo và xem yêu cầu của mình
   - Manager có thể xem tất cả và duyệt yêu cầu

3. **Validation**:
   - Tiết gốc và tiết thay thế phải cùng lớp, cùng tuần
   - Không được có yêu cầu pending khác cho cùng tiết 