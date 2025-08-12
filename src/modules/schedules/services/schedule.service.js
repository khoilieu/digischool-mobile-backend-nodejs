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
const School = require("../../classes/models/school.model");
const userService = require("../../user/services/user.service");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const LessonRequest = require("../models/lesson-request.model");
const StudentLeaveRequest = require("../../leave-requests/models/student-leave-request.model");
const TeacherLeaveRequest = require("../../leave-requests/models/teacher-leave-request.model");

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
    token,
    currentUser = null
  ) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = currentUser || await User.findById(decoded.id);
      if (!user) {
        throw new Error("User not found");
      }

      // Tối ưu: Batch queries cho class và academic year
      const [classInfo, academicYearDoc] = await Promise.all([
        Class.findOne({ className, academicYear }),
        AcademicYear.findOne({ name: academicYear })
      ]);

      if (!classInfo) {
        throw new Error(`Class ${className} not found for academic year ${academicYear}`);
      }
      if (!academicYearDoc) {
        throw new Error(`Academic year ${academicYear} not found`);
      }

      // Tối ưu: Sử dụng aggregation pipeline thay vì populate
      const weeklySchedule = await WeeklySchedule.aggregate([
        { $match: { class: classInfo._id, academicYear: academicYearDoc._id, weekNumber: weekNumber } },
        { $lookup: { from: "lessons", localField: "lessons", foreignField: "_id", as: "lessonDetails" } },
        { $lookup: { from: "subjects", localField: "lessonDetails.subject", foreignField: "_id", as: "subjectDetails" } },
        { $lookup: { from: "users", localField: "lessonDetails.teacher", foreignField: "_id", as: "teacherDetails" } },
        { $lookup: { from: "users", localField: "lessonDetails.substituteTeacher", foreignField: "_id", as: "substituteTeacherDetails" } },
        { $lookup: { from: "timeslots", localField: "lessonDetails.timeSlot", foreignField: "_id", as: "timeSlotDetails" } },
        { $lookup: { from: "academicyears", localField: "lessonDetails.academicYear", foreignField: "_id", as: "academicYearDetails" } }
      ]);

      if (!weeklySchedule || weeklySchedule.length === 0) {
        throw new Error(`Weekly schedule not found for class ${className}, week ${weekNumber}`);
      }

      const scheduleData = weeklySchedule[0];

      // Tối ưu: Tạo maps cho các details để lookup nhanh
      const subjectMap = new Map();
      scheduleData.subjectDetails.forEach(subject => {
        subjectMap.set(subject._id.toString(), {
          _id: subject._id,
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode
        });
      });

      const teacherMap = new Map();
      scheduleData.teacherDetails.forEach(teacher => {
        teacherMap.set(teacher._id.toString(), {
          _id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          fullName: teacher.fullName
        });
      });

      const substituteTeacherMap = new Map();
      scheduleData.substituteTeacherDetails.forEach(teacher => {
        substituteTeacherMap.set(teacher._id.toString(), {
          _id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          fullName: teacher.fullName
        });
      });

      const timeSlotMap = new Map();
      scheduleData.timeSlotDetails.forEach(timeSlot => {
        timeSlotMap.set(timeSlot._id.toString(), {
          _id: timeSlot._id,
          period: timeSlot.period,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          type: timeSlot.type
        });
      });

      const academicYearMap = new Map();
      scheduleData.academicYearDetails.forEach(academicYear => {
        academicYearMap.set(academicYear._id.toString(), {
          _id: academicYear._id,
          name: academicYear.name
        });
      });

      // Tối ưu: Batch queries cho testInfo và student leave requests
      const lessonIds = scheduleData.lessonDetails.map(lesson => lesson._id);
      
      const [testInfos, studentLeaveRequests, usersInClass] = await Promise.all([
        TestInfo.find({ lesson: { $in: lessonIds } }),
        StudentLeaveRequest.find({ 
          lessonId: { $in: lessonIds },
          status: { $in: ["pending", "approved"] }
        }),
        User.find({ class_id: classInfo._id }).select("_id")
      ]);

      // Tạo maps cho lookup nhanh
      const testInfoMap = new Map();
      testInfos.forEach(testInfo => {
        testInfoMap.set(testInfo.lesson.toString(), true);
      });

      // Tối ưu: Filter student leave requests theo current user nếu là student
      const studentLeaveRequestMap = new Map();
      if (user.role.includes("student")) {
        // Nếu là student, chỉ lấy requests của chính mình
        const userStudentLeaveRequests = studentLeaveRequests.filter(
          request => request.studentId.toString() === user._id.toString()
        );
        userStudentLeaveRequests.forEach(request => {
          studentLeaveRequestMap.set(request.lessonId.toString(), true);
        });
      } else {
        // Nếu là teacher/admin, lấy tất cả requests
        studentLeaveRequests.forEach(request => {
          studentLeaveRequestMap.set(request.lessonId.toString(), true);
        });
      }

      // Tối ưu: Query personal activities với batch
      const userIds = usersInClass.map((u) => u._id);
      const studentPersonalActivities = await PersonalActivity.find({
        user: { $in: userIds },
        date: { $gte: scheduleData.startDate, $lte: scheduleData.endDate },
      });

      // Tối ưu: Process lessons với data đã được map
      const lessonsWithDayInfo = scheduleData.lessonDetails.map((lesson) => {
        // Tạo lesson object từ aggregation result
        const lessonObj = {
          _id: lesson._id,
          lessonId: lesson.lessonId,
          class: lesson.class,
          subject: lesson.subject,
          teacher: lesson.teacher,
          substituteTeacher: lesson.substituteTeacher,
          academicYear: lesson.academicYear,
          timeSlot: lesson.timeSlot,
          scheduledDate: lesson.scheduledDate,
          type: lesson.type,
          status: lesson.status,
          topic: lesson.topic,
          description: lesson.description,
          createdBy: lesson.createdBy,
          createdAt: lesson.createdAt,
          updatedAt: lesson.updatedAt,
          __v: lesson.__v
        };

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

        // Populate từ maps thay vì database queries
        if (lesson.subject) {
          lessonObj.subject = subjectMap.get(lesson.subject.toString());
        }
        if (lesson.teacher) {
          lessonObj.teacher = teacherMap.get(lesson.teacher.toString());
        }
        if (lesson.substituteTeacher) {
          lessonObj.substituteTeacher = substituteTeacherMap.get(lesson.substituteTeacher.toString());
        }
        if (lesson.timeSlot) {
          lessonObj.timeSlot = timeSlotMap.get(lesson.timeSlot.toString());
        }
        if (lesson.academicYear) {
          lessonObj.academicYear = academicYearMap.get(lesson.academicYear.toString());
        }

        // Thêm trạng thái testInfo và student leave request
        lessonObj.hasTestInfo = testInfoMap.has(lesson._id.toString());
        lessonObj.hasStudentLeaveRequest = studentLeaveRequestMap.has(lesson._id.toString());

        return lessonObj;
      });

      return {
        academicYear: academicYearDoc.name,
        class: {
          className: classInfo.className,
          gradeLevel: classInfo.gradeLevel,
        },
        weeklySchedule: {
          weekNumber: scheduleData.weekNumber,
          startDate: scheduleData.startDate,
          endDate: scheduleData.endDate,
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

      // Đảm bảo teacherId là ObjectId
      const teacherObjectId = typeof teacherId === 'string' ? new mongoose.Types.ObjectId(teacherId) : teacherId;

      // Tối ưu: Sử dụng aggregation pipeline thay vì populate
      const lessons = await Lesson.aggregate([
        {
          $match: {
            teacher: teacherObjectId,
            academicYear: academicYearDoc._id,
            scheduledDate: {
              $gte: startDate,
              $lte: endDate,
            },
          }
        },
        {
          $lookup: {
            from: "classes",
            localField: "class",
            foreignField: "_id",
            as: "classDetails"
          }
        },
        {
          $lookup: {
            from: "subjects",
            localField: "subject",
            foreignField: "_id",
            as: "subjectDetails"
          }
        },
        {
          $lookup: {
            from: "timeslots",
            localField: "timeSlot",
            foreignField: "_id",
            as: "timeSlotDetails"
          }
        },
        {
          $sort: {
            scheduledDate: 1,
            "timeSlotDetails.period": 1
          }
        }
      ]);

      console.log(`🔍 Found ${lessons.length} lessons for teacher ${teacherObjectId}`);

      if (!lessons || lessons.length === 0) {
        return {
          teacherId,
          academicYear,
          weekNumber,
          startDate: startDate,
          endDate: endDate,
          totalLessons: 0,
          lessons: [],
          teacherPersonalActivities: [],
        };
      }

      // Tối ưu: Tạo maps cho các details để lookup nhanh
      const classMap = new Map();
      const subjectMap = new Map();
      const timeSlotMap = new Map();

      lessons.forEach(lesson => {
        // Process class details
        if (lesson.classDetails && lesson.classDetails.length > 0) {
          const classDetail = lesson.classDetails[0];
          classMap.set(lesson.class.toString(), {
            _id: classDetail._id,
            className: classDetail.className,
            gradeLevel: classDetail.gradeLevel
          });
        }

        // Process subject details
        if (lesson.subjectDetails && lesson.subjectDetails.length > 0) {
          const subjectDetail = lesson.subjectDetails[0];
          subjectMap.set(lesson.subject.toString(), {
            _id: subjectDetail._id,
            subjectName: subjectDetail.subjectName,
            subjectCode: subjectDetail.subjectCode
          });
        }

        // Process timeSlot details
        if (lesson.timeSlotDetails && lesson.timeSlotDetails.length > 0) {
          const timeSlotDetail = lesson.timeSlotDetails[0];
          timeSlotMap.set(lesson.timeSlot.toString(), {
            _id: timeSlotDetail._id,
            period: timeSlotDetail.period,
            startTime: timeSlotDetail.startTime,
            endTime: timeSlotDetail.endTime,
            type: timeSlotDetail.type
          });
        }
      });

      // Tối ưu: Batch queries cho tất cả các trạng thái
      const lessonIds = lessons.map(lesson => lesson._id);
      
      const [testInfos, teacherLeaveRequests, substituteRequests, swapRequests, makeupRequests, teacherPersonalActivities] = await Promise.all([
        TestInfo.find({ lesson: { $in: lessonIds } }),
        TeacherLeaveRequest.find({ 
          lessonId: { $in: lessonIds },
          status: { $in: ["pending", "approved"] }
        }),
        LessonRequest.find({
          requestType: "substitute",
          lesson: { $in: lessonIds },
          status: "pending"
        }),
        LessonRequest.find({
          requestType: "swap",
          $or: [
            { originalLesson: { $in: lessonIds } },
            { replacementLesson: { $in: lessonIds } },
          ],
          status: "pending"
        }),
        LessonRequest.find({
          requestType: "makeup",
          $or: [
            { originalLesson: { $in: lessonIds } },
            { replacementLesson: { $in: lessonIds } },
          ],
          status: "pending"
        }),
        PersonalActivity.find({
          user: teacherObjectId,
          date: { $gte: startDate, $lte: endDate },
        })
      ]);

      // Tạo maps cho lookup nhanh
      const testInfoMap = new Map();
      testInfos.forEach(testInfo => {
        testInfoMap.set(testInfo.lesson.toString(), true);
      });

      const teacherLeaveRequestMap = new Map();
      teacherLeaveRequests.forEach(request => {
        teacherLeaveRequestMap.set(request.lessonId.toString(), true);
      });

      const substituteRequestMap = new Map();
      substituteRequests.forEach(request => {
        substituteRequestMap.set(request.lesson.toString(), true);
      });

      const swapRequestMap = new Map();
      swapRequests.forEach(request => {
        if (request.originalLesson) {
          swapRequestMap.set(request.originalLesson.toString(), true);
        }
        if (request.replacementLesson) {
          swapRequestMap.set(request.replacementLesson.toString(), true);
        }
      });

      const makeupRequestMap = new Map();
      makeupRequests.forEach(request => {
        if (request.originalLesson) {
          makeupRequestMap.set(request.originalLesson.toString(), true);
        }
        if (request.replacementLesson) {
          makeupRequestMap.set(request.replacementLesson.toString(), true);
        }
      });

      // Tối ưu: Process lessons với data đã được map
      const lessonsWithDayInfo = lessons.map((lesson) => {
        // Tạo lesson object từ aggregation result
        const lessonObj = {
          _id: lesson._id,
          lessonId: lesson.lessonId,
          class: lesson.class,
          subject: lesson.subject,
          teacher: lesson.teacher,
          substituteTeacher: lesson.substituteTeacher,
          academicYear: lesson.academicYear,
          timeSlot: lesson.timeSlot,
          scheduledDate: lesson.scheduledDate,
          type: lesson.type,
          status: lesson.status,
          topic: lesson.topic,
          description: lesson.description,
          createdBy: lesson.createdBy,
          createdAt: lesson.createdAt,
          updatedAt: lesson.updatedAt,
          __v: lesson.__v
        };

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

        // Populate từ maps thay vì database queries
        if (lesson.class) {
          lessonObj.class = classMap.get(lesson.class.toString());
        }
        if (lesson.subject) {
          lessonObj.subject = subjectMap.get(lesson.subject.toString());
        }
        if (lesson.timeSlot) {
          lessonObj.timeSlot = timeSlotMap.get(lesson.timeSlot.toString());
        }

        // Thêm các trạng thái boolean
        lessonObj.hasTestInfo = testInfoMap.has(lesson._id.toString());
        lessonObj.hasTeacherLeaveRequest = teacherLeaveRequestMap.has(lesson._id.toString());
        lessonObj.hasSubstituteRequest = substituteRequestMap.has(lesson._id.toString());
        lessonObj.hasSwapRequest = swapRequestMap.has(lesson._id.toString());
        lessonObj.hasMakeupRequest = makeupRequestMap.has(lesson._id.toString());

        return lessonObj;
      });

      // Fallback cho personal activities nếu không tìm thấy
      let finalTeacherPersonalActivities = teacherPersonalActivities;
      if (teacherPersonalActivities.length === 0) {
        const oldStartDate = this.calculateWeekStartDate(academicYearDoc.startDate, weekNumber);
        const oldEndDate = this.calculateWeekEndDate(oldStartDate, "MONDAY_TO_SATURDAY");
        
        finalTeacherPersonalActivities = await PersonalActivity.find({
          user: teacherObjectId,
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
        teacherPersonalActivities: finalTeacherPersonalActivities,
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
          rating: teacherLessonEvaluation.rating,
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
        status: { $in: ["pending", "approved"] }
      })
        .populate("requestingTeacher", "name email fullName")
        .populate("candidateTeachers.teacher", "name email fullName")
        .sort({ createdAt: -1 })
        .lean();
      // Swap: originalLesson hoặc replacementLesson
      const swapRequests = await LessonRequest.find({
        requestType: "swap",
        $or: [
          { originalLesson: lesson._id },
          { replacementLesson: lesson._id },
        ],
        status: { $in: ["pending", "approved"] }
      })
        .populate("requestingTeacher", "name email fullName")
        .populate("replacementTeacher", "name email fullName")
        .populate("originalLesson", "lessonId scheduledDate topic status type")
        .populate(
          "replacementLesson",
          "lessonId scheduledDate topic status type"
        )
        .sort({ createdAt: -1 })
        .lean();
      // Makeup: originalLesson hoặc replacementLesson
      const makeupRequests = await LessonRequest.find({
        requestType: "makeup",
        $or: [
          { originalLesson: lesson._id },
          { replacementLesson: lesson._id },
        ],
        status: { $in: ["pending", "approved"] }
      })
        .populate("requestingTeacher", "name email fullName")
        .populate("originalLesson", "lessonId scheduledDate topic status type")
        .populate(
          "replacementLesson",
          "lessonId scheduledDate topic status type"
        )
        .sort({ createdAt: -1 })
        .lean();

      // Student Leave Requests: lessonId field
      const studentLeaveRequests = await StudentLeaveRequest.find({
        lessonId: lesson._id,
      })
        .populate("studentId", "name email fullName")
        .populate("teacherId", "name email fullName")
        .populate("classId", "className")
        .populate("subjectId", "subjectName subjectCode")
        .lean();

      // Teacher Leave Requests: lessonId field
      const teacherLeaveRequests = await TeacherLeaveRequest.find({
        lessonId: lesson._id,
      })
        .populate("teacherId", "name email fullName")
        .populate("classId", "className")
        .populate("subjectId", "subjectName subjectCode")
        .populate("managerId", "name email fullName")
        .lean();

      lessonObj.substituteRequests = substituteRequests;
      lessonObj.swapRequests = swapRequests;
      lessonObj.makeupRequests = makeupRequests;
      lessonObj.studentLeaveRequests = studentLeaveRequests;
      lessonObj.teacherLeaveRequests = teacherLeaveRequests;

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
          try {
            // Lấy trường học
            let school = await School.findOne({ active: true });
            if (!school) {
              school = await School.create({
                name: 'THPT Phan Văn Trị',
                address: '123 Đường Nguyễn Văn Linh, Quận 7, TP.HCM',
                phone: '028 3776 1234',
                email: 'info@thptphanvantri.edu.vn',
                website: 'https://thptphanvantri.edu.vn',
                principal: 'Nguyễn Văn A',
                active: true
              });
            }
            
            // Tạo giáo viên chủ nhiệm sử dụng UserService
            homeroomTeacher = await userService.createTeacherFromSchedule(homeroomTeacherName, 'Chào cờ', school._id);
            
            // Cập nhật role để bao gồm homeroom_teacher
            if (!homeroomTeacher.role.includes("homeroom_teacher")) {
              homeroomTeacher.role = Array.from(
                new Set([...homeroomTeacher.role, "homeroom_teacher"])
              );
              await homeroomTeacher.save();
            }
            
            allTeachers.push(homeroomTeacher);
            createdTeachers.push(homeroomTeacher);
          } catch (error) {
            console.error(`❌ Lỗi tạo giáo viên chủ nhiệm ${homeroomTeacherName}:`, error.message);
            
            // Fallback: tạo giáo viên chủ nhiệm cơ bản
            const gender = Math.random() < 0.5 ? "male" : "female";
            
            // Tạo email theo format mới
            const normalizedName = homeroomTeacherName
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9\s]/g, '')
              .replace(/\s+/g, '.');
            const email = `${normalizedName}.teacher@yopmail.com`;
            
            // Tạo mã giáo viên
            const teacherCount = await User.countDocuments({ role: { $in: ['teacher', 'homeroom_teacher'] } });
            const teacherId = `TCH${String(teacherCount + 1).padStart(3, '0')}`;
            
            // Tạo ngày sinh random (25-60 tuổi)
            const generateRandomDate = (minAge, maxAge) => {
              const now = new Date();
              const minYear = now.getFullYear() - maxAge;
              const maxYear = now.getFullYear() - minAge;
              const year = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
              const month = Math.floor(Math.random() * 12);
              const day = Math.floor(Math.random() * 28) + 1;
              return new Date(year, month, day);
            };
            
            // Tạo số điện thoại random
            const generateRandomPhone = () => {
              const prefixes = ['032', '033', '034', '035', '036', '037', '038', '039'];
              const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
              const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
              return `${prefix}${number}`;
            };
            
            // Tạo địa chỉ random
            const generateRandomAddress = () => {
              const districts = ['Quận 1', 'Quận 2', 'Quận 3', 'Quận 7', 'Quận 8', 'Quận 9'];
              const district = districts[Math.floor(Math.random() * districts.length)];
              const street = Math.floor(Math.random() * 100) + 1;
              return `${street} Đường Nguyễn Văn Linh, ${district}, TP.HCM`;
            };
            
            const newTeacher = new User({
              name: homeroomTeacherName,
              email: email,
              passwordHash: await bcrypt.hash("Teacher@123", 10),
              teacherId: teacherId,
              role: ["teacher", "homeroom_teacher"],
              dateOfBirth: generateRandomDate(25, 60),
              gender: gender,
              phone: generateRandomPhone(),
              address: generateRandomAddress(),
              school: school._id,
              isNewUser: true,
              active: true,
            });
            await newTeacher.save();
            allTeachers.push(newTeacher);
            homeroomTeacher = newTeacher;
            createdTeachers.push(newTeacher);
          }
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
        // Tạo mới giáo viên sử dụng UserService
        try {
          // Lấy trường học đầu tiên (hoặc tạo mới nếu chưa có)
          let school = await School.findOne({ active: true });
          if (!school) {
            school = await School.create({
              name: 'THPT Phan Văn Trị',
              address: '123 Đường Nguyễn Văn Linh, Quận 7, TP.HCM',
              phone: '028 3776 1234',
              email: 'info@thptphanvantri.edu.vn',
              website: 'https://thptphanvantri.edu.vn',
              principal: 'Nguyễn Văn A',
              active: true
            });
          }

          // Tạo giáo viên sử dụng UserService
          const subjectName = subjectObj ? subjectObj.subjectName : 'Chào cờ';
          teacher = await userService.createTeacherFromSchedule(teacherName, subjectName, school._id);
          
          // Cập nhật role nếu là chủ nhiệm
          if (isHomeroom && !teacher.role.includes("homeroom_teacher")) {
            teacher.role = Array.from(
              new Set([...teacher.role, "homeroom_teacher"])
            );
            await teacher.save();
          }
          
          allTeachers.push(teacher);
          createdTeachers.push(teacher);
          return teacher;
        } catch (error) {
          console.error(`❌ Lỗi tạo giáo viên ${teacherName}:`, error.message);
          // Fallback: tạo giáo viên cơ bản nếu có lỗi
          const gender = Math.random() < 0.5 ? "male" : "female";
          const roles = isHomeroom ? ["teacher", "homeroom_teacher"] : ["teacher"];
          const isSpecial = subjectObj && ["Chào cờ", "Sinh hoạt lớp"].includes(subjectObj.subjectName);
          
          // Tạo email theo format mới
          const normalizedName = teacherName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '.');
          const email = `${normalizedName}.teacher@yopmail.com`;
          
          // Tạo mã giáo viên
          const teacherCount = await User.countDocuments({ role: { $in: ['teacher', 'homeroom_teacher'] } });
          const teacherId = `TCH${String(teacherCount + 1).padStart(3, '0')}`;
          
          // Tạo ngày sinh random (25-60 tuổi)
          const generateRandomDate = (minAge, maxAge) => {
            const now = new Date();
            const minYear = now.getFullYear() - maxAge;
            const maxYear = now.getFullYear() - minAge;
            const year = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
            const month = Math.floor(Math.random() * 12);
            const day = Math.floor(Math.random() * 28) + 1;
            return new Date(year, month, day);
          };
          
          // Tạo số điện thoại random
          const generateRandomPhone = () => {
            const prefixes = ['032', '033', '034', '035', '036', '037', '038', '039'];
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
            return `${prefix}${number}`;
          };
          
          // Tạo địa chỉ random
          const generateRandomAddress = () => {
            const districts = ['Quận 1', 'Quận 2', 'Quận 3', 'Quận 7', 'Quận 8', 'Quận 9'];
            const district = districts[Math.floor(Math.random() * districts.length)];
            const street = Math.floor(Math.random() * 100) + 1;
            return `${street} Đường Nguyễn Văn Linh, ${district}, TP.HCM`;
          };
          
          const newTeacher = new User({
            name: teacherName,
            email: email,
            passwordHash: await bcrypt.hash("Teacher@123", 10),
            teacherId: teacherId,
            role: roles,
            dateOfBirth: generateRandomDate(25, 60),
            gender: gender,
            phone: generateRandomPhone(),
            address: generateRandomAddress(),
            school: school._id,
            isNewUser: true,
            active: true,
            subject: subjectObj && !isSpecial ? subjectObj._id : undefined,
          });
          await newTeacher.save();
          allTeachers.push(newTeacher);
          createdTeachers.push(newTeacher);
          return newTeacher;
        }
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

  /**
   * Lấy danh sách năm học và tuần có sẵn trong database
   * @returns {Promise<Object>} Object chứa danh sách năm học và tuần
   */
  async getAvailableAcademicYearsAndWeeks() {
    try {
      // Lấy tất cả năm học
      const academicYears = await AcademicYear.find({})
        .select('name startDate endDate totalWeeks isActive')
        .sort({ name: -1 }); // Sắp xếp theo thứ tự mới nhất trước

      // Lấy năm học hiện tại
      const currentAcademicYear = await AcademicYear.getCurrentAcademicYear();

      // Lấy danh sách tuần có sẵn từ WeeklySchedule
      const weeklySchedules = await WeeklySchedule.aggregate([
        {
          $group: {
            _id: {
              academicYear: '$academicYear',
              weekNumber: '$weekNumber'
            },
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'academicyears',
            localField: '_id.academicYear',
            foreignField: '_id',
            as: 'academicYearInfo'
          }
        },
        {
          $unwind: '$academicYearInfo'
        },
        {
          $group: {
            _id: '$academicYearInfo.name',
            academicYearId: { $first: '$_id.academicYear' },
            weeks: {
              $push: {
                weekNumber: '$_id.weekNumber',
                count: '$count'
              }
            },
            totalWeeks: { $first: '$academicYearInfo.totalWeeks' },
            isActive: { $first: '$academicYearInfo.isActive' },
            startDate: { $first: '$academicYearInfo.startDate' },
            endDate: { $first: '$academicYearInfo.endDate' }
          }
        },
        {
          $sort: { _id: -1 } // Sắp xếp theo tên năm học giảm dần
        }
      ]);

      // Sắp xếp tuần trong mỗi năm học
      weeklySchedules.forEach(year => {
        year.weeks.sort((a, b) => a.weekNumber - b.weekNumber);
      });

      // Tạo response object
      const result = {
        currentAcademicYear: currentAcademicYear ? {
          name: currentAcademicYear.name,
          startDate: currentAcademicYear.startDate,
          endDate: currentAcademicYear.endDate,
          totalWeeks: currentAcademicYear.totalWeeks,
          isActive: currentAcademicYear.isActive
        } : null,
        availableAcademicYears: weeklySchedules.map(year => {
          const totalAvailableWeeks = year.weeks.length;
          const totalClasses = year.weeks.reduce((sum, week) => sum + week.count, 0);
          
          return {
            name: year._id,
            academicYearId: year.academicYearId,
            totalWeeks: year.totalWeeks,
            isActive: year.isActive,
            startDate: year.startDate,
            endDate: year.endDate,
            totalAvailableWeeks: totalAvailableWeeks,
            totalClasses: totalClasses,
            availableWeeks: year.weeks.map(week => ({
              weekNumber: week.weekNumber,
              classCount: week.count
            })),
            weekNumbers: year.weeks.map(week => week.weekNumber).sort((a, b) => a - b)
          };
        }),
        allAcademicYears: academicYears.map(year => ({
          name: year.name,
          startDate: year.startDate,
          endDate: year.endDate,
          totalWeeks: year.totalWeeks,
          isActive: year.isActive
        })),
        summary: {
          totalAcademicYears: academicYears.length,
          totalAvailableWeeks: weeklySchedules.reduce((sum, year) => sum + year.weeks.length, 0),
          totalClasses: weeklySchedules.reduce((sum, year) => 
            sum + year.weeks.reduce((weekSum, week) => weekSum + week.count, 0), 0
          )
        }
      };

      return result;
    } catch (error) {
      console.error('❌ Error in getAvailableAcademicYearsAndWeeks:', error.message);
      throw new Error(`Failed to get available academic years and weeks: ${error.message}`);
    }
  }
}

module.exports = new ScheduleService();
