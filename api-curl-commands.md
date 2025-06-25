# Schedule APIs - Complete CURL Commands

## 🔑 Authentication Token
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDM0MTIzNywiZXhwIjoxNzUwNDI3NjM3fQ.K6BlMUk-zfcxqnZ8hN6aZ8zfg7ZmvfuXuruG6KA-D0o"
```

## 📋 1. Basic Schedule Management

### 1.1 Initialize Schedules for Academic Year (Basic)
```bash
curl --location 'http://localhost:3000/api/schedules/initialize' \
--header "Authorization: Bearer $TOKEN" \
--header 'Content-Type: application/json' \
--data '{
  "academicYear": "2024-2025",
  "gradeLevel": 12,
  "semester": 1
}'
```

### 1.2 Initialize Optimized Schedules (Heuristic/Greedy Algorithm) ⭐ NEW
```bash
curl --location 'http://localhost:3000/api/schedules/initialize-optimized' \
--header "Authorization: Bearer $TOKEN" \
--header 'Content-Type: application/json' \
--data '{
  "academicYear": "2024-2025",
  "gradeLevel": 12,
  "semester": 1
}'
```

**🎯 Optimization Constraints:**
- ✅ **Teacher Clustering**: Giáo viên dạy theo cụm (liên tiếp các lớp gần nhau)
- ✅ **Subject Balance**: Học sinh không bị học lệch (cân bằng lý thuyết/thực hành)
- ✅ **No Teacher Conflicts**: Mỗi giáo viên không dạy trùng tiết
- ✅ **No Room Conflicts**: Mỗi phòng học chỉ phục vụ một lớp tại một thời điểm
- ✅ **Adjacent Period Limit**: Mỗi môn tối đa 2 tiết liền kề trong ngày
- ✅ **Room Suitability**: Phòng học phù hợp với môn học (lab, gym, etc.)

### 1.3 Check if Class Exists
```bash
curl --location 'http://localhost:3000/api/schedules/check-class?className=12A4&academicYear=2024-2025' \
--header "Authorization: Bearer $TOKEN"
```

### 1.4 View Available Schedules
```bash
curl --location 'http://localhost:3000/api/schedules/available?academicYear=2024-2025' \
--header "Authorization: Bearer $TOKEN"
```

### 1.5 View Available Schedules for Specific Class
```bash
curl --location 'http://localhost:3000/api/schedules/available?academicYear=2024-2025&className=12A4' \
--header "Authorization: Bearer $TOKEN"
```

## 📅 2. Get Class Schedule

### 2.1 Get Schedule by Week Number
```bash
curl --location 'http://localhost:3000/api/schedules/class?className=12A4&academicYear=2024-2025&weekNumber=1' \
--header "Authorization: Bearer $TOKEN"
```

### 2.2 Get Schedule by Date Range (NEW)
```bash
curl --location 'http://localhost:3000/api/schedules/class?className=12A4&academicYear=2024-2025&startOfWeek=2024-12-19&endOfWeek=2024-12-25' \
--header "Authorization: Bearer $TOKEN"
```

### 2.3 Get Current Week Schedule
```bash
curl --location 'http://localhost:3000/api/schedules/class?className=12A4&academicYear=2024-2025&startOfWeek=2024-12-19&endOfWeek=2024-12-25' \
--header "Authorization: Bearer $TOKEN"
```

## 👨‍🏫 3. Get Teacher Schedule (Full 10 Periods)

### 3.1 Get Teacher Schedule by Date Range
```bash
curl --location 'http://localhost:3000/api/schedules/teacher?teacherId=68557c6a0672fea58658278c&academicYear=2024-2025&startOfWeek=2024-12-19&endOfWeek=2024-12-25' \
--header "Authorization: Bearer $TOKEN"
```

### 3.2 Get Teacher Schedule for Current Week
```bash
curl --location 'http://localhost:3000/api/schedules/teacher?teacherId=68557c6a0672fea58658278c&academicYear=2024-2025&startOfWeek=2024-08-12&endOfWeek=2024-08-18' \
--header "Authorization: Bearer $TOKEN"
```

## 📚 4. Get Lesson Detail (NEW API)

### 4.1 Get Detailed Information for a Specific Lesson
```bash
curl --location 'http://localhost:3000/api/schedules/lesson/675a1b2c3d4e5f6789012345' \
--header "Authorization: Bearer $TOKEN"
```

### 4.2 Get Lesson ID from Teacher Schedule First
```bash
# Step 1: Get lesson ID from teacher schedule
curl --location 'http://localhost:3000/api/schedules/teacher?teacherId=68557c6a0672fea58658278c&academicYear=2024-2025&startOfWeek=2024-08-12&endOfWeek=2024-08-18' \
--header "Authorization: Bearer $TOKEN" | jq '.schedule[0].periods[0]._id'

