# THIẾT KẾ LẠI SCHEMA THỜI KHÓA BIỂU - 38 TUẦN

## Tổng quan thay đổi

Schema thời khóa biểu đã được thiết kế lại hoàn toàn để hỗ trợ:

### ✅ Các tính năng mới
1. **38 tuần học** bắt đầu từ ngày **12/8/2024**
2. **Cấu trúc 3 tầng**: Schedule → Weeks → Days → Periods
3. **ID riêng cho mỗi tiết học** để dễ dàng quản lý
4. **7-8 tiết học + 2-3 tiết rỗng** mỗi ngày (tiết 1-7 thường, tiết 8-10 rỗng)
5. **Khả năng mở rộng**: Thêm tiết dạy bù/ngoại khóa vào tiết rỗng
6. **Tương thích ngược**: Các API cũ vẫn hoạt động

---

## Cấu trúc Schema mới

### 1. Schedule (Thời khóa biểu chính)
```javascript
{
  class: ObjectId,           // Lớp học
  academicYear: String,      // Năm học (2024-2025)
  academicStartDate: Date,   // 12/8/2024
  totalWeeks: Number,        // 38 tuần
  weeks: [WeekSchema],       // Mảng 38 tuần
  status: String,            // 'draft', 'active', 'archived'
  // ... các field khác
}
```

### 2. Week (Tuần học)
```javascript
{
  weekNumber: Number,        // 1-38
  startDate: Date,          // Ngày đầu tuần (thứ 2)
  endDate: Date,            // Ngày cuối tuần (thứ 7)
  days: [DaySchema]         // 6 ngày (T2-T7)
}
```

### 3. Day (Ngày học)
```javascript
{
  dayOfWeek: Number,        // 2=T2, 3=T3, ..., 7=T7
  dayName: String,          // 'Monday', 'Tuesday', ...
  date: Date,               // Ngày cụ thể
  periods: [PeriodSchema]   // 10 tiết (7 thường + 3 rỗng)
}
```

### 4. Period (Tiết học)
```javascript
{
  _id: ObjectId,            // 🆕 ID riêng cho mỗi tiết
  periodNumber: Number,     // 1-10
  periodType: String,       // 'regular', 'makeup', 'extracurricular', 'fixed', 'empty'
  subject: ObjectId,        // Môn học (nullable cho fixed/empty)
  teacher: ObjectId,        // Giáo viên (nullable cho empty)
  session: String,          // 'morning', 'afternoon'
  timeStart: String,        // '07:00'
  timeEnd: String,          // '07:45'
  status: String,           // 'not_started', 'completed', 'absent', 'makeup'
  // ... các field khác
}
```

---

## Phân bổ tiết học

### Khung giờ mặc định:
- **Buổi sáng**: Tiết 1-5 (07:00-11:20)
- **Buổi chiều**: Tiết 6-10 (13:30-17:35)

### Phân loại tiết:
- **Tiết 1-7**: Tiết học thường (`periodType: 'regular'`)
- **Tiết 8-10**: Tiết rỗng (`periodType: 'empty'`) - dành cho mở rộng

### Tiết cố định:
- **Thứ 2, tiết 1**: Chào cờ (`periodType: 'fixed'`, `specialType: 'flag_ceremony'`)
- **Thứ 7, tiết 7**: Sinh hoạt lớp (`periodType: 'fixed'`, `specialType: 'class_meeting'`)

---

## API mới

### 1. Lấy chi tiết tiết học theo ID
```http
GET /api/schedules/:scheduleId/periods/:periodId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "schedule": {
      "id": "...",
      "class": {...},
      "academicYear": "2024-2025"
    },
    "period": {
      "id": "...",
      "location": {
        "weekNumber": 1,
        "dayOfWeek": 2,
        "dayName": "Monday",
        "date": "2024-08-12",
        "periodNumber": 1
      },
      "basic": {
        "session": "morning",
        "timeStart": "07:00",
        "timeEnd": "07:45"
      },
      "type": {
        "periodType": "fixed",
        "isFixed": true
      }
    }
  }
}
```

### 2. Lấy danh sách tiết rỗng
```http
GET /api/schedules/:scheduleId/empty-slots?weekNumber=1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEmptySlots": 18,
    "emptySlots": [
      {
        "weekNumber": 1,
        "dayOfWeek": 2,
        "dayName": "Monday",
        "periodNumber": 8,
        "periodId": "...",
        "timeStart": "15:10",
        "timeEnd": "15:55"
      }
    ]
  }
}
```

### 3. Lấy thời khóa biểu theo tuần
```http
GET /api/schedules/:scheduleId/weeks?weekNumber=1
```

### 4. Cập nhật trạng thái tiết học theo ID
```http
PUT /api/schedules/:scheduleId/periods/:periodId/status
```

