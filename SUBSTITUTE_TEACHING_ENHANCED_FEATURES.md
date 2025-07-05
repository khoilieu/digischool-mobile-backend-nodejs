# Substitute Teaching Enhanced Features

## 🔄 **MAJOR LOGIC CHANGE: From Replacement to Addition**

### Previous Logic (Replacement)
- When substitute teacher approved → `lesson.teacher = substituteTeacherId`
- Original teacher was completely replaced
- Only substitute teacher remained in lesson
- Email used "thay thế" (replace) terminology

### **NEW LOGIC (Addition)**
- When substitute teacher approved → `lesson.substituteTeacher = substituteTeacherId`
- Original teacher remains in `lesson.teacher`
- Both teachers participate in the lesson
- Email uses "dạy bù" (assist/support) terminology

## 🚀 **NEW ENHANCED FEATURES**

### 1. **Flexible Teacher Selection (Updated)**
- **Previous**: Only teachers without time conflicts were returned
- **NEW**: ALL teachers teaching the same subject are returned, including those with time conflicts
- **Benefit**: Users can make informed decisions about teacher selection

### 2. **Conflict Information Display**
```json
{
  "_id": "teacher_id_2", 
  "name": "Trần Văn C",
  "email": "teacher.c@school.com",
  "subject": "subject_id_hoa",
  "subjects": ["subject_id_hoa", "subject_id_sinh"],
  "hasConflict": true,
  "conflictLesson": {
    "className": "12A3",
    "subjectName": "Hóa học",
    "lessonId": "LESSON_20241220_003"
  }
}
```

### 3. **Enhanced Available Teachers API**
- **Endpoint**: `GET /api/schedules/substitute-request/available-teachers/:lessonId`
- **Returns**: All teachers with same subject + conflict information
- **Fields Added**:
  - `hasConflict`: Boolean indicating if teacher has time conflict
  - `conflictLesson`: Details of conflicting lesson (if any)

### 4. **Dual Teacher System**
- **Main Teacher**: Remains in `lesson.teacher` field
- **Substitute Teacher**: Added to `lesson.substituteTeacher` field
- **Schedule Queries**: Updated to find lessons for both teacher types
- **Role Identification**: Teachers see their role (main/substitute) in schedule

### 5. **Updated Email Templates**
- **Terminology Change**: "dạy thay" → "dạy bù"
- **Collaborative Approach**: Emphasizes both teachers working together
- **Student Notifications**: Explain both teachers will participate

### 6. **Enhanced Schedule Service**
```javascript
// Query finds lessons for both main and substitute teachers
const lessons = await Lesson.find({
  $or: [
    { teacher: teacherId },
    { substituteTeacher: teacherId }
  ]
}).populate('teacher substituteTeacher');
```

## 📊 **Database Schema Updates**

### Lesson Model Enhancement
```javascript
// Added to existing Lesson schema
substituteTeacher: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null
}
```

### User Model Enhancement
```javascript
// Added to support multiple subjects per teacher
subjects: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Subject'
}]
```

## 🔧 **API Changes Summary**

### 1. Available Teachers API (Enhanced)
- **Before**: Filtered out teachers with conflicts
- **After**: Returns all teachers with conflict information
- **Impact**: Better user experience, informed decision making

### 2. Create Request API (Simplified)
- **Before**: Rejected requests with conflicting teachers
- **After**: Allows all teachers, displays conflict info
- **Impact**: More flexible teacher selection

### 3. Approve Request API (Logic Updated)
- **Before**: `lesson.teacher = substituteTeacherId`
- **After**: `lesson.substituteTeacher = substituteTeacherId`
- **Impact**: Preserves original teacher, adds substitute

### 4. Schedule APIs (Enhanced)
- **Teacher Schedule**: Shows both main and substitute lessons
- **Class Schedule**: Displays both teachers when applicable
- **Role Identification**: Indicates teacher's role in each lesson

## 🎯 **Testing Scenarios**

### Scenario 1: Teacher with No Conflicts
```bash
# Should return teacher with hasConflict: false
curl -X GET "http://localhost:3000/api/schedules/substitute-request/available-teachers/LESSON_ID"
```

### Scenario 2: Teacher with Time Conflicts
```bash
# Should return teacher with hasConflict: true and conflictLesson details
curl -X GET "http://localhost:3000/api/schedules/substitute-request/available-teachers/LESSON_ID"
```

### Scenario 3: Dual Teacher Lesson
```bash
# After approval, lesson should have both teacher and substituteTeacher
curl -X GET "http://localhost:3000/api/schedules/lessons/LESSON_ID"
```

### Scenario 4: Teacher Schedule Views
```bash
# Both teachers should see the lesson in their schedules
curl -X GET "http://localhost:3000/api/schedules/teacher/TEACHER_ID"
```

## 🔄 **Migration Guide**

### For Existing Data
1. **Existing Lessons**: Continue to work normally with `teacher` field
2. **New Approvals**: Will populate `substituteTeacher` field
3. **Schedule Queries**: Updated to handle both fields automatically
4. **Email Templates**: Updated for new terminology

### For Frontend Integration
1. **Available Teachers Display**: Show conflict information to users
2. **Teacher Selection**: Allow selection of conflicting teachers with warnings
3. **Lesson Display**: Show both teachers when applicable
4. **Schedule Views**: Indicate teacher roles clearly

## 🚀 **Benefits of New System**

### 1. **Transparency**
- Users see all available options
- Conflict information helps decision making
- No hidden filtering of teachers

### 2. **Flexibility**
- Can choose teachers with conflicts if necessary
- Emergency situations can be handled better
- More teacher options available

### 3. **Collaboration**
- Both teachers remain involved
- Better support for students
- Clearer responsibility distribution

### 4. **Data Integrity**
- Original teacher information preserved
- Complete audit trail maintained
- Better reporting capabilities

## 🎉 **Implementation Status**

### ✅ Completed
- [x] Enhanced Available Teachers API
- [x] Updated Substitute Request Model
- [x] Modified Service Logic
- [x] Updated Email Templates
- [x] Enhanced Schedule Queries
- [x] Updated Documentation
- [x] Created Test Scenarios

### 🔄 Next Steps
- [ ] Frontend integration updates
- [ ] User interface enhancements
- [ ] Additional reporting features
- [ ] Performance optimizations

---

**Note**: This enhanced system provides much more flexibility and transparency while maintaining backward compatibility with existing data. 