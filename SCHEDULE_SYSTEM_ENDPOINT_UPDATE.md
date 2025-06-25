# 🔄 CẬP NHẬT ENDPOINT SỬ DỤNG API HIỆN CÓ

## 📌 Tóm tắt thay đổi

Thay vì tạo endpoint mới `/api/schedules/initialize-new`, chúng ta đã cập nhật endpoint hiện có `/api/schedules/initialize` để hỗ trợ tham số `scheduleType`.

## 🛠️ Các file đã cập nhật

### 1. **Controller** (`src/modules/schedules/controllers/schedule.controller.js`)
```javascript
// ✅ THÊM: Hỗ trợ scheduleType parameter
const requestData = {
  ...req.body,
  scheduleType: req.body.scheduleType || 'MONDAY_TO_SATURDAY'
};

console.log(`📅 Schedule type: ${requestData.scheduleType}`);
```

### 2. **API Commands** (`api-curl-commands.md`)
```bash
# ✅ CẬP NHẬT: Sử dụng endpoint hiện có
curl --location 'http://localhost:3000/api/schedules/initialize' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--data '{
    "academicYear": "2024-2025",
    "gradeLevel": "12",
    "scheduleType": "MONDAY_TO_FRIDAY"
}'
```

### 3. **Test Scripts**
- `test-schedule-options.sh`: Cập nhật endpoint
- `test-new-schedule-system.js`: Sử dụng service trực tiếp

### 4. **Ví dụ với Token** (`EXAMPLES_WITH_YOUR_TOKEN.md`)
Tạo file mới với token cụ thể của user để test ngay lập tức.

## 🎯 Cách sử dụng

### Option 1: Thứ 2-6 (Sinh hoạt lớp thứ 6)
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

### Option 2: Thứ 2-7 (Sinh hoạt lớp thứ 7) 
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

### Option 3: Giống lệnh gốc (Mặc định = MONDAY_TO_SATURDAY)
```bash
curl --location 'http://localhost:3000/api/schedules/initialize' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI2OWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDc3MDM4NiwiZXhwIjoxNzUwODU2Nzg2fQ.0J3MF4r7d_PPKMqHIhz48ndq_tlYtqIhSQladoDNNZM' \
--data '{
    "academicYear": "2024-2025",
    "gradeLevel": 12,
    "semester": 1
}'
```

## 🔍 Response Format

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

## ⚡ Ưu điểm

1. **Không breaking changes**: API hiện có vẫn hoạt động bình thường
2. **Backward compatible**: Nếu không truyền `scheduleType`, mặc định là `MONDAY_TO_SATURDAY`
3. **Flexible**: Hỗ trợ cả 2 options trong cùng 1 endpoint
4. **Consistent**: Sử dụng cùng validation và middleware hiện có

## 🧪 Test ngay

```bash
# Chạy test script với token của bạn
./test-schedule-options.sh eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDc3MDM4NiwiZXhwIjoxNzUwODU2Nzg2fQ.0J3MF4r7d_PPKMqHIhz48ndq_tlYtqIhSQladoDNNZM

# Hoặc chạy Node.js test
node test-new-schedule-system.js
```

## 🚨 Lưu ý

- Token hết hạn: `1750856786` (timestamp)
- Endpoint không thay đổi: `/api/schedules/initialize`
- Tham số mới: `scheduleType` (optional)
- Mặc định: `MONDAY_TO_SATURDAY` nếu không chỉ định 