# API Quản Lý Nhắc Nhở Kiểm Tra Tiết Học

## Tổng Quan
API này cho phép giáo viên tạo, xem, sửa, xóa các nhắc nhở kiểm tra cho các tiết học của mình. Chỉ giáo viên dạy tiết đó mới có quyền tạo nhắc nhở, và tiết học phải có trạng thái `scheduled`.

## Base URL
```
/api/lesson-reminders
```

## Authentication
Tất cả các endpoint đều yêu cầu:
- Bearer token trong header Authorization
- Role `teacher`

## Endpoints

### 1. Tạo Nhắc Nhở Kiểm Tra

**POST** `/lessons/:lessonId`

Tạo nhắc nhở kiểm tra cho một tiết học cụ thể.

#### Request Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Request Body
```json
{
  "testType": "kiemtra15",
  "title": "Kiểm tra 15 phút - Chương 3",
  "content": "Kiểm tra kiến thức về phương trình bậc hai và ứng dụng",
  "chapters": [
    {
      "chapterName": "Chương 3: Phương trình bậc hai",
      "topics": [
        "Công thức nghiệm",
        "Định lý Viète",
        "Ứng dụng thực tế"
      ]
    }
  ],
  "references": [
    {
      "title": "SGK Toán 9 - Trang 45-60",
      "description": "Lý thuyết cơ bản về phương trình bậc hai",
      "url": "https://example.com/toan9-ch3"
    }
  ],
  "expectedTestDate": "2024-02-15T07:00:00.000Z",
  "priority": "high",
  "notes": "Học sinh cần ôn tập kỹ công thức nghiệm"
}
```

#### Response Success (201)
```json
{
  "success": true,
  "message": "Tạo nhắc nhở kiểm tra thành công",
  "data": {
    "reminderId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "lesson": {
      "lessonId": "LESSON_001",
      "scheduledDate": "2024-02-15T07:00:00.000Z",
      "topic": "Phương trình bậc hai"
    },
    "class": "12A1",
    "subject": {
      "name": "Toán học",
      "code": "MATH"
    },
    "teacher": "Nguyễn Văn A",
    "testType": "kiemtra15",
    "title": "Kiểm tra 15 phút - Chương 3",
    "content": "Kiểm tra kiến thức về phương trình bậc hai và ứng dụng",
    "chapters": [...],
    "references": [...],
    "expectedTestDate": "2024-02-15T07:00:00.000Z",
    "reminderDate": "2024-02-01T10:30:00.000Z",
    "priority": "high",
    "status": "active",
    "notes": "Học sinh cần ôn tập kỹ công thức nghiệm",
    "createdAt": "2024-02-01T10:30:00.000Z"
  }
}
```

### 2. Lấy Danh Sách Nhắc Nhở

**GET** `/`

Lấy danh sách tất cả nhắc nhở của giáo viên với phân trang và bộ lọc.

#### Query Parameters
- `status` (optional): `active`, `completed`, `cancelled`
- `priority` (optional): `low`, `medium`, `high`, `urgent`
- `testType` (optional): `kiemtra15`, `kiemtra1tiet`, `kiemtrathuchanh`, `kiemtramieng`, `baitap`, `other`
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

#### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy danh sách nhắc nhở thành công",
  "data": {
    "reminders": [
      {
        "reminderId": "60f7b3b3b3b3b3b3b3b3b3b3",
        "lesson": {
          "lessonId": "LESSON_001",
          "scheduledDate": "2024-02-15T07:00:00.000Z",
          "topic": "Phương trình bậc hai"
        },
        "class": "12A1",
        "subject": {
          "name": "Toán học",
          "code": "MATH"
        },
        "testType": "kiemtra15",
        "title": "Kiểm tra 15 phút - Chương 3",
        "content": "Kiểm tra kiến thức về phương trình bậc hai",
        "expectedTestDate": "2024-02-15T07:00:00.000Z",
        "reminderDate": "2024-02-01T10:30:00.000Z",
        "priority": "high",
        "status": "active",
        "notes": "Học sinh cần ôn tập kỹ công thức nghiệm",
        "createdAt": "2024-02-01T10:30:00.000Z",
        "updatedAt": "2024-02-01T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 45,
      "itemsPerPage": 20
    }
  }
}
```

### 3. Lấy Chi Tiết Nhắc Nhở

**GET** `/:reminderId`

Lấy thông tin chi tiết của một nhắc nhở.

#### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy chi tiết nhắc nhở thành công",
  "data": {
    "reminderId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "lesson": {
      "lessonId": "LESSON_001",
      "scheduledDate": "2024-02-15T07:00:00.000Z",
      "topic": "Phương trình bậc hai"
    },
    "class": "12A1",
    "subject": {
      "name": "Toán học",
      "code": "MATH"
    },
    "teacher": "Nguyễn Văn A",
    "testType": "kiemtra15",
    "title": "Kiểm tra 15 phút - Chương 3",
    "content": "Kiểm tra kiến thức về phương trình bậc hai và ứng dụng",
    "chapters": [
      {
        "chapterName": "Chương 3: Phương trình bậc hai",
        "topics": [
          "Công thức nghiệm",
          "Định lý Viète",
          "Ứng dụng thực tế"
        ]
      }
    ],
    "references": [
      {
        "title": "SGK Toán 9 - Trang 45-60",
        "description": "Lý thuyết cơ bản về phương trình bậc hai",
        "url": "https://example.com/toan9-ch3"
      }
    ],
    "expectedTestDate": "2024-02-15T07:00:00.000Z",
    "reminderDate": "2024-02-01T10:30:00.000Z",
    "priority": "high",
    "status": "active",
    "notes": "Học sinh cần ôn tập kỹ công thức nghiệm",
    "isVisible": true,
    "createdAt": "2024-02-01T10:30:00.000Z",
    "updatedAt": "2024-02-01T10:30:00.000Z"
  }
}
```

