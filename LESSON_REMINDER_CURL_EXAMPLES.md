# Ví Dụ cURL Commands - API Nhắc Nhở Kiểm Tra Tiết Học

## Chuẩn Bị

Thay thế các giá trị sau trong các lệnh cURL:
- `YOUR_TOKEN`: Token của giáo viên
- `LESSON_ID`: ID của tiết học cần tạo nhắc nhở
- `REMINDER_ID`: ID của nhắc nhở cần thao tác

## 1. Tạo Nhắc Nhở Kiểm Tra Cơ Bản

```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra15",
    "title": "Kiểm tra 15 phút - Chương 3",
    "content": "Kiểm tra kiến thức về phương trình bậc hai và ứng dụng",
    "expectedTestDate": "2024-03-15T07:00:00.000Z",
    "priority": "high"
  }'
```

## 2. Tạo Nhắc Nhở Chi Tiết Với Chương và Tài Liệu

```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra1tiet",
    "title": "Kiểm tra 1 tiết - Chương 4: Hàm số bậc nhất",
    "content": "Kiểm tra toàn diện về hàm số bậc nhất, đồ thị và ứng dụng",
    "chapters": [
      {
        "chapterName": "Chương 4: Hàm số bậc nhất",
        "topics": [
          "Khái niệm hàm số bậc nhất",
          "Đồ thị hàm số bậc nhất",
          "Tính chất của hàm số bậc nhất",
          "Ứng dụng thực tế"
        ]
      }
    ],
    "references": [
      {
        "title": "SGK Toán 9 - Chương 4",
        "description": "Lý thuyết cơ bản về hàm số bậc nhất",
        "url": "https://example.com/toan9-ch4"
      },
      {
        "title": "SBT Toán 9 - Bài tập chương 4",
        "description": "Bài tập thực hành về hàm số bậc nhất"
      }
    ],
    "expectedTestDate": "2024-03-20T07:00:00.000Z",
    "reminderDate": "2024-03-10T08:00:00.000Z",
    "priority": "urgent",
    "notes": "Học sinh cần ôn tập kỹ cách vẽ đồ thị và tìm giao điểm"
  }'
```

## 3. Lấy Danh Sách Nhắc Nhở

### Lấy tất cả nhắc nhở
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Lấy nhắc nhở theo trạng thái
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/?status=active&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Lấy nhắc nhở theo độ ưu tiên
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/?priority=high&priority=urgent" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Lấy nhắc nhở theo loại kiểm tra
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/?testType=kiemtra15" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Lấy nhắc nhở theo khoảng thời gian
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/?startDate=2024-03-01T00:00:00.000Z&endDate=2024-03-31T23:59:59.999Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 4. Lấy Chi Tiết Nhắc Nhở

```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/REMINDER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 5. Cập Nhật Nhắc Nhở

### Cập nhật cơ bản
```bash
curl -X PUT "http://localhost:3000/api/lesson-reminders/REMINDER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Kiểm tra 15 phút - Chương 3 (Cập nhật)",
    "priority": "urgent",
    "notes": "Thêm phần bất phương trình bậc hai"
  }'
```

### Cập nhật chi tiết
```bash
curl -X PUT "http://localhost:3000/api/lesson-reminders/REMINDER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Kiểm tra 1 tiết - Chương 4 (Sửa đổi)",
    "content": "Kiểm tra hàm số bậc nhất và hàm số bậc hai",
    "chapters": [
      {
        "chapterName": "Chương 4: Hàm số bậc nhất",
        "topics": [
          "Khái niệm hàm số bậc nhất",
          "Đồ thị hàm số bậc nhất"
        ]
      },
      {
        "chapterName": "Chương 5: Hàm số bậc hai",
        "topics": [
          "Khái niệm hàm số bậc hai",
          "Đồ thị parabol"
        ]
      }
    ],
    "expectedTestDate": "2024-03-25T07:00:00.000Z",
    "priority": "high"
  }'
```

## 6. Xóa Nhắc Nhở

```bash
curl -X DELETE "http://localhost:3000/api/lesson-reminders/REMINDER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 7. Lấy Nhắc Nhở Sắp Đến Hạn

### Lấy nhắc nhở 7 ngày tới (mặc định)
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/upcoming" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Lấy nhắc nhở 3 ngày tới
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/upcoming?days=3" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Lấy nhắc nhở 30 ngày tới
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/upcoming?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 8. Đánh Dấu Hoàn Thành

