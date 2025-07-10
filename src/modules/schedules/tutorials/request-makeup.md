# Hướng dẫn sử dụng API Makeup (Dạy bù) - Postman

## Tổng quan

API Makeup cho phép giáo viên tạo yêu cầu dạy bù cho các tiết học của mình bằng cách hoán đổi với tiết trống. Yêu cầu này sẽ được quản lý (manager/admin) phê duyệt hoặc từ chối. Giáo viên có thể huỷ yêu cầu khi chưa được duyệt.

## Điểm khác biệt với Swap

- **Makeup**: Hoán đổi tiết hiện tại với tiết trống (empty)
- **Swap**: Hoán đổi tiết hiện tại với tiết có giáo viên dạy (regular/makeup)
- **Makeup**: Được approve/reject bởi manager
- **Swap**: Được approve/reject bởi replacement teacher

## Base URL

```
http://localhost:8080/api/schedules/lesson-request
```

## Authentication

Tất cả API đều yêu cầu Bearer Token. Thêm header:

```
Authorization: Bearer <your_jwt_token>
```

## 1. Tạo yêu cầu dạy bù

### Endpoint

```
POST /makeup/create
```

### Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

### Body

```json
{
  "originalLessonId": "64f8a1b2c3d4e5f6a7b8c9d1",
  "replacementLessonId": "64f8a1b2c3d4e5f6a7b8c9d4",
  "reason": "Tôi cần dạy bù cho lớp do bận công việc"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "message": "Makeup request created successfully",
  "request": {
    "requestId": "MKP-2024-001",
    "requestType": "makeup",
    "status": "pending",
    "requestingTeacher": {
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@example.com"
    },
    "originalLesson": {
      "lessonId": "LSN-2024-001",
      "scheduledDate": "2024-01-15T07:00:00.000Z",
      "timeSlot": {
        "period": 1,
        "name": "Tiết 1",
        "startTime": "07:00",
        "endTime": "07:45"
      },
      "topic": "Hàm số bậc nhất",
      "status": "scheduled",
      "type": "regular"
    },
    "replacementLesson": {
      "lessonId": "LSN-2024-010",
      "scheduledDate": "2024-01-18T08:00:00.000Z",
      "timeSlot": {
        "period": 2,
        "name": "Tiết 2",
        "startTime": "08:00",
        "endTime": "08:45"
      },
      "status": "scheduled",
      "type": "empty"
    },
    "reason": "Tôi cần dạy bù cho lớp do bận công việc",
    "createdAt": "2024-01-14T10:30:00.000Z"
  }
}
```

## 2. Huỷ yêu cầu dạy bù

### Endpoint

```
POST /makeup/:requestId/cancel
```

### Headers

```
Authorization: Bearer <token>
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Makeup request cancelled successfully",
  "request": {
    "requestId": "MKP-2024-001",
    "status": "cancelled",
    "cancelledBy": "64f8a1b2c3d4e5f6a7b8c9d1",
    "cancelledAt": "2024-01-14T11:00:00.000Z"
  }
}
```

**Lưu ý:** Chỉ giáo viên tạo yêu cầu mới có thể huỷ khi trạng thái là `pending`.

## 3. Duyệt yêu cầu dạy bù (Manager/Admin)

### Endpoint

```
POST /makeup/:requestId/approve
```

### Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

### Body

```json
{
  "comment": "Đồng ý cho phép dạy bù"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Makeup request approved successfully",
  "request": {
    "requestId": "MKP-2024-001",
    "requestType": "makeup",
    "status": "approved",
    "processedBy": "64f8a1b2c3d4e5f6a7b8c9d5",
    "processedAt": "2024-01-14T11:30:00.000Z",
    "originalLesson": { ... },
    "replacementLesson": { ... },
    "reason": "Tôi cần dạy bù cho lớp do bận công việc",
    "managerComment": "Đồng ý cho phép dạy bù"
  }
}
```

## 4. Từ chối yêu cầu dạy bù (Manager/Admin)

### Endpoint

```
POST /makeup/:requestId/reject
```

### Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

### Body

```json
{
  "comment": "Không thể dạy bù vì lý do lịch lớp bận"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Makeup request rejected",
  "request": {
    "requestId": "MKP-2024-001",
    "requestType": "makeup",
    "status": "rejected",
    "processedBy": "64f8a1b2c3d4e5f6a7b8c9d5",
    "processedAt": "2024-01-14T11:45:00.000Z",
    "managerComment": "Không thể dạy bù vì lý do lịch lớp bận"
  }
}
```

## 5. Trạng thái yêu cầu dạy bù

- `pending`: Đang chờ duyệt
- `approved`: Đã được duyệt
- `rejected`: Đã bị từ chối
- `cancelled`: Đã bị huỷ bởi giáo viên

## 6. Lưu ý sử dụng

- Giáo viên có thể tạo yêu cầu dạy bù cho bất kỳ tiết học nào mình dạy.
- Chỉ có thể chọn tiết trống (`empty`, `scheduled`) để hoán đổi, và phải cùng lớp, cùng tuần với tiết gốc.
- Một tiết chỉ có thể có 1 yêu cầu dạy bù ở trạng thái `pending`.
- Giáo viên chỉ được huỷ yêu cầu của chính mình khi yêu cầu còn `pending`.
- Quản lý chỉ duyệt/từ chối khi yêu cầu còn `pending`.
- Khi được approve, hệ thống sẽ hoán đổi thông tin giữa tiết gốc và tiết trống.
- Sau khi duyệt, hệ thống sẽ gửi thông báo qua email cho giáo viên và học sinh.

## 7. Ví dụ luồng sử dụng

1. Giáo viên chọn tiết muốn dạy bù → chọn tiết trống → nhập lý do → gửi yêu cầu.
2. Quản lý vào hệ thống, xem danh sách yêu cầu dạy bù → duyệt hoặc từ chối.
3. Giáo viên có thể huỷ yêu cầu khi chưa được duyệt.

---

Mọi thắc mắc vui lòng liên hệ quản trị hệ thống hoặc đội phát triển.
