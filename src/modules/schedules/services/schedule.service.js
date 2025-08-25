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

      // Xử lý academicYear có thể là string hoặc ObjectId
      let academicYearDoc;
      if (mongoose.Types.ObjectId.isValid(academicYear)) {
        academicYearDoc = await AcademicYear.findById(academicYear);
      } else {
        academicYearDoc = await AcademicYear.findOne({ name: academicYear });
      }
      
      if (!academicYearDoc) {
        throw new Error(`Academic year ${academicYear} not found`);
      }

      const classes = await Class.find({
        academicYear: academicYearDoc._id,
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

      // academicYearDoc đã được khai báo ở trên

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
      let academicYearDoc;
      let classInfo;
      
      // Xử lý academicYear có thể là string hoặc ObjectId
      if (mongoose.Types.ObjectId.isValid(academicYear)) {
        // Nếu là ObjectId, tìm trực tiếp
        academicYearDoc = await AcademicYear.findById(academicYear);
        if (academicYearDoc) {
          classInfo = await Class.findOne({ className, academicYear: academicYearDoc._id });
        }
      } else {
        // Nếu là string, tìm theo name
        academicYearDoc = await AcademicYear.findOne({ name: academicYear });
        if (academicYearDoc) {
          classInfo = await Class.findOne({ className, academicYear: academicYearDoc._id });
        }
      }

      if (!classInfo) {
        throw new Error(`Class ${className} not found for academic year ${academicYear}`);
      }
      if (!academicYearDoc) {
        throw new Error(`Academic year ${academicYear} not found`);
      }

      // TỐI ƯU: Gộp tất cả queries vào 1 aggregation pipeline
      const weeklySchedule = await WeeklySchedule.aggregate([
        { 
          $match: { 
            class: classInfo._id, 
            academicYear: academicYearDoc._id, 
            weekNumber: weekNumber 
          } 
        },
        // Lookup lessons
        { 
          $lookup: { 
            from: "lessons", 
            localField: "lessons", 
            foreignField: "_id", 
            as: "lessonDetails" 
          } 
        },
        // Lookup subjects
        { 
          $lookup: { 
            from: "subjects", 
            localField: "lessonDetails.subject", 
            foreignField: "_id", 
            as: "subjectDetails" 
          } 
        },
        // Lookup teachers
        { 
          $lookup: { 
            from: "users", 
            localField: "lessonDetails.teacher", 
            foreignField: "_id", 
            as: "teacherDetails" 
          } 
        },
        // Lookup substitute teachers
        { 
          $lookup: { 
            from: "users", 
            localField: "lessonDetails.substituteTeacher", 
            foreignField: "_id", 
            as: "substituteTeacherDetails" 
          } 
        },
        // Lookup time slots
        { 
          $lookup: { 
            from: "timeslots", 
            localField: "lessonDetails.timeSlot", 
            foreignField: "_id", 
            as: "timeSlotDetails" 
          } 
        },
        // Lookup academic years
        { 
          $lookup: { 
            from: "academicyears", 
            localField: "lessonDetails.academicYear", 
            foreignField: "_id", 
            as: "academicYearDetails" 
          } 
        },
        // TỐI ƯU: Thêm lookup cho TestInfo
        { 
          $lookup: { 
            from: "testinfos", 
            localField: "lessonDetails._id", 
            foreignField: "lesson", 
            as: "testInfos" 
          } 
        },
        // TỐI ƯU: Thêm lookup cho StudentLeaveRequest
        // Lookup theo lessonId (cho requestType: "lesson")
        { 
          $lookup: { 
            from: "studentleaverequests", 
            localField: "lessonDetails._id", 
            foreignField: "lessonId", 
            as: "lessonLeaveRequests" 
          } 
        },
        // Lookup theo classId và date (cho requestType: "day")
        {
          $lookup: {
            from: "studentleaverequests",
            let: { classId: "$class", startDate: "$startDate", endDate: "$endDate" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$requestType", "day"] },
                      { $eq: ["$classId", "$$classId"] },
                      { $gte: ["$date", "$$startDate"] },
                      { $lte: ["$date", "$$endDate"] }
                    ]
                  }
                }
              }
            ],
            as: "dayLeaveRequests"
          }
        },
        // Gộp cả 2 loại leave requests
        {
          $addFields: {
            leaveRequests: {
              $concatArrays: ["$lessonLeaveRequests", "$dayLeaveRequests"]
            }
          }
        },
        // TỐI ƯU: Thêm lookup cho TeacherLeaveRequest
        { 
          $lookup: { 
            from: "teacherleaverequests", 
            localField: "lessonDetails._id", 
            foreignField: "lessonId", 
            as: "teacherLeaveRequests" 
          } 
        },
        // TỐI ƯU: Thêm lookup cho LessonRequest (makeup/swap/substitute)
        { 
          $lookup: { 
            from: "lessonrequests", 
            localField: "lessonDetails._id", 
            foreignField: "lesson", 
            as: "lessonRequests" 
          } 
        },
        // TỐI ƯU: Thêm lookup cho PersonalActivity
        { 
          $lookup: { 
            from: "personalactivities", 
            localField: "lessonDetails.scheduledDate", 
            foreignField: "date", 
            as: "personalActivities" 
          } 
        },
        // Lookup user info cho personal activities
        {
          $lookup: {
            from: "users",
            localField: "personalActivities.user",
            foreignField: "_id",
            as: "personalActivityUsers"
          }
        }
      ]);

      if (!weeklySchedule || weeklySchedule.length === 0) {
        throw new Error(`Weekly schedule not found for class ${className}, week ${weekNumber}`);
      }

      const scheduleData = weeklySchedule[0];

      // TỐI ƯU: Tạo maps cho tất cả details từ aggregation result
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

      // TỐI ƯU: Tạo maps từ aggregation result thay vì query riêng
      const testInfoMap = new Map();
      scheduleData.testInfos.forEach(testInfo => {
        testInfoMap.set(testInfo.lesson.toString(), true);
      });

      // TỐI ƯU: Tạo maps cho các loại request khác nhau
      const teacherLeaveRequestMap = new Map();
      const lessonRequestMap = new Map();
      
      // Xử lý TeacherLeaveRequest với trạng thái pending
      scheduleData.teacherLeaveRequests.forEach(request => {
        if (request.status === "pending") {
          teacherLeaveRequestMap.set(request.lessonId.toString(), true);
        }
      });
      
      // Xử lý LessonRequest (makeup/swap/substitute) với trạng thái pending
      scheduleData.lessonRequests.forEach(request => {
        if (request.status === "pending") {
          lessonRequestMap.set(request.lesson.toString(), true);
        }
      });

      // SỬA ĐỔI: Chỉ lấy leave requests với trạng thái pending hoặc approved
      const leaveRequestMap = new Map();
      const leaveRequestStatusMap = new Map(); // Thêm map để lưu trạng thái
      
      if (user.role.includes("student")) {
        // Nếu là student, chỉ lấy requests của chính mình với trạng thái pending/approved
        const userLeaveRequests = scheduleData.leaveRequests.filter(
          request => request.studentId.toString() === user._id.toString() && 
                     ["pending", "approved"].includes(request.status)
        );
        
        console.log(`🔍 Found ${userLeaveRequests.length} leave requests for student ${user._id}`);
        console.log(`🔍 Breakdown: lessonLeaveRequests=${scheduleData.lessonLeaveRequests?.length || 0}, dayLeaveRequests=${scheduleData.dayLeaveRequests?.length || 0}`);
        
        userLeaveRequests.forEach(request => {
          console.log(`📋 Processing leave request: ${request._id}, type: ${request.requestType}, status: ${request.status}`);
          
          if (request.requestType === "lesson") {
            // Nghỉ từng tiết: đánh dấu tiết cụ thể
            leaveRequestMap.set(request.lessonId.toString(), true);
            leaveRequestStatusMap.set(request.lessonId.toString(), request.status);
            console.log(`📝 Lesson leave request: ${request.lessonId} -> ${request.status}`);
          } else if (request.requestType === "day") {
            // Nghỉ cả ngày: đánh dấu tất cả tiết trong ngày đó (cả pending và approved)
            const requestDate = new Date(request.date);
            const requestDateStr = requestDate.toISOString().split('T')[0];
            
            console.log(`📅 Day leave request (${request.status}) for date: ${requestDateStr}`);
            
            // Tìm tất cả tiết học trong ngày đó và đánh dấu
            let matchedLessons = 0;
            scheduleData.lessonDetails.forEach(lesson => {
              const lessonDate = new Date(lesson.scheduledDate);
              const lessonDateStr = lessonDate.toISOString().split('T')[0];
              
              if (lessonDateStr === requestDateStr) {
                leaveRequestMap.set(lesson._id.toString(), true);
                leaveRequestStatusMap.set(lesson._id.toString(), request.status);
                matchedLessons++;
              }
            });
            
          }
        });
      } else {
        // Nếu là teacher/admin, lấy tất cả requests với trạng thái pending/approved
        const validLeaveRequests = scheduleData.leaveRequests.filter(
          request => ["pending", "approved"].includes(request.status)
        );
        
        console.log(`🔍 Found ${validLeaveRequests.length} leave requests for teacher/admin`);
        console.log(`🔍 Breakdown: lessonLeaveRequests=${scheduleData.lessonLeaveRequests?.length || 0}, dayLeaveRequests=${scheduleData.dayLeaveRequests?.length || 0}`);
        
        validLeaveRequests.forEach(request => {
          console.log(`📋 Processing leave request: ${request._id}, type: ${request.requestType}, status: ${request.status}`);
          
          if (request.requestType === "lesson") {
            // Nghỉ từng tiết: đánh dấu tiết cụ thể
            leaveRequestMap.set(request.lessonId.toString(), true);
            leaveRequestStatusMap.set(request.lessonId.toString(), request.status);
            console.log(`📝 Lesson leave request: ${request.lessonId} -> ${request.status}`);
          } else if (request.requestType === "day") {
            // Nghỉ cả ngày: đánh dấu tất cả tiết trong ngày đó (cả pending và approved)
            const requestDate = new Date(request.date);
            const requestDateStr = requestDate.toISOString().split('T')[0];
            
            console.log(`📅 Day leave request (${request.status}) for date: ${requestDateStr}`);
            
            // Tìm tất cả tiết học trong ngày đó và đánh dấu
            let matchedLessons = 0;
            scheduleData.lessonDetails.forEach(lesson => {
              const lessonDate = new Date(lesson.scheduledDate);
              const lessonDateStr = lessonDate.toISOString().split('T')[0];
              
              if (lessonDateStr === requestDateStr) {
                leaveRequestMap.set(lesson._id.toString(), true);
                leaveRequestStatusMap.set(lesson._id.toString(), request.status);
                matchedLessons++;
              }
            });
            
            console.log(`📊 Marked ${matchedLessons} lessons for day leave on ${requestDateStr}`);
          }
        });
      }
      
      console.log(`📊 Final leaveRequestMap size: ${leaveRequestMap.size}`);
      console.log(`📊 Final leaveRequestStatusMap size: ${leaveRequestStatusMap.size}`);

      // TỐI ƯU: Lấy personal activities từ aggregation result
      const studentPersonalActivities = [];
      
      scheduleData.personalActivities.forEach((activity, index) => {
        // Chỉ lấy personal activities của user hiện tại
        if (activity.user.toString() === user._id.toString()) {
          // Tạo activity object với thông tin đầy đủ
          const activityObj = {
            _id: activity._id,
            user: activity.user,
            date: activity.date,
            period: activity.period,
            title: activity.title,
            content: activity.content,
            remindAt: activity.remindAt,
            time: activity.time,
            createdAt: activity.createdAt,
            updatedAt: activity.updatedAt
          };
          
          studentPersonalActivities.push(activityObj);
        }
      });

      // TỐI ƯU: Process lessons với data đã được map từ aggregation
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

        // Thêm trạng thái từ aggregation result
        // Thay thế hasTestInfo bằng hasNotification với logic mới
        const hasTestInfo = testInfoMap.has(lesson._id.toString());
        const hasTeacherLeaveRequest = teacherLeaveRequestMap.has(lesson._id.toString());
        const hasLessonRequest = lessonRequestMap.has(lesson._id.toString());
        
        // hasNotification = true nếu có một trong các điều kiện sau:
        // 1. có test information
        // 2. giáo viên có các yêu cầu makeup/swap/substitute trạng thái pending
        // 3. giáo viên có yêu cầu xin nghỉ trạng thái pending
        lessonObj.hasNotification = hasTestInfo || hasTeacherLeaveRequest || hasLessonRequest;
        
        // SỬA ĐỔI: Thêm logic mới cho leave request
        // Chỉ xử lý leave request cho các tiết có type khác "empty"
        if (lesson.type !== "empty") {
          const hasLeaveRequest = leaveRequestMap.has(lesson._id.toString());
          lessonObj.hasStudentLeaveRequest = hasLeaveRequest;
          
          // Nếu có leave request, thêm trạng thái
          if (hasLeaveRequest) {
            lessonObj.leaveRequestStatus = leaveRequestStatusMap.get(lesson._id.toString());
          }
        }
        


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
        studentPersonalActivities: studentPersonalActivities,
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

      // Xử lý academicYear có thể là string hoặc ObjectId
      let academicYearDoc;
      if (mongoose.Types.ObjectId.isValid(academicYear)) {
        academicYearDoc = await AcademicYear.findById(academicYear);
      } else {
        academicYearDoc = await AcademicYear.findOne({ name: academicYear });
      }
      
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
            $or: [
              { teacher: teacherObjectId },
              { substituteTeacher: teacherObjectId }
            ],
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
          $lookup: {
            from: "users",
            localField: "teacher",
            foreignField: "_id",
            as: "teacherDetails"
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "substituteTeacher",
            foreignField: "_id",
            as: "substituteTeacherDetails"
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
      const teacherMap = new Map();
      const substituteTeacherMap = new Map();

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

        // Process teacher details
        if (lesson.teacherDetails && lesson.teacherDetails.length > 0) {
          const teacherDetail = lesson.teacherDetails[0];
          teacherMap.set(lesson.teacher.toString(), {
            _id: teacherDetail._id,
            name: teacherDetail.name,
            email: teacherDetail.email
          });
        }

        // Process substituteTeacher details
        if (lesson.substituteTeacherDetails && lesson.substituteTeacherDetails.length > 0) {
          const substituteTeacherDetail = lesson.substituteTeacherDetails[0];
          substituteTeacherMap.set(lesson.substituteTeacher.toString(), {
            _id: substituteTeacherDetail._id,
            name: substituteTeacherDetail.name,
            email: substituteTeacherDetail.email
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
        if (lesson.teacher) {
          lessonObj.teacher = teacherMap.get(lesson.teacher.toString());
        }
        if (lesson.substituteTeacher) {
          lessonObj.substituteTeacher = substituteTeacherMap.get(lesson.substituteTeacher.toString());
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
    
    // Tìm Thứ 2 đầu tiên của năm học
    const dayOfWeek = startDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
    
    // Điều chỉnh ngày bắt đầu về Thứ 2 đầu tiên
    startDate.setDate(startDate.getDate() + daysToMonday);
    
    // Tính ngày bắt đầu của tuần cụ thể
    const daysToAdd = (weekNumber - 1) * 7;
    startDate.setDate(startDate.getDate() + daysToAdd);
    
    return startDate;
  }

  calculateWeekEndDate(startDate, scheduleType) {
    const endDate = new Date(startDate);
    // MONDAY_TO_FRIDAY: 5 ngày (Thứ 2 -> Thứ 6), cộng thêm 4 ngày
    // MONDAY_TO_SATURDAY: 6 ngày (Thứ 2 -> Thứ 7), cộng thêm 5 ngày
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

      // Tìm thêm Student Leave Requests theo classId và date (cho requestType: "day")
      const dayLeaveRequests = await StudentLeaveRequest.find({
        requestType: "day",
        classId: lesson.class._id,
        date: {
          $gte: new Date(lesson.scheduledDate.getFullYear(), lesson.scheduledDate.getMonth(), lesson.scheduledDate.getDate()),
          $lt: new Date(lesson.scheduledDate.getFullYear(), lesson.scheduledDate.getMonth(), lesson.scheduledDate.getDate() + 1)
        }
      })
        .populate("studentId", "name email fullName")
        .populate("classId", "className")
        .lean();

      // Gộp cả 2 loại leave requests
      const allStudentLeaveRequests = [...studentLeaveRequests, ...dayLeaveRequests];

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
      lessonObj.studentLeaveRequests = allStudentLeaveRequests;
      lessonObj.teacherLeaveRequests = teacherLeaveRequests;

      // Thêm thông tin về trạng thái nghỉ phép của học sinh
      if (allStudentLeaveRequests.length > 0) {
        lessonObj.hasStudentLeaveRequest = true;
        
        // Tìm request có trạng thái approved hoặc pending
        const activeLeaveRequest = allStudentLeaveRequests.find(request => 
          ["pending", "approved"].includes(request.status)
        );
        
        if (activeLeaveRequest) {
          lessonObj.leaveRequestStatus = activeLeaveRequest.status;
          lessonObj.leaveRequestType = activeLeaveRequest.requestType;
        }
      } else {
        lessonObj.hasStudentLeaveRequest = false;
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

  async importScheduleFromExcel(data, currentUser, options = {}) {
    const errors = [];
    const createdTeachers = [];
    const createdClasses = [];
    const createdLessons = [];
    const weeklyScheduleMap = new Map();
    const bcrypt = require("bcryptjs");
    
    try {
      let allClasses = await Class.find();
      const allSubjects = await Subject.find();
      let allTeachers = await User.find({
        role: { $in: ["teacher", "homeroom_teacher"] },
      });
      const AcademicYear = require("../models/academic-year.model");
      const allAcademicYears = await AcademicYear.find();
      const { startDate, endDate, academicYear, weekNumber, semester } = options;
      let academicYearObj = null;
      if (academicYear) {
        // Xử lý academicYear có thể là string hoặc ObjectId
        if (mongoose.Types.ObjectId.isValid(academicYear)) {
          academicYearObj = allAcademicYears.find(
            (a) => a._id.toString() === academicYear
          );
        } else {
          academicYearObj = allAcademicYears.find(
            (a) => a.name === academicYear
          );
        }
        
        if (!academicYearObj) {
          throw new Error(
            `Năm học '${academicYear}' không tồn tại trong hệ thống!`
          );
        }
      }
      if (!startDate || !endDate || !academicYearObj) {
        throw new Error("Thiếu startDate, endDate hoặc academicYear!");
      }

    // Xác định tất cả các lớp cần thiết từ dữ liệu Excel
    const requiredClasses = new Set();
    for (const row of data) {
      const { Lớp: className } = row;
      if (className && className.trim()) {
        requiredClasses.add(className.trim());
      }
    }

    // Xác định giáo viên chủ nhiệm và email cho từng lớp TRƯỚC KHI tạo class
    const homeroomTeachersByClass = {};
    const homeroomTeacherEmails = {};
    const allTeacherEmails = {}; // Map tất cả giáo viên và email
    
    for (const row of data) {
      const {
        Lớp: className,
        "Môn học": subjectName,
        "Giáo viên": teacherName,
        "Email giáo viên": teacherEmail,
      } = row;
      
      // Lưu email cho tất cả giáo viên
      if (teacherName && teacherEmail && teacherEmail.trim()) {
        allTeacherEmails[teacherName] = teacherEmail.trim();
      }
      
      // Lưu giáo viên chủ nhiệm
      if (["Chào cờ", "Sinh hoạt lớp"].includes(subjectName) && teacherName) {
        homeroomTeachersByClass[className] = teacherName;
        if (teacherEmail && teacherEmail.trim()) {
          homeroomTeacherEmails[teacherName] = teacherEmail.trim();
        }
      }
    }

    // Tự động tạo các lớp còn thiếu VỚI giáo viên chủ nhiệm
    console.log("🔄 Kiểm tra và tạo các lớp còn thiếu...");
    for (const className of requiredClasses) {
      let classObj = allClasses.find((c) => c.className === className);
      if (!classObj) {
        try {
          // Tự động xác định khối từ tên lớp (ví dụ: 10A1 -> khối 10)
          const gradeMatch = className.match(/^(\d{1,2})/);
          const gradeLevel = gradeMatch ? parseInt(gradeMatch[1]) : 10;
          
          // Tìm hoặc tạo giáo viên chủ nhiệm cho lớp này
          let homeroomTeacher = null;
          if (homeroomTeachersByClass[className]) {
            const teacherName = homeroomTeachersByClass[className];
            homeroomTeacher = allTeachers.find((t) => t.name === teacherName);
            
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
                // Lấy email từ Excel nếu có
                const teacherEmail = homeroomTeacherEmails[teacherName] || null;
                homeroomTeacher = await userService.createTeacherFromSchedule(teacherName, 'Chào cờ', school._id, teacherEmail);
                
                // Cập nhật role để bao gồm homeroom_teacher
                if (!homeroomTeacher.role.includes("homeroom_teacher")) {
                  homeroomTeacher.role = Array.from(
                    new Set([...homeroomTeacher.role, "homeroom_teacher"])
                  );
                  await homeroomTeacher.save();
                }
                
                allTeachers.push(homeroomTeacher);
                createdTeachers.push(homeroomTeacher);
                console.log(`✅ Đã tạo giáo viên chủ nhiệm: ${teacherName}`);
              } catch (error) {
                console.error(`❌ Lỗi tạo giáo viên chủ nhiệm ${teacherName}:`, error.message);
                // Fallback: tạo giáo viên chủ nhiệm cơ bản
                const gender = Math.random() < 0.5 ? "male" : "female";
                
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
                  const district = districts[Math.floor(Math.random() * prefixes.length)];
                  const street = Math.floor(Math.random() * 100) + 1;
                  return `${street} Đường Nguyễn Văn Linh, ${district}, TP.HCM`;
                };
                
                const newTeacher = new User({
                  name: teacherName,
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
            }
          }
          
          // Nếu không có giáo viên chủ nhiệm, tạo một giáo viên mặc định
          if (!homeroomTeacher) {
            // Tạo giáo viên mặc định cho lớp
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
            
            const defaultTeacherName = `GVCN ${className}`;
            const gender = Math.random() < 0.5 ? "male" : "female";
            const normalizedName = defaultTeacherName
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9\s]/g, '')
              .replace(/\s+/g, '.');
            const email = `${normalizedName}.teacher@yopmail.com`;
            const teacherCount = await User.countDocuments({ role: { $in: ['teacher', 'homeroom_teacher'] } });
            const teacherId = `TCH${String(teacherCount + 1).padStart(3, '0')}`;
            
            const newTeacher = new User({
              name: defaultTeacherName,
              email: email,
              passwordHash: await bcrypt.hash("Teacher@123", 10),
              teacherId: teacherId,
              role: ["teacher", "homeroom_teacher"],
              dateOfBirth: new Date(1980 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
              gender: gender,
              phone: `03${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
              address: `${Math.floor(Math.random() * 100) + 1} Đường Nguyễn Văn Linh, Quận 7, TP.HCM`,
              school: school._id,
              isNewUser: true,
              active: true,
            });
            await newTeacher.save();
            allTeachers.push(newTeacher);
            homeroomTeacher = newTeacher;
            createdTeachers.push(newTeacher);
            console.log(`✅ Đã tạo giáo viên chủ nhiệm mặc định: ${defaultTeacherName}`);
          }
          
          // Tạo lớp mới với giáo viên chủ nhiệm
          const newClass = new Class({
            className: className,
            academicYear: academicYearObj._id,
            gradeLevel: gradeLevel,
            homeroomTeacher: homeroomTeacher._id,
            active: true,
          });
          
          await newClass.save();
          allClasses.push(newClass);
          createdClasses.push(newClass);
          console.log(`✅ Đã tạo lớp mới: ${className} (Khối ${gradeLevel}) với GVCN: ${homeroomTeacher.name}`);
        } catch (error) {
          console.error(`❌ Lỗi tạo lớp ${className}:`, error.message);
          errors.push({ 
            row: 0, 
            error: `Không thể tạo lớp ${className}: ${error.message}` 
          });
        }
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
            // Lấy email từ Excel nếu có
            const teacherEmail = homeroomTeacherEmails[homeroomTeacherName] || null;
            homeroomTeacher = await userService.createTeacherFromSchedule(homeroomTeacherName, 'Chào cờ', school._id, teacherEmail);
            
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
      } else {
        // Nếu lớp chưa có homeroomTeacher, cập nhật ngay
        if (!classObj.homeroomTeacher) {
          classObj.homeroomTeacher = homeroomTeacher._id;
          await classObj.save();
          console.log(`✅ Đã gán GVCN ${homeroomTeacher.name} cho lớp ${className}`);
        }
      }
    }

    async function findOrCreateAndUpdateTeacher(
      teacherName,
      subjectObj,
      className,
      teacherEmail = null // Thêm tham số email từ Excel
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

          // Xử lý email: ưu tiên email từ Excel, nếu không có thì tự động tạo
          let email;
          if (teacherEmail && teacherEmail.trim()) {
            // Kiểm tra email từ Excel có tồn tại trong database chưa
            const existingUserWithEmail = await User.findOne({ email: teacherEmail.trim() });
            if (existingUserWithEmail) {
              throw new Error(`Email '${teacherEmail.trim()}' đã tồn tại trong hệ thống. Vui lòng sử dụng email khác hoặc để trống để tự động tạo.`);
            }
            email = teacherEmail.trim();
            console.log(`📧 Sử dụng email từ Excel: ${email}`);
          } else {
            // Tự động tạo email nếu không có trong Excel
            const normalizedName = teacherName
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9\s]/g, '')
              .replace(/\s+/g, '.');
            email = `${normalizedName}.teacher@yopmail.com`;
            console.log(`📧 Tự động tạo email: ${email}`);
          }

          // Tạo giáo viên sử dụng UserService
          const subjectName = subjectObj ? subjectObj.subjectName : 'Chào cờ';
          // Lấy email từ Excel nếu có
          const excelEmail = allTeacherEmails[teacherName] || teacherEmail;
          teacher = await userService.createTeacherFromSchedule(teacherName, subjectName, school._id, excelEmail);
          
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
          
          // Nếu lỗi là do email đã tồn tại, throw error để rollback
          if (error.message.includes('đã tồn tại trong hệ thống')) {
            throw error;
          }
          
          // Fallback: tạo giáo viên cơ bản nếu có lỗi khác
          const gender = Math.random() < 0.5 ? "male" : "female";
          const roles = isHomeroom ? ["teacher", "homeroom_teacher"] : ["teacher"];
          const isSpecial = subjectObj && ["Chào cờ", "Sinh hoạt lớp"].includes(subjectObj.subjectName);
          
          // Sử dụng email đã xử lý ở trên
          let email;
          if (teacherEmail && teacherEmail.trim()) {
            email = teacherEmail.trim();
          } else {
            const normalizedName = teacherName
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9\s]/g, '')
              .replace(/\s+/g, '.');
            email = `${normalizedName}.teacher@yopmail.com`;
          }
          
          // Lấy trường học cho fallback
          let fallbackSchool = await School.findOne({ active: true });
          if (!fallbackSchool) {
            fallbackSchool = await School.create({
              name: 'THPT Phan Văn Trị',
              address: '123 Đường Nguyễn Văn Linh, Quận 7, TP.HCM',
              phone: '028 3776 1234',
              email: 'info@thptphanvantri.edu.vn',
              website: 'https://thptphanvantri.edu.vn',
              principal: 'Nguyễn Văn A',
              active: true
            });
          }
          
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
            school: fallbackSchool._id,
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
        "Email giáo viên": teacherEmail, // Thêm email từ Excel
        Ngày: day,
        Tiết: period,
        Tuần: week,
        Buổi: session,
        "Bài học": topic, // Thêm dòng này
      } = row;
      let classObj = allClasses.find((c) => c.className === className);
      if (!classObj) {
        // Tự động tạo lớp mới nếu chưa tồn tại
        try {
          // Tự động xác định khối từ tên lớp (ví dụ: 10A1 -> khối 10)
          const gradeMatch = className.match(/^(\d{1,2})/);
          const gradeLevel = gradeMatch ? parseInt(gradeMatch[1]) : 10;
          
          // Tạo lớp mới
          const newClass = new Class({
            className: className,
            academicYear: academicYearObj._id,
            gradeLevel: gradeLevel,
            homeroomTeacher: null, // Sẽ được cập nhật sau khi xác định giáo viên chủ nhiệm
            active: true,
          });
          
          await newClass.save();
          allClasses.push(newClass);
          createdClasses.push(newClass);
          classObj = newClass;
          console.log(`✅ Đã tạo lớp mới: ${className} (Khối ${gradeLevel})`);
        } catch (error) {
          console.error(`❌ Lỗi tạo lớp ${className}:`, error.message);
          errors.push({ 
            row: i + 2, 
            error: `Không thể tạo lớp ${className}: ${error.message}` 
          });
          continue;
        }
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
        // Log để debug email
        if (teacherEmail && teacherEmail.trim()) {
          console.log(`📧 Excel email cho ${teacherName}: ${teacherEmail}`);
        } else {
          console.log(`📧 Không có email Excel cho ${teacherName}, sẽ tự động tạo`);
        }
        
        teacherObj = await findOrCreateAndUpdateTeacher(
          teacherName,
          subjectObj,
          className,
          teacherEmail // Truyền email từ Excel
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

    // Log tổng kết
    console.log(`\n📊 TỔNG KẾT IMPORT TKB:`);
    console.log(`✅ Tổng số giáo viên đã tạo: ${createdTeachers.length}`);
    console.log(`✅ Tổng số lớp đã tạo: ${createdClasses.length}`);
    console.log(`✅ Tổng số lesson đã tạo: ${createdLessons.length}`);
    console.log(`✅ Tổng số lớp đã cập nhật: ${updatedClasses.length}`);
    if (createdClasses.length > 0) {
      console.log(`📚 Các lớp mới được tạo: ${createdClasses.map(c => c.className).join(', ')}`);
    }
    if (createdTeachers.length > 0) {
      console.log(`👨‍🏫 Các giáo viên mới được tạo: ${createdTeachers.map(t => t.name).join(', ')}`);
    }
    if (errors.length > 0) {
      console.log(`⚠️ Có ${errors.length} lỗi cần xem xét`);
    }

    return {
      errors,
      createdTeachers: createdTeachers.map((t) => ({
        name: t.name,
        email: t.email,
        gender: t.gender,
      })),
      createdClasses: createdClasses.map((c) => ({
        className: c.className,
        gradeLevel: c.gradeLevel,
        academicYear: c.academicYear,
      })),
      totalLessons: createdLessons.length,
      totalTeachersCreated: createdTeachers.length,
      totalClassesCreated: createdClasses.length,
      updatedClasses: updatedClasses,
      totalClassesUpdated: updatedClasses.length,
      teacherMappings: Array.from(teacherMapping.entries()).map(([oldId, newId]) => ({
        oldTeacherId: oldId,
        newTeacherId: newId,
      })),
      totalTeacherMappings: teacherMapping.size,
    };
    
  } catch (error) {
    console.error('❌ LỖI CRITICAL trong importScheduleFromExcel:', error.message);
    
    // ROLLBACK: Xóa tất cả dữ liệu đã tạo nếu có lỗi
    console.log('🔄 Bắt đầu ROLLBACK - Xóa tất cả dữ liệu đã tạo...');
    
    try {
      // Xóa tất cả lessons đã tạo
      if (createdLessons.length > 0) {
        for (const lesson of createdLessons) {
          await Lesson.findByIdAndDelete(lesson._id);
        }
        console.log(`🗑️ Đã xóa ${createdLessons.length} lessons`);
      }
      
      // Xóa tất cả classes đã tạo
      if (createdClasses.length > 0) {
        for (const classObj of createdClasses) {
          await Class.findByIdAndDelete(classObj._id);
        }
        console.log(`🗑️ Đã xóa ${createdClasses.length} classes`);
      }
      
      // Xóa tất cả teachers đã tạo
      if (createdTeachers.length > 0) {
        for (const teacher of createdTeachers) {
          await User.findByIdAndDelete(teacher._id);
        }
        console.log(`🗑️ Đã xóa ${createdTeachers.length} teachers`);
      }
      
      console.log('✅ ROLLBACK hoàn tất');
    } catch (rollbackError) {
      console.error('❌ Lỗi trong quá trình ROLLBACK:', rollbackError.message);
    }
    
    // Throw error để controller có thể xử lý
    throw error;
  }
  }

  /**
   * Lấy thông tin tuần hiện tại dựa trên dữ liệu TKB thực tế trong database
   * @param {Date} targetDate - Ngày cần xác định tuần (mặc định là ngày hiện tại)
   * @returns {Promise<Object>} Object chứa thông tin năm học và tuần hiện tại
   */
  async getCurrentWeek(targetDate = new Date()) {
    try {
      // Tìm năm học đang diễn ra
      const currentAcademicYear = await AcademicYear.getCurrentAcademicYear();
      
      if (!currentAcademicYear) {
        return null; // Trả về null thay vì throw error để không làm crash API chính
      }

      // TỐI ƯU: Tìm tuần chứa ngày đó dựa trên dữ liệu TKB thực tế trong database
      const weeklySchedule = await WeeklySchedule.aggregate([
        {
          $match: {
            academicYear: currentAcademicYear._id
          }
        },
        {
          $lookup: {
            from: "lessons",
            localField: "lessons",
            foreignField: "_id",
            as: "lessonDetails"
          }
        },
        {
          $unwind: "$lessonDetails"
        },
        {
          $match: {
            "lessonDetails.scheduledDate": {
              $gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
              $lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)
            }
          }
        },
        {
          $group: {
            _id: {
              weekNumber: "$weekNumber",
              academicYear: "$academicYear"
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { "_id.weekNumber": 1 }
        }
      ]);

      // Nếu không tìm thấy lesson nào trong ngày đó, tìm tuần gần nhất
      let weekNumber = 1;
      if (weeklySchedule.length > 0) {
        weekNumber = weeklySchedule[0]._id.weekNumber;
      } else {
        // Tìm tuần gần nhất có dữ liệu
        const nearestWeek = await WeeklySchedule.aggregate([
          {
            $match: {
              academicYear: currentAcademicYear._id
            }
          },
          {
            $group: {
              _id: "$weekNumber",
              startDate: { $min: "$startDate" },
              endDate: { $max: "$endDate" }
            }
          },
          {
            $addFields: {
              distance: {
                $abs: {
                  $subtract: [
                    targetDate,
                    { $avg: ["$startDate", "$endDate"] }
                  ]
                }
              }
            }
          },
          {
            $sort: { distance: 1 }
          },
          {
            $limit: 1
          }
        ]);

        if (nearestWeek.length > 0) {
          weekNumber = nearestWeek[0]._id;
        }
      }

      // Chỉ trả về thông tin cần thiết cho frontend
      return {
        academicYear: currentAcademicYear.name,
        weekNumber: weekNumber
      };
    } catch (error) {
      console.warn('⚠️ Could not get current week info:', error.message);
      return null; // Trả về null thay vì throw error
    }
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
        },
        currentWeek: null // Bỏ logic currentWeek khỏi getAvailableAcademicYearsAndWeeks
      };

      return result;
    } catch (error) {
      console.error('❌ Error in getAvailableAcademicYearsAndWeeks:', error.message);
      throw new Error(`Failed to get available academic years and weeks: ${error.message}`);
    }
  }
}

module.exports = new ScheduleService();