```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/REMINDER_ID/complete" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 9. Lấy Thống Kê Nhắc Nhở

### Thống kê tổng quan
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Thống kê theo khoảng thời gian
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/stats?startDate=2024-01-01T00:00:00.000Z&endDate=2024-03-31T23:59:59.999Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 10. Email Features - Gửi Lại Email Nhắc Nhở

### Gửi lại email cho tất cả học sinh trong lớp
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/REMINDER_ID/resend-email" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 11. Test Email - Gửi Email Thử Nghiệm

### Gửi email test đến địa chỉ cụ thể
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/REMINDER_ID/test-email" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testEmail": "test@example.com"
  }'
```

### Gửi email test đến email giáo viên
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/REMINDER_ID/test-email" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testEmail": "teacher@school.edu.vn"
  }'
```

## 12. Workflow Hoàn Chỉnh Với Email

### Bước 1: Tạo nhắc nhở (tự động gửi email)
```bash
RESPONSE=$(curl -s -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra15",
    "title": "Kiểm tra 15 phút - Demo với Email",
    "content": "Demo tạo nhắc nhở và gửi email tự động",
    "chapters": [
      {
        "chapterName": "Chương 1: Căn bậc hai",
        "topics": [
          "Khái niệm căn bậc hai",
          "Tính chất căn bậc hai",
          "Phép tính với căn bậc hai"
        ]
      }
    ],
    "references": [
      {
        "title": "SGK Toán 9 - Chương 1",
        "description": "Lý thuyết về căn bậc hai",
        "url": "https://example.com/toan9-ch1"
      }
    ],
    "expectedTestDate": "2024-03-15T07:00:00.000Z",
    "priority": "high",
    "notes": "Học sinh cần ôn tập kỹ công thức và bài tập"
  }')

echo $RESPONSE
REMINDER_ID=$(echo $RESPONSE | jq -r '.data.reminderId')
echo "Created reminder ID: $REMINDER_ID"
echo "Email info: $(echo $RESPONSE | jq -r '.data.emailInfo')"
```

### Bước 2: Test email template
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/$REMINDER_ID/test-email" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testEmail": "admin@school.edu.vn"
  }'
```

### Bước 3: Gửi lại email nếu cần
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/$REMINDER_ID/resend-email" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Bước 4: Xem chi tiết và đánh dấu hoàn thành
```bash
# Xem chi tiết
curl -X GET "http://localhost:3000/api/lesson-reminders/$REMINDER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Đánh dấu hoàn thành
curl -X POST "http://localhost:3000/api/lesson-reminders/$REMINDER_ID/complete" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 13. Bulk Operations Với Email

### Tạo nhiều nhắc nhở (mỗi cái sẽ gửi email riêng)
```bash
# Reminder cho Lesson 1
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID_1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra15",
    "title": "Kiểm tra 15 phút - Chương 1",
    "content": "Kiểm tra căn bậc hai và ứng dụng",
    "expectedTestDate": "2024-03-15T07:00:00.000Z",
    "priority": "medium"
  }'

# Reminder cho Lesson 2
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID_2" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra1tiet",
    "title": "Kiểm tra 1 tiết - Chương 2",
    "content": "Kiểm tra hàm số và đồ thị",
    "expectedTestDate": "2024-03-20T07:00:00.000Z",
    "priority": "high"
  }'
```

## 14. Email Testing và Debugging

### Test với các loại email khác nhau
```bash
# Test với Gmail
curl -X POST "http://localhost:3000/api/lesson-reminders/REMINDER_ID/test-email" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testEmail": "test@gmail.com"
  }'

# Test với email trường
curl -X POST "http://localhost:3000/api/lesson-reminders/REMINDER_ID/test-email" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testEmail": "student@school.edu.vn"
  }'

# Test với email khác
curl -X POST "http://localhost:3000/api/lesson-reminders/REMINDER_ID/test-email" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testEmail": "parent@yahoo.com"
  }'
```

### Test lỗi email không hợp lệ
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/REMINDER_ID/test-email" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testEmail": "invalid-email-format"
  }'
```

## 15. Monitoring Email Results

