# 📚 Hướng dẫn sử dụng Schedule API

## 🎯 Tổng quan

Module Schedule cung cấp các API để quản lý thời khóa biểu học tập. Hệ thống được tối ưu hóa để chỉ tạo và quản lý thời khóa biểu theo từng tuần, với 2 collection chính:

- **`weeklySchedules`**: Lưu thông tin tuần học
- **`lessons`**: Lưu chi tiết từng tiết học

## 🔐 Authentication

Tất cả API đều yêu cầu authentication token trong header:

```
Authorization: Bearer <your_jwt_token>
```

## 📋 Danh sách API

### 1. Tạo thời khóa biểu cho 1 tuần

**Endpoint:** `POST /api/schedules/create-weekly`

**Mô tả:** Tạo thời khóa biểu cho tất cả lớp trong một khối lớp cụ thể cho 1 tuần.

**Permissions:** `admin`, `manager`

**Request Body:**

```json
{
  "academicYear": "2024-2025",
  "gradeLevel": "12",
  "weekNumber": 1,
  "scheduleType": "MONDAY_TO_SATURDAY",
  "startDate": "2024-09-02",
  "endDate": "2024-09-07"
}
```

**Parameters:**

- `academicYear` (required): Năm học (format: YYYY-YYYY)
- `gradeLevel` (required): Khối lớp (1-12)
- `weekNumber` (optional): Số tuần (1-52, default: 1)
- `scheduleType` (optional): Loại lịch học
  - `"MONDAY_TO_SATURDAY"` (default): Thứ 2 đến thứ 7
  - `"MONDAY_TO_FRIDAY"`: Thứ 2 đến thứ 6
- `startDate` (optional): Ngày bắt đầu tuần (format: YYYY-MM-DD)
- `endDate` (optional): Ngày kết thúc tuần (format: YYYY-MM-DD)

**📅 Cách tính ngày:**

**Option 1: Tự động tính toán (không cung cấp startDate/endDate)**

```json
{
  "academicYear": "2024-2025",
  "gradeLevel": "12",
  "weekNumber": 1,
  "scheduleType": "MONDAY_TO_SATURDAY"
}
```

- Hệ thống sẽ tự động tính toán ngày dựa trên `academicYear.startDate` và `weekNumber`
- Tuần 1 = ngày bắt đầu năm học
- Tuần 2 = ngày bắt đầu năm học + 7 ngày
- Và cứ thế...

**Option 2: Tùy chỉnh ngày (cung cấp startDate/endDate)**

```json
{
  "academicYear": "2024-2025",
  "gradeLevel": "12",
  "weekNumber": 1,
  "scheduleType": "MONDAY_TO_SATURDAY",
  "startDate": "2024-09-02",
  "endDate": "2024-09-07"
}
```

- Sử dụng ngày tùy chỉnh thay vì tính toán tự động
- `startDate` và `endDate` phải được cung cấp cùng nhau
- Khoảng cách giữa 2 ngày không được quá 7 ngày
- `endDate` phải sau `startDate`

**Response Success (201):**

```json
{
  "success": true,
  "message": "Weekly schedule created successfully",
  "data": {
    "weekNumber": 1,
    "startDate": "2024-09-02T00:00:00.000Z",
    "endDate": "2024-09-07T00:00:00.000Z",
    "scheduleType": "MONDAY_TO_SATURDAY",
    "dateSource": "custom",
    "classesProcessed": 4,
    "weeklySchedulesCreated": 4,
    "totalLessonsCreated": 120,
    "classes": [
      {
        "className": "12A1",
        "gradeLevel": "12",
        "homeroomTeacher": "Nguyễn Văn A"
      },
      {
        "className": "12A2",
        "gradeLevel": "12",
        "homeroomTeacher": "Trần Thị B"
      }
    ]
  }
}
```

**Response Error (400):**

```json
{
  "success": false,
  "message": "Validation error",
  "errors": ["Academic year is required", "Grade level is required"]
}
```

