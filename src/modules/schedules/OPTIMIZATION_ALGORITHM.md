# 🎯 Advanced Schedule Optimization Algorithm

## Tổng quan

Hệ thống tạo thời khóa biểu sử dụng thuật toán **Heuristic/Greedy** để tối ưu hóa việc phân bổ các tiết học với nhiều ràng buộc phức tạp. Thuật toán này đảm bảo việc tạo ra thời khóa biểu hiệu quả và thực tế cho môi trường giáo dục.

## 🎯 Mục tiêu tối ưu hóa

### 1. **Teacher Clustering (Dạy theo cụm)**
- Giáo viên được sắp xếp dạy các tiết liên tiếp để tối ưu hóa thời gian di chuyển
- Giảm thiểu thời gian chờ đợi giữa các tiết dạy
- Tăng hiệu quả công việc của giáo viên

### 2. **Subject Balance (Cân bằng môn học)**
- Tránh việc học sinh chỉ học các môn lý thuyết trong một ngày
- Phân bố đều các môn thực hành và lý thuyết
- Đảm bảo sự đa dạng trong lịch học hàng ngày

### 3. **Conflict Resolution (Giải quyết xung đột)**
- **Teacher Conflicts**: Mỗi giáo viên chỉ dạy một lớp tại một thời điểm
- **Room Conflicts**: Mỗi phòng học chỉ phục vụ một lớp tại một thời điểm
- **Adjacent Period Limits**: Mỗi môn tối đa 2 tiết liền kề trong ngày

### 4. **🆕 Double Period Optimization (Tối ưu tiết đôi)**
- **Preferred Subjects**: Ưu tiên tạo tiết đôi cho Văn, Toán, Tiếng Anh, Vật lý, Hóa học
- **Enhanced Learning**: Tiết đôi giúp tăng hiệu quả học tập cho các môn cốt lõi
- **Flexible Constraint**: Cho phép vi phạm nhẹ ràng buộc tiết liên tiếp cho các môn ưu tiên

### 5. **Resource Optimization (Tối ưu tài nguyên)**
- Phòng học được phân bổ phù hợp với môn học (lab, gym, etc.)
- Tối ưu hóa việc sử dụng phòng học đặc biệt
- Cân nhắc sức chứa phòng học

## 🔧 Cấu trúc thuật toán

### Phase 1: Initialization (Khởi tạo)
```javascript
initializeScheduleState(classId, academicYear, subjects, teachers, rooms) {
  // 1. Tiền xử lý môn học (phân loại, độ ưu tiên)
  // 2. Tiền xử lý giáo viên (lịch trống, sở thích)
  // 3. Tạo cấu trúc dữ liệu tracking
  // 4. Khởi tạo ma trận xung đột
  // 5. 🆕 Khởi tạo danh sách môn ưu tiên tiết đôi
}
```

### Phase 2: Subject Distribution (Phân bố môn học)
```javascript
distributeSubjectsOptimally(subjects, totalPeriods) {
  // 1. Sắp xếp môn học theo độ ưu tiên
  // 2. Phân bố 33 tiết/tuần theo tỷ lệ
  // 3. Cân bằng môn lý thuyết/thực hành
  // 4. 🆕 Ưu tiên phân bố các môn có tiết đôi
}
```

### Phase 3: Greedy Assignment (Phân công tham lam)
```javascript
greedyScheduleOptimization(scheduleState, subjectDistribution, allSlots) {
  for each timeSlot in prioritizedSlots {
    bestAssignment = findBestAssignmentForSlot(slot, availablePeriods)
    if (bestAssignment.score > threshold) {
      assignPeriodToSlot(slot, bestAssignment)
    }
  }
}
```

### Phase 4: Heuristic Scoring (Tính điểm heuristic)
```javascript
calculateAssignmentScore(slot, period, teacher, room, scheduleState) {
  score = baseScore
  score += teacherClusteringBonus(slot, teacher)
  score += subjectBalanceBonus(slot, subject)
  score += roomSuitabilityBonus(subject, room)
  score += doublePeriodBonus(slot, subject)  // 🆕 Bonus tiết đôi
  score -= constraintPenalties(slot, period, teacher)
  return score
}
```