# Step 2: Use the lesson ID to get detailed information
curl --location 'http://localhost:3000/api/schedules/lesson/LESSON_ID_FROM_STEP_1' \
--header "Authorization: Bearer $TOKEN"
```

### 4.3 Different User Roles Accessing Lesson Detail

#### Manager accessing any lesson
```bash
curl --location 'http://localhost:3000/api/schedules/lesson/675a1b2c3d4e5f6789012345' \
--header 'Authorization: Bearer MANAGER_TOKEN'
```

#### Teacher accessing own lesson
```bash
curl --location 'http://localhost:3000/api/schedules/lesson/675a1b2c3d4e5f6789012345' \
--header 'Authorization: Bearer TEACHER_TOKEN'
```

#### Student accessing class lesson
```bash
curl --location 'http://localhost:3000/api/schedules/lesson/675a1b2c3d4e5f6789012345' \
--header 'Authorization: Bearer STUDENT_TOKEN'
```

## 🎓 3. Learning Progress & Attendance (NEW)

### 3.1 Get Learning Progress
```bash
curl --location 'http://localhost:3000/api/schedules/progress?className=12A4&academicYear=2024-2025' \
--header "Authorization: Bearer $TOKEN"
```

### 3.2 Get Learning Progress with Details
```bash
curl --location 'http://localhost:3000/api/schedules/progress?className=12A4&academicYear=2024-2025&includeDetails=true' \
--header "Authorization: Bearer $TOKEN"
```

### 3.3 Get Attendance Report
```bash
curl --location 'http://localhost:3000/api/schedules/attendance-report?className=12A4&academicYear=2024-2025' \
--header "Authorization: Bearer $TOKEN"
```

## ✅ 4. Mark Period Status (NEW)

### 4.1 Mark Period as Completed
```bash
# First get schedule ID from /available API, then use it
SCHEDULE_ID="REPLACE_WITH_ACTUAL_SCHEDULE_ID"

