const jwt = require("jsonwebtoken");
const User = require("../../auth/models/user.model");
const Class = require("../../classes/models/class.model");
const Subject = require("../../subjects/models/subject.model");
const AcademicYear = require("../models/academic-year.model");
const TimeSlot = require("../models/time-slot.model");
const WeeklySchedule = require("../models/weekly-schedule.model");
const Lesson = require("../models/lesson.model");
const TestInfo = require("../models/test-info.model");
const TeacherLessonEvaluation = require("../models/teacher-lesson-evaluation.model");
const StudentLessonEvaluation = require("../models/student-lesson-evaluation.model");
const MultiClassSchedulerService = require("./multi-class-scheduler.service");

class ScheduleService {
  async initializeSchedulesWithNewArchitecture(data, token) {
    try {
      const {
        academicYear,
        gradeLevel,
        weekNumber = 1,
        scheduleType = "MONDAY_TO_SATURDAY",
        startDate: customStartDate,
        endDate: customEndDate,
      } = data;

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        throw new Error("User not found");
      }

      console.log(`🚀 Creating weekly schedule for week ${weekNumber}...`);
      console.log(`📋 Request data:`, JSON.stringify(data, null, 2));

      const classes = await Class.find({
        academicYear: academicYear,
        gradeLevel: gradeLevel,
      }).populate("homeroomTeacher", "name email");

      if (classes.length === 0) {
        throw new Error(
          `No classes found for grade level ${gradeLevel} in academic year ${academicYear}`
        );
      }

      console.log(
        `📚 Found ${classes.length} classes for grade level ${gradeLevel}`
      );

      const academicYearDoc = await AcademicYear.findOne({
        name: academicYear,
      });
      if (!academicYearDoc) {
        throw new Error(`Academic year ${academicYear} not found`);
      }

      let startDate, endDate;

      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        console.log(
          `📅 Using custom dates: ${startDate.toDateString()} - ${endDate.toDateString()}`
        );
      } else {
        startDate = this.calculateWeekStartDate(
          academicYearDoc.startDate,
          weekNumber
        );
        endDate = this.calculateWeekEndDate(startDate, scheduleType);
        console.log(
          `📅 Week ${weekNumber}: ${startDate.toDateString()} - ${endDate.toDateString()}`
        );
      }

      const weeklySchedules = [];
      const classesToCreate = [];

      for (const classInfo of classes) {
        try {
          const existingWeeklySchedule = await WeeklySchedule.findOne({
            class: classInfo._id,
            academicYear: academicYearDoc._id,
            weekNumber: weekNumber,
          });

          if (existingWeeklySchedule) {
            await WeeklySchedule.findByIdAndDelete(existingWeeklySchedule._id);
            console.log(
              `🗑️ Deleted old weekly schedule for ${classInfo.className}`
            );
          }

          classesToCreate.push(classInfo);
        } catch (error) {
          console.error(`❌ Failed to create weekly schedules:`, error.message);
          throw error;
        }
      }

      for (const classInfo of classesToCreate) {
        const weeklySchedule = new WeeklySchedule({
          class: classInfo._id,
          academicYear: academicYearDoc._id,
          weekNumber: weekNumber,
          startDate: startDate,
          endDate: endDate,
          lessons: [],
          createdBy: currentUser._id,
        });

        const savedWeeklySchedule = await weeklySchedule.save();
        weeklySchedules.push(savedWeeklySchedule);

        console.log(`✅ Created weekly schedule for ${classInfo.className}`);
      }

      console.log(
        `\n🎯 Creating lessons with multi-class scheduler for week ${weekNumber}...`
      );

      const weeklyScheduleIds = weeklySchedules.map((ws) => ws._id);
      const classIds = classes.map((c) => c._id);
      const homeroomTeachers = classes.map((c) => c.homeroomTeacher);

      const multiClassScheduler = new MultiClassSchedulerService();

      const timeSlots = await TimeSlot.find().sort("period");
      const subjects = await Subject.find({ isActive: true }).sort(
        "subjectName"
      );

      // Populate subjects với teachers
      const subjectsWithTeachers = await Promise.all(
        subjects.map(async (subject) => {
          const teachers = await subject.getTeachers();
          return {
            ...subject.toObject(),
            teacher: teachers.length > 0 ? teachers[0] : null, // Lấy teacher đầu tiên
            availableTeachers: teachers,
          };
        })
      );

