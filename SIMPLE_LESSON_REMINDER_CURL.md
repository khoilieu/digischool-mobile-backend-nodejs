# Ví Dụ cURL Đơn Giản - API Nhắc Nhở Kiểm Tra

## Chuẩn Bị
- `YOUR_TOKEN`: Token của giáo viên
- `LESSON_ID`: ID của tiết học cần tạo nhắc nhở

## 1. Tạo Nhắc Nhở Cơ Bản (Chỉ 3 Trường)

### Kiểm tra 15 phút
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra15",
    "title": "Kiểm tra 15 phút",
    "content": "Kiểm tra kiến thức cơ bản"
  }'
```

### Kiểm tra 1 tiết
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra1tiet",
    "title": "Kiểm tra 1 tiết",
    "content": "Kiểm tra toàn diện kiến thức chương"
  }'
```

### Kiểm tra thực hành
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtrathuchanh",
    "title": "Kiểm tra thực hành",
    "content": "Thực hành vẽ đồ thị và tính toán"
  }'
```

### Kiểm tra miệng
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtramieng",
    "title": "Kiểm tra miệng",
    "content": "Trình bày lý thuyết và giải thích khái niệm"
  }'
```

### Bài tập
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "baitap",
    "title": "Nộp bài tập",
    "content": "Hoàn thành bài tập về nhà chương 3"
  }'
```

## 2. Các Ví Dụ Thực Tế

### Toán học
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra15",
    "title": "Kiểm tra 15 phút - Phương trình bậc hai",
    "content": "Kiểm tra công thức nghiệm và định lý Viète"
  }'
```

### Vật lý
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra1tiet",
    "title": "Kiểm tra 1 tiết - Điện học",
    "content": "Kiểm tra định luật Ohm và mạch điện"
  }'
```

### Hóa học
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtrathuchanh",
    "title": "Thí nghiệm hóa học",
    "content": "Thực hành phản ứng axit-bazơ"
  }'
```

### Văn học
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtramieng",
    "title": "Thuyết trình văn học",
    "content": "Phân tích tác phẩm Chí Phèo"
  }'
```

### Tiếng Anh
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra15",
    "title": "Vocabulary Test Unit 5",
    "content": "Test từ vựng và ngữ pháp Unit 5"
  }'
```

## 3. Quản Lý Nhắc Nhở

### Xem chi tiết nhắc nhở
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/REMINDER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Cập nhật nhắc nhở
```bash
curl -X PUT "http://localhost:3000/api/lesson-reminders/REMINDER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tiêu đề mới",
    "content": "Nội dung cập nhật"
  }'
```

### Xóa nhắc nhở (tự động gửi email hủy cho học sinh)
```bash
curl -X DELETE "http://localhost:3000/api/lesson-reminders/REMINDER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Đánh dấu hoàn thành
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/REMINDER_ID/complete" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 4. Test Nhanh

### Template cơ bản (chỉ 3 trường)
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra15",
    "title": "Test",
    "content": "Test content"
  }'
```

### Với biến môi trường
```bash
export TOKEN="your_actual_token_here"
export LESSON="your_lesson_id_here"

curl -X POST "http://localhost:3000/api/lesson-reminders/lessons/$LESSON" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra15",
    "title": "Kiểm tra nhanh",
    "content": "Kiểm tra kiến thức đã học"
  }'
```

### Xóa nhanh với biến
```bash
export REMINDER_ID="your_reminder_id_here"

curl -X DELETE "http://localhost:3000/api/lesson-reminders/$REMINDER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

## 5. Workflow Đơn Giản

### Bước 1: Tạo reminder
```bash
RESPONSE=$(curl -s -X POST "http://localhost:3000/api/lesson-reminders/lessons/LESSON_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "kiemtra15",
    "title": "Kiểm tra đơn giản",
    "content": "Nội dung kiểm tra cơ bản"
  }')

echo $RESPONSE
REMINDER_ID=$(echo $RESPONSE | jq -r '.data.reminderId')
echo "Created reminder: $REMINDER_ID"
```

### Bước 2: Xem danh sách
```bash
curl -X GET "http://localhost:3000/api/lesson-reminders/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Bước 3: Đánh dấu hoàn thành
```bash
curl -X POST "http://localhost:3000/api/lesson-reminders/$REMINDER_ID/complete" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Bước 4: Xóa nhắc nhở (gửi email hủy)
```bash
curl -X DELETE "http://localhost:3000/api/lesson-reminders/$REMINDER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 6. Workflow Xóa Nhắc Nhở

### Cách 1: Xóa trực tiếp bằng ID (tự động gửi email hủy)
```bash
curl -X DELETE "http://localhost:3000/api/lesson-reminders/67890abcdef123456789" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Cách 2: Tìm và xóa
```bash
# Tìm reminder cần xóa
REMINDERS=$(curl -s -X GET "http://localhost:3000/api/lesson-reminders/" \
  -H "Authorization: Bearer YOUR_TOKEN")

echo $REMINDERS | jq '.data.reminders[] | {id: ._id, title: .title}'

# Xóa reminder đầu tiên
FIRST_ID=$(echo $REMINDERS | jq -r '.data.reminders[0]._id')
curl -X DELETE "http://localhost:3000/api/lesson-reminders/$FIRST_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Cách 3: Xóa với xác nhận
```bash
REMINDER_ID="67890abcdef123456789"

# Xem chi tiết trước khi xóa
curl -X GET "http://localhost:3000/api/lesson-reminders/$REMINDER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

echo "Bạn có chắc muốn xóa? (y/n)"
read -r confirm
if [ "$confirm" = "y" ]; then
  curl -X DELETE "http://localhost:3000/api/lesson-reminders/$REMINDER_ID" \
    -H "Authorization: Bearer YOUR_TOKEN"
  echo "Đã xóa reminder!"
else
  echo "Hủy xóa."
fi
```

## 7. Các Loại Test Type

- `kiemtra15`: Kiểm tra 15 phút
- `kiemtra1tiet`: Kiểm tra 1 tiết  
- `kiemtrathuchanh`: Kiểm tra thực hành
- `kiemtramieng`: Kiểm tra miệng
- `baitap`: Bài tập
- `other`: Loại khác

## Lưu Ý

1. **Trường bắt buộc**: `testType`, `title`, `content`
2. **Trường tự động**: 
   - `expectedTestDate` (default: 7 ngày sau)
   - `priority` (default: medium)
   - `reminderDate` (default: hiện tại)
3. **Email tự động**: 
   - **Tạo reminder**: Gửi email thông báo cho tất cả học sinh
   - **Xóa reminder**: Gửi email hủy bỏ cho tất cả học sinh
4. **Ngày kiểm tra**: Nếu không cung cấp, sẽ tự động đặt 7 ngày sau
5. **Unique**: Mỗi lesson chỉ có một reminder
6. **Xóa reminder**: Chỉ giáo viên tạo mới có thể xóa
7. **Không thể khôi phục**: Sau khi xóa, không thể khôi phục reminder
8. **Email hủy**: Template đặc biệt với màu đỏ, thông báo rõ ràng việc hủy bỏ 