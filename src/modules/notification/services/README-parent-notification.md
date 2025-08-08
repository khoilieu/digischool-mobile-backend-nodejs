# Parent Notification System

## Tổng quan

Hệ thống notification cho phụ huynh được thiết kế để thông báo cho phụ huynh về các hoạt động liên quan đến con cái của họ trong trường học. Tất cả notification có type là "school".

## Các trường hợp gửi notification

### 1. Học sinh xin nghỉ học
- **Trigger**: Khi học sinh tạo đơn xin nghỉ học
- **Service**: `parentNotificationService.notifyStudentLeaveRequest()`
- **Nội dung**: Thông báo cho phụ huynh về việc con họ đã gửi đơn xin nghỉ
- **Người nhận**: Phụ huynh của học sinh xin nghỉ

### 2. Giáo viên được approved nghỉ dạy
- **Trigger**: Khi manager/admin approved đơn xin nghỉ của giáo viên
- **Service**: `parentNotificationService.notifyTeacherLeaveApproved()`
- **Nội dung**: Thông báo cho phụ huynh về việc giáo viên sẽ nghỉ dạy
- **Người nhận**: Phụ huynh của tất cả học sinh trong lớp bị ảnh hưởng

### 3. Giáo viên được approved dạy thay
- **Trigger**: Khi giáo viên khác approved yêu cầu dạy thay
- **Service**: `parentNotificationService.notifySubstituteApproved()`
- **Nội dung**: Thông báo về việc thay đổi giáo viên dạy
- **Người nhận**: Phụ huynh của tất cả học sinh trong lớp

### 4. Giáo viên được approved đổi tiết
- **Trigger**: Khi giáo viên khác approved yêu cầu đổi tiết
- **Service**: `parentNotificationService.notifySwapApproved()`
- **Nội dung**: Thông báo về việc đổi lịch học
- **Người nhận**: Phụ huynh của tất cả học sinh trong lớp

### 5. Giáo viên được approved dạy bù
- **Trigger**: Khi manager/admin approved yêu cầu dạy bù
- **Service**: `parentNotificationService.notifyMakeupApproved()`
- **Nội dung**: Thông báo về tiết dạy bù
- **Người nhận**: Phụ huynh của tất cả học sinh trong lớp

### 6. Giáo viên đánh giá tiết học
- **Trigger**: Khi giáo viên tạo đánh giá tiết học
- **Service**: `parentNotificationService.notifyLessonEvaluation()`
- **Nội dung**: Thông báo chi tiết về đánh giá của con cái
- **Người nhận**: Phụ huynh của học sinh có liên quan đến đánh giá

## Chi tiết về Lesson Evaluation Notification

### Logic xử lý
1. **Xác định học sinh có liên quan**:
   - Học sinh có điểm kiểm tra miệng
   - Học sinh vi phạm
   - Học sinh vắng mặt
   - Nếu không có học sinh cụ thể, gửi cho tất cả học sinh trong lớp

2. **Tạo nội dung thông báo cá nhân hóa**:
   - Điểm kiểm tra miệng của con cái
   - Vi phạm của con cái
   - Tình trạng vắng mặt của con cái
   - Thông báo chung nếu không có thông tin cụ thể

3. **Gửi notification cho từng phụ huynh**:
   - Mỗi phụ huynh nhận thông báo riêng về con cái của họ
   - Nội dung được tùy chỉnh theo thông tin của từng học sinh

### Ví dụ nội dung notification
```
Giáo viên Nguyễn Thị Kim Huệ đã đánh giá tiết Chào cờ lớp 12A2.
- Điểm kiểm tra miệng của Trần Văn An: 8.5
- Vi phạm của Phạm Văn Cường: Nói chuyện riêng
- Trần Thị B vắng mặt trong tiết học này
```

## Cấu trúc Service

### ParentNotificationService
```javascript
class ParentNotificationService {
  // Lấy danh sách phụ huynh của học sinh
  async getParentsOfStudent(studentId)
  
  // Lấy danh sách phụ huynh của nhiều học sinh
  async getParentsOfStudents(studentIds)
  
  // Các method notification
  async notifyStudentLeaveRequest(studentId, leaveRequestId, reason)
  async notifyTeacherLeaveApproved(teacherId, classId, leaveRequestId, reason)
  async notifySubstituteApproved(lessonId, substituteTeacherId, originalTeacherId)
  async notifySwapApproved(originalLessonId, replacementLessonId, requestingTeacherId, replacementTeacherId)
  async notifyMakeupApproved(originalLessonId, replacementLessonId, teacherId)
  async notifyLessonEvaluation(evaluationId, lessonId, teacherId)
}
```

## Integration với các Service khác

### Student Leave Request Service
```javascript
// Trong student-leave-request.service.js
await parentNotificationService.notifyStudentLeaveRequest(studentId, leaveRequest._id, reason);
```

### Teacher Leave Request Service
```javascript
// Trong teacher-leave-request.service.js
await parentNotificationService.notifyTeacherLeaveApproved(
  request.teacherId._id,
  request.classId._id,
  request._id,
  request.reason
);
```

### Substitute Request Service
```javascript
// Trong request-substitute.service.js
await parentNotificationService.notifySubstituteApproved(
  request.lesson._id,
  teacherId,
  request.lesson.teacher
);
```

### Swap Request Service
```javascript
// Trong request-swap.service.js
await parentNotificationService.notifySwapApproved(
  lessonRequest.originalLesson._id,
  lessonRequest.replacementLesson._id,
  lessonRequest.requestingTeacher._id,
  lessonRequest.replacementTeacher._id
);
```

### Makeup Request Service
```javascript
// Trong request-makeup.service.js
await parentNotificationService.notifyMakeupApproved(
  lessonRequest.originalLesson._id,
  lessonRequest.replacementLesson._id,
  lessonRequest.requestingTeacher._id
);
```

### Teacher Evaluation Service
```javascript
// Trong teacher-evaluation.service.js
await parentNotificationService.notifyLessonEvaluation(
  evaluation._id,
  lessonId,
  teacherId
);
```

## Lưu ý quan trọng

1. **Type notification**: Tất cả notification cho phụ huynh có type là "school"
2. **Error handling**: Tất cả notification đều có try-catch để tránh ảnh hưởng đến flow chính
3. **Performance**: Sử dụng populate để tối ưu query database
4. **Privacy**: Chỉ gửi thông tin cần thiết cho từng phụ huynh
5. **Related Object**: Mỗi notification đều có relatedObject để tracking

## Testing

Hệ thống đã được test với dữ liệu thật từ database và hoạt động đúng như mong đợi. Tất cả các trường hợp notification đều được gửi thành công đến phụ huynh tương ứng. 