curl --location "http://localhost:3000/api/schedules/$SCHEDULE_ID/mark-completed" \
--header "Authorization: Bearer $TOKEN" \
--header 'Content-Type: application/json' \
--data '{
  "dayOfWeek": 2,
  "periodNumber": 1,
  "attendance": {
    "presentStudents": 35,
    "absentStudents": 3,
    "totalStudents": 38
  },
  "notes": "Đã hoàn thành bài Ngữ văn về thơ Nguyễn Du"
}'
```

### 4.2 Mark Period as Absent
```bash
curl --location "http://localhost:3000/api/schedules/$SCHEDULE_ID/mark-absent" \
--header "Authorization: Bearer $TOKEN" \
--header 'Content-Type: application/json' \
--data '{
  "dayOfWeek": 3,
  "periodNumber": 2,
  "notes": "Giáo viên ốm, chưa có giáo viên thay thế"
}'
```

### 4.3 Update Period Status (Generic)
```bash
curl --location "http://localhost:3000/api/schedules/$SCHEDULE_ID/period-status" \
--header "Authorization: Bearer $TOKEN" \
--header 'Content-Type: application/json' \
--data '{
  "dayOfWeek": 4,
  "periodNumber": 3,
  "status": "makeup",
  "options": {
    "notes": "Tiết bù cho buổi vắng trước đó",
    "attendance": {
      "presentStudents": 37,
      "absentStudents": 1,
      "totalStudents": 38
    }
  }
}'
```

### 4.4 Bulk Update Multiple Periods
```bash
curl --location "http://localhost:3000/api/schedules/$SCHEDULE_ID/bulk-period-status" \
--header "Authorization: Bearer $TOKEN" \
--header 'Content-Type: application/json' \
--data '{
  "updates": [
    {
      "dayOfWeek": 2,
      "periodNumber": 1,
      "status": "completed",
      "options": {
        "attendance": {
          "presentStudents": 35,
          "absentStudents": 3,
          "totalStudents": 38
        },
        "notes": "Hoàn thành bài thực hành Hóa học"
      }
    },
    {
      "dayOfWeek": 2,
      "periodNumber": 2,
      "status": "makeup",
      "options": {
        "notes": "Tiết bù cho buổi vắng trước đó"
      }
    },
    {
      "dayOfWeek": 3,
      "periodNumber": 1,
      "status": "absent",
      "options": {
        "notes": "Vắng do giáo viên ốm"
      }
    }
  ]
}'
```

## 📊 5. Statistics & Reports

### 5.1 Get Schedule Statistics
```bash
curl --location 'http://localhost:3000/api/schedules/stats?academicYear=2024-2025' \
--header "Authorization: Bearer $TOKEN"
```

### 5.2 Get All Schedules with Filters
```bash
curl --location 'http://localhost:3000/api/schedules?academicYear=2024-2025&status=active' \
--header "Authorization: Bearer $TOKEN"
```

### 5.3 Get Schedule by ID
```bash
SCHEDULE_ID="REPLACE_WITH_ACTUAL_SCHEDULE_ID"
curl --location "http://localhost:3000/api/schedules/$SCHEDULE_ID" \
--header "Authorization: Bearer $TOKEN"
```

## 🛠️ 6. Helper APIs

### 6.1 Get Academic Year Options
```bash
curl --location 'http://localhost:3000/api/schedules/helper/academic-years' \
--header "Authorization: Bearer $TOKEN"
```

### 6.2 Get Time Slots
```bash
curl --location 'http://localhost:3000/api/schedules/helper/time-slots' \
--header "Authorization: Bearer $TOKEN"
```

### 6.3 Get Classes by Grade
```bash
curl --location 'http://localhost:3000/api/schedules/helper/classes?academicYear=2024-2025&gradeLevel=12' \
--header "Authorization: Bearer $TOKEN"
```

## 🔧 7. Administrative Operations

### 7.1 Update Schedule Status
```bash
curl --location "http://localhost:3000/api/schedules/$SCHEDULE_ID/status" \
--header "Authorization: Bearer $TOKEN" \
--header 'Content-Type: application/json' \
--data '{
  "status": "active"
}'
```

### 7.2 Delete Schedule
```bash
curl --location "http://localhost:3000/api/schedules/$SCHEDULE_ID" \
--header "Authorization: Bearer $TOKEN" \
--request DELETE
```

## 📝 8. Test Authentication
```bash
curl --location 'http://localhost:3000/api/schedules/test-auth' \
--header "Authorization: Bearer $TOKEN"
```

## 🔄 Usage Flow Example

### Step 1: Initialize schedules
```bash
curl --location 'http://localhost:3000/api/schedules/initialize' \
--header "Authorization: Bearer $TOKEN" \
--header 'Content-Type: application/json' \
--data '{"academicYear": "2024-2025", "gradeLevel": 12, "semester": 1}'
```

### Step 2: Get schedule ID
```bash
curl --location 'http://localhost:3000/api/schedules/available?academicYear=2024-2025&className=12A4' \
--header "Authorization: Bearer $TOKEN"
```

### Step 3: View class schedule
```bash
curl --location 'http://localhost:3000/api/schedules/class?className=12A4&academicYear=2024-2025&startOfWeek=2024-12-16&endOfWeek=2024-12-22' \
--header "Authorization: Bearer $TOKEN"
```

### Step 4: Mark some periods as completed
```bash
# Use the SCHEDULE_ID from Step 2
curl --location "http://localhost:3000/api/schedules/YOUR_SCHEDULE_ID/mark-completed" \
--header "Authorization: Bearer $TOKEN" \
--header 'Content-Type: application/json' \
--data '{
  "dayOfWeek": 2,
  "periodNumber": 1,
  "attendance": {"presentStudents": 35, "absentStudents": 3, "totalStudents": 38},
  "notes": "Completed Literature lesson"
}'
```

### Step 5: Check learning progress
```bash
curl --location 'http://localhost:3000/api/schedules/progress?className=12A4&academicYear=2024-2025&includeDetails=true' \
--header "Authorization: Bearer $TOKEN"
```

## 📚 Period Status Values
- `not_started` - Chưa học
- `completed` - Học xong
- `absent` - Vắng tiết
- `makeup` - Tiết bù

## 📅 Day of Week Values
- `2` - Monday (Thứ 2)
- `3` - Tuesday (Thứ 3)
- `4` - Wednesday (Thứ 4)
- `5` - Thursday (Thứ 5)
- `6` - Friday (Thứ 6)
- `7` - Saturday (Thứ 7)

## ⏰ Period Numbers
- `1-5` - Morning periods (07:00-11:20)
- `6-7` - Afternoon periods (12:30-14:05)

## 🎯 Quick Test Script

Create `test-all.sh`:
```bash
#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDM0MTIzNywiZXhwIjoxNzUwNDI3NjM3fQ.K6BlMUk-zfcxqnZ8hN6aZ8zfg7ZmvfuXuruG6KA-D0o"

