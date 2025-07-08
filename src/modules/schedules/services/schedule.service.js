const jwt = require("jsonwebtoken");
const Schedule = require("../models/schedule.model");
const Period = require("../models/period.model");
const TeacherSchedule = require("../models/teacher-schedule.model");
const AcademicYear = require("../models/academic-year.model");
const TimeSlot = require("../models/time-slot.model");
const Lesson = require("../models/lesson.model");
const WeeklySchedule = require("../models/weekly-schedule.model");
const LessonTemplate = require("../models/lesson-template.model");
const TestInfo = require("../models/test-info.model");
const Class = require("../../classes/models/class.model");
const Subject = require("../../subjects/models/subject.model");
const User = require("../../auth/models/user.model");
const TeacherLessonEvaluation = require("../models/teacher-lesson-evaluation.model");
const StudentLessonEvaluation = require("../models/student-lesson-evaluation.model");
const MultiClassSchedulerService = require("./multi-class-scheduler.service");
const mongoose = require("mongoose");

class ScheduleService {
  constructor() {}

  async initializeSchedulesWithNewArchitecture(data, token) {
    try {
      const {
        academicYear,
        gradeLevel,
        semester = 1,
        scheduleType = "MONDAY_TO_SATURDAY",
      } = data;

      // Verify user permissions
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !["admin", "manager"].includes(user.role[0])) {
        throw new Error("Unauthorized to create schedules");
      }

      console.log(
        `🚀 Starting NEW schedule initialization for grade ${gradeLevel}, academic year ${academicYear}`
      );
      console.log(
        `📅 Schedule type: ${scheduleType} (${
          scheduleType === "MONDAY_TO_FRIDAY" ? "Thứ 2-6" : "Thứ 2-7"
        })`
      );

      // Đảm bảo Academic Year exists
      let academicYearDoc = await AcademicYear.findOne({ name: academicYear });
      if (!academicYearDoc) {
        console.log(`📅 Creating Academic Year: ${academicYear}`);
        academicYearDoc = new AcademicYear({
          name: academicYear,
          startDate: new Date("2024-08-12"),
          endDate: new Date("2025-05-30"),
          totalWeeks: 38,
          isActive: true,
        });
        await academicYearDoc.save();
      }

      // Đảm bảo Time Slots exist
      await this.ensureTimeSlots();

      // Lấy danh sách lớp theo khối
      const classes = await Class.find({
        className: new RegExp(`^${gradeLevel}`),
        academicYear,
        active: true,
      }).populate("homeroomTeacher");

      if (!classes || classes.length === 0) {
        throw new Error(
          `No classes found for grade ${gradeLevel} in academic year ${academicYear}`
        );
      }

      console.log(
        `📚 Found ${classes.length} classes: ${classes
          .map((c) => c.className)
          .join(", ")}`
      );

      const results = [];
      let createdSchedulesCount = 0;

      // NEW: Tạo thời khóa biểu cho tất cả lớp với multi-class scheduler
      const classesToCreate = [];

      // Phân loại lớp: tạo mới vs đã tồn tại
      for (const classInfo of classes) {
        console.log(`\n🎯 Processing class: ${classInfo.className}`);

        // Kiểm tra xem lớp đã có thời khóa biểu chưa
        const existingSchedule = await Schedule.findByClassAndYear(
          classInfo._id,
          academicYearDoc._id
        );

        if (existingSchedule) {
          console.log(
            `⚠️ Schedule already exists for ${classInfo.className}, deleting old data...`
          );

          // Xóa các lessons cũ
          await Lesson.deleteMany({
            class: classInfo._id,
            academicYear: academicYearDoc._id,
          });
          console.log(`🗑️ Deleted old lessons for ${classInfo.className}`);

          // Xóa schedule cũ
          await Schedule.findByIdAndDelete(existingSchedule._id);
          console.log(`🗑️ Deleted old schedule for ${classInfo.className}`);

          classesToCreate.push(classInfo);
        } else {
          classesToCreate.push(classInfo);
        }
      }

      // Tạo schedules cho tất cả lớp cần tạo mới
      if (classesToCreate.length > 0) {
        try {
          console.log(
            `\n🎯 Creating schedules for ${classesToCreate.length} classes with optimized teacher distribution...`
          );

          // Tạo schedules cho tất cả lớp cùng lúc với scheduleType option
          const schedules = await this.createMultiClassSchedulesWithLessons(
            classesToCreate,
            academicYearDoc._id,
            user._id,
            { scheduleType }
          );

          // Activate và tạo results cho từng schedule
          for (let i = 0; i < schedules.length; i++) {
            const schedule = schedules[i];
            const classInfo = classesToCreate[i];

            await schedule.activate();

            console.log(
              `✅ Successfully created schedule for ${classInfo.className}`
            );

            results.push({
              classId: classInfo._id,
              className: classInfo.className,
              status: "created",
              scheduleId: schedule._id,
              scheduleType: scheduleType,
              totalWeeks: schedule.statistics.totalWeeks,
              totalLessons: schedule.statistics.totalLessons,
            });

            createdSchedulesCount++;
          }
        } catch (error) {
          console.error(
            `❌ Failed to create multi-class schedules:`,
            error.message
          );

          // Mark all classes as failed
          for (const classInfo of classesToCreate) {
            results.push({
              classId: classInfo._id,
              className: classInfo.className,
              status: "failed",
              error: error.message,
            });
          }
        }
      }

      const summary = {
        totalClasses: classes.length,
        createdSchedules: createdSchedulesCount,
        skippedSchedules: results.filter((r) => r.status === "skipped").length,
        failedSchedules: results.filter((r) => r.status === "failed").length,
        successRate:
          ((createdSchedulesCount / classes.length) * 100).toFixed(2) + "%",
        scheduleType: scheduleType,
      };

      console.log("\n📊 Schedule Creation Summary:");
      console.log(`- Total Classes: ${summary.totalClasses}`);
      console.log(`- Created: ${summary.createdSchedules}`);
      console.log(`- Skipped: ${summary.skippedSchedules}`);
      console.log(`- Failed: ${summary.failedSchedules}`);
      console.log(`- Success Rate: ${summary.successRate}`);
      console.log(
        `- Schedule Type: ${
          scheduleType === "MONDAY_TO_FRIDAY" ? "Thứ 2-6" : "Thứ 2-7"
        }`
      );

      return {
        summary,
        results,
        useNewArchitecture: true,
      };
    } catch (error) {
      throw new Error(
        `Failed to initialize schedules with new architecture: ${error.message}`
      );
    }
  }

  async createMultiClassSchedulesWithLessons(
    classes,
    academicYearId,
    createdBy,
    options = {}
  ) {
    console.log(
      `\n🎯 Creating schedules for ${classes.length} classes with optimized teacher distribution...`
    );
    console.log(
      `📅 Schedule type: ${options.scheduleType || "MONDAY_TO_SATURDAY"}`
    );

    // Lấy time slots và subjects
    const timeSlots = await TimeSlot.getAllActive();
    const academicYear = await AcademicYear.findById(academicYearId);
    const startDate = new Date(academicYear.startDate);

    // Lấy subjects cho grade level
    const gradeLevel = classes[0].className.startsWith("12")
      ? 12
      : classes[0].className.startsWith("11")
      ? 11
      : 10;
    const subjects = await Subject.find({
      gradeLevels: gradeLevel,
      isActive: true,
    });

    console.log(`📚 Found ${subjects.length} subjects for grade ${gradeLevel}`);

    // Log tổng weeklyHours
    const totalWeeklyHours = subjects.reduce(
      (sum, subject) => sum + (subject.weeklyHours || 3),
      0
    );
    console.log(`📊 Total weekly hours for all subjects: ${totalWeeklyHours}`);

    // Tạo schedules và weekly schedules cho tất cả lớp
    const schedules = [];
    const weeklySchedulesByWeek = []; // [week][classIndex] = weeklyScheduleId

    for (const classInfo of classes) {
      const schedule = await Schedule.createSchedule(
        classInfo._id,
        academicYearId,
        createdBy
      );
      schedules.push(schedule);
    }

    // Tạo weekly schedules cho tất cả tuần và lớp
    for (let weekNum = 1; weekNum <= 38; weekNum++) {
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(startDate.getDate() + (weekNum - 1) * 7);

      // Điều chỉnh để thứ 2 là ngày đầu tuần
      const dayOfWeek = weekStartDate.getDay();
      const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
      if (daysToMonday > 0) {
        weekStartDate.setDate(weekStartDate.getDate() + daysToMonday);
      }

      const weekSchedules = [];
      for (let i = 0; i < classes.length; i++) {
        const classInfo = classes[i];
        const weeklySchedule = await WeeklySchedule.createWeek(
          classInfo._id,
          academicYearId,
          weekNum,
          weekStartDate,
          createdBy
        );
        weekSchedules.push(weeklySchedule._id);

        // Add to main schedule
        await schedules[i].addWeeklySchedule(weeklySchedule._id);
      }
      weeklySchedulesByWeek.push(weekSchedules);
    }

    // Tạo lessons cho tất cả lớp sử dụng multi-class scheduler
    console.log(`\n🎯 Creating lessons with multi-class scheduler...`);

    for (let weekNum = 1; weekNum <= 38; weekNum++) {
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(startDate.getDate() + (weekNum - 1) * 7);

      // Điều chỉnh để thứ 2 là ngày đầu tuần
      const dayOfWeek = weekStartDate.getDay();
      const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
      if (daysToMonday > 0) {
        weekStartDate.setDate(weekStartDate.getDate() + daysToMonday);
      }

      // Get data for this week
      const weeklyScheduleIds = weeklySchedulesByWeek[weekNum - 1];
      const classIds = classes.map((c) => c._id);
      const homeroomTeachers = classes.map((c) => c.homeroomTeacher);

      // Create lessons for all classes in this week với scheduleType option
      await this.createLessonsForMultipleClasses(
        weeklyScheduleIds,
        classIds,
        academicYearId,
        weekNum,
        weekStartDate,
        timeSlots,
        subjects,
        homeroomTeachers,
        createdBy,
        options
      );

      // Publish weekly schedules
      for (const weeklyScheduleId of weeklyScheduleIds) {
        const weeklySchedule = await WeeklySchedule.findById(weeklyScheduleId);
        await weeklySchedule.publish();
      }
    }

    // Update statistics for all schedules
    for (const schedule of schedules) {
      await schedule.updateStatistics();
    }

    console.log(
      `✅ Successfully created ${classes.length} optimized schedules`
    );
    return schedules;
  }

  async createLessonsForMultipleClasses(
    weeklyScheduleIds,
    classIds,
    academicYearId,
    weekNum,
    weekStartDate,
    timeSlots,
    subjects,
    homeroomTeachers,
    createdBy,
    options = {}
  ) {
    const multiClassScheduler = new MultiClassSchedulerService();

    return await multiClassScheduler.createMultiClassSchedules(
      weeklyScheduleIds,
      classIds,
      academicYearId,
      weekNum,
      weekStartDate,
      timeSlots,
      subjects,
      homeroomTeachers,
      createdBy,
      options
    );
  }

  async ensureTimeSlots() {
    const existingSlots = await TimeSlot.countDocuments();
    if (existingSlots === 0) {
      console.log("⏰ Creating default time slots...");
      await TimeSlot.createDefaultTimeSlots();
    }
  }

  async getClassSchedule(className, academicYear, weekNumber = 1) {
    try {
      const classInfo = await Class.findOne({ className, academicYear });
      if (!classInfo) {
        throw new Error(
          `Class ${className} not found in academic year ${academicYear}`
        );
      }

      const schedule = await Schedule.findOne({
        class: classInfo._id,
        academicYear,
        status: "active",
      })
        .populate("class", "className academicYear")
        .lean();

      if (!schedule) {
        throw new Error(`No active schedule found for class ${className}`);
      }

      // Get the specific week
      const week = schedule.weeks.find((w) => w.weekNumber === weekNumber);
      if (!week) {
        throw new Error(`Week ${weekNumber} not found in schedule`);
      }

      // Populate periods for the week
      const periodIds = [];
      week.days.forEach((day) => {
        periodIds.push(...day.periods);
      });

      const periods = await Period.find({
        _id: { $in: periodIds },
      })
        .populate("subject", "subjectName subjectCode")
        .populate("teacher", "name email")
        .populate("substituteTeacher", "name email")
        .lean();

      // Create period lookup map
      const periodMap = {};
      periods.forEach((period) => {
        periodMap[period._id.toString()] = period;
      });

      // Populate periods in days
      week.days.forEach((day) => {
        day.periods = day.periods
          .map((periodId) => periodMap[periodId.toString()])
          .filter(Boolean);
      });

      return {
        schedule: {
          _id: schedule._id,
          class: schedule.class,
          academicYear: schedule.academicYear,
          status: schedule.status,
          totalWeeks: schedule.totalWeeks,
        },
        week: week,
      };
    } catch (error) {
      throw new Error(`Error fetching class schedule: ${error.message}`);
    }
  }

  async checkClassExists(className, academicYear) {
    try {
      const classInfo = await Class.findOne({ className, academicYear });

      return {
        exists: !!classInfo,
        class: classInfo
          ? {
              id: classInfo._id,
              className: classInfo.className,
              academicYear: classInfo.academicYear,
              gradeLevel: classInfo.gradeLevel,
            }
          : null,
      };
    } catch (error) {
      throw new Error(`Failed to check class existence: ${error.message}`);
    }
  }

  async getDetailedLessonScheduleByDateRange(
    className,
    academicYear,
    startOfWeek,
    endOfWeek
  ) {
    try {
      console.log(
        `🔍 Getting detailed lesson schedule for ${className}, ${academicYear}, ${startOfWeek} to ${endOfWeek}`
      );

      const classInfo = await Class.findOne({ className, academicYear });
      if (!classInfo) {
        throw new Error(
          `Class ${className} not found in academic year ${academicYear}`
        );
      }

      const startDate = new Date(startOfWeek);
      const endDate = new Date(endOfWeek);
      endDate.setHours(23, 59, 59, 999); // End of day

      // Find all lessons in the date range for this class
      const lessons = await Lesson.find({
        class: classInfo._id,
        scheduledDate: {
          $gte: startDate,
          $lte: endDate,
        },
      })
        .populate("subject", "subjectName subjectCode department weeklyHours")
        .populate("teacher", "name email phoneNumber role")
        .populate("substituteTeacher", "name email phoneNumber role")
        .populate("timeSlot", "period startTime endTime")
        .populate("academicYear", "name startDate endDate isActive")
        .sort({ scheduledDate: 1, "timeSlot.period": 1 })
        .lean();

      console.log(`📚 Found ${lessons.length} lessons in date range`);

      // Group lessons by date and organize by day
      const scheduleByDay = {};
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      lessons.forEach((lesson) => {
        const dateKey = lesson.scheduledDate.toISOString().split("T")[0];
        const dayOfWeek = lesson.scheduledDate.getDay();

        if (!scheduleByDay[dateKey]) {
          scheduleByDay[dateKey] = {
            date: dateKey,
            dayOfWeek: dayOfWeek,
            dayName: dayNames[dayOfWeek],
            dayNameVN: this.getDayNameVN(dayOfWeek + 1), // Convert to 1-7 format
            lessons: [],
          };
        }

        // Enhanced lesson info
        const lessonInfo = {
          lessonId: lesson.lessonId,
          _id: lesson._id,
          type: lesson.type,
          status: lesson.status,
          period: lesson.timeSlot?.period || 0,
          timeSlot: {
            period: lesson.timeSlot?.period || 0,
            startTime: lesson.timeSlot?.startTime || "",
            endTime: lesson.timeSlot?.endTime || "",
          },
          subject: lesson.subject
            ? {
                _id: lesson.subject._id,
                name: lesson.subject.subjectName,
                code: lesson.subject.subjectCode,
                department: lesson.subject.department,
                weeklyHours: lesson.subject.weeklyHours,
              }
            : null,
          teacher: lesson.teacher
            ? {
                _id: lesson.teacher._id,
                name: lesson.teacher.name,
                email: lesson.teacher.email,
                phoneNumber: lesson.teacher.phoneNumber,
                role: lesson.teacher.role,
              }
            : null,
          substituteTeacher: lesson.substituteTeacher
            ? {
                _id: lesson.substituteTeacher._id,
                name: lesson.substituteTeacher.name,
                email: lesson.substituteTeacher.email,
                phoneNumber: lesson.substituteTeacher.phoneNumber,
                role: lesson.substituteTeacher.role,
              }
            : null,
          topic: lesson.topic || "",
          notes: lesson.notes || "",
          actualDate: lesson.actualDate,
          evaluation: lesson.evaluation || null,
          attendance: lesson.attendance || null,
          makeupInfo: lesson.makeupInfo || null,
          extracurricularInfo: lesson.extracurricularInfo || null,
          fixedInfo: lesson.fixedInfo || null,
          createdAt: lesson.createdAt,
          updatedAt: lesson.updatedAt,
        };

        scheduleByDay[dateKey].lessons.push(lessonInfo);
      });

      // Sort lessons by period within each day
      Object.values(scheduleByDay).forEach((day) => {
        day.lessons.sort((a, b) => a.period - b.period);
      });

      // Convert to array and sort by date
      const weeklySchedule = Object.values(scheduleByDay).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      // Fill in missing days with empty structure
      const fullWeekSchedule = [];
      let currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split("T")[0];
        const dayOfWeek = currentDate.getDay();

        const existingDay = scheduleByDay[dateKey];
        if (existingDay) {
          fullWeekSchedule.push(existingDay);
        } else {
          fullWeekSchedule.push({
            date: dateKey,
            dayOfWeek: dayOfWeek,
            dayName: dayNames[dayOfWeek],
            dayNameVN: this.getDayNameVN(dayOfWeek + 1),
            lessons: [],
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate statistics
      const totalLessons = lessons.length;
      const completedLessons = lessons.filter(
        (l) => l.status === "completed"
      ).length;
      const scheduledLessons = lessons.filter(
        (l) => l.status === "scheduled"
      ).length;
      const cancelledLessons = lessons.filter(
        (l) => l.status === "cancelled"
      ).length;

      const subjectStats = {};
      lessons.forEach((lesson) => {
        if (lesson.subject) {
          if (!subjectStats[lesson.subject.subjectCode]) {
            subjectStats[lesson.subject.subjectCode] = {
              subjectName: lesson.subject.subjectName,
              total: 0,
              completed: 0,
              scheduled: 0,
              cancelled: 0,
            };
          }
          subjectStats[lesson.subject.subjectCode].total++;
          subjectStats[lesson.subject.subjectCode][lesson.status]++;
        }
      });

      console.log(
        `📊 Returning detailed schedule with ${fullWeekSchedule.length} days and ${totalLessons} lessons`
      );

      return {
        success: true,
        class: {
          _id: classInfo._id,
          className: classInfo.className,
          academicYear: classInfo.academicYear,
          gradeLevel: classInfo.gradeLevel,
          homeroomTeacher: classInfo.homeroomTeacher,
        },
        dateRange: {
          startOfWeek,
          endOfWeek,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        schedule: fullWeekSchedule,
        statistics: {
          totalLessons,
          completedLessons,
          scheduledLessons,
          cancelledLessons,
          completionRate:
            totalLessons > 0
              ? ((completedLessons / totalLessons) * 100).toFixed(2) + "%"
              : "0%",
          subjectStats,
        },
        metadata: {
          totalDays: fullWeekSchedule.length,
          daysWithLessons: weeklySchedule.length,
          architecture: "lesson-based",
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error(
        "❌ Error in getDetailedLessonScheduleByDateRange:",
        error.message
      );
      throw new Error(
        `Error fetching detailed lesson schedule: ${error.message}`
      );
    }
  }

  async getTeacherScheduleByDateRange(
    teacherId,
    academicYear,
    startOfWeek,
    endOfWeek
  ) {
    try {
      console.log(
        `🔍 Getting teacher schedule for ${teacherId}, ${academicYear}, ${startOfWeek} to ${endOfWeek}`
      );

      // Validate teacher exists
      const teacher = await User.findById(teacherId);
      if (!teacher) {
        throw new Error(`Teacher with ID ${teacherId} not found`);
      }

      const startDate = new Date(startOfWeek);
      const endDate = new Date(endOfWeek);
      endDate.setHours(23, 59, 59, 999); // End of day

      // Find all lessons for this teacher in the date range (both main and substitute)
      const lessons = await Lesson.find({
        $or: [{ teacher: teacherId }, { substituteTeacher: teacherId }],
        scheduledDate: {
          $gte: startDate,
          $lte: endDate,
        },
      })
        .populate("class", "className gradeLevel")
        .populate("subject", "subjectName subjectCode department weeklyHours")
        .populate("teacher", "name email phoneNumber role")
        .populate("substituteTeacher", "name email phoneNumber role")
        .populate("timeSlot", "period startTime endTime")
        .populate("academicYear", "name startDate endDate isActive")
        .sort({ scheduledDate: 1, "timeSlot.period": 1 })
        .lean();

      console.log(
        `📚 Found ${lessons.length} lessons for teacher in date range`
      );

      // Get time slots for period mapping
      const timeSlots = await TimeSlot.find().sort({ period: 1 }).lean();
      const timeSlotMap = {};
      timeSlots.forEach((slot) => {
        timeSlotMap[slot.period] = slot;
      });

      // Group lessons by date and organize by day with full 10 periods
      const scheduleByDay = {};
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      // First, create lesson map by date and period
      const lessonMap = {};
      lessons.forEach((lesson) => {
        const dateKey = lesson.scheduledDate.toISOString().split("T")[0];
        const period = lesson.timeSlot?.period || 0;

        if (!lessonMap[dateKey]) {
          lessonMap[dateKey] = {};
        }
        lessonMap[dateKey][period] = lesson;
      });

      // Fill in missing days with empty structure and create full 10-period schedule
      let currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split("T")[0];
        const dayOfWeek = currentDate.getDay();

        scheduleByDay[dateKey] = {
          date: dateKey,
          dayOfWeek: dayOfWeek,
          dayName: dayNames[dayOfWeek],
          dayNameVN: this.getDayNameVN(dayOfWeek + 1), // Convert to 1-7 format
          periods: [],
        };

        // Create full 10 periods for each day
        for (let period = 1; period <= 10; period++) {
          const lesson = lessonMap[dateKey] && lessonMap[dateKey][period];
          const timeSlot = timeSlotMap[period];

          if (lesson) {
            // Has lesson - populate with lesson data
            // Determine teacher role
            const isMainTeacher =
              lesson.teacher &&
              lesson.teacher._id.toString() === teacherId.toString();
            const isSubstituteTeacher =
              lesson.substituteTeacher &&
              lesson.substituteTeacher._id.toString() === teacherId.toString();

            const lessonInfo = {
              period: period,
              hasLesson: true,
              lessonId: lesson.lessonId,
              _id: lesson._id,
              type: lesson.type,
              status: lesson.status,
              timeSlot: {
                period: period,
                startTime: timeSlot?.startTime || "",
                endTime: timeSlot?.endTime || "",
              },
              class: lesson.class
                ? {
                    _id: lesson.class._id,
                    className: lesson.class.className,
                    gradeLevel: lesson.class.gradeLevel,
                  }
                : null,
              subject: lesson.subject
                ? {
                    _id: lesson.subject._id,
                    name: lesson.subject.subjectName,
                    code: lesson.subject.subjectCode,
                    department: lesson.subject.department,
                    weeklyHours: lesson.subject.weeklyHours,
                  }
                : null,
              teacher: lesson.teacher
                ? {
                    _id: lesson.teacher._id,
                    name: lesson.teacher.name,
                    email: lesson.teacher.email,
                    phoneNumber: lesson.teacher.phoneNumber,
                    role: lesson.teacher.role,
                  }
                : null,
              substituteTeacher: lesson.substituteTeacher
                ? {
                    _id: lesson.substituteTeacher._id,
                    name: lesson.substituteTeacher.name,
                    email: lesson.substituteTeacher.email,
                    phoneNumber: lesson.substituteTeacher.phoneNumber,
                    role: lesson.substituteTeacher.role,
                  }
                : null,
              teacherRole: isMainTeacher
                ? "main_teacher"
                : isSubstituteTeacher
                ? "substitute_teacher"
                : "unknown",
              topic: lesson.topic || "",
              notes: lesson.notes || "",
              actualDate: lesson.actualDate,
              evaluation: lesson.evaluation || null,
              attendance: lesson.attendance || null,
              makeupInfo: lesson.makeupInfo || null,
              extracurricularInfo: lesson.extracurricularInfo || null,
              fixedInfo: lesson.fixedInfo || null,
              createdAt: lesson.createdAt,
              updatedAt: lesson.updatedAt,
            };
            scheduleByDay[dateKey].periods.push(lessonInfo);
          } else {
            // No lesson - create empty period
            const emptyPeriod = {
              period: period,
              hasLesson: false,
              lessonId: null,
              _id: null,
              type: "empty",
              status: "free",
              timeSlot: {
                period: period,
                startTime: timeSlot?.startTime || "",
                endTime: timeSlot?.endTime || "",
              },
              class: null,
              subject: null,
              topic: "",
              notes: "Tiết trống",
              actualDate: null,
              evaluation: null,
              attendance: null,
              makeupInfo: null,
              extracurricularInfo: null,
              fixedInfo: null,
              createdAt: null,
              updatedAt: null,
            };
            scheduleByDay[dateKey].periods.push(emptyPeriod);
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Convert to array and sort by date
      const fullWeekSchedule = Object.values(scheduleByDay).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      // Calculate statistics
      const totalLessons = lessons.length;
      const completedLessons = lessons.filter(
        (l) => l.status === "completed"
      ).length;
      const scheduledLessons = lessons.filter(
        (l) => l.status === "scheduled"
      ).length;
      const cancelledLessons = lessons.filter(
        (l) => l.status === "cancelled"
      ).length;

      // Statistics by class
      const classStats = {};
      lessons.forEach((lesson) => {
        if (lesson.class) {
          if (!classStats[lesson.class.className]) {
            classStats[lesson.class.className] = {
              className: lesson.class.className,
              gradeLevel: lesson.class.gradeLevel,
              total: 0,
              completed: 0,
              scheduled: 0,
              cancelled: 0,
            };
          }
          classStats[lesson.class.className].total++;
          classStats[lesson.class.className][lesson.status]++;
        }
      });

      // Statistics by subject
      const subjectStats = {};
      lessons.forEach((lesson) => {
        if (lesson.subject) {
          if (!subjectStats[lesson.subject.subjectCode]) {
            subjectStats[lesson.subject.subjectCode] = {
              subjectName: lesson.subject.subjectName,
              subjectCode: lesson.subject.subjectCode,
              total: 0,
              completed: 0,
              scheduled: 0,
              cancelled: 0,
            };
          }
          subjectStats[lesson.subject.subjectCode].total++;
          subjectStats[lesson.subject.subjectCode][lesson.status]++;
        }
      });

      // Daily workload statistics with full period breakdown
      const dailyWorkload = {};
      fullWeekSchedule.forEach((day) => {
        const lessonsInDay = day.periods.filter((p) => p.hasLesson);
        dailyWorkload[day.dayName] = {
          date: day.date,
          totalPeriods: 10,
          totalLessons: lessonsInDay.length,
          freePeriods: 10 - lessonsInDay.length,
          morningLessons: lessonsInDay.filter(
            (l) => l.period >= 1 && l.period <= 5
          ).length,
          afternoonLessons: lessonsInDay.filter(
            (l) => l.period >= 6 && l.period <= 10
          ).length,
          completedLessons: lessonsInDay.filter((l) => l.status === "completed")
            .length,
          periodBreakdown: {
            morning: day.periods.slice(0, 5).map((p) => ({
              period: p.period,
              hasLesson: p.hasLesson,
              subject: p.subject?.code || null,
            })),
            afternoon: day.periods.slice(5, 10).map((p) => ({
              period: p.period,
              hasLesson: p.hasLesson,
              subject: p.subject?.code || null,
            })),
          },
        };
      });

      console.log(
        `📊 Returning teacher schedule with ${fullWeekSchedule.length} days and ${totalLessons} lessons (full 10-period format)`
      );

      return {
        success: true,
        teacher: {
          _id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          role: teacher.role,
          subject: teacher.subject,
        },
        academicYear,
        dateRange: {
          startOfWeek,
          endOfWeek,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        schedule: fullWeekSchedule,
        statistics: {
          totalLessons,
          completedLessons,
          scheduledLessons,
          cancelledLessons,
          freePeriods: fullWeekSchedule.length * 10 - totalLessons,
          completionRate:
            totalLessons > 0
              ? ((completedLessons / totalLessons) * 100).toFixed(2) + "%"
              : "0%",
          classStats,
          subjectStats,
          dailyWorkload,
        },
        metadata: {
          totalDays: fullWeekSchedule.length,
          daysWithLessons: fullWeekSchedule.filter((day) =>
            day.periods.some((p) => p.hasLesson)
          ).length,
          periodsPerDay: 10,
          totalPeriods: fullWeekSchedule.length * 10,
          architecture: "lesson-based",
          displayFormat: "full-10-periods",
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error(
        "❌ Error in getTeacherScheduleByDateRange:",
        error.message
      );
      throw new Error(`Error fetching teacher schedule: ${error.message}`);
    }
  }

  async getLessonDetailById(lessonId, currentUser) {
    try {
      console.log(
        `🔍 Getting lesson detail for ${lessonId} by user ${currentUser._id} (${currentUser.role})`
      );

      // Find lesson with full population
      const lesson = await Lesson.findById(lessonId)
        .populate("class", "className gradeLevel academicYear homeroomTeacher")
        .populate(
          "subject",
          "subjectName subjectCode department weeklyHours description"
        )
        .populate("teacher", "name email phoneNumber role gender department")
        .populate("substituteTeacher", "name email phoneNumber role department")
        .populate("timeSlot", "period startTime endTime type")
        .populate("academicYear", "name startDate endDate isActive")
        .populate("createdBy", "name email role")
        .populate("lastModifiedBy", "name email role")
        .lean();

      if (!lesson) {
        throw new Error(`Lesson with ID ${lessonId} not found`);
      }

      // Authorization check
      const hasAccess = this.checkLessonAccess(lesson, currentUser);
      if (!hasAccess.allowed) {
        throw new Error(hasAccess.reason);
      }

      // Get additional context information
      const additionalInfo = await this.getLessonAdditionalInfo(lesson);

      // Get test info for this lesson
      const testInfo = await TestInfo.findOne({ lesson: lessonId })
        .populate("teacher", "name email")
        .lean();

      // Get teacher evaluation for this lesson
      const teacherEvaluation = await TeacherLessonEvaluation.findOne({
        lesson: lessonId,
      })
        .populate("teacher", "name email")
        .populate("absentStudents.student", "name studentId email")
        .populate("oralTests.student", "name studentId email")
        .populate("violations.student", "name studentId email")
        .lean();

      const studentEvaluations = await StudentLessonEvaluation.findOne({
        lesson: lessonId,
      })
        .populate("student", "name email studentId")
        .lean();

      // Format response with comprehensive information
      const lessonDetail = {
        // Basic lesson information
        lessonId: lesson.lessonId,
        _id: lesson._id,
        type: lesson.type,
        status: lesson.status,

        // Thông tin thời gian và lịch trình
        scheduledDate: lesson.scheduledDate,
        actualDate: lesson.actualDate,
        timeSlot: {
          period: lesson.timeSlot?.period || 0,
          startTime: lesson.timeSlot?.startTime || "",
          endTime: lesson.timeSlot?.endTime || "",
          session: lesson.timeSlot?.type || "",
        },

        // Thông tin lớp học
        class: lesson.class
          ? {
              _id: lesson.class._id,
              className: lesson.class.className,
              gradeLevel: lesson.class.gradeLevel,
              academicYear: lesson.class.academicYear,
              homeroomTeacher: lesson.class.homeroomTeacher,
            }
          : null,

        // Thông tin môn học
        subject: lesson.subject
          ? {
              _id: lesson.subject._id,
              name: lesson.subject.subjectName,
              code: lesson.subject.subjectCode,
              department: lesson.subject.department,
              weeklyHours: lesson.subject.weeklyHours,
              description: lesson.subject.description,
            }
          : null,

        // Thông tin giáo viên
        teacher: lesson.teacher
          ? {
              _id: lesson.teacher._id,
              name: lesson.teacher.name,
              email: lesson.teacher.email,
              phoneNumber: lesson.teacher.phoneNumber,
              role: lesson.teacher.role,
              gender: lesson.teacher.gender,
              department: lesson.teacher.department,
            }
          : null,

        // Thông tin giáo viên dạy bù
        substituteTeacher: lesson.substituteTeacher
          ? {
              _id: lesson.substituteTeacher._id,
              name: lesson.substituteTeacher.name,
              email: lesson.substituteTeacher.email,
              phoneNumber: lesson.substituteTeacher.phoneNumber,
              role: lesson.substituteTeacher.role,
              department: lesson.substituteTeacher.department,
            }
          : null,

        // Thông tin năm học
        academicYear: lesson.academicYear
          ? {
              _id: lesson.academicYear._id,
              name: lesson.academicYear.name,
              startDate: lesson.academicYear.startDate,
              endDate: lesson.academicYear.endDate,
              isActive: lesson.academicYear.isActive,
            }
          : null,

        // Nội dung tiết học
        topic: lesson.topic || "",
        description: lesson.description || "",

        attendance: lesson.attendance || null,

        studentEvaluations: studentEvaluations
          ? {
              _id: studentEvaluations._id,
              student: studentEvaluations.student,
              evaluation: studentEvaluations.evaluation,
              comments: studentEvaluations.comments,
              evaluatedAt: studentEvaluations.evaluatedAt,
            }
          : null,

        // Thông tin đánh giá giáo viên (mới thêm)
        teacherEvaluation: teacherEvaluation
          ? {
              _id: teacherEvaluation._id,
              teacher: teacherEvaluation.teacher
                ? {
                    _id: teacherEvaluation.teacher._id,
                    name: teacherEvaluation.teacher.name,
                    email: teacherEvaluation.teacher.email,
                  }
                : null,
              lessonContent: teacherEvaluation.lessonContent,
              evaluation: {
                rating: teacherEvaluation.evaluation.rating,
                comments: teacherEvaluation.evaluation.comments,
                details: teacherEvaluation.evaluation.details,
              },
              absentStudents: teacherEvaluation.absentStudents.map(
                (absent) => ({
                  student: {
                    id: absent.student._id,
                    name: absent.student.name,
                    studentId: absent.student.studentId,
                    email: absent.student.email,
                  },
                  isExcused: absent.isExcused,
                  reason: absent.reason,
                  recordedAt: absent.recordedAt,
                })
              ),
              oralTests: teacherEvaluation.oralTests.map((test) => ({
                student: {
                  id: test.student._id,
                  name: test.student.name,
                  studentId: test.student.studentId,
                  email: test.student.email,
                },
                score: test.score,
                question: test.question,
                comment: test.comment,
                testedAt: test.testedAt,
              })),
              violations: teacherEvaluation.violations.map((violation) => ({
                student: {
                  id: violation.student._id,
                  name: violation.student.name,
                  studentId: violation.student.studentId,
                  email: violation.student.email,
                },
                description: violation.description,
                type: violation.type,
                severity: violation.severity,
                action: violation.action,
                recordedAt: violation.recordedAt,
              })),
              summary: teacherEvaluation.summary,
              status: teacherEvaluation.status,
              completedAt: teacherEvaluation.completedAt,
              submittedAt: teacherEvaluation.submittedAt,
              createdAt: teacherEvaluation.createdAt,
              updatedAt: teacherEvaluation.updatedAt,
            }
          : null,

        // Các loại tiết học đặc biệt
        makeupInfo: lesson.makeupInfo || null,
        extracurricularInfo: lesson.extracurricularInfo || null,
        fixedInfo: lesson.fixedInfo || null,

        // Thông tin kiểm tra (test info)
        testInfo: testInfo
          ? {
              _id: testInfo._id,
              testType: testInfo.testType,
              title: testInfo.title,
              content: testInfo.content,
              chapters: testInfo.chapters || [],
              references: testInfo.references || [],
              expectedTestDate: testInfo.expectedTestDate,
              testInfoDate: testInfo.testInfoDate,
              priority: testInfo.priority,
              status: testInfo.status,
              reminder: testInfo.reminder,
              isVisible: testInfo.isVisible,
              createdAt: testInfo.createdAt,
              updatedAt: testInfo.updatedAt,
              teacher: testInfo.teacher
                ? {
                    _id: testInfo.teacher._id,
                    name: testInfo.teacher.name,
                    email: testInfo.teacher.email,
                  }
                : null,
            }
          : null,

        // Thông tin kiểm toán
        createdBy: lesson.createdBy
          ? {
              _id: lesson.createdBy._id,
              name: lesson.createdBy.name,
              email: lesson.createdBy.email,
              role: lesson.createdBy.role,
            }
          : null,
        createdAt: lesson.createdAt,
        lastModifiedBy: lesson.lastModifiedBy
          ? {
              _id: lesson.lastModifiedBy._id,
              name: lesson.lastModifiedBy.name,
              email: lesson.lastModifiedBy.email,
              role: lesson.lastModifiedBy.role,
            }
          : null,
        updatedAt: lesson.updatedAt,

        // Ngữ cảnh bổ sung
        context: additionalInfo,

        // Quyền của người dùng đối với tiết học này
        permissions: this.getLessonPermissions(lesson, currentUser),
      };

      console.log(`✅ Successfully retrieved lesson detail for ${lessonId}`);
      return lessonDetail;
    } catch (error) {
      console.error("❌ Error in getLessonDetailById:", error.message);
      throw new Error(`Error fetching lesson detail: ${error.message}`);
    }
  }

  getDayNameVN(dayOfWeek) {
    const dayNames = {
      1: "Chủ nhật",
      2: "Thứ 2",
      3: "Thứ 3",
      4: "Thứ 4",
      5: "Thứ 5",
      6: "Thứ 6",
      7: "Thứ 7",
    };
    return dayNames[dayOfWeek] || "Unknown";
  }

  checkLessonAccess(lesson, currentUser) {
    // Manager can access all lessons
    if (
      currentUser.role.includes("manager") ||
      currentUser.role.includes("admin")
    ) {
      return { allowed: true, reason: "Admin/Manager access" };
    }

    // Teacher can access lessons they teach
    if (currentUser.role.includes("teacher")) {
      if (
        lesson.teacher &&
        lesson.teacher._id.toString() === currentUser._id.toString()
      ) {
        return { allowed: true, reason: "Teacher owns this lesson" };
      }

      // Substitute teacher can access lessons they substitute
      if (
        lesson.substituteTeacher &&
        lesson.substituteTeacher._id.toString() === currentUser._id.toString()
      ) {
        return { allowed: true, reason: "Substitute teacher for this lesson" };
      }

      // Homeroom teacher can access lessons of their class
      if (
        lesson.class &&
        lesson.class.homeroomTeacher &&
        lesson.class.homeroomTeacher.toString() === currentUser._id.toString()
      ) {
        return { allowed: true, reason: "Homeroom teacher access" };
      }
    }

    // Student can access lessons of their class
    if (currentUser.role.includes("student")) {
      // Note: This would require student-class relationship in the database
      // For now, we'll allow students to view lessons (can be restricted later)
      return { allowed: true, reason: "Student access (general)" };
    }

    return {
      allowed: false,
      reason: "Access denied. You do not have permission to view this lesson.",
    };
  }

  async getLessonAdditionalInfo(lesson) {
    try {
      const context = {};

      // Get lesson sequence information (previous/next lesson in the same subject)
      if (lesson.subject && lesson.class) {
        const siblingLessons = await Lesson.find({
          subject: lesson.subject._id,
          class: lesson.class._id,
          type: "regular",
          scheduledDate: {
            $gte: new Date(
              lesson.scheduledDate.getTime() - 7 * 24 * 60 * 60 * 1000
            ), // 1 week before
            $lte: new Date(
              lesson.scheduledDate.getTime() + 7 * 24 * 60 * 60 * 1000
            ), // 1 week after
          },
        })
          .select("lessonId scheduledDate topic status")
          .sort({ scheduledDate: 1 })
          .lean();

        const currentIndex = siblingLessons.findIndex(
          (l) => l._id.toString() === lesson._id.toString()
        );

        context.sequence = {
          previousLesson:
            currentIndex > 0 ? siblingLessons[currentIndex - 1] : null,
          nextLesson:
            currentIndex < siblingLessons.length - 1
              ? siblingLessons[currentIndex + 1]
              : null,
          position: currentIndex + 1,
          total: siblingLessons.length,
        };
      }

      // Get same day lessons for context
      const dayStart = new Date(lesson.scheduledDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(lesson.scheduledDate);
      dayEnd.setHours(23, 59, 59, 999);

      const sameDayLessons = await Lesson.find({
        class: lesson.class._id,
        scheduledDate: {
          $gte: dayStart,
          $lte: dayEnd,
        },
      })
        .populate("subject", "subjectName subjectCode")
        .populate("timeSlot", "period startTime endTime")
        .select("lessonId subject timeSlot type status")
        .sort({ "timeSlot.period": 1 })
        .lean();

      context.daySchedule = sameDayLessons.map((l) => ({
        lessonId: l.lessonId,
        period: l.timeSlot?.period || 0,
        subject: l.subject?.subjectCode || "Unknown",
        type: l.type,
        status: l.status,
        isCurrent: l._id.toString() === lesson._id.toString(),
      }));

      // Get weekly subject statistics
      const weekStart = new Date(lesson.scheduledDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
      weekEnd.setHours(23, 59, 59, 999);

      if (lesson.subject) {
        const weeklySubjectLessons = await Lesson.countDocuments({
          subject: lesson.subject._id,
          class: lesson.class._id,
          scheduledDate: {
            $gte: weekStart,
            $lte: weekEnd,
          },
          type: "regular",
        });

        context.weeklyStats = {
          subjectLessonsThisWeek: weeklySubjectLessons,
          expectedWeeklyHours: lesson.subject.weeklyHours || 0,
        };
      }

      return context;
    } catch (error) {
      console.error("Error getting additional lesson info:", error.message);
      return {};
    }
  }

  getLessonPermissions(lesson, currentUser) {
    const permissions = {
      canView: true, // If we reach here, user can view
      canEdit: false,
      canDelete: false,
      canMarkAttendance: false,
      canAddEvaluation: false,
      canModifyContent: false,
    };

    // Admin/Manager permissions
    if (
      currentUser.role.includes("manager") ||
      currentUser.role.includes("admin")
    ) {
      permissions.canEdit = true;
      permissions.canDelete = true;
      permissions.canMarkAttendance = true;
      permissions.canAddEvaluation = true;
      permissions.canModifyContent = true;
      return permissions;
    }

    // Teacher permissions
    if (currentUser.role.includes("teacher")) {
      // Own lessons
      if (
        lesson.teacher &&
        lesson.teacher._id.toString() === currentUser._id.toString()
      ) {
        permissions.canEdit = true;
        permissions.canMarkAttendance = true;
        permissions.canAddEvaluation = true;
        permissions.canModifyContent = true;
      }

      // Homeroom teacher permissions
      if (
        lesson.class &&
        lesson.class.homeroomTeacher &&
        lesson.class.homeroomTeacher.toString() === currentUser._id.toString()
      ) {
        permissions.canMarkAttendance = true;
      }
    }

    // Student permissions (read-only by default)
    // Students can't modify anything by default

    return permissions;
  }
}

module.exports = new ScheduleService();