### 4. Cập Nhật Nhắc Nhở

**PUT** `/:reminderId`

Cập nhật thông tin nhắc nhở (không thể cập nhật nhắc nhở đã hoàn thành).

#### Request Body
```json
{
  "title": "Kiểm tra 15 phút - Chương 3 (Cập nhật)",
  "content": "Kiểm tra kiến thức về phương trình bậc hai, bất phương trình và ứng dụng",
  "priority": "urgent",
  "expectedTestDate": "2024-02-16T07:00:00.000Z",
  "notes": "Thêm phần bất phương trình bậc hai"
}
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Cập nhật nhắc nhở thành công",
  "data": {
    "reminderId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "testType": "kiemtra15",
    "title": "Kiểm tra 15 phút - Chương 3 (Cập nhật)",
    "content": "Kiểm tra kiến thức về phương trình bậc hai, bất phương trình và ứng dụng",
    "chapters": [...],
    "references": [...],
    "expectedTestDate": "2024-02-16T07:00:00.000Z",
    "reminderDate": "2024-02-01T10:30:00.000Z",
    "priority": "urgent",
    "status": "active",
    "notes": "Thêm phần bất phương trình bậc hai",
    "updatedAt": "2024-02-02T14:20:00.000Z"
  }
}
```

### 5. Xóa Nhắc Nhở

**DELETE** `/:reminderId`

Xóa hoàn toàn một nhắc nhở.

#### Response Success (200)
```json
{
  "success": true,
  "message": "Xóa nhắc nhở thành công"
}
```

### 6. Lấy Nhắc Nhở Sắp Đến Hạn

**GET** `/upcoming`

Lấy danh sách nhắc nhở sắp đến hạn trong N ngày tới.

#### Query Parameters
- `days` (optional): Số ngày tới (default: 7, max: 365)

#### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy nhắc nhở 7 ngày tới thành công",
  "data": {
    "upcomingReminders": [
      {
        "reminderId": "60f7b3b3b3b3b3b3b3b3b3b3",
        "lesson": {
          "lessonId": "LESSON_001",
          "scheduledDate": "2024-02-15T07:00:00.000Z",
          "topic": "Phương trình bậc hai"
        },
        "class": "12A1",
        "subject": {
          "name": "Toán học",
          "code": "MATH"
        },
        "testType": "kiemtra15",
        "title": "Kiểm tra 15 phút - Chương 3",
        "expectedTestDate": "2024-02-15T07:00:00.000Z",
        "priority": "high",
        "daysUntilTest": 3
      }
    ],
    "totalUpcoming": 1
  }
}
```

### 7. Đánh Dấu Hoàn Thành

**POST** `/:reminderId/complete`

Đánh dấu nhắc nhở đã hoàn thành.

#### Response Success (200)
```json
{
  "success": true,
  "message": "Đánh dấu hoàn thành nhắc nhở thành công",
  "data": {
    "reminderId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "status": "completed",
    "updatedAt": "2024-02-15T08:00:00.000Z"
  }
}
```

### 8. Lấy Thống Kê Nhắc Nhở

**GET** `/stats`

Lấy thống kê tổng quan về nhắc nhở của giáo viên.

#### Query Parameters
- `startDate` (optional): Ngày bắt đầu thống kê
- `endDate` (optional): Ngày kết thúc thống kê

#### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy thống kê nhắc nhở thành công",
  "data": {
    "totalReminders": 25,
    "activeReminders": 15,
    "completedReminders": 8,
    "highPriorityReminders": 5,
    "urgentReminders": 2,
    "testTypeDistribution": {
      "kiemtra15": 12,
      "kiemtra1tiet": 8,
      "kiemtrathuchanh": 3,
      "kiemtramieng": 2
    }
  }
}
```

### 9. Gửi Lại Email Nhắc Nhở

**POST** `/:reminderId/resend-email`

