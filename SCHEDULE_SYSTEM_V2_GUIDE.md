# 📚 HƯỚNG DẪN HỆ THỐNG THỜI KHÓA BIỂU V2

## 🎯 Tổng quan

Hệ thống thời khóa biểu v2 đã được cập nhật với các tính năng mới:

### ✨ Tính năng chính

1. **Đảm bảo đủ tiết học theo `weeklyHours`** - Mỗi môn học sẽ được xếp đúng số tiết theo cấu hình
2. **Tiết 1-5 luôn có subject** - 5 tiết buổi sáng không bao giờ trống, luôn có môn học
3. **Ít nhất 2 ngày >5 tiết** - Đảm bảo học sinh có ít nhất 2 ngày học cả ngày
4. **2 options lịch học**: 
   - **Option 1**: Thứ 2-6 (sinh hoạt lớp thứ 6)
   - **Option 2**: Thứ 2-7 (sinh hoạt lớp thứ 7)

---

## 🔧 API Usage

### 1. Tạo thời khóa biểu với options

```javascript
// Option 1: Thứ 2-6
const result = await ScheduleService.initializeSchedulesWithNewArchitecture({
  academicYear: '2024-2025',
  gradeLevel: '12',
  scheduleType: 'MONDAY_TO_FRIDAY'  // Thứ 2-6
}, token);

// Option 2: Thứ 2-7
const result = await ScheduleService.initializeSchedulesWithNewArchitecture({
  academicYear: '2024-2025',
  gradeLevel: '12',
  scheduleType: 'MONDAY_TO_SATURDAY'  // Thứ 2-7 (default)
}, token);
```

### 2. Response Structure

```javascript
{
  summary: {
    totalClasses: 4,
    createdSchedules: 4,
    skippedSchedules: 0,
    failedSchedules: 0,
    successRate: "100.00%",
    scheduleType: "MONDAY_TO_SATURDAY"
  },
  results: [
    {
      classId: "...",
      className: "12A1",
      status: "created",
      scheduleId: "...",
      scheduleType: "MONDAY_TO_SATURDAY",
      totalWeeks: 38,
      totalLessons: 1520
    }
  ],
  useNewArchitecture: true
}
```

---

## 📊 Cấu hình Subject WeeklyHours

### Ví dụ cấu hình môn học:

```javascript
// subjects collection
{
  subjectName: "Mathematics",
  subjectCode: "MATH",
  weeklyHours: 5,  // 5 tiết/tuần
  gradeLevels: [12],
  category: "core"
}

{
  subjectName: "Literature", 
  subjectCode: "LIT",
  weeklyHours: 4,  // 4 tiết/tuần
  gradeLevels: [12],
  category: "core"
}
```

### Tổng tiết/tuần mẫu cho lớp 12:

| Môn học | weeklyHours | Loại tiết |
|---------|-------------|-----------|
| Toán | 5 | 2 tiết đôi + 1 tiết đơn |
| Văn | 4 | 2 tiết đôi |
| Anh | 3 | 1 tiết đôi + 1 tiết đơn |
| Lý | 3 | 3 tiết đơn |
| Hóa | 3 | 3 tiết đơn |
| Sinh | 2 | 2 tiết đơn |
| Sử | 2 | 2 tiết đơn |
| Địa | 2 | 2 tiết đơn |
| GDCD | 1 | 1 tiết đơn |
| Thể dục | 2 | 2 tiết đơn |
| **Tổng** | **27** | |

---

## 🎯 Ràng buộc và Logic

### 1. Core Periods (Tiết 1-5)
- **Yêu cầu**: Thứ 2-6, tiết 1-5 PHẢI có subject
- **Logic**: Nếu thiếu subject, tự động điền "Học tập tự do"
- **Ưu tiên**: Môn thiếu tiết nhất + priority cao nhất

### 2. Extended Days (Ngày học >5 tiết)
- **Yêu cầu**: Tối thiểu 2 ngày/tuần có >5 tiết
- **Logic**: Tự động thêm tiết vào period 6-8 để đạt yêu cầu
- **Ưu tiên**: Môn chưa đủ weeklyHours