      console.log(
        `📚 Found ${subjectsWithTeachers.length} subjects and ${timeSlots.length} time slots`
      );

      if (subjectsWithTeachers.length === 0) {
        console.log("⚠️ No subjects found! Creating empty schedules...");
        const emptyLessons = [];
        for (let i = 0; i < classes.length; i++) {
          const classId = classes[i]._id;
          const weeklyScheduleId = weeklySchedules[i]._id;

          // Đảm bảo có homeroom teacher
          if (!homeroomTeachers[i]) {
            console.log(
              `⚠️ Lớp ${classes[i].className} không có giáo viên chủ nhiệm, bỏ qua`
            );
            continue;
          }

          const chaoCoLesson = new Lesson({
            lessonId: `${classId.toString().slice(-6)}_${startDate
              .toISOString()
              .slice(0, 10)
              .replace(/-/g, "")}_T1`,
            class: classId,
            subject: undefined,
            teacher: homeroomTeachers[i]._id,
            academicYear: academicYearDoc._id,
            timeSlot: timeSlots[0]?._id,
            scheduledDate: startDate,
            type: "fixed",
            status: "scheduled",
            topic: "Chào cờ",
            createdBy: currentUser._id,
          });

          const sinhHoatLesson = new Lesson({
            lessonId: `${classId.toString().slice(-6)}_${new Date(
              startDate.getTime() + 5 * 24 * 60 * 60 * 1000
            )
              .toISOString()
              .slice(0, 10)
              .replace(/-/g, "")}_T5`,
            class: classId,
            subject: undefined,
            teacher: homeroomTeachers[i]._id,
            academicYear: academicYearDoc._id,
            timeSlot: timeSlots[4]?._id,
            scheduledDate: new Date(
              startDate.getTime() + 5 * 24 * 60 * 60 * 1000
            ),
            type: "fixed",
            status: "scheduled",
            topic: "Sinh hoạt lớp",
            createdBy: currentUser._id,
          });

          await chaoCoLesson.save();
          await sinhHoatLesson.save();
          emptyLessons.push(chaoCoLesson, sinhHoatLesson);
        }

        for (let i = 0; i < weeklySchedules.length; i++) {
          const weeklySchedule = weeklySchedules[i];
          const classLessons = emptyLessons.filter(
            (lesson) => lesson.class.toString() === classes[i]._id.toString()
          );

          weeklySchedule.lessons = classLessons.map((lesson) => lesson._id);
          await weeklySchedule.save();
        }

        console.log(`✅ Created empty schedules for ${classes.length} classes`);

        return {
          weekNumber: weekNumber,
          startDate: startDate,
          endDate: endDate,
          scheduleType: scheduleType,
          dateSource:
            customStartDate && customEndDate ? "custom" : "calculated",
          classesProcessed: classes.length,
          weeklySchedulesCreated: weeklySchedules.length,
          totalLessonsCreated: emptyLessons.length,
          classes: classes.map((classInfo) => ({
            className: classInfo.className,
            gradeLevel: classInfo.gradeLevel,
            homeroomTeacher: classInfo.homeroomTeacher?.name || "N/A",
          })),
        };
      }

      const result = await multiClassScheduler.createMultiClassSchedules(
        weeklyScheduleIds,
        classIds,
        academicYearDoc._id,
        weekNumber,
        startDate,
        timeSlots,
        subjectsWithTeachers,
        homeroomTeachers,
        currentUser._id
      );

      console.log(`✅ Successfully created schedules for week ${weekNumber}`);
      console.log(`📊 Summary:`, result);