### Gửi lại email và xem kết quả chi tiết
```bash
RESEND_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/lesson-reminders/REMINDER_ID/resend-email" \
  -H "Authorization: Bearer YOUR_TOKEN")

echo "Email Results:"
echo $RESEND_RESPONSE | jq '.data.emailResults'

# Xem số lượng thành công/thất bại
echo "Success: $(echo $RESEND_RESPONSE | jq '.data.emailResults.successCount')"
echo "Failed: $(echo $RESEND_RESPONSE | jq '.data.emailResults.failCount')"
echo "Total: $(echo $RESEND_RESPONSE | jq '.data.emailResults.totalStudents')"
```

## 16. Advanced Email Scenarios

### Tạo reminder với nội dung phong phú cho email đẹp
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra1tiet",
    "title": "🔥 Kiểm tra giữa kỳ - Toán 9 - Chương 1,2,3",
    "content": "Kiểm tra tổng hợp về căn bậc hai, hàm số bậc nhất và hệ phương trình. Thời gian: 45 phút. Được sử dụng máy tính cầm tay.",
    "chapters": [
      {
        "chapterName": "Chương 1: Căn bậc hai",
        "topics": [
          "Khái niệm căn bậc hai số học",
          "Tính chất của căn bậc hai",
          "Phép nhân và chia căn bậc hai",
          "Đưa thừa số ra ngoài dấu căn",
          "Trục căn thức ở mẫu"
        ]
      },
      {
        "chapterName": "Chương 2: Hàm số bậc nhất",
        "topics": [
          "Khái niệm hàm số bậc nhất",
          "Tính chất và đồ thị hàm số bậc nhất",
          "Vị trí tương đối của hai đường thẳng",
          "Hệ số góc và góc tạo bởi đường thẳng với trục Ox"
        ]
      },
      {
        "chapterName": "Chương 3: Hệ phương trình bậc nhất hai ẩn",
        "topics": [
          "Phương trình bậc nhất hai ẩn",
          "Hệ phương trình bậc nhất hai ẩn",
          "Giải hệ phương trình bằng phương pháp thế",
          "Giải hệ phương trình bằng phương pháp cộng đại số",
          "Giải bài toán bằng cách lập hệ phương trình"
        ]
      }
    ],
    "references": [
      {
        "title": "📚 SGK Toán 9 - Tập 1",
        "description": "Sách giáo khoa chính thức - Chương 1, 2, 3",
        "url": "https://example.com/sgk-toan9-tap1"
      },
      {
        "title": "📝 SBT Toán 9 - Tập 1", 
        "description": "Sách bài tập với các dạng bài từ cơ bản đến nâng cao"
      },
      {
        "title": "🎥 Video bài giảng",
        "description": "Playlist video ôn tập 3 chương",
        "url": "https://youtube.com/playlist?list=example"
      },
      {
        "title": "📊 Đề thi thử",
        "description": "10 đề thi thử với đáp án chi tiết",
        "url": "https://example.com/de-thi-thu"
      }
    ],
    "expectedTestDate": "2024-03-25T07:00:00.000Z",
    "priority": "urgent",
    "notes": "Đây là bài kiểm tra quan trọng ảnh hưởng đến điểm học kỳ. Học sinh cần chuẩn bị kỹ lưỡng, ôn tập đầy đủ 3 chương. Mang theo máy tính cầm tay, thước kẻ, compa nếu cần. Có mặt đúng 7h00, không được đến muộn."
  }'
```

## Email Configuration Notes

### Cấu hình Email trong .env
```bash
# Gmail SMTP (recommended)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=EcoSchool System <your-email@gmail.com>