echo "1. Testing auth..."
curl --location 'http://localhost:3000/api/schedules/test-auth' --header "Authorization: Bearer $TOKEN"

echo -e "\n\n2. Checking class exists..."
curl --location 'http://localhost:3000/api/schedules/check-class?className=12A4&academicYear=2024-2025' --header "Authorization: Bearer $TOKEN"

echo -e "\n\n3. Getting available schedules..."
curl --location 'http://localhost:3000/api/schedules/available?academicYear=2024-2025&className=12A4' --header "Authorization: Bearer $TOKEN"

echo -e "\n\n4. Getting class schedule..."
curl --location 'http://localhost:3000/api/schedules/class?className=12A4&academicYear=2024-2025&startOfWeek=2024-12-16&endOfWeek=2024-12-22' --header "Authorization: Bearer $TOKEN"
```

Make executable: `chmod +x test-all.sh`
Run: `./test-all.sh`

## 🔐 Authentication
```bash
# Login to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ecoschool.edu.vn",
    "password": "admin123"
  }'

# Response will include token:
# {"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

## 📚 NEW: Tạo Thời Khóa Biểu V2 với 2 Options (Sử dụng endpoint hiện có)

### 🗓️ Option 1: Thứ 2-6 (Sinh hoạt lớp thứ 6)
```bash
curl --location 'http://localhost:3000/api/schedules/initialize' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_TOKEN_HERE' \
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
--header 'Authorization: Bearer YOUR_TOKEN_HERE' \
--data '{
    "academicYear": "2024-2025",
    "gradeLevel": "12",
    "scheduleType": "MONDAY_TO_SATURDAY"
}'
```

### 🗓️ Option 3: Không chỉ định scheduleType (Mặc định = MONDAY_TO_SATURDAY)
```bash
curl --location 'http://localhost:3000/api/schedules/initialize' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_TOKEN_HERE' \
--data '{
    "academicYear": "2024-2025",
    "gradeLevel": "12"
}'
```

### 📋 Response Format cho cả 3 options:
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

## 🔍 Kiểm tra Thời Khóa Biểu đã tạo