### 2. Lấy thời khóa biểu theo lớp và tuần

**Endpoint:** `GET /api/schedules/class/:className/:academicYear/:weekNumber`

**Mô tả:** Lấy thời khóa biểu chi tiết của một lớp trong một tuần cụ thể.

**Permissions:** Tất cả user types (tự động lọc theo quyền)

**URL Parameters:**

- `className`: Tên lớp (ví dụ: 12A1)
- `academicYear`: Năm học (format: YYYY-YYYY)
- `weekNumber`: Số tuần (1-52)

**Example URL:**

```
GET /api/schedules/class/12A1/2024-2025/1
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Weekly schedule retrieved successfully",
  "data": {
    "class": {
      "className": "12A1",
      "gradeLevel": "12"
    },
    "weeklySchedule": {
      "weekNumber": 1,
      "startDate": "2024-09-02T00:00:00.000Z",
      "endDate": "2024-09-07T00:00:00.000Z",
      "lessons": [
        {
          "_id": "64f8b9c123456789abcdef01",
          "lessonId": "12A1-2024-2025-W1-MON-P1",
          "type": "regular",
          "status": "scheduled",
          "scheduledDate": "2024-09-02T00:00:00.000Z",
          "dayOfWeek": "Thứ 2",
          "dayNumber": 1,
          "subject": {
            "_id": "64f8b9c123456789abcdef02",
            "subjectName": "Toán học",
            "subjectCode": "MATH"
          },
          "teacher": {
            "_id": "64f8b9c123456789abcdef03",
            "name": "Nguyễn Văn A",
            "email": "nguyenvana@school.com"
          },
          "substituteTeacher": null,
          "timeSlot": {
            "_id": "64f8b9c123456789abcdef04",
            "period": 1,
            "startTime": "07:00",
            "endTime": "07:45",
            "type": "morning"
          },
          "notes": "Tiết học đầu tiên của năm học"
        }
      ]
    }
  }
}
```

### 3. Lấy thời khóa biểu giáo viên theo tuần

**Endpoint:** `GET /api/schedules/teacher/:teacherId/:academicYear/:weekNumber`

**Mô tả:** Lấy lịch dạy của một giáo viên trong một tuần cụ thể.

**Permissions:** `admin`, `manager`, `teacher` (chỉ có thể xem lịch của mình)

**URL Parameters:**

- `teacherId`: ID của giáo viên
- `academicYear`: Năm học (format: YYYY-YYYY)
- `weekNumber`: Số tuần (1-52)

**Example URL:**

```
GET /api/schedules/teacher/64f8b9c123456789abcdef03/2024-2025/1
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Teacher weekly schedule retrieved successfully",
  "data": {
    "teacherId": "64f8b9c123456789abcdef03",
    "academicYear": "2024-2025",
    "weekNumber": 1,
    "startDate": "2024-09-02T00:00:00.000Z",
    "endDate": "2024-09-07T00:00:00.000Z",
    "totalLessons": 15,
    "lessons": [
      {
        "_id": "64f8b9c123456789abcdef01",
        "lessonId": "12A1-2024-2025-W1-MON-P1",
        "type": "regular",
        "status": "scheduled",
        "scheduledDate": "2024-09-02T00:00:00.000Z",
        "dayOfWeek": "Thứ 2",
        "dayNumber": 1,
        "subject": {
          "_id": "64f8b9c123456789abcdef02",
          "subjectName": "Toán học",
          "subjectCode": "MATH"
        },
        "class": {
          "_id": "64f8b9c123456789abcdef04",
          "className": "12A1",
          "gradeLevel": "12"
        },
        "timeSlot": {
          "_id": "64f8b9c123456789abcdef05",
          "period": 1,
          "startTime": "07:00",
          "endTime": "07:45",
          "type": "morning"
        },
        "notes": "Ghi chú bài học"
      }
    ]
  }
}
```

**🔒 Quyền truy cập:**

