# Notification Types - Cập nhật 2024

## Tổng quan

Hệ thống notification hiện hỗ trợ 5 loại notification type khác nhau để phục vụ các mục đích khác nhau trong hệ thống trường học.

## Các loại Notification Type

### 1. `user`
- **Mô tả**: Thông báo cá nhân cho user
- **Sử dụng**: Thông báo riêng tư, nhắc nhở cá nhân
- **Ví dụ**: Nhắc nhở hoàn thành bài tập, thông báo cá nhân

### 2. `activity`
- **Mô tả**: Thông báo về hoạt động (yêu cầu, đơn từ, etc.)
- **Sử dụng**: Thông báo về các yêu cầu, đơn từ, hoạt động trong hệ thống
- **Ví dụ**: Yêu cầu dạy thay, đơn xin nghỉ, yêu cầu đổi tiết

### 3. `system`
- **Mô tả**: Thông báo hệ thống
- **Sử dụng**: Thông báo từ hệ thống, cập nhật, bảo trì
- **Ví dụ**: Thông báo bảo trì hệ thống, cập nhật tính năng mới

### 4. `school` ⭐ **MỚI**
- **Mô tả**: Thông báo cho phụ huynh về hoạt động của con cái
- **Sử dụng**: Thông báo cho phụ huynh về các hoạt động liên quan đến con cái
- **Ví dụ**: 
  - Học sinh xin nghỉ học
  - Giáo viên nghỉ dạy
  - Đánh giá tiết học của con cái
  - Thay đổi giáo viên dạy
  - Dạy bù, đổi tiết

### 5. `teacher` ⭐ **MỚI**
- **Mô tả**: Thông báo cho giáo viên
- **Sử dụng**: Thông báo dành riêng cho giáo viên
- **Ví dụ**: Thông báo về lịch dạy, yêu cầu dạy thay, đánh giá

## Cập nhật Validation

### Trước đây:
```javascript
// Chỉ hỗ trợ 3 type
.isIn(["user", "activity", "system"])
```

### Bây giờ:
```javascript
// Hỗ trợ 5 type
.isIn(["user", "activity", "system", "school", "teacher"])
```

## API Endpoints

### Lấy notification theo type
```
GET /api/notifications/get-by-user?type=school
```

### Tạo notification với type mới
```json
{
  "type": "school",
  "title": "Thông báo đánh giá tiết học",
  "content": "Giáo viên đã đánh giá tiết học của con bạn",
  "receiverScope": {
    "type": "user",
    "ids": ["parent_id"]
  }
}
```

## Parent Notification System

### Các trường hợp gửi notification type "school":

1. **Học sinh xin nghỉ học**
   - Trigger: Khi học sinh tạo đơn xin nghỉ
   - Content: Thông báo cho phụ huynh về việc con xin nghỉ

2. **Giáo viên được approved nghỉ dạy**
   - Trigger: Khi manager approved đơn xin nghỉ của giáo viên
   - Content: Thông báo cho phụ huynh về việc giáo viên nghỉ dạy

3. **Giáo viên được approved dạy thay**
   - Trigger: Khi giáo viên khác approved yêu cầu dạy thay
   - Content: Thông báo về việc thay đổi giáo viên dạy

4. **Giáo viên được approved đổi tiết**
   - Trigger: Khi giáo viên khác approved yêu cầu đổi tiết
   - Content: Thông báo về việc đổi lịch học

5. **Giáo viên được approved dạy bù**
   - Trigger: Khi manager approved yêu cầu dạy bù
   - Content: Thông báo về tiết dạy bù

6. **Giáo viên đánh giá tiết học**
   - Trigger: Khi giáo viên tạo đánh giá tiết học
   - Content: Thông báo chi tiết về đánh giá của con cái (điểm kiểm tra miệng, vi phạm, vắng mặt)

## Testing

Hệ thống đã được test với tất cả 5 notification types và hoạt động đúng như mong đợi:

- ✅ `user`: Hoạt động bình thường
- ✅ `activity`: Hoạt động bình thường  
- ✅ `system`: Hoạt động bình thường
- ✅ `school`: Hoạt động bình thường (mới)
- ✅ `teacher`: Hoạt động bình thường (mới)

## Files đã cập nhật:

1. `src/modules/notification/middleware/notification.validation.js` - Cập nhật validation
2. `src/modules/notification/tutorial/notification_api_tutorial.md` - Cập nhật documentation
3. `src/modules/notification/README-notification-types.md` - Tài liệu mới này

## Lưu ý quan trọng

- Tất cả notification cho phụ huynh đều có type là "school"
- Mỗi phụ huynh chỉ nhận thông báo về con cái của họ
- Nội dung notification được cá nhân hóa theo thông tin của từng học sinh
- Validation đã được cập nhật để hỗ trợ các type mới
- API endpoints hoạt động bình thường với các type mới