**Body:**
```json
{
  "status": "completed",
  "options": {
    "attendance": {
      "presentStudents": 35,
      "absentStudents": 2,
      "totalStudents": 37
    },
    "notes": "Học sinh tích cực tham gia"
  }
}
```

### 5. Thêm tiết dạy bù vào slot rỗng
```http
POST /api/schedules/:scheduleId/periods/:periodId/makeup
```

**Body:**
```json
{
  "teacherId": "...",
  "subjectId": "...",
  "makeupInfo": {
    "originalDate": "2024-08-15",
    "reason": "Giáo viên bận công tác",
    "originalPeriodNumber": 3,
    "originalWeekNumber": 2,
    "originalDayOfWeek": 5
  }
}
```

### 6. Thêm hoạt động ngoại khóa vào slot rỗng
```http
POST /api/schedules/:scheduleId/periods/:periodId/extracurricular
```

**Body:**
```json
{
  "teacherId": "...",
  "extracurricularInfo": {
    "activityName": "CLB Toán học",
    "activityType": "club",
    "location": "Phòng 301",
    "maxParticipants": 30
  }
}
```

---

## Tương thích ngược

### API cũ vẫn hoạt động:
- `GET /api/schedules/:id` ✅
- `PATCH /api/schedules/:scheduleId/period-status` ✅
- `POST /api/schedules/:scheduleId/periods/makeup` ✅ (deprecated)
- `POST /api/schedules/:scheduleId/periods/extracurricular` ✅ (deprecated)

### Methods tương thích:
- `schedule.getScheduleByDay(dayOfWeek)` ✅
- `schedule.updatePeriodStatus(dayOfWeek, periodNumber, status)` ✅
- `schedule.canAddPeriod(dayOfWeek, periodNumber)` ✅

---

## Ưu điểm của Schema mới

### 1. **Khả năng mở rộng**
- Dễ dàng thêm tiết dạy bù/ngoại khóa vào tiết rỗng
- Có thể mở rộng thành nhiều học kỳ
- Hỗ trợ lịch học theo tuần cụ thể

### 2. **Quản lý chi tiết**
- Mỗi tiết có ID riêng để tracking
- Theo dõi được ngày cụ thể của từng tiết
- Lưu trữ đầy đủ 38 tuần học

### 3. **Hiệu suất tốt**
- Index được tối ưu cho truy vấn theo tuần/ngày
- Populate hiệu quả với đường dẫn cụ thể
- Cấu trúc rõ ràng, dễ cache

### 4. **Trải nghiệm người dùng**
- API trực quan với ID tiết học
- Có thể lấy dữ liệu theo tuần/tháng
- Hỗ trợ nhiều loại hoạt động học tập

---

## Cách triển khai

### 1. **Tạo schedule mới**
```javascript
// Sử dụng API hiện tại
POST /api/schedules/initialize-class
{
  "classId": "...",
  "academicYear": "2024-2025",
  "semester": 1
}
```

### 2. **Migration dữ liệu cũ** (nếu cần)
```javascript
// Script migration sẽ được tạo riêng nếu cần thiết
// Chuyển đổi từ cấu trúc schedule.schedule[] 
// sang schedule.weeks[].days[].periods[]
```

### 3. **Test API mới**
```bash
# Test tạo schedule
npm run test test-new-schedule.js

# Test các API mới
npm run test test-period-apis.js
```

---

## Lưu ý quan trọng

### ⚠️ **Không ảnh hưởng thuật toán hiện tại**
- Logic tạo thời khóa biểu vẫn giữ nguyên
- Teacher assignment logic không thay đổi
- Optimization algorithm vẫn hoạt động

### ⚠️ **Compatibility**
- Code cũ vẫn chạy bình thường
- Các script test hiện tại vẫn hoạt động
- Chỉ có thêm tính năng mới

### ⚠️ **Performance**
- File model lớn hơn do có 38 tuần
- Cần thiết lập index phù hợp
- Populate cần được tối ưu

---

## Roadmap tiếp theo

### Phase 1: ✅ Hoàn thành
- [x] Thiết kế lại schema
- [x] Cập nhật model methods
- [x] Tạo API mới
- [x] Đảm bảo tương thích ngược

### Phase 2: 🚧 Đang thực hiện
- [ ] Tạo script test cho API mới
- [ ] Tối ưu performance
- [ ] Documentation chi tiết

### Phase 3: 📋 Kế hoạch
- [ ] Migration tool (nếu cần)
- [ ] Dashboard quản lý theo tuần
- [ ] Export/Import theo tuần
- [ ] Báo cáo chi tiết theo thời gian

---

*Tài liệu này được cập nhật vào: {{ new Date().toLocaleDateString('vi-VN') }}* 