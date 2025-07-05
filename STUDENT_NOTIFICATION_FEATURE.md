# Student Notification Feature - Lesson Request

## 📧 Tính năng thông báo học sinh khi approve lesson request

### 🎯 Mục đích:
Khi manager approve yêu cầu đổi tiết hoặc dạy bù, hệ thống sẽ tự động gửi email thông báo cho tất cả học sinh trong lớp để họ biết về thay đổi lịch học.

### 🔄 Flow hoạt động:

1. **Manager approve request** → `approveRequest()`
2. **Gửi email cho giáo viên** → `sendRequestNotifications()`
3. **Gửi email cho học sinh** → `sendStudentNotifications()` ✨ **NEW**

### 📧 Email Templates:

#### 🔄 **SWAP Notification (Đổi tiết):**

```html
Subject: Thông báo đổi tiết - [Tên lớp]

Content:
- 📅 Thay đổi lịch học
- ❌ Tiết bị hủy: [Ngày] - Tiết X (XX:XX-XX:XX)
- ✅ Tiết mới: [Ngày] - Tiết Y (YY:YY-YY:YY)
- 📝 Lý do thay đổi
- ⚠️ Cảnh báo: Ghi nhớ thời gian mới
```

#### 📚 **MAKEUP Notification (Dạy bù):**

```html
Subject: Thông báo dạy bù - [Tên lớp]

Content:
- 📚 Thông tin tiết dạy bù
- 📅 Tiết học bị vắng: [Ngày] - Tiết X (XX:XX-XX:XX)
- ✅ Tiết dạy bù: [Ngày] - Tiết Y (YY:YY-YY:YY)
- 📝 Lý do dạy bù
- 📚 Khuyến khích: Tham gia đầy đủ
```

### 🛠️ Implementation Details:

#### 1. **sendStudentNotifications()**
```javascript
async sendStudentNotifications(lessonRequest, status) {
  // Lấy danh sách học sinh trong lớp
  const students = await User.find({ 
    role: 'student',
    'studentInfo.class': lessonRequest.additionalInfo.classInfo._id
  });
  
  // Tạo email content theo loại request
  const emailContent = lessonRequest.requestType === 'swap' 
    ? this.createSwapNotificationEmail(lessonRequest)
    : this.createMakeupNotificationEmail(lessonRequest);
    
  // Gửi email cho từng học sinh
  for (const student of students) {
    await emailService.sendEmail(student.email, subject, emailContent);
  }
}
```

#### 2. **createSwapNotificationEmail()**
- Hiển thị tiết bị hủy vs tiết mới
- So sánh rõ ràng với màu sắc khác nhau
- Cảnh báo ghi nhớ thời gian mới

#### 3. **createMakeupNotificationEmail()**
- Hiển thị tiết bị vắng và lý do
- Thông tin tiết dạy bù chi tiết
- Khuyến khích tham gia đầy đủ

### 📊 Expected Results:

#### ✅ **SWAP Email Example:**
```
Thông báo đổi tiết - 12A1

📅 Thay đổi lịch học:
❌ Tiết bị hủy:
   Ngày: 16/12/2024
   Tiết 7 (13:20-14:05)
   Chủ đề: Bài 15 - Hóa học

✅ Tiết mới:
   Ngày: 17/12/2024  
   Tiết 10 (15:50-16:35)
   Chủ đề: Bài 15 - Hóa học

📝 Lý do: Có việc đột xuất cần xử lý

⚠️ Vui lòng ghi nhớ thời gian học mới!
```

#### ✅ **MAKEUP Email Example:**
```
Thông báo dạy bù - 12A1

📚 Thông tin tiết dạy bù:
📅 Tiết học bị vắng:
   Ngày: 15/12/2024
   Tiết 3 (08:40-09:25)
   Lý do vắng: Giáo viên ốm

✅ Tiết dạy bù:
   Ngày: 18/12/2024
   Tiết 8 (14:10-14:55)
   Nội dung: Dạy bù tiết học ngày 15/12/2024

📝 Lý do: Dạy bù tiết vắng do ốm

📚 Vui lòng tham gia đầy đủ tiết dạy bù!
```

### 🎨 Email Design Features:

- **📱 Responsive design** - Hiển thị tốt trên mobile
- **🎨 Color coding:**
  - 🔴 Red: Tiết bị hủy/vắng
  - 🟢 Green: Tiết mới/dạy bù
  - 🔵 Blue: Thông tin chung
  - 🟡 Yellow: Cảnh báo/lưu ý
- **📋 Clear structure** - Dễ đọc và hiểu
- **⚠️ Call-to-action** - Nhắc nhở quan trọng

### 🔧 Technical Notes:

1. **Error Handling:**
   - Không throw error nếu gửi email thất bại
   - Log chi tiết để debug
   - Không làm gián đoạn approval flow

2. **Performance:**
   - Gửi email bất đồng bộ
   - Không block approval process
   - Có thể optimize với email queue sau này

3. **Data Requirements:**
   - Student phải có email hợp lệ
   - Student phải thuộc đúng class
   - TimeSlot phải được populate đầy đủ

### 📝 Log Output Example:

```
✅ Approving lesson request: 6867a28d234475b755c22953
🔄 Swapped lessons: 58283b_20240813_1492_060 ↔ 58283b_20240814_1495_305
📧 Email sent successfully: <message-id-teacher>
📧 Sent đổi tiết approved notification to teacher
📧 Sending student notifications for swap approved
📧 Email sent successfully: <message-id-student-1>
📧 Email sent successfully: <message-id-student-2>
📧 Email sent successfully: <message-id-student-3>
📧 Sent đổi tiết notification to 25 students
✅ Approved lesson swap request: 6867a28d234475b755c22953
```

### 🚀 Benefits:

- ✅ **Transparency** - Học sinh biết rõ thay đổi
- ✅ **Attendance** - Giảm vắng mặt do không biết lịch
- ✅ **Communication** - Thông tin đầy đủ, chi tiết
- ✅ **Professional** - Email đẹp, dễ hiểu
- ✅ **Automated** - Không cần thao tác thủ công 