## 📊 Hàm điểm Heuristic

### Bonus Points (Điểm thưởng)
- **Teacher Clustering**: +10 điểm cho mỗi tiết liền kề cùng giáo viên
- **Subject Balance**: +5 điểm nếu môn chưa có trong ngày
- **Theory/Practical Balance**: +8 điểm khi cân bằng lý thuyết/thực hành
- **Room Suitability**: +15 điểm cho phòng phù hợp (gym cho thể dục)
- **Teacher Preference**: +3 điểm cho khung giờ ưa thích
- **🆕 Double Period Bonus**: +20 điểm cho tiết đôi của môn ưu tiên
- **🆕 Double Period Potential**: +10 điểm cho tiềm năng tạo tiết đôi

### Penalty Points (Điểm phạt)
- **Teacher Conflict**: -100 điểm (xung đột giáo viên)
- **Room Conflict**: -50 điểm (xung đột phòng học)
- **Max Periods Violation**: -20 điểm (vượt quá 2 tiết/môn/ngày)
- **Consecutive Violation (Normal)**: -15 điểm (3 tiết liên tiếp cùng môn)
- **🆕 Consecutive Violation (Preferred)**: -25 điểm (vi phạm nhẹ cho môn ưu tiên tiết đôi)

## 🆕 Ràng buộc tiết đôi mới

### Môn học ưu tiên tiết đôi
```javascript
doublePeriodPreferredSubjects = [
  'Literature', 'Vietnamese Literature', 'Văn học', 'Ngữ văn',
  'Mathematics', 'Math', 'Toán học', 'Toán',
  'English', 'Tiếng Anh', 'Anh văn',
  'Physics', 'Vật lý', 'Vật lí',
  'Chemistry', 'Hóa học', 'Hóa'
]
```

### Logic tiết đôi
1. **Kiểm tra tiết trước**: Nếu tiết trước cùng môn → +20 điểm bonus
2. **Kiểm tra tiết sau**: Nếu tiết sau có thể assign cùng môn → +10 điểm potential
3. **Relaxed Constraint**: Cho phép vi phạm nhẹ ràng buộc 2 tiết liên tiếp

## 🏗️ Cấu trúc dữ liệu

### ScheduleState (Cập nhật)
```javascript
{
  classId: ObjectId,
  academicYear: String,
  subjects: [PreprocessedSubject],
  teachers: Map<teacherId, TeacherData>,
  rooms: [Room],
  schedule: [DaySchedule],
  teacherSchedules: Map<teacherId, Schedule>,
  roomSchedules: Map<roomId, Schedule>,
  constraints: {
    // ... existing constraints
    enableDoublePeriods: true,           // 🆕
    doublePeriodBonus: 20,              // 🆕
    maxDoublePeriodViolationPenalty: -25 // 🆕
  },
  statistics: OptimizationStats
}
```

### PreprocessedSubject
```javascript
{
  _id: ObjectId,
  subjectName: String,
  weeklyHours: Number,
  category: 'theory' | 'practical' | 'science' | 'language',
  priority: Number,        // 1-10
  flexibility: Number      // 1-10
}
```

### TeacherData
```javascript
{
  _id: ObjectId,
  name: String,
  subjects: [Subject],
  schedule: Map<day, [Period]>,
  workload: Number,
  clusterBonus: Number,
  preferredTimeSlots: Preferences
}
```

## 🎲 Ràng buộc (Constraints) - Cập nhật

### Hard Constraints (Ràng buộc cứng)
1. **No Teacher Conflicts**: Giáo viên không thể dạy 2 lớp cùng lúc
2. **No Room Conflicts**: Phòng học không thể phục vụ 2 lớp cùng lúc
3. **Subject-Teacher Matching**: Giáo viên chỉ dạy môn mình phụ trách
4. **Time Slot Validity**: Chỉ phân bổ trong khung giờ hợp lệ

