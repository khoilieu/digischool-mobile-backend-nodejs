# Leave Request Email Testing Commands

## Prerequisites
1. Server đang chạy
2. Có token của student và teacher
3. Có lesson IDs hợp lệ
4. Email được cấu hình (hoặc check console logs)

## 1. Test Email khi Student tạo đơn xin vắng

### Lấy token student
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123"
  }'
```

### Lấy danh sách lessons có thể xin vắng
```bash
curl -X GET "http://localhost:3000/api/leave-requests/available-lessons?startDate=2024-12-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN"
```

### Tạo đơn xin vắng (sẽ gửi email cho giáo viên)
```bash
curl -X POST http://localhost:3000/api/leave-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -d '{
    "lessonIds": ["LESSON_ID_1", "LESSON_ID_2"],
    "phoneNumber": "0123456789",
    "reason": "Có việc gia đình khẩn cấp cần xin vắng mặt"
  }'
```

**Expected Result:**
- Response: `"Successfully created X leave requests and notifications sent to teachers"`
- Console log: `📧 New leave request notification sent to teacher [teacher_email]`
- Email gửi đến giáo viên với subject: `📝 Đơn xin vắng mới cần duyệt - [Môn học]`

## 2. Test Email khi Teacher duyệt đơn

### Lấy token teacher
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }'
```

### Lấy danh sách đơn cần duyệt
```bash
curl -X GET http://localhost:3000/api/leave-requests/pending \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

### Approve đơn xin vắng (sẽ gửi email cho học sinh)
```bash
curl -X PUT http://localhost:3000/api/leave-requests/REQUEST_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN" \
  -d '{
    "comment": "Đồng ý cho em vắng mặt. Hãy liên hệ để nhận bài tập bù."
  }'
```

**Expected Result:**
- Response: `"Leave request approved successfully and notification sent to student"`
- Console log: `📧 Email notification sent to [student_email] for approved leave request`
- Email gửi đến học sinh với subject: `✅ Thông báo kết quả đơn xin vắng - [Môn học]`

### Reject đơn xin vắng (sẽ gửi email cho học sinh)
```bash
curl -X PUT http://localhost:3000/api/leave-requests/REQUEST_ID/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN" \
  -d '{
    "comment": "Không thể chấp thuận vì đây là tiết kiểm tra quan trọng."
  }'
```

**Expected Result:**
- Response: `"Leave request rejected successfully and notification sent to student"`
- Console log: `📧 Email notification sent to [student_email] for rejected leave request`
- Email gửi đến học sinh với subject: `❌ Thông báo kết quả đơn xin vắng - [Môn học]`

## 3. Test Batch Processing (sẽ gửi nhiều email)

```bash
curl -X POST http://localhost:3000/api/leave-requests/batch-process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN" \
  -d '{
    "requests": [
      {
        "requestId": "REQUEST_ID_1",
        "action": "approve",
        "comment": "Đồng ý cho em vắng mặt"
      },
      {
        "requestId": "REQUEST_ID_2", 
        "action": "reject",
        "comment": "Không thể chấp thuận vì lý do không hợp lý"
      }
    ]
  }'
```

## 4. Email Configuration Check

### Check email service status
```bash
# Kiểm tra console logs khi server start để xem email config
# Nếu thấy: "⚠️ Email not configured" thì cần cấu hình .env
# Nếu thấy: "✅ Email service connection verified" thì email OK
```

### Test với email không cấu hình
- Nếu email không được cấu hình, tất cả email content sẽ được log ra console
- Format log: `📧 [NO EMAIL CONFIG] Email would be sent:`

## 5. Troubleshooting

### Nếu không thấy email:
1. **Check console logs** - email content sẽ được log nếu email service không hoạt động
2. **Check spam folder** - email có thể bị đánh dấu spam
3. **Verify email config** - đảm bảo EMAIL_USER và EMAIL_PASS đúng
4. **Check network** - đảm bảo server có thể kết nối internet

### Common error patterns:
- `❌ Error sending new leave request notification to teacher: [error]`
- `❌ Failed to send email notification: [error]`
- `⚠️ Email not configured - skipping connection test`

### Debug commands:
```bash
# Check environment variables
echo $EMAIL_USER
echo $EMAIL_PASS

# Check server logs
tail -f server.log | grep "📧\|❌.*email"
```

## 6. Test Scenarios

### Scenario 1: Normal Flow
1. Student tạo đơn → Teacher nhận email
2. Teacher approve → Student nhận email approve
3. Check both email contents

### Scenario 2: Multiple Requests
1. Student tạo 3 đơn cùng lúc → 3 teachers nhận email
2. 3 teachers approve/reject → Student nhận 3 emails

### Scenario 3: Error Handling
1. Tạo đơn với email service down → Đơn vẫn tạo thành công
2. Approve với email service down → Vẫn approve thành công
3. Check console logs có error messages

## 7. Expected Email Templates

### Email cho Teacher (New Request):
- Subject: `📝 Đơn xin vắng mới cần duyệt - [Subject Name]`
- Contains: Student info, lesson details, reason, action required

### Email cho Student (Approved):
- Subject: `✅ Thông báo kết quả đơn xin vắng - [Subject Name]`
- Contains: Approval confirmation, teacher comment, next steps

### Email cho Student (Rejected):
- Subject: `❌ Thông báo kết quả đơn xin vắng - [Subject Name]`
- Contains: Rejection notification, teacher comment, requirements 