# Lesson Swap API Guide

## Tổng quan
Module đổi tiết cho phép giáo viên yêu cầu đổi tiết học của mình sang tiết trống khác trong cùng lớp và cùng tuần. Manager sẽ duyệt yêu cầu và hệ thống tự động thực hiện đổi tiết khi được chấp thuận.

## Flow hoạt động

### 1. Giáo viên tạo yêu cầu đổi tiết
1. Giáo viên chọn tiết học muốn đổi (phải là tiết `scheduled`)
2. Hệ thống hiển thị các tiết trống (`empty`) trong cùng lớp và cùng tuần
3. Giáo viên chọn tiết trống muốn đổi và nhập lý do
4. Hệ thống tự động tính toán tuần dựa trên ngày của tiết học gốc
5. Hệ thống kiểm tra tiết thay thế có cùng tuần và cùng lớp không
6. Hệ thống tạo yêu cầu và gửi email thông báo cho manager

### 2. Manager xử lý yêu cầu
1. Manager xem danh sách yêu cầu đang chờ duyệt
2. Manager approve hoặc reject với nhận xét
3. Nếu approve: Hệ thống tự động đổi tiết và gửi email thông báo
4. Nếu reject: Gửi email thông báo từ chối

### 3. Thông báo email
- **Khi tạo yêu cầu**: Gửi email cho manager
- **Khi approve**: Gửi email cho giáo viên và học sinh trong lớp
- **Khi reject**: Gửi email cho giáo viên

## API Endpoints

### Base URL
```
/api/schedules/lesson-swap
```

### Authentication
Tất cả endpoints đều yêu cầu authentication header:
```
Authorization: Bearer <your_jwt_token>
```

### Authorization
- **Teacher endpoints**: Chỉ giáo viên có thể truy cập
  - `GET /teacher-lessons` - Lấy tiết học của giáo viên
  - `GET /available-lessons` - Lấy tiết trống có thể đổi
  - `POST /request` - Tạo yêu cầu đổi tiết
  - `GET /my-requests` - Lấy yêu cầu của giáo viên

- **Manager/Admin endpoints**: Chỉ manager và admin có thể truy cập
  - `GET /pending` - Lấy yêu cầu chờ duyệt
  - `PATCH /:requestId/approve` - Duyệt yêu cầu
  - `PATCH /:requestId/reject` - Từ chối yêu cầu

- **Common endpoints**: Tất cả user đã xác thực có thể truy cập
  - `GET /:requestId` - Chi tiết yêu cầu
  - `GET /test-auth` - Test authentication

---

## 1. Lấy các tiết học của giáo viên để đổi

**Endpoint:** `GET /teacher-lessons`

**Mô tả:** Lấy danh sách các tiết học `scheduled` của giáo viên trong tuần để có thể đổi