### Soft Constraints (Ràng buộc mềm)
1. **Max 2 Adjacent Periods**: Tối đa 2 tiết liền kề cùng môn
2. **🆕 Preferred Double Periods**: Ưu tiên tiết đôi cho Văn, Toán, Anh, Lý, Hóa
3. **Max 2 Periods Per Day**: Tối đa 2 tiết/môn/ngày
4. **Theory/Practical Balance**: Cân bằng lý thuyết và thực hành
5. **Teacher Clustering**: Ưu tiên giáo viên dạy liên tiếp

## 🚀 Cải tiến mới

### 1. Enhanced Consecutive Period Logic
- Đếm chính xác số tiết liên tiếp trước và sau
- Xử lý đặc biệt cho môn ưu tiên tiết đôi
- Penalty linh hoạt dựa trên loại môn học

### 2. Double Period Optimization
- Nhận diện môn học ưu tiên tự động
- Tính toán bonus tiết đôi thông minh
- Dự đoán khả năng tạo tiết đôi trong tương lai

### 3. Cross-Class Teacher Conflict Prevention
- Chuẩn bị sẵn logic kiểm tra xung đột giữa các lớp
- Framework mở rộng cho global teacher schedule

## 📈 Độ phức tạp

- **Time Complexity**: O(n × m × p × r × d)
  - n: số time slots (42 slots/week)
  - m: số môn học cần phân bổ (33 periods)
  - p: số giáo viên có thể dạy
  - r: số phòng học có thể sử dụng
  - d: độ phức tạp tính toán tiết đôi

- **Space Complexity**: O(n + m + p + r + s)
  - s: không gian lưu trữ state tiết đôi

## 🚀 Sử dụng

### API Endpoint
```bash
POST /api/schedules/initialize-optimized
```

### Request Body
```json
{
  "academicYear": "2024-2025",
  "gradeLevel": 12,
  "semester": 1
}
```

### Response
```json
{
  "success": true,
  "message": "Optimized schedules created successfully",
  "data": {
    "academicYear": "2024-2025",
    "gradeLevel": 12,
    "totalClasses": 4,
    "results": [...]
  },
  "optimization": {
    "totalClasses": 4,
    "successfullyOptimized": 4,
    "averageOptimizationScore": 245.8,
    "constraints": {
      "teacherClustering": "✅ Giáo viên dạy theo cụm",
      "subjectBalance": "✅ Cân bằng môn học trong ngày",
      "noConflicts": "✅ Không xung đột giáo viên/phòng học",
      "practicalBalance": "✅ Tránh ngày chỉ có lý thuyết"
    }
  }
}
```

## 🧪 Testing

### Chạy test thuật toán
```bash
node test-optimized-schedule.js
```

### Các trường hợp test mới
1. **Double Period Creation**: Test tạo tiết đôi cho môn ưu tiên
2. **Flexible Constraint**: Test việc vi phạm nhẹ ràng buộc
3. **Cross-Subject Balance**: Test cân bằng khi có tiết đôi
4. **Teacher Conflict Resolution**: Test giải quyết xung đột nâng cao

## 🔄 Fallback Strategy

Nếu thuật toán tối ưu hóa thất bại, hệ thống sẽ tự động chuyển về thuật toán cơ bản:

```javascript
try {
  const optimizedSchedule = await advancedScheduler.generateOptimalSchedule(...)
  return optimizedSchedule
} catch (error) {
  console.log('⚠️ Advanced scheduling failed, falling back to basic algorithm')
  return basicSchedulingAlgorithm(...)
}
```

## 📝 Notes

- Thuật toán được thiết kế để xử lý 33 tiết/tuần (5 sáng + 2 chiều × 6 ngày)
- Có thể mở rộng để hỗ trợ thêm ràng buộc tùy chỉnh
- Tích hợp với hệ thống quản lý lớp học, môn học, và giáo viên hiện có
- Hỗ trợ multiple academic years và semesters

## 🔮 Future Enhancements

1. **Machine Learning Integration**: Học từ lịch sử để cải thiện scoring
2. **Dynamic Constraints**: Cho phép admin tùy chỉnh ràng buộc
3. **Multi-objective Optimization**: Tối ưu nhiều mục tiêu đồng thời
4. **Real-time Adjustment**: Điều chỉnh lịch theo thời gian thực
5. **Load Balancing**: Cân bằng khối lượng công việc giáo viên 