- **Admin/Manager**: Có thể xem lịch của bất kỳ giáo viên nào
- **Teacher**: Chỉ có thể xem lịch của chính mình

### 4. Kiểm tra lớp có tồn tại không

**Endpoint:** `GET /api/schedules/check-class/:className/:academicYear`

**Mô tả:** Kiểm tra xem một lớp có tồn tại trong năm học hay không.

**Permissions:** Tất cả user types

**URL Parameters:**

- `className`: Tên lớp (ví dụ: 12A1)
- `academicYear`: Năm học (format: YYYY-YYYY)

**Example URL:**

```
GET /api/schedules/check-class/12A1/2024-2025
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Class check completed",
  "data": {
    "exists": true,
    "class": {
      "_id": "64f8b9c123456789abcdef01",
      "className": "12A1",
      "academicYear": "2024-2025",
      "gradeLevel": "12"
    }
  }
}
```

### 5. Lấy chi tiết lesson

**Endpoint:** `GET /api/schedules/lesson/:lessonId`

**Mô tả:** Lấy thông tin chi tiết của một lesson cụ thể.

**Permissions:** Tất cả user types (tự động kiểm tra quyền)

**URL Parameters:**

- `lessonId`: ID của lesson

**Example URL:**

```
GET /api/schedules/lesson/64f8b9c123456789abcdef01
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lesson detail retrieved successfully",
  "data": {
    "_id": "64f8b9c123456789abcdef01",
    "lessonId": "12A1-2024-2025-W1-MON-P1",
    "type": "regular",
    "status": "scheduled",
    "scheduledDate": "2024-01-15T00:00:00.000Z",
    "dayOfWeek": "Thứ 2",
    "dayNumber": 1,
    "subject": {
      "_id": "64f8b9c123456789abcdef02",
      "subjectName": "Toán học"
    },
    "teacher": {
      "_id": "64f8b9c123456789abcdef03",
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@school.com"
    },
    "class": {
      "_id": "64f8b9c123456789abcdef04",
      "className": "12A1"
    },
    "timeSlot": {
      "_id": "64f8b9c123456789abcdef05",
      "period": 1,
      "startTime": "07:00",
      "endTime": "07:45"
    },
    "notes": "Ghi chú bài học"
  }
}
```

### 6. Cập nhật mô tả lesson

**Endpoint:** `PATCH /api/schedules/lessons/:lessonId/description`

**Mô tả:** Cập nhật mô tả/ghi chú cho một lesson.

**Permissions:** `admin`, `manager`, `teacher` (chỉ lesson của mình)

**URL Parameters:**

- `lessonId`: ID của lesson

**Request Body:**

```json
{
  "description": "Nội dung mô tả mới"
}
```

**Example URL:**

```
PATCH /api/schedules/lessons/64f8b9c123456789abcdef01/description
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lesson description updated successfully",
  "data": {
    "_id": "64f8b9c123456789abcdef01",
    "lessonId": "12A1-2024-2025-W1-MON-P1",
    "notes": "Nội dung mô tả mới"
  }
}
```

### 7. Xóa mô tả lesson

**Endpoint:** `DELETE /api/schedules/lessons/:lessonId/description`

**Mô tả:** Xóa mô tả/ghi chú của một lesson.

**Permissions:** `admin`, `manager`, `teacher` (chỉ lesson của mình)

**URL Parameters:**

- `lessonId`: ID của lesson

**Example URL:**

```
DELETE /api/schedules/lessons/64f8b9c123456789abcdef01/description
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lesson description deleted successfully",
  "data": {
    "_id": "64f8b9c123456789abcdef01",
    "lessonId": "12A1-2024-2025-W1-MON-P1",
    "notes": null
  }
}
```

### 8. Hoàn thành lesson

**Endpoint:** `PATCH /api/schedules/lesson/:lessonId/complete`

**Mô tả:** Đánh dấu một lesson đã hoàn thành.

**Permissions:** `admin`, `manager`, `teacher` (chỉ lesson của mình)

