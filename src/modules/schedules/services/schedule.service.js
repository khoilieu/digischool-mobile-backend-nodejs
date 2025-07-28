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
const PersonalActivity = require("../models/personal-activity.model");
const MultiClassSchedulerService = require("./multi-class-scheduler.service");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const LessonRequest = require("../models/lesson-request.model");

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
        semester, // thêm trường semester
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
          semester: semester, // lưu học kỳ
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

      // Lấy studentPersonalActivities: các PersonalActivity của user có class_id.className = className và date trong tuần
      const startDate = weeklySchedule.startDate;
      const endDate = weeklySchedule.endDate;
      const usersInClass = await User.find({ class_id: classInfo._id }).select(
        "_id"
      );
      const userIds = usersInClass.map((u) => u._id);
      const studentPersonalActivities = await PersonalActivity.find({
        user: { $in: userIds },
        date: { $gte: startDate, $lte: endDate },
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
        studentPersonalActivities,
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

      const weeklySchedule = await WeeklySchedule.findOne({
        academicYear: academicYearDoc._id,
        weekNumber: weekNumber,
      }).select("startDate endDate");

      let startDate, endDate;
      
      if (weeklySchedule) {
        // Sử dụng startDate và endDate từ weekly schedule nếu có
        startDate = weeklySchedule.startDate;
        endDate = weeklySchedule.endDate;
        console.log(`✅ Found weekly schedule: ${startDate.toISOString()} - ${endDate.toISOString()}`);
      } else {
        // Fallback về cách tính cũ
        startDate = this.calculateWeekStartDate(
          academicYearDoc.startDate,
          weekNumber
        );
        endDate = this.calculateWeekEndDate(
          startDate,
          "MONDAY_TO_SATURDAY"
        );
        console.log(`⚠️ No weekly schedule found, using calculated dates: ${startDate.toISOString()} - ${endDate.toISOString()}`);
      }

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



      // Không gán personalActivity vào từng lesson nữa
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

      // Lấy tất cả hoạt động cá nhân của giáo viên trong tuần (theo date, period)
      // Sử dụng cùng startDate và endDate như lessons để đảm bảo khớp
      let teacherPersonalActivities = await PersonalActivity.find({
        user: teacherId,
        date: { $gte: startDate, $lte: endDate },
      });

      // Nếu không tìm thấy personal activities với date range mới, thử với date range cũ
      if (teacherPersonalActivities.length === 0) {
        const oldStartDate = this.calculateWeekStartDate(academicYearDoc.startDate, weekNumber);
        const oldEndDate = this.calculateWeekEndDate(oldStartDate, "MONDAY_TO_SATURDAY");
        
        teacherPersonalActivities = await PersonalActivity.find({
          user: teacherId,
          date: { $gte: oldStartDate, $lte: oldEndDate },
        });
      }

      return {
        teacherId,
        academicYear,
        weekNumber,
        startDate: startDate,
        endDate: endDate,
        totalLessons: lessonsWithDayInfo.length,
        lessons: lessonsWithDayInfo,
        teacherPersonalActivities,
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
        };
      }

      // Lấy các lesson-request liên quan đến lesson này
      // Substitute: lesson field
      const substituteRequests = await LessonRequest.find({
        requestType: "substitute",
        lesson: lesson._id,
      })
        .populate("requestingTeacher", "name email fullName")
        .populate("candidateTeachers.teacher", "name email fullName")
        .lean();
      // Swap: originalLesson hoặc replacementLesson
      const swapRequests = await LessonRequest.find({
        requestType: "swap",
        $or: [
          { originalLesson: lesson._id },
          { replacementLesson: lesson._id },
        ],
      })
        .populate("requestingTeacher", "name email fullName")
        .populate("replacementTeacher", "name email fullName")
        .populate("originalLesson", "lessonId scheduledDate topic status type")
        .populate(
          "replacementLesson",
          "lessonId scheduledDate topic status type"
        )
        .lean();
      // Makeup: originalLesson hoặc replacementLesson
      const makeupRequests = await LessonRequest.find({
        requestType: "makeup",
        $or: [
          { originalLesson: lesson._id },
          { replacementLesson: lesson._id },
        ],
      })
        .populate("requestingTeacher", "name email fullName")
        .populate("originalLesson", "lessonId scheduledDate topic status type")
        .populate(
          "replacementLesson",
          "lessonId scheduledDate topic status type"
        )
        .lean();
      lessonObj.substituteRequests = substituteRequests;
      lessonObj.swapRequests = swapRequests;
      lessonObj.makeupRequests = makeupRequests;

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

  async importScheduleFromExcel(data, currentUser, options = {}) {
    const errors = [];
    const createdTeachers = [];
    const createdLessons = [];
    const weeklyScheduleMap = new Map();
    const bcrypt = require("bcryptjs");
    const allClasses = await Class.find();
    const allSubjects = await Subject.find();
    let allTeachers = await User.find({
      role: { $in: ["teacher", "homeroom_teacher"] },
    });
    const AcademicYear = require("../models/academic-year.model");
    const allAcademicYears = await AcademicYear.find();
    const { startDate, endDate, academicYear, weekNumber, semester } = options;
    let academicYearObj = null;
    if (academicYear) {
      academicYearObj = allAcademicYears.find(
        (a) => a._id.toString() === academicYear || a.name === academicYear
      );
      if (!academicYearObj) {
        throw new Error(
          `Năm học '${academicYear}' không tồn tại trong hệ thống!`
        );
      }
    }
    if (!startDate || !endDate || !academicYearObj) {
      throw new Error("Thiếu startDate, endDate hoặc academicYear!");
    }

    // Xác định giáo viên chủ nhiệm cho từng lớp và cập nhật trước khi tạo lesson
    const homeroomTeachersByClass = {};
    for (const row of data) {
      const {
        Lớp: className,
        "Môn học": subjectName,
        "Giáo viên": teacherName,
      } = row;
      if (["Chào cờ", "Sinh hoạt lớp"].includes(subjectName) && teacherName) {
        homeroomTeachersByClass[className] = teacherName;
      }
    }

    // Cập nhật giáo viên chủ nhiệm cho các lớp TRƯỚC KHI tạo lesson
    console.log("🔄 Cập nhật giáo viên chủ nhiệm cho các lớp...");
    const updatedClasses = [];
    const teacherMapping = new Map(); // Map để lưu teacher cũ -> teacher mới

    for (const [className, homeroomTeacherName] of Object.entries(homeroomTeachersByClass)) {
      const classObj = allClasses.find((c) => c.className === className);
      if (classObj) {
        // Tìm hoặc tạo giáo viên chủ nhiệm
        let homeroomTeacher = allTeachers.find((t) => t.name === homeroomTeacherName);
        
        if (!homeroomTeacher) {
          // Tạo mới giáo viên chủ nhiệm nếu chưa tồn tại
          const gender = Math.random() < 0.5 ? "male" : "female";
          const newTeacher = new User({
            name: homeroomTeacherName,
            email: `gv${Date.now()}${Math.floor(Math.random() * 1000)}@yopmail.com`,
            passwordHash: await bcrypt.hash("Teacher@123", 10),
            role: ["teacher", "homeroom_teacher"],
            isNewUser: true,
            active: true,
            gender: gender,
          });
          await newTeacher.save();
          allTeachers.push(newTeacher);
          homeroomTeacher = newTeacher;
          createdTeachers.push(newTeacher);
        } else {
          // Cập nhật role nếu chưa có homeroom_teacher
          if (!homeroomTeacher.role.includes("homeroom_teacher")) {
            homeroomTeacher.role = Array.from(
              new Set([...homeroomTeacher.role, "homeroom_teacher"])
            );
            await homeroomTeacher.save();
          }
        }

        // Lưu mapping teacher cũ -> teacher mới nếu có thay đổi
        if (classObj.homeroomTeacher && classObj.homeroomTeacher.toString() !== homeroomTeacher._id.toString()) {
          teacherMapping.set(classObj.homeroomTeacher.toString(), homeroomTeacher._id.toString());
        }

        // Cập nhật homeroomTeacher cho lớp
        if (classObj.homeroomTeacher?.toString() !== homeroomTeacher._id.toString()) {
          const oldTeacherId = classObj.homeroomTeacher;
          classObj.homeroomTeacher = homeroomTeacher._id;
          await classObj.save();
          updatedClasses.push({
            className: classObj.className,
            oldHomeroomTeacher: oldTeacherId,
            newHomeroomTeacher: homeroomTeacher.name
          });
          console.log(`✅ Cập nhật GVCN cho lớp ${className}: ${homeroomTeacher.name}`);
        }
      }
    }

    async function findOrCreateAndUpdateTeacher(
      teacherName,
      subjectObj,
      className
    ) {
      if (!teacherName) return null;
      let teacher = allTeachers.find((t) => t.name === teacherName);
      const isHomeroom = homeroomTeachersByClass[className] === teacherName;
      
      if (!teacher) {
        // Tạo mới
        const gender = Math.random() < 0.5 ? "male" : "female";
        const roles = isHomeroom
          ? ["teacher", "homeroom_teacher"]
          : ["teacher"];
        const isSpecial =
          subjectObj &&
          ["Chào cờ", "Sinh hoạt lớp"].includes(subjectObj.subjectName);
        const newTeacher = new User({
          name: teacherName,
          email: `gv${Date.now()}${Math.floor(
            Math.random() * 1000
          )}@yopmail.com`,
          passwordHash: await bcrypt.hash("Teacher@123", 10),
          role: roles,
          isNewUser: true,
          active: true,
          gender: gender,
          subject: subjectObj && !isSpecial ? subjectObj._id : undefined,
        });
        await newTeacher.save();
        allTeachers.push(newTeacher);
        createdTeachers.push(newTeacher);
        return newTeacher;
      }
      
      // Update role nếu là chủ nhiệm
      if (isHomeroom && !teacher.role.includes("homeroom_teacher")) {
        teacher.role = Array.from(
          new Set([...teacher.role, "homeroom_teacher"])
        );
      }
      
      // Chỉ gán subject nếu là môn chuyên môn
      if (
        subjectObj &&
        !["Chào cờ", "Sinh hoạt lớp"].includes(subjectObj.subjectName)
      ) {
        teacher.subject = subjectObj._id;
      }
      
      teacher.passwordHash = await bcrypt.hash("Teacher@123", 10);
      if (teacher.email && teacher.email.endsWith("@school.local")) {
        teacher.email = teacher.email.replace(
          /@school\.local$/,
          "@yopmail.com"
        );
      }
      await teacher.save();
      return teacher;
    }

    const allTimeSlots = await TimeSlot.find();
    const dayMap = {
      "Thứ 2": 0,
      "Thứ 3": 1,
      "Thứ 4": 2,
      "Thứ 5": 3,
      "Thứ 6": 4,
      "Thứ 7": 5,
      "Chủ nhật": 6,
    };

    for (const [i, row] of data.entries()) {
      const {
        Lớp: className,
        "Môn học": subjectName,
        "Giáo viên": teacherName,
        Ngày: day,
        Tiết: period,
        Tuần: week,
        Buổi: session,
        "Bài học": topic, // Thêm dòng này
      } = row;
      const classObj = allClasses.find((c) => c.className === className);
      if (!classObj) {
        errors.push({ row: i + 2, error: `Lớp ${className} không tồn tại` });
        continue;
      }
      const subjectObj = allSubjects.find((s) => s.subjectName === subjectName);
      const isSpecial = ["Chào cờ", "Sinh hoạt lớp"].includes(subjectName);
      if (!subjectObj && !isSpecial) {
        errors.push({
          row: i + 2,
          error: `Môn học ${subjectName} không tồn tại`,
        });
        continue;
      }
      let teacherObj = null;
      if (teacherName) {
        teacherObj = await findOrCreateAndUpdateTeacher(
          teacherName,
          subjectObj,
          className
        );
      }
      if (!teacherObj) {
        errors.push({
          row: i + 2,
          error: `Không thể tạo hoặc cập nhật giáo viên '${teacherName}'`,
        });
        continue;
      }

      // Kiểm tra xem có cần thay thế teacher ID không (nếu là giáo viên chủ nhiệm)
      const isHomeroomLesson = ["Chào cờ", "Sinh hoạt lớp"].includes(subjectName);
      if (isHomeroomLesson && teacherMapping.has(teacherObj._id.toString())) {
        // Nếu là lesson của giáo viên chủ nhiệm và có mapping, sử dụng teacher mới
        const newTeacherId = teacherMapping.get(teacherObj._id.toString());
        teacherObj = allTeachers.find(t => t._id.toString() === newTeacherId);
        if (!teacherObj) {
          errors.push({
            row: i + 2,
            error: `Không tìm thấy giáo viên mới cho '${teacherName}'`,
          });
          continue;
        }
      }
      // Mapping scheduledDate
      const dayIndex = dayMap[day];
      if (typeof dayIndex === "undefined") {
        errors.push({
          row: i + 2,
          error: `Giá trị ngày '${day}' không hợp lệ`,
        });
        continue;
      }
      const scheduledDate = new Date(startDate);
      scheduledDate.setDate(scheduledDate.getDate() + dayIndex);
      // Mapping timeSlot
      const timeSlotObj = allTimeSlots.find(
        (ts) => ts.period === Number(period)
      );
      if (!timeSlotObj) {
        errors.push({
          row: i + 2,
          error: `Không tìm thấy timeSlot cho tiết ${period}`,
        });
        continue;
      }
      const weekKey = `${classObj._id}_${week}`;
      let weeklySchedule = weeklyScheduleMap.get(weekKey);
      if (!weeklySchedule) {
        // Tìm weekly schedule hiện có với điều kiện chính xác hơn
        weeklySchedule = await WeeklySchedule.findOne({
          class: classObj._id,
          academicYear: academicYearObj._id,
          weekNumber: weekNumber || week,
        });
        
        if (!weeklySchedule) {
          // Tạo mới weekly schedule với startDate và endDate từ options
          weeklySchedule = new WeeklySchedule({
            class: classObj._id,
            academicYear: academicYearObj._id,
            weekNumber: weekNumber || week,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            lessons: [],
            createdBy: currentUser._id,
            semester: semester, // lưu học kỳ
          });
          await weeklySchedule.save();
        } else {
          // Cập nhật startDate và endDate của weekly schedule hiện có
          weeklySchedule.startDate = new Date(startDate);
          weeklySchedule.endDate = new Date(endDate);
          await weeklySchedule.save();
        }
        weeklyScheduleMap.set(weekKey, weeklySchedule);
      }
      const lesson = new Lesson({
        lessonId: new mongoose.Types.ObjectId().toString(),
        class: classObj._id,
        subject: subjectObj ? subjectObj._id : undefined,
        teacher: teacherObj ? teacherObj._id : undefined,
        academicYear: academicYearObj._id,
        timeSlot: timeSlotObj._id,
        scheduledDate: scheduledDate,
        type: isSpecial ? "fixed" : "regular",
        status: "scheduled",
        topic: topic || subjectName, // Ưu tiên topic, fallback sang tên môn học
        createdBy: currentUser._id,
      });
      await lesson.save();
      createdLessons.push(lesson);
      weeklySchedule.lessons.push(lesson._id);
      await weeklySchedule.save();
    }

    // Sau khi import xong các lesson từ file Excel, lấp đầy lesson empty cho các slot còn thiếu
    // Gom lesson theo tuần/lớp
    for (const [weekKey, weeklySchedule] of weeklyScheduleMap.entries()) {
      // Sử dụng startDate và endDate từ options thay vì từ weeklySchedule
      const {
        class: classId,
        academicYear,
        createdBy,
      } = weeklySchedule;
      // Lấy timeSlots
      const allTimeSlots = await TimeSlot.find();
      
      // Tính toán số ngày giữa startDate và endDate
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const daysDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;
      
      for (let dayIndex = 0; dayIndex < daysDiff; dayIndex++) {
        // Tính ngày dựa trên startDate từ options
        const scheduledDate = new Date(startDateObj);
        scheduledDate.setDate(startDateObj.getDate() + dayIndex);
        
        for (let period = 0; period < 10; period++) {
          // Kiểm tra đã có lesson ở slot này chưa
          const hasLesson = await Lesson.findOne({
            class: classId,
            academicYear: academicYear,
            scheduledDate: scheduledDate,
            timeSlot: allTimeSlots[period]?._id,
          });
          if (!hasLesson) {
            const lessonId = `${classId.toString().slice(-6)}_${scheduledDate
              .toISOString()
              .slice(0, 10)
              .replace(/-/g, "")}_T${period + 1}`;
            const emptyLesson = new Lesson({
              lessonId: lessonId,
              class: classId,
              academicYear: academicYear,
              timeSlot: allTimeSlots[period]?._id,
              scheduledDate: scheduledDate,
              type: "empty",
              status: "scheduled",
              createdBy: createdBy || (currentUser && currentUser._id),
            });
            await emptyLesson.save();
            weeklySchedule.lessons.push(emptyLesson._id);
          }
        }
      }
      await weeklySchedule.save();
    }

    // Cập nhật lại các lesson đã tạo để đảm bảo sử dụng đúng teacher ID
    console.log("🔄 Cập nhật teacher ID cho các lesson đã tạo...");
    for (const lesson of createdLessons) {
      if (lesson.teacher && teacherMapping.has(lesson.teacher.toString())) {
        const newTeacherId = teacherMapping.get(lesson.teacher.toString());
        lesson.teacher = newTeacherId;
        await lesson.save();
        console.log(`✅ Cập nhật teacher ID cho lesson ${lesson.lessonId}: ${lesson.teacher} -> ${newTeacherId}`);
      }
    }

    return {
      errors,
      createdTeachers: createdTeachers.map((t) => ({
        name: t.name,
        email: t.email,
        gender: t.gender,
      })),
      totalLessons: createdLessons.length,
      totalTeachersCreated: createdTeachers.length,
      updatedClasses: updatedClasses,
      totalClassesUpdated: updatedClasses.length,
      teacherMappings: Array.from(teacherMapping.entries()).map(([oldId, newId]) => ({
        oldTeacherId: oldId,
        newTeacherId: newId,
      })),
      totalTeacherMappings: teacherMapping.size,
    };
  }
}

module.exports = new ScheduleService();
