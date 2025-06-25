# Class Validation Security - Leave Request System

## 🔒 Bảo mật theo Lớp học

Hệ thống Leave Request của EcoSchool có cơ chế bảo mật chặt chẽ đảm bảo học sinh **CHỈ có thể xin vắng các tiết học của lớp mình**.

## 🛡️ Các lớp bảo mật

### 1. **Validation khi lấy Available Lessons**
```javascript
// Chỉ trả về lessons của lớp học sinh
const lessons = await Lesson.find({
  class: student.class_id._id, // CHỈ lớp của học sinh
  scheduledDate: { $gte: now, $lte: end },
  status: 'scheduled'
});
```

**Kết quả**: Học sinh chỉ thấy được các tiết của lớp mình, không thể thấy tiết của lớp khác.

### 2. **Validation khi tạo Leave Request**
```javascript
// Kiểm tra nghiêm ngặt
if (lesson.class._id.toString() !== student.class_id._id.toString()) {
  errors.push(`Access denied: Student from class ${student.class_id.className} cannot request leave for lesson in class ${lesson.class.className}`);
  console.log(`🚫 SECURITY: Student ${student.name} (${student.class_id.className}) tried to access lesson for class ${lesson.class.className}`);
  continue;
}
```

**Kết quả**: Ngay cả khi học sinh có lesson ID của lớp khác, hệ thống sẽ từ chối và ghi log security.

### 3. **Database Level Protection**
- User model có field `class_id` liên kết với Class
- Lesson model có field `class` liên kết với Class
- Mọi query đều filter theo class relationship

## 🧪 Test Cases

### Test 1: Available Lessons Filtering
```bash
# Student 12A4 chỉ thấy lessons của 12A4
curl -X GET "http://localhost:3000/api/leave-requests/available-lessons?startDate=2024-08-12&endDate=2024-08-19" \
  -H "Authorization: Bearer <student_12a4_token>"

# Response: Chỉ có lessons của class 12A4
```

### Test 2: Cross-Class Access Prevention
```bash
# Student 12A4 cố gắng xin vắng lesson của 12A1
curl -X POST "http://localhost:3000/api/leave-requests/create" \
  -H "Authorization: Bearer <student_12a4_token>" \
  -d '{
    "lessonIds": ["lesson_id_from_12a1"],
    "phoneNumber": "0987654321",
    "reason": "This should be blocked"
  }'

# Response: 400 Bad Request với error message
{
  "success": false,
  "data": {
    "errors": [
      "Access denied: Student from class 12A4 cannot request leave for lesson in class 12A1"
    ]
  }
}
```

### Test 3: Security Logging
Khi có attempt truy cập cross-class, hệ thống sẽ log:
```
🚫 SECURITY: Student Nguyễn Văn An (12A4) tried to access lesson for class 12A1
```

## 🔍 Implementation Details

### 1. User Model Updates
```javascript
// Virtual field for compatibility
userSchema.virtual('classId').get(function() {
  return this.class_id;
});

// Population để lấy thông tin class
const student = await User.findById(studentId).populate('class_id', 'className');
```

### 2. Service Layer Validation
```javascript
// Kiểm tra student có class không
if (!student.class_id) {
  throw new Error('Student is not assigned to any class');
}

// Log thông tin student và class
console.log(`👨‍🎓 Student ${student.name} from class ${student.class_id.className} requesting leave`);

// Validation nghiêm ngặt cho mỗi lesson
if (lesson.class._id.toString() !== student.class_id._id.toString()) {
  // Block và log security event
}
```

### 3. Controller Layer Protection
```javascript
// Middleware đã check authentication và role
// Service layer check class membership
// Double validation cho security
```

## 🚨 Security Scenarios

### Scenario 1: Normal Usage ✅
1. Student 12A4 login
2. Get available lessons → Chỉ thấy lessons của 12A4
3. Create leave request → Success cho lessons của 12A4

### Scenario 2: Malicious Attempt ❌
1. Student 12A4 somehow có lesson ID của 12A1
2. Cố gắng tạo leave request với lesson ID đó
3. **Hệ thống từ chối** và ghi log security
4. Trả về error message rõ ràng

### Scenario 3: Data Tampering ❌
1. Student cố gắng modify request body
2. Thêm lesson IDs của classes khác
3. **Validation layer chặn** tất cả attempts
4. Chỉ process lessons hợp lệ, reject invalid

## 📊 Monitoring & Alerts

### Security Logs
```javascript
// Log format
console.log(`🚫 SECURITY: Student ${student.name} (${student.class_id.className}) tried to access lesson for class ${lesson.class.className}`);

// Có thể extend để:
// - Send alert to admin
// - Log to security audit trail
// - Implement rate limiting
// - Block suspicious users
```

### Metrics to Monitor
- Cross-class access attempts
- Failed validation counts
- Unusual request patterns
- Students without class assignments

## 🔧 Configuration

### Environment Variables
```bash
# Security settings
ENABLE_CLASS_VALIDATION=true
LOG_SECURITY_EVENTS=true
ALERT_ON_SECURITY_VIOLATIONS=true
```

### Database Indexes
```javascript
// Ensure efficient queries
LeaveRequest.index({ studentId: 1, classId: 1 });
Lesson.index({ class: 1, scheduledDate: 1 });
User.index({ class_id: 1, role: 1 });
```

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Verify all students have class_id assigned
- [ ] Test cross-class validation
- [ ] Check security logging
- [ ] Validate database relationships

### Post-deployment
- [ ] Monitor security logs
- [ ] Check validation metrics
- [ ] Verify no false positives
- [ ] Test with real user data

## 🛠️ Troubleshooting

### Common Issues

#### 1. Student không có class_id
```javascript
// Error: Student is not assigned to any class
// Solution: Assign student to a class in User model
await User.findByIdAndUpdate(studentId, { class_id: classId });
```

#### 2. Lesson không có class information
```javascript
// Error: Cannot read property 'className' of null
// Solution: Ensure all lessons have class assigned
await Lesson.updateMany({ class: null }, { class: defaultClassId });
```

#### 3. False security alerts
```javascript
// Check if lesson actually belongs to different class
const lesson = await Lesson.findById(lessonId).populate('class');
console.log('Lesson class:', lesson.class.className);

const student = await User.findById(studentId).populate('class_id');
console.log('Student class:', student.class_id.className);
```

## 📈 Performance Considerations

### Query Optimization
```javascript
// Use indexed fields
.find({ class: student.class_id._id }) // Indexed

// Avoid full table scans
.populate('class_id', 'className') // Only get needed fields

// Batch operations
const studentsByClass = await User.aggregate([
  { $group: { _id: '$class_id', students: { $push: '$_id' } } }
]);
```

### Caching Strategy
```javascript
// Cache student-class mapping
const studentClassCache = new Map();
studentClassCache.set(studentId, classId);

// Cache available lessons by class
const classLessonsCache = new Map();
classLessonsCache.set(classId, lessons);
```

---

## 🎯 Summary

Hệ thống Leave Request có **3 lớp bảo mật** để đảm bảo học sinh chỉ truy cập lessons của lớp mình:

1. **Frontend Filter**: Available lessons API chỉ trả về lessons của lớp học sinh
2. **Backend Validation**: Kiểm tra nghiêm ngặt khi tạo leave request
3. **Security Logging**: Ghi log và alert khi có attempt truy cập cross-class

**Kết quả**: Hệ thống an toàn, bảo mật cao và có khả năng monitoring đầy đủ. 