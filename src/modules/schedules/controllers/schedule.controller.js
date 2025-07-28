const scheduleService = require("../services/schedule.service");
const PersonalActivity = require("../models/personal-activity.model");
const XLSX = require("xlsx");
const fs = require("fs");

class ScheduleController {
  createWeeklySchedule = async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      const result =
        await scheduleService.initializeSchedulesWithNewArchitecture(
          req.body,
          token
        );

      res.status(201).json({
        success: true,
        message: "Weekly schedule created successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in createWeeklySchedule:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  getWeeklySchedule = async (req, res) => {
    try {
      const { className, academicYear, weekNumber } = req.params;
      const token = req.headers.authorization?.split(" ")[1];

      const result = await scheduleService.getWeeklyScheduleByClassAndWeek(
        className,
        academicYear,
        parseInt(weekNumber),
        token
      );

      // Bổ sung: cá nhân hóa hoạt động cá nhân cho lesson trống
      if (
        result.weeklySchedule &&
        Array.isArray(result.weeklySchedule.lessons) &&
        req.user &&
        req.user._id
      ) {
        for (const lesson of result.weeklySchedule.lessons) {
          if (lesson.type === "empty") {
            if (
              req.user.role.includes("teacher") ||
              req.user.role.includes("homeroom_teacher")
            ) {
              // Giáo viên: lấy theo user, date, period
              const activity = await PersonalActivity.findOne({
                user: req.user._id,
                date: lesson.scheduledDate,
                period: lesson.timeSlot?.period,
              });
              lesson.personalActivity = activity;
            } else {
              // Học sinh: lấy theo user, lessonId
              const activity = await PersonalActivity.findOne({
                user: req.user._id,
                lesson: lesson._id || lesson.id,
              });
              lesson.personalActivity = activity;
            }
          }
        }
      }

      res.status(200).json({
        success: true,
        message: "Weekly schedule retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in getWeeklySchedule:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  getTeacherWeeklySchedule = async (req, res) => {
    try {
      const { teacherId, academicYear, weekNumber } = req.params;
      const token = req.headers.authorization?.split(" ")[1];

      const result = await scheduleService.getTeacherWeeklySchedule(
        teacherId,
        academicYear,
        parseInt(weekNumber),
        token
      );

      res.status(200).json({
        success: true,
        message: "Teacher weekly schedule retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in getTeacherWeeklySchedule:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  getLessonDetail = async (req, res) => {
    try {
      const { lessonId } = req.params;
      const token = req.headers.authorization?.split(" ")[1];

      const result = await scheduleService.getLessonDetail(lessonId, token);

      // Nếu lesson là empty, trả về personalActivity của user hiện tại
      if (result.type === "empty" && req.user && req.user._id) {
        const activity = await PersonalActivity.findOne({
          user: req.user._id,
          lesson: lessonId,
        });
        result.personalActivity = activity;
      }

      res.status(200).json({
        success: true,
        message: "Lesson detail retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in getLessonDetail:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  getLessonStudents = async (req, res, next) => {
    try {
      const { lessonId } = req.params;
      const teacherId = req.user._id;

      const Lesson = require("../models/lesson.model");
      const User = require("../../auth/models/user.model");
      const Class = require("../../classes/models/class.model");

      const lesson = await Lesson.findById(lessonId)
        .populate("class", "className")
        .populate("subject", "subjectName subjectCode")
        .populate("teacher", "name");

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: "Lesson not found",
        });
      }

      if (lesson.teacher._id.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only view students of your own lessons",
        });
      }

      const students = await User.find({
        class_id: lesson.class._id,
        role: "student",
      })
        .select("_id name studentId class_id")
        .sort("name");

      const classInfo = await Class.findById(lesson.class._id).select(
        "className grade"
      );

      res.status(200).json({
        success: true,
        message: "Lấy danh sách học sinh thành công",
        data: {
          lesson: {
            lessonId: lesson.lessonId,
            topic: lesson.topic,
            scheduledDate: lesson.scheduledDate,
            status: lesson.status,
          },
          class: {
            className: classInfo.className,
            grade: classInfo.grade,
          },
          subject: {
            subjectName: lesson.subject.subjectName,
            subjectCode: lesson.subject.subjectCode,
          },
          teacher: {
            name: lesson.teacher.name,
          },
          students: students.map((student) => ({
            id: student._id,
            name: student.name,
            studentId: student.studentId,
            className: classInfo.className,
          })),
          totalStudents: students.length,
        },
      });
    } catch (error) {
      console.error("❌ Error in getLessonStudents:", error.message);
      next(error);
    }
  };

  updateLessonDescription = async (req, res) => {
    try {
      const { lessonId } = req.params;
      const { description } = req.body;
      const token = req.headers.authorization?.split(" ")[1];

      const result = await scheduleService.updateLessonDescription(
        lessonId,
        description,
        token
      );

      res.status(200).json({
        success: true,
        message: "Lesson description updated successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in updateLessonDescription:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  deleteLessonDescription = async (req, res) => {
    try {
      const { lessonId } = req.params;
      const token = req.headers.authorization?.split(" ")[1];

      const result = await scheduleService.deleteLessonDescription(
        lessonId,
        token
      );

      res.status(200).json({
        success: true,
        message: "Lesson description deleted successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in deleteLessonDescription:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  completeLesson = async (req, res) => {
    try {
      const { lessonId } = req.params;
      const token = req.headers.authorization?.split(" ")[1];

      const result = await scheduleService.completeLesson(lessonId, token);

      res.status(200).json({
        success: true,
        message: "Lesson completed successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in completeLesson:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  importScheduleFromExcel = async (req, res) => {
    try {
      const filePath = req.file.path;
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);

      // Lấy các trường bổ sung từ body
      const { startDate, endDate, academicYear, weekNumber, semester } =
        req.body;

      // Gọi service xử lý import
      const result = await scheduleService.importScheduleFromExcel(
        data,
        req.user,
        { startDate, endDate, academicYear, weekNumber, semester }
      );

      // Xóa file tạm sau khi xử lý
      fs.unlinkSync(filePath);

      // Tạo message chi tiết về kết quả import
      let message = "Import thời khóa biểu thành công";
      if (result.totalClassesUpdated > 0) {
        message += `. Đã cập nhật ${result.totalClassesUpdated} lớp với giáo viên chủ nhiệm mới`;
      }
      if (result.totalTeachersCreated > 0) {
        message += `. Đã tạo ${result.totalTeachersCreated} giáo viên mới`;
      }
      if (result.totalLessons > 0) {
        message += `. Đã tạo ${result.totalLessons} tiết học`;
      }
      if (result.totalTeacherMappings > 0) {
        message += `. Đã cập nhật ${result.totalTeacherMappings} teacher ID trong lesson`;
      }

      res.status(200).json({
        success: true,
        message: message,
        data: {
          errors: result.errors,
          createdTeachers: result.createdTeachers,
          updatedClasses: result.updatedClasses,
          teacherMappings: result.teacherMappings,
          totalLessons: result.totalLessons,
          totalTeachersCreated: result.totalTeachersCreated,
          totalClassesUpdated: result.totalClassesUpdated,
          totalTeacherMappings: result.totalTeacherMappings,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };
}

module.exports = new ScheduleController();