### 3. Double Periods (Tiết đôi)
- **Môn ưu tiên**: Mathematics, Literature, English
- **Phân bổ**: Rãi đều thứ 2-6, tối đa 1 cặp/ngày
- **Logic**: 
  - 4+ tiết → 2 tiết đôi
  - 3 tiết môn ưu tiên → 1 tiết đôi + 1 đơn
  - 2 tiết môn ưu tiên → 1 tiết đôi

### 4. Schedule Options

#### MONDAY_TO_FRIDAY (Thứ 2-6)
```
- Ngày học: Thứ 2, 3, 4, 5, 6
- Sinh hoạt lớp: Thứ 6, tiết 5
- Chào cờ: Thứ 2, tiết 1
- Thứ 7, CN: 10 tiết trống
```

#### MONDAY_TO_SATURDAY (Thứ 2-7)
```
- Ngày học: Thứ 2, 3, 4, 5, 6, 7
- Sinh hoạt lớp: Thứ 7, tiết 5  
- Chào cờ: Thứ 2, tiết 1
- CN: 10 tiết trống
```

---

## 📋 Validation & Reporting

### 1. Constraint Violations

```
🚨 CRITICAL:
- TOTAL_WEEKLY_HOURS_INSUFFICIENT: Thiếu tổng tiết
- TEACHER_DAILY_OVERLOAD: GV quá tải

⚠️ HIGH:
- INSUFFICIENT_PERIODS: Môn thiếu tiết
- INSUFFICIENT_DOUBLE_PERIODS: Thiếu tiết đôi

ℹ️ MEDIUM:
- EXCESSIVE_PERIODS: Môn thừa tiết
```

### 2. Statistics Report

```
📊 Tổng tiết: 27/27 (100.0%)
📈 Ngày học >5 tiết: 3/6 (yêu cầu tối thiểu: 2)
🎯 Tỷ lệ hoàn thành: 100%
✅ Tất cả core periods (1-5) đã có subject
🏆 Yêu cầu extended days: ✅ Đạt
```

---

## 🧪 Testing

### Chạy test script:

```bash
node test-new-schedule-system.js
```

### Test cases:
1. **Test Option 1**: Tạo lịch thứ 2-6
2. **Test Option 2**: Tạo lịch thứ 2-7 (ghi đè)
3. **Test Schedule**: Kiểm tra lịch đã tạo
4. **Test Statistics**: Thống kê môn học

---

## 🔍 Debugging

### 1. Kiểm tra Subject Configuration

```javascript
// Kiểm tra tổng weeklyHours
db.subjects.aggregate([
  { $match: { gradeLevels: 12, isActive: true } },
  { $group: { _id: null, total: { $sum: "$weeklyHours" } } }
])
```

### 2. Kiểm tra Lessons Created

```javascript
// Đếm lessons theo type
db.lessons.aggregate([
  { $group: { _id: "$type", count: { $sum: 1 } } }
])
```

### 3. Kiểm tra Core Periods

```javascript
// Kiểm tra tiết 1-5 có trống không
db.lessons.find({
  scheduledDate: { $gte: ISODate("2024-08-12"), $lte: ISODate("2024-08-16") },
  timeSlot: { $in: [period1_id, period2_id, period3_id, period4_id, period5_id] },
  type: "empty"
})
```

---

## 📝 Notes

1. **Backup**: Luôn backup data trước khi tạo lịch mới
2. **Performance**: Tạo 38 tuần x 4 lớp = ~6000 lessons/lớp
3. **Constraints**: Ưu tiên đảm bảo weeklyHours trước khi tối ưu khác
4. **Teachers**: Tự động tìm giáo viên chuyên môn, fallback về GVCN

---

## 🚀 Future Enhancements

- [ ] Dynamic schedule options (custom days)
- [ ] Teacher preference constraints  
- [ ] Classroom allocation integration
- [ ] Real-time constraint violation alerts
- [ ] Advanced optimization algorithms 