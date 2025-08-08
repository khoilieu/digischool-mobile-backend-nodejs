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
          relatedObject: {
            id: leaveRequestId,
            requestType: "student_leave_request",
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
          relatedObject: {
            id: leaveRequestId,
            requestType: "teacher_leave_request",
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
          relatedObject: {
            id: lessonId,
            requestType: "substitute_request",
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
          relatedObject: {
            id: originalLessonId,
            requestType: "swap_request",
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
          relatedObject: {
            id: originalLessonId,
            requestType: "makeup_request",
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
      
      const evaluation = await TeacherLessonEvaluation.findById(evaluationId)
        .populate("oralTests.student", "name studentId")
        .populate("violations.student", "name studentId")
        .populate("absentStudents.student", "name studentId");
      
      const lesson = await Lesson.findById(lessonId)
        .populate("class", "className")
        .populate("subject", "subjectName");

      if (!evaluation || !lesson || !lesson.class) return;

      // Lấy thông tin giáo viên
      const teacher = await User.findById(teacherId).select("name");

      // Tạo map để lưu thông tin của từng học sinh
      const studentInfoMap = new Map();
      
      // Xử lý học sinh có điểm kiểm tra miệng
      if (evaluation.oralTests && evaluation.oralTests.length > 0) {
        evaluation.oralTests.forEach(test => {
          if (test.student) {
            const studentId = test.student._id.toString();
            if (!studentInfoMap.has(studentId)) {
              studentInfoMap.set(studentId, { student: test.student, oralTest: test, violations: [], absent: null });
            } else {
              studentInfoMap.get(studentId).oralTest = test;
            }
          }
        });
      }

      // Xử lý học sinh vi phạm
      if (evaluation.violations && evaluation.violations.length > 0) {
        evaluation.violations.forEach(violation => {
          if (violation.student) {
            const studentId = violation.student._id.toString();
            if (!studentInfoMap.has(studentId)) {
              studentInfoMap.set(studentId, { student: violation.student, oralTest: null, violations: [violation], absent: null });
            } else {
              studentInfoMap.get(studentId).violations.push(violation);
            }
          }
        });
      }

      // Xử lý học sinh vắng
      if (evaluation.absentStudents && evaluation.absentStudents.length > 0) {
        evaluation.absentStudents.forEach(absent => {
          if (absent.student) {
            const studentId = absent.student._id.toString();
            if (!studentInfoMap.has(studentId)) {
              studentInfoMap.set(studentId, { student: absent.student, oralTest: null, violations: [], absent: absent });
            } else {
              studentInfoMap.get(studentId).absent = absent;
            }
          }
        });
      }

      // Nếu không có học sinh cụ thể, gửi cho tất cả học sinh trong lớp
      if (studentInfoMap.size === 0) {
        const allStudents = await User.find({
          role: "student",
          class_id: lesson.class._id,
        }).select("_id name studentId");
        
        allStudents.forEach(student => {
          studentInfoMap.set(student._id.toString(), { 
            student: student, 
            oralTest: null, 
            violations: [], 
            absent: null 
          });
        });
      }

      console.log(`🔍 Processing ${studentInfoMap.size} students for notifications`);

      // Gửi notification cho từng học sinh có liên quan
      for (const [studentId, studentInfo] of studentInfoMap) {
        const student = studentInfo.student;
        
        // Tạo nội dung thông báo cho học sinh cụ thể
        let content = `Giáo viên ${teacher.name} đã đánh giá tiết ${lesson.subject.subjectName} lớp ${lesson.class.className}.`;
        let hasSpecificInfo = false;

        // Thêm thông tin điểm kiểm tra miệng
        if (studentInfo.oralTest) {
          content += `\n- Điểm kiểm tra miệng của ${student.name}: ${studentInfo.oralTest.score}`;
          hasSpecificInfo = true;
        }

        // Thêm thông tin vi phạm
        if (studentInfo.violations && studentInfo.violations.length > 0) {
          studentInfo.violations.forEach(violation => {
            content += `\n- Vi phạm của ${student.name}: ${violation.description}`;
          });
          hasSpecificInfo = true;
        }

        // Thêm thông tin vắng mặt
        if (studentInfo.absent) {
          content += `\n- ${student.name} vắng mặt trong tiết học này`;
          hasSpecificInfo = true;
        }

        // Nếu không có thông tin cụ thể, gửi thông báo chung
        if (!hasSpecificInfo) {
          content += `\n- Con bạn có tham gia tiết học này.`;
        }

        console.log(`📝 Creating notification for ${student.name}:`);
        console.log(`   - Oral test: ${studentInfo.oralTest ? studentInfo.oralTest.score : 'None'}`);
        console.log(`   - Violations: ${studentInfo.violations.length}`);
        console.log(`   - Absent: ${studentInfo.absent ? 'Yes' : 'No'}`);

        // Lấy phụ huynh của học sinh này
        const parents = await this.getParentsOfStudent(student._id);
        console.log(`   - Parents found: ${parents.length}`);
        
        // Gửi notification cho tất cả phụ huynh của học sinh này
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
            relatedObject: {
              id: evaluationId,
              requestType: "lesson_evaluation",
            },
          });
        }
      }

      console.log(`✅ Parent notifications sent for lesson evaluation: ${evaluationId}`);
    } catch (error) {
      console.error("❌ Error notifying parents about lesson evaluation:", error.message);
    }
  }
}

module.exports = new ParentNotificationService(); 