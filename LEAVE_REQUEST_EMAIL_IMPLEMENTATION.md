# Leave Request Email Implementation

## Tổng quan
Hệ thống đơn xin vắng đã được tích hợp tính năng gửi email tự động cho cả học sinh và giáo viên.

## Luồng Email

### 1. Khi học sinh tạo đơn xin vắng mới
- **Người nhận:** Giáo viên dạy tiết học đó
- **Thời điểm:** Ngay sau khi tạo đơn xin vắng thành công
- **Nội dung email:**
  - Thông tin học sinh (tên, lớp, số điện thoại)
  - Chi tiết tiết học (môn học, ngày, tiết, giáo viên)
  - Lý do xin vắng
  - Hướng dẫn duyệt đơn

### 2. Khi giáo viên duyệt/từ chối đơn
- **Người nhận:** Học sinh tạo đơn
- **Thời điểm:** Ngay sau khi giáo viên approve/reject
- **Nội dung email:**
  - Kết quả duyệt (chấp thuận/từ chối)
  - Thông tin chi tiết đơn xin vắng
  - Nhận xét của giáo viên (nếu có)
  - Hướng dẫn tiếp theo

## Implementation Details

### Service Layer
File: `src/modules/leave-requests/services/leave-request.service.js`

#### Method mới được thêm:
```javascript
async sendNewLeaveRequestNotificationToTeacher(request)
```
- Gửi email thông báo cho giáo viên khi có đơn xin vắng mới
- Sử dụng template HTML đẹp với thông tin đầy đủ
- Không throw error để không làm gián đoạn flow tạo đơn

#### Method đã có:
```javascript
async sendLeaveRequestNotification(request, status, comment)
```
- Gửi email thông báo kết quả cho học sinh
- Hỗ trợ cả approved và rejected status
- Template khác nhau tùy theo kết quả

### Controller Layer
File: `src/modules/leave-requests/controllers/leave-request.controller.js`

#### Cập nhật:
- Method `createLeaveRequests`: Thêm message về việc gửi email cho giáo viên
- Method `approveRequest`: Đã có message về việc gửi email cho học sinh  
- Method `rejectRequest`: Đã có message về việc gửi email cho học sinh

## Email Templates

### Template cho giáo viên (đơn mới)
- **Subject:** `📝 Đơn xin vắng mới cần duyệt - [Môn học]`
- **Design:** Gradient header, thông tin được tổ chức rõ ràng
- **Sections:**
  - Header với logo EcoSchool
  - Thông tin học sinh
  - Chi tiết tiết học
  - Lý do xin vắng (highlighted)
  - Hướng dẫn hành động

### Template cho học sinh (kết quả)
- **Subject:** `✅/❌ Thông báo kết quả đơn xin vắng - [Môn học]`
- **Design:** Màu sắc tùy theo kết quả (xanh/đỏ)
- **Sections:**
  - Header với logo EcoSchool
  - Kết quả duyệt (approved/rejected)
  - Thông tin đơn xin vắng
  - Nhận xét giáo viên (nếu có)
  - Hướng dẫn tiếp theo

## Cấu hình Email
Sử dụng email service có sẵn trong hệ thống:
- File: `src/modules/auth/services/email.service.js`
- Hỗ trợ cả Gmail và SMTP tùy chỉnh
- Fallback về console log nếu email không được cấu hình

## Error Handling
- Email failure không làm gián đoạn flow chính
- Log chi tiết lỗi email để debug
- Fallback mechanism cho trường hợp email service không khả dụng

## Testing

### Test Cases
1. **Tạo đơn xin vắng:**
   - Tạo đơn thành công → Kiểm tra email gửi cho giáo viên
   - Tạo nhiều đơn cùng lúc → Kiểm tra email gửi cho nhiều giáo viên

2. **Duyệt đơn:**
   - Approve đơn → Kiểm tra email thông báo cho học sinh
   - Reject đơn → Kiểm tra email thông báo cho học sinh

3. **Error scenarios:**
   - Email service không khả dụng
   - Thông tin email không đầy đủ
   - Network issues

### API Endpoints không thay đổi
Tất cả API endpoints hiện tại vẫn hoạt động bình thường, chỉ thêm tính năng email tự động.

## Monitoring & Logs
Tất cả hoạt động email được log với format:
- `📧 Email notification sent to [email] for [action]`
- `❌ Error sending [type] notification: [error]`

## Configuration Required
Để email hoạt động, cần cấu hình trong `.env`:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_HOST=smtp.gmail.com (optional)
EMAIL_PORT=587 (optional)
EMAIL_FROM=noreply@ecoschool.com (optional)
```

Nếu không cấu hình, hệ thống sẽ log email content ra console để debug. 