**Query Parameters:**
- `teacherId` (required): ID của giáo viên
- `academicYear` (required): ID năm học
- `startOfWeek` (required): Ngày bắt đầu tuần (ISO 8601)
- `endOfWeek` (required): Ngày kết thúc tuần (ISO 8601)

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/schedules/lesson-swap/teacher-lessons?teacherId=64f8b9c123456789abcdef07&academicYear=64f8b9c123456789abcdef01&startOfWeek=2024-12-16T00:00:00.000Z&endOfWeek=2024-12-22T23:59:59.999Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "lessons": [
    {
      "_id": "675a1b2c3d4e5f6789012345",
      "lessonId": "12A4_20241216_0001",
      "scheduledDate": "2024-12-16T00:00:00.000Z",
      "status": "scheduled",
      "type": "regular",
      "class": {
        "_id": "64f8b9c123456789abcdef02",
        "className": "12A4",
        "gradeLevel": 12
      },
      "subject": {
        "_id": "64f8b9c123456789abcdef03",
        "subjectName": "Toán học",
        "subjectCode": "MATH"
      },
      "timeSlot": {
        "_id": "64f8b9c123456789abcdef04",
        "period": 1,
        "startTime": "07:00",
        "endTime": "07:45"
      }
    }
  ],
  "count": 1
}
```

---

## 2. Lấy các tiết trống có thể đổi

**Endpoint:** `GET /available-lessons`

**Mô tả:** Lấy danh sách các tiết trống (`empty`) trong lớp để có thể đổi tiết

**Query Parameters:**
- `classId` (required): ID của lớp
- `academicYear` (required): ID năm học
- `startOfWeek` (required): Ngày bắt đầu tuần (ISO 8601)
- `endOfWeek` (required): Ngày kết thúc tuần (ISO 8601)
- `subjectId` (required): ID môn học (để hiển thị thông tin)

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/schedules/lesson-swap/available-lessons?classId=64f8b9c123456789abcdef02&academicYear=64f8b9c123456789abcdef01&startOfWeek=2024-12-16T00:00:00.000Z&endOfWeek=2024-12-22T23:59:59.999Z&subjectId=64f8b9c123456789abcdef03" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "availableLessons": [
    {
      "_id": "675a1b2c3d4e5f6789012346",
      "lessonId": "12A4_20241217_0003",
      "scheduledDate": "2024-12-17T00:00:00.000Z",
      "status": "scheduled",
      "type": "empty",
      "class": {
        "_id": "64f8b9c123456789abcdef02",
        "className": "12A4",
        "gradeLevel": 12
      },
      "timeSlot": {
        "_id": "64f8b9c123456789abcdef05",
        "period": 3,
        "startTime": "08:45",
        "endTime": "09:30"
      }
    }
  ],
  "subjectInfo": {
    "_id": "64f8b9c123456789abcdef03",
    "subjectName": "Toán học",
    "subjectCode": "MATH"
  },
  "count": 1
}
```

---

## 3. Tạo yêu cầu đổi tiết

**Endpoint:** `POST /request`

**Mô tả:** Tạo yêu cầu đổi tiết mới (chỉ giáo viên)

**Lưu ý:** Hệ thống sẽ tự động tính toán tuần dựa trên ngày của tiết học gốc và kiểm tra xem tiết thay thế có cùng tuần không. Bạn chỉ cần cung cấp ID của tiết học gốc, tiết thay thế và lý do đổi tiết.

**Request Body:**
```json
{
  "originalLessonId": "675a1b2c3d4e5f6789012345",
  "replacementLessonId": "675a1b2c3d4e5f6789012346",
  "reason": "Tôi có lịch họp phụ huynh vào tiết này, cần đổi sang tiết khác để đảm bảo chất lượng giảng dạy"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/schedules/lesson-swap/request" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "originalLessonId": "675a1b2c3d4e5f6789012345",
    "replacementLessonId": "675a1b2c3d4e5f6789012346",
    "reason": "Tôi có lịch họp phụ huynh vào tiết này, cần đổi sang tiết khác để đảm bảo chất lượng giảng dạy"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Lesson swap request created successfully. Managers will be notified via email.",
  "swapRequest": {
    "_id": "675a1b2c3d4e5f6789012347",
    "swapId": "SWAP_LK5M2N8P_ABC12",
    "status": "pending",
    "reason": "Tôi có lịch họp phụ huynh vào tiết này, cần đổi sang tiết khác để đảm bảo chất lượng giảng dạy",
    "requestingTeacher": {
      "_id": "64f8b9c123456789abcdef07",
      "name": "Nguyễn Văn A",
      "email": "teacher@example.com"
    },
    "originalLesson": {
      "_id": "675a1b2c3d4e5f6789012345",
      "lessonId": "12A4_20241216_0001",
      "scheduledDate": "2024-12-16T00:00:00.000Z"
    },
    "replacementLesson": {
      "_id": "675a1b2c3d4e5f6789012346",
      "lessonId": "12A4_20241217_0003",
      "scheduledDate": "2024-12-17T00:00:00.000Z"
    },
    "createdAt": "2024-12-16T10:00:00.000Z"
  }
}
```

---

---

## 4. Duyệt yêu cầu đổi tiết

**Endpoint:** `PATCH /:requestId/approve`

