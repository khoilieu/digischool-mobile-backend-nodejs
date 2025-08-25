# Thay đổi API Xin Nghỉ Phép - Frontend Guide

## Tổng quan thay đổi

Hệ thống xin nghỉ phép đã được cập nhật để hỗ trợ **2 loại yêu cầu**:

1. **Nghỉ từng tiết** (`requestType: "lesson"`) - Giáo viên bộ môn phê duyệt
2. **Nghỉ cả ngày** (`requestType: "day"`) - Giáo viên chủ nhiệm phê duyệt

## API Endpoints mới

### 1. Tạo đơn xin nghỉ từng tiết
```
POST /api/student-leave-requests/create-lesson
```

**Body:**
```json
{
  "lessonIds": ["lessonId1", "lessonId2"],
  "phoneNumber": "0123456789",
  "reason": "Lý do xin nghỉ"
}
```

### 2. Tạo đơn xin nghỉ cả ngày
```
POST /api/student-leave-requests/create-day
```

**Body:**
```json
{
  "date": "2024-01-15",
  "phoneNumber": "0123456789", 
  "reason": "Lý do xin nghỉ"
}
```

## Thay đổi UI cần thực hiện

### 1. Form xin nghỉ phép
- **Thêm radio button** để chọn loại yêu cầu:
  - "Nghỉ từng tiết"
  - "Nghỉ cả ngày"

### 2. Form nghỉ từng tiết (khi chọn "Nghỉ từng tiết")
- Hiển thị danh sách tiết học có thể chọn
- Cho phép chọn nhiều tiết
- Hiển thị thông tin: Môn học, Giáo viên, Thời gian

### 3. Form nghỉ cả ngày (khi chọn "Nghỉ cả ngày")
- Chọn ngày (date picker)
- Không cần chọn tiết học cụ thể

### 4. Hiển thị danh sách đơn xin nghỉ
- **Thêm cột "Loại yêu cầu"** hiển thị "Tiết học" hoặc "Cả ngày"
- **Cập nhật logic hiển thị** dựa trên `requestType`

### 5. Giao diện giáo viên
- **Giáo viên bộ môn**: Chỉ thấy đơn xin nghỉ tiết học của mình
- **Giáo viên chủ nhiệm**: Chỉ thấy đơn xin nghỉ cả ngày của lớp mình

## ⚠️ QUAN TRỌNG: Thay đổi API Thời Khóa Biểu

### API Loading TKB: `/api/schedules/weekly/:classId/:academicYear/:weekNumber`

**Response mới cho mỗi lesson:**
```json
{
  "_id": "lessonId",
  "lessonId": "LSN-001",
  "subject": { "subjectName": "Toán học" },
  "teacher": { "name": "Nguyễn Văn A" },
  "timeSlot": { "period": 1, "startTime": "07:00" },
  "scheduledDate": "2024-01-15T07:00:00.000Z",
  "type": "regular", // "regular", "empty", "test", etc.
  
  // Thông tin nghỉ phép (CHỈ có khi type !== "empty")
  "hasStudentLeaveRequest": true,
  "leaveRequestStatus": "approved" // "pending", "approved", "rejected"
}
```

### Lưu ý quan trọng:

- **Tiết có type = "empty"**: Không có thông tin nghỉ phép (không có `hasStudentLeaveRequest` và `leaveRequestStatus`)
- **Tiết có type = "regular"**: Có thể có thông tin nghỉ phép
- **Tiết có type = "test"**: Có thể có thông tin nghỉ phép

## ⚠️ QUAN TRỌNG: Thay đổi API Lesson Detail

### API Lesson Detail: `/api/schedules/lesson/:lessonId`

**Response mới:**
```json
{
  "_id": "lessonId",
  "lessonId": "LSN-001",
  "subject": { "subjectName": "Toán học" },
  "teacher": { "name": "Nguyễn Văn A" },
  "timeSlot": { "period": 1, "startTime": "07:00" },
  "scheduledDate": "2024-01-15T07:00:00.000Z",
  
  // Thông tin nghỉ phép của học sinh
  "hasStudentLeaveRequest": true,
  "leaveRequestStatus": "approved", // "pending", "approved", "rejected"
  "leaveRequestType": "day", // "lesson" hoặc "day"
  
  // Danh sách chi tiết các yêu cầu nghỉ phép
  "studentLeaveRequests": [
    {
      "_id": "requestId",
      "requestType": "day",
      "status": "approved",
      "studentId": { "name": "Học sinh A" },
      "reason": "Lý do xin nghỉ",
      "date": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

### Logic xử lý mới:

1. **Nghỉ từng tiết** (`requestType: "lesson"`):
   - Chỉ tiết được chọn có `leaveRequestStatus`
   - Các tiết khác không bị ảnh hưởng

2. **Nghỉ cả ngày** (`requestType: "day"`):
   - **TẤT CẢ tiết học trong ngày** đều có `leaveRequestStatus: "approved"`
   - Frontend cần disable/hide tất cả tiết trong ngày đó

### Ví dụ UI:

```javascript
// Khi hiển thị tiết học
if (lesson.hasStudentLeaveRequest) {
  if (lesson.leaveRequestStatus === "approved") {
    // Tiết đã được approved nghỉ
    if (lesson.leaveRequestType === "day") {
      // Nghỉ cả ngày: hiển thị "Đã nghỉ cả ngày"
      lessonDisplay = "Đã nghỉ cả ngày";
      lessonStyle = "opacity: 0.5; text-decoration: line-through;";
    } else {
      // Nghỉ từng tiết: hiển thị "Đã được duyệt nghỉ"
      lessonDisplay = "Đã được duyệt nghỉ";
      lessonStyle = "opacity: 0.7;";
    }
  } else if (lesson.leaveRequestStatus === "pending") {
    // Đang chờ duyệt
    lessonDisplay = "Đang chờ duyệt";
    lessonStyle = "color: orange;";
  }
}
```

## Lưu ý quan trọng

1. **Validation**: Không cho phép xin nghỉ ngày trong quá khứ
2. **Xung đột**: Kiểm tra xung đột giữa 2 loại yêu cầu
3. **Phân quyền**: Giáo viên chỉ thấy đơn cần duyệt của mình
4. **Thông báo**: Học sinh và phụ huynh vẫn nhận thông báo như cũ
5. **TKB**: Tất cả tiết trong ngày nghỉ cả ngày sẽ có `leaveRequestStatus: "approved"`
6. **Lesson Detail**: API này cũng đã được cập nhật để xử lý cả 2 loại yêu cầu

## Migration

- API cũ `/create` đã được thay thế bằng `/create-lesson`
- API loading TKB đã được cập nhật để hỗ trợ cả 2 loại yêu cầu
- API lesson detail đã được cập nhật để xử lý cả 2 loại yêu cầu
- Database sẽ tự động thêm field `requestType` cho các đơn cũ
- Frontend cần cập nhật logic hiển thị để xử lý `leaveRequestType`
