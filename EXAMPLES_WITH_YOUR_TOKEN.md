# 🧪 VÍ DỤ CỤ THỂ VỚI TOKEN CỦA BẠN

## 🔑 Token hiện tại:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDc3MDM4NiwiZXhwIjoxNzUwODU2Nzg2fQ.0J3MF4r7d_PPKMqHIhz48ndq_tlYtqIhSQladoDNNZM
```

## 📚 Tạo Thời Khóa Biểu với 2 Options

### 🗓️ Option 1: Thứ 2-6 (Sinh hoạt lớp thứ 6)
```bash
curl --location 'http://localhost:3000/api/schedules/initialize' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDc3MDM4NiwiZXhwIjoxNzUwODU2Nzg2fQ.0J3MF4r7d_PPKMqHIhz48ndq_tlYtqIhSQladoDNNZM' \
--data '{
    "academicYear": "2024-2025",
    "gradeLevel": "12",
    "scheduleType": "MONDAY_TO_FRIDAY"
}'
```

### 🗓️ Option 2: Thứ 2-7 (Sinh hoạt lớp thứ 7) - Default
```bash
curl --location 'http://localhost:3000/api/schedules/initialize' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDc3MDM4NiwiZXhwIjoxNzUwODU2Nzg2fQ.0J3MF4r7d_PPKMqHIhz48ndq_tlYtqIhSQladoDNNZM' \
--data '{
    "academicYear": "2024-2025",
    "gradeLevel": "12",
    "scheduleType": "MONDAY_TO_SATURDAY"
}'
```

### 🗓️ Option 3: Giống lệnh gốc của bạn (Mặc định = MONDAY_TO_SATURDAY)
```bash
curl --location 'http://localhost:3000/api/schedules/initialize' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDc3MDM4NiwiZXhwIjoxNzUwODU2Nzg2fQ.0J3MF4r7d_PPKMqHIhz48ndq_tlYtqIhSQladoDNNZM' \
--data '{
    "academicYear": "2024-2025",
    "gradeLevel": 12,
    "semester": 1
}'
```

## 🔍 Kiểm tra kết quả

### Lấy lịch học chi tiết lớp 12A1
```bash
curl --location 'http://localhost:3000/api/schedules/class?className=12A1&academicYear=2024-2025&startOfWeek=2024-08-12&endOfWeek=2024-08-18' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDc3MDM4NiwiZXhwIjoxNzUwODU2Nzg2fQ.0J3MF4r7d_PPKMqHIhz48ndq_tlYtqIhSQladoDNNZM'
```

### Lấy thống kê thời khóa biểu
```bash
curl --location 'http://localhost:3000/api/schedules/stats?academicYear=2024-2025' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDc3MDM4NiwiZXhwIjoxNzUwODU2Nzg2fQ.0J3MF4r7d_PPKMqHIhz48ndq_tlYtqIhSQladoDNNZM'
```

## 🎯 So sánh kết quả

### ✅ Với scheduleType: "MONDAY_TO_FRIDAY"
- Ngày học: Thứ 2, 3, 4, 5, 6 (5 ngày)
- Sinh hoạt lớp: Thứ 6, tiết 5
- Thứ 7 + CN: 20 tiết trống
- Phù hợp: Trường nghỉ cuối tuần hoàn toàn

### ✅ Với scheduleType: "MONDAY_TO_SATURDAY" 
- Ngày học: Thứ 2, 3, 4, 5, 6, 7 (6 ngày)
- Sinh hoạt lớp: Thứ 7, tiết 5
- CN: 10 tiết trống
- Phù hợp: Trường cần thêm ngày học

### ✅ Không có scheduleType (giống lệnh gốc)
- Mặc định = MONDAY_TO_SATURDAY
- Tương tự option 2

## 📊 Expected Response Format

```json
{
  "success": true,
  "message": "Schedules initialized successfully with new architecture",
  "data": {
    "summary": {
      "totalClasses": 4,
      "createdSchedules": 4,
      "skippedSchedules": 0,
      "failedSchedules": 0,
      "successRate": "100.00%",
      "scheduleType": "MONDAY_TO_FRIDAY"
    },
    "results": [
      {
        "classId": "...",
        "className": "12A1",
        "status": "created",
        "scheduleId": "...",
        "scheduleType": "MONDAY_TO_FRIDAY",
        "totalWeeks": 38,
        "totalLessons": 1520
      }
    ],
    "useNewArchitecture": true
  },
  "architecture": "lesson-based",
  "scheduleType": "MONDAY_TO_FRIDAY"
}
```

## 🚨 Lưu ý quan trọng

1. **Token expiry**: Token của bạn hết hạn lúc `1750856786` (timestamp)
2. **Backup**: Nên backup data trước khi tạo lịch mới
3. **Performance**: Mỗi lần tạo sẽ tạo ~6000 lessons cho 4 lớp x 38 tuần
4. **WeeklyHours**: Đảm bảo subjects đã có cấu hình weeklyHours đúng

## 🧪 Test Script với token của bạn

```bash
# Làm script có thể chạy
chmod +x test-schedule-options.sh

# Chạy test với token của bạn
./test-schedule-options.sh eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDc3MDM4NiwiZXhwIjoxNzUwODU2Nzg2fQ.0J3MF4r7d_PPKMqHIhz48ndq_tlYtqIhSQladoDNNZM
``` 