**Mô tả:** Manager duyệt yêu cầu đổi tiết (chỉ manager/admin)

**URL Parameters:**
- `requestId` (required): ID của yêu cầu đổi tiết

**Request Body:**
```json
{
  "comment": "Nhận xét của manager (tùy chọn)"
}
```

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/schedules/lesson-swap/675a1b2c3d4e5f6789012347/approve" \
  -H "Authorization: Bearer YOUR_MANAGER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Đã duyệt yêu cầu đổi tiết. Lý do hợp lý."
  }'
```

---

## 5. Từ chối yêu cầu đổi tiết

**Endpoint:** `PATCH /:requestId/reject`

**Mô tả:** Manager từ chối yêu cầu đổi tiết (chỉ manager/admin)

**URL Parameters:**
- `requestId` (required): ID của yêu cầu đổi tiết

**Request Body:**
```json
{
  "comment": "Lý do từ chối (bắt buộc)"
}
```

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/schedules/lesson-swap/675a1b2c3d4e5f6789012347/reject" \
  -H "Authorization: Bearer YOUR_MANAGER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Không thể duyệt vì lý do không hợp lý."
  }'
```

---

## Các endpoint khác

Bao gồm:
- `GET /my-requests` - Lấy yêu cầu của giáo viên
- `GET /pending` - Lấy yêu cầu chờ duyệt (manager)
- `GET /:requestId` - Chi tiết yêu cầu

## Testing Commands

```bash
# 0. Test authentication
curl -X GET "http://localhost:3000/api/schedules/lesson-swap/test-auth" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 1. Lấy tiết học của giáo viên
curl -X GET "http://localhost:3000/api/schedules/lesson-swap/teacher-lessons?teacherId=YOUR_TEACHER_ID&academicYear=YOUR_ACADEMIC_YEAR_ID&startOfWeek=2024-12-16T00:00:00.000Z&endOfWeek=2024-12-22T23:59:59.999Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. Tạo yêu cầu đổi tiết
curl -X POST "http://localhost:3000/api/schedules/lesson-swap/request" \
  -H "Authorization: Bearer YOUR_TEACHER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "originalLessonId": "YOUR_ORIGINAL_LESSON_ID",
    "replacementLessonId": "YOUR_REPLACEMENT_LESSON_ID",
    "reason": "Lý do đổi tiết của bạn (ít nhất 10 ký tự)"
  }'

# 3. Manager duyệt yêu cầu
curl -X PATCH "http://localhost:3000/api/schedules/lesson-swap/YOUR_REQUEST_ID/approve" \
  -H "Authorization: Bearer YOUR_MANAGER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Nhận xét của manager"
  }'

# 4. Manager từ chối yêu cầu
curl -X PATCH "http://localhost:3000/api/schedules/lesson-swap/YOUR_REQUEST_ID/reject" \
  -H "Authorization: Bearer YOUR_MANAGER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Lý do từ chối yêu cầu"
  }'
```

## Error Handling

### Authentication Errors

**401 Unauthorized - Missing Token:**
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

**401 Unauthorized - Invalid Token:**
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

**401 Unauthorized - Token Expired:**
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### Authorization Errors

**403 Forbidden - Wrong Role:**
```json
{
  "success": false,
  "message": "User roles [teacher] are not authorized to access this route. Required: [admin, manager]"
}
```

**403 Forbidden - Access Denied:**
```json
{
  "success": false,
  "message": "You can only view your own lessons"
}
```

### Common Usage Examples

**Correct Authentication Header:**
```bash
curl -X GET "http://localhost:3000/api/schedules/lesson-swap/test-auth" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Missing Authorization Header:**
```bash
curl -X GET "http://localhost:3000/api/schedules/lesson-swap/test-auth"
# Returns: 401 Unauthorized
```

**Invalid Token Format:**
```bash
curl -X GET "http://localhost:3000/api/schedules/lesson-swap/test-auth" \
  -H "Authorization: invalid_token"
# Returns: 401 Unauthorized
```
``` 