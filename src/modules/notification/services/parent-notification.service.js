const notificationService = require("./notification.service");
const User = require("../../auth/models/user.model");

class ParentNotificationService {
  // Lấy danh sách phụ huynh của học sinh
  async getParentsOfStudent(studentId) {
    try {
      const parents = await User.find({
        role: "parent",
        children: studentId,
      }).select("_id name email");
      
      return parents;
    } catch (error) {
      console.error("❌ Error getting parents of student:", error.message);
      throw error;
    }
  }

  // Lấy danh sách phụ huynh của nhiều học sinh
  async getParentsOfStudents(studentIds) {
    try {
      const parents = await User.find({
        role: "parent",
        children: { $in: studentIds },
      }).select("_id name email children");
      
      return parents;
    } catch (error) {
      console.error("❌ Error getting parents of students:", error.message);
      throw error;
    }
  }

  // Gửi notification cho phụ huynh về yêu cầu nghỉ của học sinh
  async notifyStudentLeaveRequest(studentId, leaveRequestId, reason) {
    try {
      const parents = await this.getParentsOfStudent(studentId);
      if (parents.length === 0) return;

      const student = await User.findById(studentId).select("name studentId");
      
      for (const parent of parents) {
        await notificationService.createNotification({
          type: "school",
          title: "Con bạn đã gửi yêu cầu nghỉ học",
          content: `Học sinh ${student.name} (${student.studentId}) đã gửi yêu cầu nghỉ học. Lý do: ${reason}`,
          sender: studentId,
          receiverScope: {
            type: "user",
            ids: [parent._id],
          },
        });
      }
    } catch (error) {
      console.error("❌ Error notifying parents about student leave request:", error.message);
    }
  }

  // Gửi notification cho phụ huynh về việc giáo viên được approved nghỉ dạy
  async notifyTeacherLeaveApproved(teacherId, classId, leaveRequestId, reason) {
    try {
      // Lấy danh sách học sinh trong lớp
      const students = await User.find({
        role: "student",
        class_id: classId,
      }).select("_id name studentId");
      
      if (students.length === 0) return;

      // Lấy thông tin giáo viên và lớp
      const teacher = await User.findById(teacherId).select("name");
      const Class = require("../../classes/models/class.model");
      const classInfo = await Class.findById(classId).select("className");

      // Lấy phụ huynh của tất cả học sinh trong lớp
      const studentIds = students.map(s => s._id);
      const parents = await this.getParentsOfStudents(studentIds);

      for (const parent of parents) {
        await notificationService.createNotification({
          type: "school",
          title: "Thông báo giáo viên nghỉ dạy",
          content: `Giáo viên ${teacher.name} sẽ nghỉ dạy lớp ${classInfo.className}. Lý do: ${reason}`,
          sender: teacherId,
          receiverScope: {
            type: "user",
            ids: [parent._id],
          },
        });
      }
    } catch (error) {
      console.error("❌ Error notifying parents about teacher leave approved:", error.message);
    }
  }

  // Gửi notification cho phụ huynh về việc giáo viên được approved dạy thay
  async notifySubstituteApproved(lessonId, substituteTeacherId, originalTeacherId) {
    try {
      const Lesson = require("../../schedules/models/lesson.model");
      const lesson = await Lesson.findById(lessonId)
        .populate("class", "className")
        .populate("subject", "subjectName")
        .populate("timeSlot", "period startTime endTime");

      if (!lesson || !lesson.class) return;

      // Lấy danh sách học sinh trong lớp
      const students = await User.find({
        role: "student",
        class_id: lesson.class._id,
      }).select("_id name studentId");

      if (students.length === 0) return;

      // Lấy thông tin giáo viên
      const substituteTeacher = await User.findById(substituteTeacherId).select("name");
      const originalTeacher = await User.findById(originalTeacherId).select("name");

      // Lấy phụ huynh của tất cả học sinh trong lớp
      const studentIds = students.map(s => s._id);
      const parents = await this.getParentsOfStudents(studentIds);

      for (const parent of parents) {
        await notificationService.createNotification({
          type: "school",
          title: "Thông báo thay đổi giáo viên dạy",
          content: `Tiết ${lesson.subject.subjectName} lớp ${lesson.class.className} vào ngày ${new Date(lesson.scheduledDate).toLocaleDateString("vi-VN")} (Tiết ${lesson.timeSlot.period}) sẽ được giáo viên ${substituteTeacher.name} dạy thay cho giáo viên ${originalTeacher.name}.`,
          sender: substituteTeacherId,
          receiverScope: {
            type: "user",
            ids: [parent._id],
          },
        });
      }
    } catch (error) {
      console.error("❌ Error notifying parents about substitute approved:", error.message);
    }
  }