### Lấy lịch học theo tuần
```bash
curl -X GET "http://localhost:3000/api/schedules/class/12A1/week?academicYear=2024-2025&startOfWeek=2024-08-12&endOfWeek=2024-08-18" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Lấy lịch học chi tiết (Lesson-based)
```bash
curl -X GET "http://localhost:3000/api/schedules/lessons/class/12A1?academicYear=2024-2025&startOfWeek=2024-08-12&endOfWeek=2024-08-18" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📊 Kiểm tra Subject WeeklyHours

### Lấy danh sách môn học lớp 12
```bash
curl -X GET "http://localhost:3000/api/subjects?gradeLevel=12" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Cập nhật weeklyHours cho môn học
```bash
curl -X PUT http://localhost:3000/api/subjects/SUBJECT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "weeklyHours": 5
  }'
```

## 🧪 Test Commands

### Test với lớp 11
```bash
# Option 1: Thứ 2-6
curl -X POST http://localhost:3000/api/schedules/initialize-new \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "academicYear": "2024-2025",
    "gradeLevel": "11",
    "scheduleType": "MONDAY_TO_FRIDAY"
  }'

# Option 2: Thứ 2-7
curl -X POST http://localhost:3000/api/schedules/initialize-new \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "academicYear": "2024-2025",
    "gradeLevel": "11",
    "scheduleType": "MONDAY_TO_SATURDAY"
  }'
```

### Test với lớp 10
```bash
# Option 1: Thứ 2-6
curl -X POST http://localhost:3000/api/schedules/initialize-new \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "academicYear": "2024-2025",
    "gradeLevel": "10",
    "scheduleType": "MONDAY_TO_FRIDAY"
  }'

# Option 2: Thứ 2-7  
curl -X POST http://localhost:3000/api/schedules/initialize-new \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "academicYear": "2024-2025",
    "gradeLevel": "10",
    "scheduleType": "MONDAY_TO_SATURDAY"
  }'
```

## 📈 Thống kê và Báo cáo

### Lấy thống kê thời khóa biểu
```bash
curl -X GET "http://localhost:3000/api/schedules/stats?academicYear=2024-2025" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Lấy tiến độ học tập
```bash
curl -X GET "http://localhost:3000/api/schedules/progress/12A1?academicYear=2024-2025" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🔧 Quản lý Thời Khóa Biểu

### Xóa thời khóa biểu cũ (trước khi tạo mới)
```bash
curl -X DELETE "http://localhost:3000/api/schedules/class/12A1?academicYear=2024-2025" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Cập nhật trạng thái thời khóa biểu
```bash
curl -X PUT http://localhost:3000/api/schedules/SCHEDULE_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "status": "active"
  }'
```

## 🎯 So sánh 2 Options

### Đặc điểm Option 1 (MONDAY_TO_FRIDAY):
- ✅ Ngày học: Thứ 2-6 (5 ngày)
- ✅ Sinh hoạt lớp: Thứ 6, tiết 5
- ✅ Thứ 7, CN: Hoàn toàn nghỉ (20 tiết trống)
- ✅ Phù hợp: Trường có lịch nghỉ cuối tuần đầy đủ

### Đặc điểm Option 2 (MONDAY_TO_SATURDAY):
- ✅ Ngày học: Thứ 2-7 (6 ngày)  
- ✅ Sinh hoạt lớp: Thứ 7, tiết 5
- ✅ CN: Nghỉ (10 tiết trống)
- ✅ Phù hợp: Trường cần thêm ngày học để hoàn thành chương trình

## 📝 Notes

1. **Token**: Thay `YOUR_TOKEN_HERE` bằng token thực từ API login
2. **Schedule Type**: Mặc định là `MONDAY_TO_SATURDAY` nếu không chỉ định
3. **Backup**: Nên backup data trước khi tạo thời khóa biểu mới
4. **Performance**: Mỗi lần tạo sẽ tạo ~6000 lessons cho 4 lớp x 38 tuần

## 🚨 Error Handling

### Lỗi thường gặp:
```bash
# 401 Unauthorized
{"error": "Access denied. No token provided."}

# 400 Bad Request  
{"error": "Grade level is required"}

# 500 Internal Server Error
{"error": "Failed to initialize schedules: ..."}
``` 