      return {
        weekNumber: weekNumber,
        startDate: startDate,
        endDate: endDate,
        scheduleType: scheduleType,
        dateSource: customStartDate && customEndDate ? "custom" : "calculated",
        classesProcessed: classes.length,
        weeklySchedulesCreated: weeklySchedules.length,
        totalLessonsCreated: result.totalLessonsCreated,
        classes: classes.map((classInfo) => ({
          className: classInfo.className,
          gradeLevel: classInfo.gradeLevel,
          homeroomTeacher: classInfo.homeroomTeacher?.name || "N/A",
        })),
      };
    } catch (error) {
      console.error(
        "❌ Error in initializeSchedulesWithNewArchitecture:",
        error.message
      );
      throw error;
    }
  }

  async getWeeklyScheduleByClassAndWeek(
    className,
    academicYear,
    weekNumber,
    token
  ) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        throw new Error("User not found");
      }

      const classInfo = await Class.findOne({ className, academicYear });
      if (!classInfo) {
        throw new Error(
          `Class ${className} not found in academic year ${academicYear}`
        );
      }

      const academicYearDoc = await AcademicYear.findOne({
        name: academicYear,
      });
      if (!academicYearDoc) {
        throw new Error(`Academic year ${academicYear} not found`);
      }

      const weeklySchedule = await WeeklySchedule.findOne({
        class: classInfo._id,
        academicYear: academicYearDoc._id,
        weekNumber: weekNumber,
      }).populate({
        path: "lessons",
        populate: [
          { path: "subject", select: "subjectName subjectCode" },
          { path: "academicYear", select: "name" },
          { path: "teacher", select: "name email" },
          { path: "substituteTeacher", select: "name email" },
          { path: "timeSlot", select: "period startTime endTime type" },
        ],
      });

      if (!weeklySchedule) {
        throw new Error(
          `Weekly schedule not found for class ${className}, week ${weekNumber}`
        );
      }

      const lessonsWithDayInfo = weeklySchedule.lessons.map((lesson) => {
        const lessonObj = lesson.toObject();
        const scheduledDate = new Date(lesson.scheduledDate);
        const dayOfWeek = scheduledDate.getDay();

        const dayNames = [
          "Chủ nhật",
          "Thứ 2",
          "Thứ 3",
          "Thứ 4",
          "Thứ 5",
          "Thứ 6",
          "Thứ 7",
        ];
        lessonObj.dayOfWeek = dayNames[dayOfWeek];
        lessonObj.dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;

        return lessonObj;
      });

      return {
        academicYear: academicYearDoc.name,
        class: {
          className: classInfo.className,
          gradeLevel: classInfo.gradeLevel,
        },
        weeklySchedule: {
          weekNumber: weeklySchedule.weekNumber,
          startDate: weeklySchedule.startDate,
          endDate: weeklySchedule.endDate,
          lessons: lessonsWithDayInfo,
        },
      };
    } catch (error) {
      console.error(
        "❌ Error in getWeeklyScheduleByClassAndWeek:",
        error.message
      );
      throw new Error(`Error fetching weekly schedule: ${error.message}`);
    }
  }

  async getTeacherWeeklySchedule(teacherId, academicYear, weekNumber, token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        throw new Error("User not found");
      }

      const academicYearDoc = await AcademicYear.findOne({
        name: academicYear,
      });
      if (!academicYearDoc) {
        throw new Error(`Academic year ${academicYear} not found`);
      }

      const startDate = this.calculateWeekStartDate(
        academicYearDoc.startDate,
        weekNumber
      );
      const endDate = this.calculateWeekEndDate(
        startDate,
        "MONDAY_TO_SATURDAY"
      );

      const lessons = await Lesson.find({
        teacher: teacherId,
        academicYear: academicYearDoc._id,
        scheduledDate: {
          $gte: startDate,
          $lte: endDate,
        },
      })
        .populate("class", "className gradeLevel")
        .populate("subject", "subjectName subjectCode")
        .populate("timeSlot", "period startTime endTime type")
        .sort("scheduledDate timeSlot.period");

      const lessonsWithDayInfo = lessons.map((lesson) => {
        const lessonObj = lesson.toObject();
        const scheduledDate = new Date(lesson.scheduledDate);
        const dayOfWeek = scheduledDate.getDay();

        const dayNames = [
          "Chủ nhật",
          "Thứ 2",
          "Thứ 3",
          "Thứ 4",
          "Thứ 5",
          "Thứ 6",
          "Thứ 7",
        ];
        lessonObj.dayOfWeek = dayNames[dayOfWeek];
        lessonObj.dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;

        return lessonObj;
      });

      return {
        teacherId,
        academicYear,
        weekNumber,
        startDate: startDate,
        endDate: endDate,
        totalLessons: lessonsWithDayInfo.length,
        lessons: lessonsWithDayInfo,
      };
    } catch (error) {
      console.error("❌ Error in getTeacherWeeklySchedule:", error.message);
      throw new Error(
        `Error fetching teacher weekly schedule: ${error.message}`
      );
    }
  }

  calculateWeekStartDate(academicYearStartDate, weekNumber) {
    const startDate = new Date(academicYearStartDate);
    const daysToAdd = (weekNumber - 1) * 7;
    startDate.setDate(startDate.getDate() + daysToAdd);
    return startDate;
  }

  calculateWeekEndDate(startDate, scheduleType) {
    const endDate = new Date(startDate);
    const daysToAdd = scheduleType === "MONDAY_TO_FRIDAY" ? 4 : 5;
    endDate.setDate(startDate.getDate() + daysToAdd);
    return endDate;
  }

  async getLessonDetail(lessonId, token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        throw new Error("User not found");
      }

      const lesson = await Lesson.findById(lessonId)
        .populate("class", "className gradeLevel")
        .populate("subject", "subjectName subjectCode")
        .populate("teacher", "name email gender")
        .populate("substituteTeacher", "name email")
        .populate("timeSlot", "period startTime endTime type")
        .populate("academicYear", "name");

      if (!lesson) {
        throw new Error("Lesson not found");
      }

      // Tìm testInfo liên kết với lesson này
      const testInfo = await TestInfo.findOne({ lesson: lessonId });

      const teacherLessonEvaluation = await TeacherLessonEvaluation.findOne({
        lesson: lessonId,
      });

      const studentLessonEvaluation = await StudentLessonEvaluation.findOne({ 
        lesson: lessonId,
      });

      const lessonObj = lesson.toObject();
      const scheduledDate = new Date(lesson.scheduledDate);
      const dayOfWeek = scheduledDate.getDay();

      const dayNames = [
        "Chủ nhật",
        "Thứ 2",
        "Thứ 3",
        "Thứ 4",
        "Thứ 5",
        "Thứ 6",
        "Thứ 7",
      ];
      lessonObj.dayOfWeek = dayNames[dayOfWeek];
      lessonObj.dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;

      // Thêm testInfo vào response nếu có
      if (testInfo) {
        lessonObj.testInfo = {
          testInfoId: testInfo._id,
          testType: testInfo.testType,
          content: testInfo.content,
          reminder: testInfo.reminder,
        };
      }

      if (teacherLessonEvaluation) {
        lessonObj.teacherEvaluation = {
          teacherLessonEvaluationId: teacherLessonEvaluation._id,
          rating: teacherLessonEvaluation.evaluation.rating,
        };
      }

      if (studentLessonEvaluation) {
        lessonObj.studentEvaluation = {
          studentLessonEvaluationId: studentLessonEvaluation._id,
          comments: studentLessonEvaluation.comments,
        }
      }

      return lessonObj;
    } catch (error) {
      console.error("❌ Error in getLessonDetail:", error.message);
      throw new Error(`Error fetching lesson detail: ${error.message}`);
    }
  }

  async updateLessonDescription(lessonId, description, token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        throw new Error("User not found");
      }

      const lesson = await Lesson.findById(lessonId);
      if (!lesson) {
        throw new Error("Lesson not found");
      }

      lesson.description = description;
      await lesson.save();

      return {
        _id: lesson._id,
        lessonId: lesson.lessonId,
        description: lesson.description,
      };
    } catch (error) {
      console.error("❌ Error in updateLessonDescription:", error.message);
      throw new Error(`Error updating lesson description: ${error.message}`);
    }
  }

  async deleteLessonDescription(lessonId, token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        throw new Error("User not found");
      }

      const lesson = await Lesson.findById(lessonId);
      if (!lesson) {
        throw new Error("Lesson not found");
      }

      lesson.description = undefined;
      await lesson.save();

      return {
        _id: lesson._id,
        lessonId: lesson.lessonId,
        description: lesson.description,
      };
    } catch (error) {
      console.error("❌ Error in deleteLessonDescription:", error.message);
      throw new Error(`Error deleting lesson description: ${error.message}`);
    }
  }

  async completeLesson(lessonId, token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        throw new Error("User not found");
      }

      const lesson = await Lesson.findById(lessonId);
      if (!lesson) {
        throw new Error("Lesson not found");
      }

      lesson.status = "completed";
      await lesson.save();

      return {
        _id: lesson._id,
        lessonId: lesson.lessonId,
        status: lesson.status,
      };
    } catch (error) {
      console.error("❌ Error in completeLesson:", error.message);
      throw new Error(`Error completing lesson: ${error.message}`);
    }
  }
}

module.exports = new ScheduleService();