# Custom SMTP
EMAIL_HOST=smtp.your-domain.com
EMAIL_PORT=587
EMAIL_USER=noreply@your-domain.com
EMAIL_PASS=your-password
EMAIL_FROM=EcoSchool <noreply@your-domain.com>
```

### Email Fallback
Nếu không cấu hình email, hệ thống sẽ:
- Log nội dung email ra console
- Vẫn trả về response thành công
- Không gián đoạn workflow tạo reminder

## Lưu Ý Quan Trọng Về Email

1. **Tự Động Gửi**: Email được gửi tự động khi tạo reminder mới
2. **Không Đồng Bộ**: Gửi email không ảnh hưởng đến response time
3. **Retry Logic**: Tự động thử lại nếu gửi email thất bại
4. **Student Filter**: Chỉ gửi cho học sinh có email hợp lệ
5. **Template Responsive**: Email hiển thị đẹp trên mọi thiết bị
6. **Multilingual**: Hỗ trợ tiếng Việt đầy đủ
7. **Security**: Không lộ thông tin nhạy cảm trong email
8. **Monitoring**: Log chi tiết kết quả gửi email

## Troubleshooting Email

### Lỗi gửi email
```bash
# Kiểm tra cấu hình email
curl -X GET "http://localhost:3000/api/health" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test với email đơn giản
curl -X POST "http://localhost:3000/api/lesson-reminders/REMINDER_ID/test-email" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "simple@gmail.com"}'
```

### Không có học sinh email
- Kiểm tra học sinh trong lớp có email không
- Đảm bảo học sinh có role 'student'
- Kiểm tra class_id mapping đúng không

## 10. Test Cases - Kiểm Tra Lỗi

### Test với lesson không tồn tại
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/invalid_lesson_id" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "content": "Test content",
    "expectedTestDate": "2024-03-15T07:00:00.000Z"
  }'
```

### Test với dữ liệu không hợp lệ
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "invalid_type",
    "title": "",
    "content": "abc",
    "expectedTestDate": "2023-01-01T00:00:00.000Z"
  }'
```

### Test với ngày trong quá khứ
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test past date",
    "content": "Test content with past date",
    "expectedTestDate": "2020-01-01T07:00:00.000Z"
  }'
```

## 11. Workflow Hoàn Chỉnh

### Bước 1: Tạo nhắc nhở
```bash
RESPONSE=$(curl -s -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra15",
    "title": "Kiểm tra 15 phút - Demo",
    "content": "Demo tạo và quản lý nhắc nhở",
    "expectedTestDate": "2024-03-15T07:00:00.000Z",
    "priority": "medium"
  }')

echo $RESPONSE
REMINDER_ID=$(echo $RESPONSE | jq -r '.data.reminderId')
echo "Created reminder ID: $REMINDER_ID"
```

### Bước 2: Xem chi tiết
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/$REMINDER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Bước 3: Cập nhật
```bash
curl -X PUT "http://localhost:3000/api/lesson-reminders/$REMINDER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "high",
    "notes": "Cập nhật độ ưu tiên"
  }'
```

### Bước 4: Đánh dấu hoàn thành
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/$REMINDER_ID/complete" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 12. Bulk Operations

### Tạo nhiều nhắc nhở cho các tiết khác nhau
```bash
# Lesson 1
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID_1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra15",
    "title": "Kiểm tra 15 phút - Bài 1",
    "content": "Kiểm tra chương 1",
    "expectedTestDate": "2024-03-15T07:00:00.000Z"
  }'

# Lesson 2
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID_2" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra1tiet",
    "title": "Kiểm tra 1 tiết - Bài 2",
    "content": "Kiểm tra chương 2",
    "expectedTestDate": "2024-03-20T07:00:00.000Z"
  }'
```

## 13. Performance Testing

### Test phân trang với số lượng lớn
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/?page=1&limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test với nhiều filter
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/?status=active&priority=high&testType=kiemtra15&startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Lưu Ý Quan Trọng

1. **Token**: Thay thế `YOUR_TOKEN` bằng token thực của giáo viên
2. **Lesson ID**: Thay thế `LESSON_ID` bằng ID thực của tiết học (phải có status 'scheduled')
3. **Reminder ID**: Thay thế `REMINDER_ID` bằng ID thực của nhắc nhở
4. **Timezone**: Tất cả thời gian sử dụng UTC (ISO 8601 format)
5. **Validation**: Kiểm tra kỹ dữ liệu đầu vào để tránh lỗi validation

## Troubleshooting

### Lỗi 401 - Unauthorized
```bash
# Kiểm tra token có hợp lệ không
curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Lỗi 403 - Forbidden
- Đảm bảo user có role 'teacher'
- Đảm bảo lesson thuộc về giáo viên đó

### Lỗi 404 - Not Found
- Kiểm tra lesson ID có tồn tại không
- Kiểm tra reminder ID có tồn tại không

### Lỗi 409 - Conflict
- Lesson đã có nhắc nhở rồi, không thể tạo thêm 