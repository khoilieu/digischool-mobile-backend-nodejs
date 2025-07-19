const scheduleService = require("../services/schedule.service");

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
}

module.exports = new ScheduleController();