Gửi lại email nhắc nhở cho tất cả học sinh trong lớp.

#### Response Success (200)
```json
{
  "success": true,
  "message": "Gửi lại email nhắc nhở thành công",
  "data": {
    "reminderId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "title": "Kiểm tra 15 phút - Chương 3",
    "class": "12A1",
    "emailResults": {
      "totalStudents": 35,
      "successCount": 33,
      "failCount": 2,
      "details": [
        {
          "studentName": "Nguyễn Văn A",
          "email": "student1@example.com",
          "success": true,
          "message": "Email sent successfully"
        },
        {
          "studentName": "Trần Thị B",
          "email": "invalid-email",
          "success": false,
          "message": "Invalid email format"
        }
      ]
    }
  }
}
```

### 10. Test Gửi Email

**POST** `/:reminderId/test-email`

Gửi email nhắc nhở test đến một địa chỉ email cụ thể.

#### Request Body
```json
{
  "testEmail": "test@example.com"
}
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Gửi test email thành công",
  "data": {
    "reminderId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "title": "Kiểm tra 15 phút - Chương 3",
    "testEmail": "test@example.com",
    "messageId": "test-email-123",
    "message": "Test email sent successfully"
  }
}
```

## Tính Năng Email Tự Động

### Gửi Email Khi Tạo Reminder
Khi tạo nhắc nhở mới, hệ thống sẽ **tự động gửi email** đến tất cả học sinh trong lớp có địa chỉ email hợp lệ.

#### Nội Dung Email Bao Gồm:
- **Thông tin cơ bản**: Môn học, lớp, loại kiểm tra, mức độ ưu tiên
- **Thời gian kiểm tra**: Ngày giờ chi tiết với định dạng dễ đọc
- **Nội dung kiểm tra**: Mô tả chi tiết về bài kiểm tra
- **Chương/Bài cần ôn**: Danh sách các chương và chủ đề cần ôn tập
- **Tài liệu tham khảo**: Links và mô tả tài liệu học tập
- **Khuyến nghị**: Lời khuyên chuẩn bị cho bài kiểm tra

#### Template Email Responsive:
- Thiết kế đẹp mắt, dễ đọc trên mọi thiết bị
- Màu sắc phân biệt theo mức độ ưu tiên
- Thông tin được tổ chức rõ ràng, logic
- Hỗ trợ tiếng Việt đầy đủ

### Cấu Hình Email
Hệ thống sử dụng service email có sẵn với các tùy chọn:
- **Gmail SMTP** (mặc định)
- **Custom SMTP** server
- **Fallback**: Log email ra console nếu không cấu hình

### Xử Lý Lỗi Email
- Email gửi **không đồng bộ** (async) để không ảnh hưởng đến response
- Tự động retry và fallback nếu gửi email thất bại
- Log chi tiết kết quả gửi email
- API riêng để gửi lại email nếu cần

## Loại Kiểm Tra (testType)

- `kiemtra15`: Kiểm tra 15 phút
- `kiemtra1tiet`: Kiểm tra 1 tiết
- `kiemtrathuchanh`: Kiểm tra thực hành
- `kiemtramieng`: Kiểm tra miệng
- `baitap`: Bài tập
- `other`: Loại khác

## Mức Độ Ưu Tiên (priority)

- `low`: Thấp
- `medium`: Trung bình (mặc định)
- `high`: Cao
- `urgent`: Khẩn cấp

## Trạng Thái (status)

- `active`: Đang hoạt động (mặc định)
- `completed`: Đã hoàn thành
- `cancelled`: Đã hủy

## Lỗi Phổ Biến

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation errors",
  "errors": [
    {
      "field": "title",
      "message": "Title is required",
      "value": ""
    }
  ]
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You can only create reminders for your own lessons"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Lesson not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Reminder already exists for this lesson"
}
```

## Quy Tắc Bảo Mật

1. **Quyền Truy Cập**: Chỉ giáo viên có thể sử dụng API
2. **Quyền Sở Hữu**: Giáo viên chỉ có thể tạo/xem/sửa/xóa nhắc nhở của chính mình
3. **Quyền Tạo**: Chỉ có thể tạo nhắc nhở cho tiết học mà giáo viên đó dạy
4. **Trạng Thái Tiết**: Chỉ có thể tạo nhắc nhở cho tiết học có trạng thái `scheduled`
5. **Unique Constraint**: Mỗi tiết học chỉ có thể có một nhắc nhở

## Lưu Ý Sử Dụng

1. **Ngày Kiểm Tra**: `expectedTestDate` không được là ngày trong quá khứ
2. **Cập Nhật**: Không thể cập nhật nhắc nhở đã hoàn thành (`completed`)
3. **Phân Trang**: Giới hạn tối đa 100 items per page
4. **Validation**: Tất cả input đều được validate nghiêm ngặt
5. **Timezone**: Tất cả thời gian đều sử dụng UTC (ISO 8601) 