# Parent Notification Service

## Tổng quan

Service này cung cấp chức năng gửi notification cho phụ huynh về các hoạt động liên quan đến con cái của họ trong trường học.

## Các loại notification

### 1. Yêu cầu nghỉ của học sinh
- **Trigger**: Khi học sinh gửi yêu cầu nghỉ học
- **Method**: `notifyStudentLeaveRequest(studentId, leaveRequestId, reason)`
- **Content**: Thông báo về việc con họ đã gửi yêu cầu nghỉ học

### 2. Giáo viên được approved nghỉ dạy
- **Trigger**: Khi manager approved yêu cầu nghỉ của giáo viên
- **Method**: `notifyTeacherLeaveApproved(teacherId, classId, leaveRequestId, reason)`
- **Content**: Thông báo về việc giáo viên sẽ nghỉ dạy lớp của con họ

### 3. Giáo viên được approved dạy thay
- **Trigger**: Khi giáo viên approved yêu cầu dạy thay
- **Method**: `notifySubstituteApproved(lessonId, substituteTeacherId, originalTeacherId)`
- **Content**: Thông báo về việc thay đổi giáo viên dạy

### 4. Giáo viên được approved đổi tiết
- **Trigger**: Khi giáo viên approved yêu cầu đổi tiết
- **Method**: `notifySwapApproved(originalLessonId, replacementLessonId, requestingTeacherId, replacementTeacherId)`
- **Content**: Thông báo về việc đổi tiết học

### 5. Giáo viên được approved dạy bù
- **Trigger**: Khi manager approved yêu cầu dạy bù
- **Method**: `notifyMakeupApproved(originalLessonId, replacementLessonId, teacherId)`
- **Content**: Thông báo về việc dạy bù

### 6. Giáo viên đánh giá tiết học
- **Trigger**: Khi giáo viên submit đánh giá tiết học
- **Method**: `notifyLessonEvaluation(evaluationId, lessonId, teacherId)`
- **Content**: Thông báo về điểm kiểm tra miệng, vi phạm, học sinh vắng

## Cách hoạt động

1. **Lấy danh sách phụ huynh**: Service sẽ tìm tất cả phụ huynh có con học trong lớp liên quan
2. **Tạo notification**: Sử dụng `notificationService.createNotification()` với type "school"
3. **Gửi realtime**: Notification sẽ được gửi realtime qua Socket.IO

## Tích hợp

Service này đã được tích hợp vào các service sau:

- `student-leave-request.service.js`: Khi học sinh tạo yêu cầu nghỉ
- `teacher-leave-request.service.js`: Khi manager approved yêu cầu nghỉ của giáo viên
- `request-substitute.service.js`: Khi giáo viên approved yêu cầu dạy thay
- `request-swap.service.js`: Khi giáo viên approved yêu cầu đổi tiết
- `request-makeup.service.js`: Khi manager approved yêu cầu dạy bù
- `teacher-evaluation.service.js`: Khi giáo viên submit đánh giá tiết học

## Lưu ý

- Notification type là "school" và không có relatedObject
- Phụ huynh chỉ nhận thông báo, không có quyền approve/reject
- Tất cả notification đều được gửi realtime
- Service tự động xử lý việc tìm phụ huynh dựa trên trường `children` trong user model 