**URL Parameters:**

- `lessonId`: ID của lesson

**Example URL:**

```
PATCH /api/schedules/lesson/64f8b9c123456789abcdef01/complete
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lesson completed successfully",
  "data": {
    "_id": "64f8b9c123456789abcdef01",
    "lessonId": "12A1-2024-2025-W1-MON-P1",
    "status": "completed"
  }
}
```

## 🆕 Tính Năng Mới

### 1. Thông Tin Ngày Trong Tuần

Tất cả API trả về lessons đều có thêm:

- `dayOfWeek`: Tên ngày bằng tiếng Việt ("Thứ 2", "Thứ 3", ...)
- `dayNumber`: Số thứ tự ngày (1-7, Chủ nhật = 7)

### 2. Cải Thiện Tiết Empty

- Tiết `empty` không còn có `class` và `teacher`
- Chỉ tiết `regular`, `makeup`, `fixed` mới có đầy đủ thông tin

### 3. API Nhất Quán

- **`/class/:className/:academicYear/:weekNumber`**: Lấy TKB lớp theo tuần
- **`/teacher/:teacherId/:academicYear/:weekNumber`**: Lấy TKB giáo viên theo tuần
- **Cấu trúc URL nhất quán** giữa class và teacher

## 📊 Lesson Types

- `regular`: Tiết học bình thường
- `makeup`: Tiết học bù
- `empty`: Tiết trống (không có class/teacher)
- `fixed`: Tiết cố định (Chào cờ, Sinh hoạt)

## 🔧 Frontend Integration

### TypeScript Code Example

```typescript
import api from "./api.config";

// Lấy thời khóa biểu lớp theo tuần
export const getClassWeeklySchedule = async ({
  className,
  academicYear,
  weekNumber,
}: {
  className: string;
  academicYear: string;
  weekNumber: number;
}) => {
  const res = await api.get(
    `/api/schedules/class/${className}/${academicYear}/${weekNumber}`
  );
  return res.data;
};

// Lấy thời khóa biểu giáo viên theo tuần
export const getTeacherWeeklySchedule = async ({
  teacherId,
  academicYear,
  weekNumber,
}: {
  teacherId: string;
  academicYear: string;
  weekNumber: number;
}) => {
  const res = await api.get(
    `/api/schedules/teacher/${teacherId}/${academicYear}/${weekNumber}`
  );
  return res.data;
};

// Lấy chi tiết lesson
export const getLessonDetail = async (lessonId: string) => {
  const res = await api.get(`/api/schedules/lesson/${lessonId}`);
  return res.data;
};

// Cập nhật mô tả lesson
export const updateLessonDescription = async (
  lessonId: string,
  description: string
): Promise<any> => {
  try {
    const response = await api.patch(
      `/api/schedules/lessons/${lessonId}/description`,
      { description }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Xóa mô tả lesson
export const deleteLessonDescription = async (
  lessonId: string
): Promise<any> => {
  try {
    const response = await api.delete(
      `/api/schedules/lessons/${lessonId}/description`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Hoàn thành lesson
export const completeLesson = async (lessonId: string): Promise<any> => {
  try {
    const response = await api.patch(
      `/api/schedules/lesson/${lessonId}/complete`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

## 🚀 Testing

```bash
# Tạo thời khóa biểu
curl -X POST "http://localhost:3000/api/schedules/create-weekly" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "academicYear": "2024-2025",
    "gradeLevel": "12",
    "weekNumber": 1,
    "scheduleType": "MONDAY_TO_SATURDAY"
  }'

# Lấy thời khóa biểu lớp theo tuần
curl -X GET "http://localhost:3000/api/schedules/class/12A1/2024-2025/1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Lấy thời khóa biểu giáo viên theo tuần
curl -X GET "http://localhost:3000/api/schedules/teacher/TEACHER_ID/2024-2025/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📞 Hỗ Trợ

Nếu có vấn đề gì, hãy liên hệ backend team để được hỗ trợ! 🎉