  // Gửi notification cho phụ huynh về việc giáo viên được approved đổi tiết
  async notifySwapApproved(originalLessonId, replacementLessonId, requestingTeacherId, replacementTeacherId) {
    try {
      const Lesson = require("../../schedules/models/lesson.model");
      const originalLesson = await Lesson.findById(originalLessonId)
        .populate("class", "className")
        .populate("subject", "subjectName")
        .populate("timeSlot", "period startTime endTime");
      
      const replacementLesson = await Lesson.findById(replacementLessonId)
        .populate("class", "className")
        .populate("subject", "subjectName")
        .populate("timeSlot", "period startTime endTime");

      if (!originalLesson || !replacementLesson || !originalLesson.class) return;

      // Lấy danh sách học sinh trong lớp
      const students = await User.find({
        role: "student",
        class_id: originalLesson.class._id,
      }).select("_id name studentId");

      if (students.length === 0) return;

      // Lấy thông tin giáo viên
      const requestingTeacher = await User.findById(requestingTeacherId).select("name");
      const replacementTeacher = await User.findById(replacementTeacherId).select("name");

      // Lấy phụ huynh của tất cả học sinh trong lớp
      const studentIds = students.map(s => s._id);
      const parents = await this.getParentsOfStudents(studentIds);

      for (const parent of parents) {
        await notificationService.createNotification({
          type: "school",
          title: "Thông báo đổi tiết học",
          content: `Tiết ${originalLesson.subject.subjectName} lớp ${originalLesson.class.className} đã được đổi từ ngày ${new Date(originalLesson.scheduledDate).toLocaleDateString("vi-VN")} (Tiết ${originalLesson.timeSlot.period}) sang ngày ${new Date(replacementLesson.scheduledDate).toLocaleDateString("vi-VN")} (Tiết ${replacementLesson.timeSlot.period}).`,
          sender: requestingTeacherId,
          receiverScope: {
            type: "user",
            ids: [parent._id],
          },
        });
      }
    } catch (error) {
      console.error("❌ Error notifying parents about swap approved:", error.message);
    }
  }

  // Gửi notification cho phụ huynh về việc giáo viên được approved dạy bù
  async notifyMakeupApproved(originalLessonId, replacementLessonId, teacherId) {
    try {
      const Lesson = require("../../schedules/models/lesson.model");
      const originalLesson = await Lesson.findById(originalLessonId)
        .populate("class", "className")
        .populate("subject", "subjectName")
        .populate("timeSlot", "period startTime endTime");
      
      const replacementLesson = await Lesson.findById(replacementLessonId)
        .populate("class", "className")
        .populate("subject", "subjectName")
        .populate("timeSlot", "period startTime endTime");

      if (!originalLesson || !replacementLesson || !originalLesson.class) return;

      // Lấy danh sách học sinh trong lớp
      const students = await User.find({
        role: "student",
        class_id: originalLesson.class._id,
      }).select("_id name studentId");

      if (students.length === 0) return;

      // Lấy thông tin giáo viên
      const teacher = await User.findById(teacherId).select("name");

      // Lấy phụ huynh của tất cả học sinh trong lớp
      const studentIds = students.map(s => s._id);
      const parents = await this.getParentsOfStudents(studentIds);

      for (const parent of parents) {
        await notificationService.createNotification({
          type: "school",
          title: "Thông báo dạy bù",
          content: `Lớp ${originalLesson.class.className} sẽ có tiết dạy bù môn ${originalLesson.subject.subjectName} vào ngày ${new Date(replacementLesson.scheduledDate).toLocaleDateString("vi-VN")} (Tiết ${replacementLesson.timeSlot.period}).`,
          sender: teacherId,
          receiverScope: {
            type: "user",
            ids: [parent._id],
          },
        });
      }
    } catch (error) {
      console.error("❌ Error notifying parents about makeup approved:", error.message);
    }
  }

  // Gửi notification cho phụ huynh về việc giáo viên đánh giá tiết học
  async notifyLessonEvaluation(evaluationId, lessonId, teacherId) {
    try {
      const TeacherLessonEvaluation = require("../../schedules/models/teacher-lesson-evaluation.model");
      const Lesson = require("../../schedules/models/lesson.model");
      
      const evaluation = await TeacherLessonEvaluation.findById(evaluationId);
      const lesson = await Lesson.findById(lessonId)
        .populate("class", "className")
        .populate("subject", "subjectName");

      if (!evaluation || !lesson || !lesson.class) return;

      // Lấy danh sách học sinh trong lớp
      const students = await User.find({
        role: "student",
        class_id: lesson.class._id,
      }).select("_id name studentId");

      if (students.length === 0) return;

      // Lấy thông tin giáo viên
      const teacher = await User.findById(teacherId).select("name");

      // Tạo nội dung thông báo dựa trên loại đánh giá
      let content = `Giáo viên ${teacher.name} đã đánh giá tiết ${lesson.subject.subjectName} lớp ${lesson.class.className}.`;

      if (evaluation.oralTests && evaluation.oralTests.length > 0) {
        content += `\n- Điểm kiểm tra miệng: ${evaluation.oralTests.map(test => `${test.studentName}: ${test.score}`).join(", ")}`;
      }

      if (evaluation.violations && evaluation.violations.length > 0) {
        content += `\n- Vi phạm: ${evaluation.violations.map(violation => `${violation.studentName}: ${violation.description}`).join(", ")}`;
      }

      if (evaluation.absentStudents && evaluation.absentStudents.length > 0) {
        content += `\n- Học sinh vắng: ${evaluation.absentStudents.map(student => student.studentName).join(", ")}`;
      }

      // Lấy phụ huynh của tất cả học sinh trong lớp
      const studentIds = students.map(s => s._id);
      const parents = await this.getParentsOfStudents(studentIds);

      for (const parent of parents) {
        await notificationService.createNotification({
          type: "school",
          title: "Thông báo đánh giá tiết học",
          content: content,
          sender: teacherId,
          receiverScope: {
            type: "user",
            ids: [parent._id],
          },
        });
      }
    } catch (error) {
      console.error("❌ Error notifying parents about lesson evaluation:", error.message);
    }
  }
}

module.exports = new ParentNotificationService(); 