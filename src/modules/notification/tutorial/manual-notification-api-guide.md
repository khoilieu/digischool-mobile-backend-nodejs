# Manual Notification API Guide

## Tổng quan
API này cho phép giáo viên và quản lý tạo thông báo thủ công gửi đến các đối tượng khác nhau.

## Authentication
Tất cả API đều yêu cầu authentication token trong header:
```
Authorization: Bearer <token>
```

## Endpoints

### 1. Tạo thông báo thủ công
**POST** `/api/notifications/create-manual`

**Body:**
```json
{
  "title": "Tiêu đề thông báo",
  "content": "Nội dung thông báo",
  "scopeType": "Toàn trường", // Chỉ cho manager: "Toàn trường", "Bộ môn", "Khối", "Lớp"
  "department": "Toán", // Chỉ khi scopeType = "Bộ môn"
  "grade": "12", // Chỉ khi scopeType = "Khối"
  "selectedClass": "class_id" // Chỉ khi scopeType = "Lớp"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Manual notification created successfully",
  "data": {
    "_id": "notification_id",
    "type": "user",
    "title": "Tiêu đề thông báo",
    "content": "Nội dung thông báo",
    "sender": "user_id",
    "receivers": ["user_id_1", "user_id_2"],
    "receiverScope": {
      "type": "school",
      "ids": []
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Lấy danh sách bộ môn
**GET** `/api/notifications/departments`

**Response:**
```json
{
  "success": true,
  "message": "Departments retrieved successfully",
  "data": ["Toán", "Văn", "Anh", "Lý", "Hóa", "Sinh", "Sử", "Địa", "GDCD", "Thể dục", "Công nghệ"]
}
```

### 3. Lấy danh sách khối
**GET** `/api/notifications/grades`

**Response:**
```json
{
  "success": true,
  "message": "Grades retrieved successfully",
  "data": [10, 11, 12]
}
```

### 4. Lấy danh sách lớp
**GET** `/api/notifications/classes`

**Response:**
```json
{
  "success": true,
  "message": "Classes retrieved successfully",
  "data": [
    {
      "id": "class_id_1",
      "name": "Lớp 10A1",
      "grade": 10
    },
    {
      "id": "class_id_2", 
      "name": "Lớp 11A1",
      "grade": 11
    }
  ]
}
```

## Quyền truy cập

### Giáo viên (teacher, homeroom_teacher)
- Chỉ có thể gửi thông báo cho lớp chủ nhiệm
- Không cần cung cấp `scopeType`, `department`, `grade`, `selectedClass`
- Nếu không có lớp chủ nhiệm, notification sẽ được tạo nhưng không gửi cho ai

### Quản lý (manager)
- Có thể gửi thông báo cho:
  - **Toàn trường**: Tất cả học sinh và giáo viên
  - **Bộ môn**: Tất cả giáo viên trong bộ môn đã chọn
  - **Khối**: Tất cả học sinh trong khối đã chọn
  - **Lớp**: Tất cả học sinh trong lớp đã chọn

## Ví dụ sử dụng

### Giáo viên tạo thông báo
```javascript
const response = await fetch('/api/notifications/create-manual', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    title: "Thông báo về bài tập về nhà",
    content: "Các em nhớ làm bài tập trang 45-46 sách giáo khoa"
  })
});
```

### Quản lý tạo thông báo cho toàn trường
```javascript
const response = await fetch('/api/notifications/create-manual', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    title: "Thông báo về lịch thi học kỳ",
    content: "Lịch thi học kỳ sẽ diễn ra từ ngày 15/12/2024",
    scopeType: "Toàn trường"
  })
});
```

### Quản lý tạo thông báo cho bộ môn Toán
```javascript
const response = await fetch('/api/notifications/create-manual', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    title: "Họp bộ môn Toán",
    content: "Họp bộ môn Toán vào thứ 6 tuần này",
    scopeType: "Bộ môn",
    department: "Toán"
  })
});
```

## Lưu ý
- Tất cả notification thủ công đều có `type: "user"`
- Notification sẽ được gửi realtime qua Socket.IO nếu có
- Nội dung có thể chứa HTML để hiển thị rich text
- Title tối đa 200 ký tự, content tối đa 2000 ký tự 