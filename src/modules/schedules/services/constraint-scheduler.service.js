const Lesson = require("../models/lesson.model");
const WeeklySchedule = require("../models/weekly-schedule.model");
const User = require("../../auth/models/user.model");
const School = require("../../classes/models/school.model");
const userService = require("../../user/services/user.service");

/**
 * Constraint Scheduler Service
 * Xử lý tạo thời khóa biểu với các ràng buộc phức tạp
 */
class ConstraintSchedulerService {
  constructor(assignmentByClassAndSubject) {
    // ===== CONFIGURATION CONSTANTS =====

    // Phân loại môn học
    this.FIXED_SUBJECTS = ["Chào cờ", "Sinh hoạt lớp"];
    this.MAIN_SUBJECTS = [
      "Ngữ văn",
      "Toán",
      "Ngoại ngữ",
      "English",
      "Mathematics",
      "Literature",
    ];
    this.SEMI_MAIN_SUBJECTS = [
      "Vật lý",
      "Hóa học",
      "Sinh học",
      "Lịch sử",
      "Địa lý",
      "Physics",
      "Chemistry",
      "Biology",
      "History",
      "Geography",
    ];
    this.MINOR_SUBJECTS = [
      "GDCD",
      "Thể dục",
      "GDQP",
      "Tin học",
      "Physical Education",
      "Arts",
    ];

    // Môn học ưu tiên cần có tiết đôi
    this.PRIORITY_SUBJECTS = ["Mathematics", "Literature", "English"];

    // Độ ưu tiên các môn học
    this.SUBJECT_PRIORITIES = {
      Mathematics: 10,
      Literature: 9,
      English: 8,
      Physics: 7,
      Chemistry: 6,
      Biology: 5,
      History: 4,
      Geography: 3,
      "Physical Education": 2,
      Arts: 1,
    };

    // Định nghĩa tiết học
    this.MORNING_PERIODS = [1, 2, 3, 4, 5];
    this.AFTERNOON_PERIODS = [6, 7, 8, 9, 10];
    this.BREAK_AFTER_PERIOD = 5; // Nghỉ lớn sau tiết 5

    // Cấu hình lịch học tuần
    this.SCHEDULE_OPTIONS = {
      MONDAY_TO_FRIDAY: {
        days: [0, 1, 2, 3, 4], // Thứ 2-6 (dayIndex 0-4)
        classMeetingDay: 4, // Sinh hoạt lớp thứ 6 (dayIndex 4)
        classMeetingPeriod: 5,
        name: "Thứ 2 - Thứ 6",
      },
      MONDAY_TO_SATURDAY: {
        days: [0, 1, 2, 3, 4, 5], // Thứ 2-7 (dayIndex 0-5)
        classMeetingDay: 5, // Sinh hoạt lớp thứ 7 (dayIndex 5)
        classMeetingPeriod: 5,
        name: "Thứ 2 - Thứ 7",
      },
    };

    // Yêu cầu tối thiểu
    this.MINIMUM_EXTENDED_DAYS = 2; // Tối thiểu 2 ngày học >5 tiết
    this.CORE_PERIODS = [1, 2, 3, 4, 5]; // Tiết 1-5 phải là subject
    this.assignmentByClassAndSubject = assignmentByClassAndSubject || null;
  }

  // ===== MAIN SCHEDULING METHOD =====

  /**
   * HÀM CHÍNH - Tạo thời khóa biểu với ràng buộc và options
   * @param {Object} options - Cấu hình lịch: { scheduleType: 'MONDAY_TO_FRIDAY' | 'MONDAY_TO_SATURDAY' }
   */
  async createConstraintBasedSchedule(
    weeklyScheduleId,
    classId,
    academicYearId,
    weekNum,
    weekStartDate,
    timeSlots,
    subjects,
    homeroomTeacher,
    createdBy,
    options = {}
  ) {
    console.log(
      `\n🎯 BẮT ĐẦU TẠO THỜI KHÓA BIỂU VỚI RÀNG BUỘC - Tuần ${weekNum}`
    );
    console.log("=".repeat(60));

    // Xác định loại lịch học
    const scheduleType = options.scheduleType || "MONDAY_TO_SATURDAY";
    const scheduleConfig = this.SCHEDULE_OPTIONS[scheduleType];
    console.log(`📅 Loại lịch: ${scheduleConfig.name}`);

    // Khởi tạo hệ thống ràng buộc
    const constraints = await this.initializeConstraintSystem(
      classId,
      subjects,
      homeroomTeacher,
      timeSlots,
      scheduleConfig
    );

    // Thực hiện các giai đoạn lập lịch
    await this.scheduleFixedPeriods(
      constraints,
      weekStartDate,
      timeSlots,
      homeroomTeacher,
      createdBy,
      academicYearId
    );
    await this.scheduleDoublePeriods(
      constraints,
      weekStartDate,
      timeSlots,
      createdBy,
      academicYearId
    );
    await this.scheduleSinglePeriods(
      constraints,
      weekStartDate,
      timeSlots,
      createdBy,
      academicYearId
    );
    await this.ensureCorePeriodRequirements(
      constraints,
      weekStartDate,
      timeSlots,
      createdBy,
      academicYearId
    );
    await this.ensureMinimumExtendedDays(
      constraints,
      weekStartDate,
      timeSlots,
      createdBy,
      academicYearId
    );
    await this.fillEmptySlots(
      constraints,
      weekStartDate,
      timeSlots,
      homeroomTeacher,
      createdBy,
      academicYearId
    );

    // Kiểm tra và báo cáo
    const validationResult = this.validateAllConstraints(constraints);
    const lessons = await this.saveLessonsToWeeklySchedule(
      constraints,
      weeklyScheduleId
    );
    this.printSchedulingReport(constraints, validationResult);

    return lessons;
  }

  // ===== INITIALIZATION METHODS =====

  /**
   * Khởi tạo hệ thống theo dõi ràng buộc với cấu hình lịch
   */
  async initializeConstraintSystem(
    classId,
    subjects,
    homeroomTeacher,
    timeSlots,
    scheduleConfig
  ) {
    const constraints = {
      classId,
      subjects,
      homeroomTeacher,
      timeSlots,
      scheduleConfig,
      // Ma trận lịch học: [ngày][tiết] = lesson hoặc null
      schedule: Array(7)
        .fill()
        .map(() => Array(10).fill(null)),
      // Theo dõi lịch giáo viên
      teacherSchedules: new Map(),
      // Yêu cầu môn học
      subjectRequirements: new Map(),
      // Vi phạm ràng buộc
      violations: [],
      // Thống kê
      stats: {
        totalLessons: 0,
        doublePeriods: 0,
        prioritySubjectsInMorning: 0,
        extendedDays: 0,
        totalWeeklyHours: 0,
        scheduledWeeklyHours: 0,
      },
    };

    await this.initializeTeacherSchedules(constraints);
    this.initializeSubjectRequirements(constraints);

    console.log(
      `✅ Hệ thống khởi tạo: ${subjects.length} môn học, ${constraints.teacherSchedules.size} giáo viên`
    );
    console.log(
      `📊 Tổng tiết/tuần cần xếp: ${constraints.stats.totalWeeklyHours}`
    );
    return constraints;
  }

  /**
   * Khởi tạo lịch giáo viên với giới hạn khối lượng
   */
  async initializeTeacherSchedules(constraints) {
    const teacherIds = new Set();

    // Thêm giáo viên chủ nhiệm
    if (constraints.homeroomTeacher) {
      teacherIds.add(constraints.homeroomTeacher._id.toString());
    }

    // Thêm giáo viên các môn học
    for (const subject of constraints.subjects) {
      if (subject.teacher) {
        teacherIds.add(subject.teacher._id.toString());
      }
    }

    // Khởi tạo lịch cho từng giáo viên
    for (const teacherId of teacherIds) {
      constraints.teacherSchedules.set(teacherId, {
        lessons: [],
        maxLessonsPerDay: 6,
        maxLessonsPerWeek: 25,
        currentLessons: 0,
        dailyLessons: Array(7).fill(0),
      });
    }

    console.log(
      `👥 Khởi tạo lịch cho ${constraints.teacherSchedules.size} giáo viên`
    );
  }

  /**
   * Khởi tạo yêu cầu môn học
   */
  initializeSubjectRequirements(constraints) {
    let totalWeeklyHours = 0;

    for (const subject of constraints.subjects) {
      const weeklyHours = subject.weeklyHours || 2;
      const doublePeriods = subject.doublePeriods || 0;
      const priority = this.SUBJECT_PRIORITIES[subject.subjectName] || 1;

      constraints.subjectRequirements.set(subject._id.toString(), {
        subject,
        weeklyHours,
        doublePeriods,
        priority,
        scheduledHours: 0,
        scheduledDoublePeriods: 0,
        morningPreference: this.PRIORITY_SUBJECTS.includes(subject.subjectName),
      });

      totalWeeklyHours += weeklyHours;
    }

    constraints.stats.totalWeeklyHours = totalWeeklyHours;
    console.log(`📚 Tổng tiết/tuần: ${totalWeeklyHours}`);
  }

  // ===== SCHEDULING PHASES =====

  /**
   * Giai đoạn 1: Xếp các tiết cố định (Chào cờ, Sinh hoạt lớp)
   */
  async scheduleFixedPeriods(
    constraints,
    weekStartDate,
    timeSlots,
    homeroomTeacher,
    createdBy,
    academicYearId
  ) {
    console.log("\n🎯 GIAI ĐOẠN 1: Xếp tiết cố định");

    const scheduleConfig = constraints.scheduleConfig;
    const firstDay = new Date(weekStartDate);
    const classMeetingDay = new Date(weekStartDate);
    classMeetingDay.setDate(
      weekStartDate.getDate() + scheduleConfig.classMeetingDay
    );

    // Đảm bảo có homeroom teacher
    if (!homeroomTeacher) {
      console.log(`⚠️ Lớp không có giáo viên chủ nhiệm, bỏ qua tiết cố định`);
      return;
    }

    // Tiết Chào cờ (Thứ 2, tiết 1)
    const chaoCoLesson = await this.createLesson({
      lessonId: `${constraints.classId.toString().slice(-6)}_${firstDay
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}_T1`,
      class: constraints.classId,
      subject: undefined,
      teacher: homeroomTeacher._id,
      academicYear: academicYearId,
      timeSlot: timeSlots[0]?._id,
      scheduledDate: firstDay,
      type: "fixed",
      status: "scheduled",
      topic: "Chào cờ",
      createdBy,
    });

    // Tiết Sinh hoạt lớp
    const sinhHoatLesson = await this.createLesson({
      lessonId: `${constraints.classId.toString().slice(-6)}_${classMeetingDay
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}_T${scheduleConfig.classMeetingPeriod}`,
      class: constraints.classId,
      subject: undefined,
      teacher: homeroomTeacher._id,
      academicYear: academicYearId,
      timeSlot: timeSlots[scheduleConfig.classMeetingPeriod - 1]?._id,
      scheduledDate: classMeetingDay,
      type: "fixed",
      status: "scheduled",
      topic: "Sinh hoạt lớp",
      createdBy,
    });

    // Cập nhật ma trận lịch
    constraints.schedule[0][0] = chaoCoLesson; // Thứ 2, tiết 1
    constraints.schedule[scheduleConfig.classMeetingDay][
      scheduleConfig.classMeetingPeriod - 1
    ] = sinhHoatLesson;

    // Cập nhật lịch giáo viên
    if (homeroomTeacher) {
      this.bookTeacherSlot(constraints, homeroomTeacher._id.toString(), 0, 0);
      this.bookTeacherSlot(
        constraints,
        homeroomTeacher._id.toString(),
        scheduleConfig.classMeetingDay,
        scheduleConfig.classMeetingPeriod - 1
      );
    }

    console.log(`✅ Đã xếp 2 tiết cố định: Chào cờ, Sinh hoạt lớp`);
  }

  /**
   * Giai đoạn 2: Xếp các tiết đôi
   */
  async scheduleDoublePeriods(
    constraints,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    console.log("\n🎯 GIAI ĐOẠN 2: Xếp tiết đôi");

    const scheduleConfig = constraints.scheduleConfig;
    let doublePeriodsScheduled = 0;

    // Sắp xếp môn học theo độ ưu tiên
    const sortedSubjects = Array.from(constraints.subjectRequirements.values())
      .filter((req) => req.doublePeriods > 0)
      .sort((a, b) => b.priority - a.priority);

    for (const requirement of sortedSubjects) {
      const subject = requirement.subject;
      const teacher = subject.teacher;
      const doublePeriodsNeeded =
        requirement.doublePeriods - requirement.scheduledDoublePeriods;

      // Bỏ qua nếu không có teacher
      if (!teacher) {
        console.log(`⚠️ Bỏ qua ${subject.subjectName} - không có giáo viên`);
        continue;
      }

      for (let i = 0; i < doublePeriodsNeeded; i++) {
        const bestSlot = this.findBestDoubleSlot(constraints, subject, teacher);

        if (bestSlot) {
          await this.scheduleDoubleLesson(
            constraints,
            subject,
            teacher,
            bestSlot.dayIndex,
            bestSlot.startPeriod,
            weekStartDate,
            timeSlots,
            createdBy,
            academicYearId
          );
          doublePeriodsScheduled++;
          requirement.scheduledDoublePeriods++;
        } else {
          console.log(`⚠️ Không thể xếp tiết đôi cho ${subject.subjectName}`);
          break;
        }
      }
    }

    console.log(`✅ Đã xếp ${doublePeriodsScheduled} tiết đôi`);
  }

  /**
   * Giai đoạn 3: Xếp các tiết đơn
   */
  async scheduleSinglePeriods(
    constraints,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    console.log("\n🎯 GIAI ĐOẠN 3: Xếp tiết đơn");

    const scheduleConfig = constraints.scheduleConfig;
    let singlePeriodsScheduled = 0;

    // Sắp xếp môn học theo độ ưu tiên
    const sortedSubjects = Array.from(
      constraints.subjectRequirements.values()
    ).sort((a, b) => b.priority - a.priority);

    for (const requirement of sortedSubjects) {
      const subject = requirement.subject;
      const teacher = subject.teacher;
      const remainingHours =
        requirement.weeklyHours - requirement.scheduledHours;

      // Bỏ qua nếu không có teacher
      if (!teacher) {
        console.log(`⚠️ Bỏ qua ${subject.subjectName} - không có giáo viên`);
        continue;
      }

      for (let i = 0; i < remainingHours; i++) {
        const bestSlot = this.findBestSingleSlot(constraints, subject, teacher);

        if (bestSlot) {
          await this.scheduleSingleLesson(
            constraints,
            subject,
            teacher,
            bestSlot.dayIndex,
            bestSlot.period,
            weekStartDate,
            timeSlots,
            createdBy,
            academicYearId
          );
          singlePeriodsScheduled++;
          requirement.scheduledHours++;
        } else {
          console.log(`⚠️ Không thể xếp tiết đơn cho ${subject.subjectName}`);
          break;
        }
      }
    }

    console.log(`✅ Đã xếp ${singlePeriodsScheduled} tiết đơn`);
  }

  // ===== ENFORCEMENT METHODS =====

  /**
   * Đảm bảo yêu cầu tiết cốt lõi
   */
  async ensureCorePeriodRequirements(
    constraints,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    console.log("\n🎯 GIAI ĐOẠN 4: Đảm bảo tiết cốt lõi");

    const scheduleConfig = constraints.scheduleConfig;
    const coreSlotsNeeded = [];

    // Kiểm tra các tiết 1-5 phải có môn học
    for (const dayIndex of scheduleConfig.days) {
      for (const period of this.CORE_PERIODS) {
        if (!constraints.schedule[dayIndex][period - 1]) {
          coreSlotsNeeded.push({ dayIndex, period });
        }
      }
    }

    if (coreSlotsNeeded.length > 0) {
      await this.createSupplementarySubjectsForCorePeriods(
        constraints,
        coreSlotsNeeded,
        weekStartDate,
        timeSlots,
        createdBy,
        academicYearId
      );
    }

    console.log(`✅ Đã đảm bảo ${coreSlotsNeeded.length} tiết cốt lõi`);
  }

  /**
   * Đảm bảo số ngày học kéo dài tối thiểu
   */
  async ensureMinimumExtendedDays(
    constraints,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    console.log("\n🎯 GIAI ĐOẠN 5: Đảm bảo ngày học kéo dài");

    const scheduleConfig = constraints.scheduleConfig;
    let extendedDays = 0;

    // Đếm số ngày có >5 tiết
    for (const dayIndex of scheduleConfig.days) {
      const dayLessons = constraints.schedule[dayIndex].filter(
        (lesson) => lesson !== null
      );
      if (dayLessons.length > 5) {
        extendedDays++;
      }
    }

    // Thêm tiết nếu cần
    while (extendedDays < this.MINIMUM_EXTENDED_DAYS) {
      const bestDay = this.findBestDayForExtraLesson(constraints);
      if (bestDay !== -1) {
        await this.addExtraLessonsToDay(
          constraints,
          bestDay,
          weekStartDate,
          timeSlots,
          createdBy,
          academicYearId
        );
        extendedDays++;
      } else {
        break;
      }
    }

    console.log(`✅ Đã đảm bảo ${extendedDays} ngày học kéo dài`);
  }

  /**
   * Giai đoạn cuối: Lấp đầy các ô trống
   */
  async fillEmptySlots(
    constraints,
    weekStartDate,
    timeSlots,
    homeroomTeacher,
    createdBy,
    academicYearId
  ) {
    console.log("\n🎯 GIAI ĐOẠN 6: Lấp đầy ô trống");

    const scheduleConfig = constraints.scheduleConfig;
    let emptySlotsFilled = 0;

    // Lấp đầy các ô trống còn lại
    for (const dayIndex of scheduleConfig.days) {
      for (let period = 0; period < 10; period++) {
        if (!constraints.schedule[dayIndex][period]) {
          const emptyLesson = await this.createLesson({
            lessonId: `${constraints.classId.toString().slice(-6)}_${new Date(
              weekStartDate.getTime() + dayIndex * 24 * 60 * 60 * 1000
            )
              .toISOString()
              .slice(0, 10)
              .replace(/-/g, "")}_T${period + 1}`,
            class: constraints.classId,
            subject: null,
            teacher: null,
            academicYear: academicYearId,
            timeSlot: timeSlots[period]?._id,
            scheduledDate: new Date(
              weekStartDate.getTime() + dayIndex * 24 * 60 * 60 * 1000
            ),
            type: "empty",
            status: "scheduled",
            createdBy,
          });

          constraints.schedule[dayIndex][period] = emptyLesson;
          emptySlotsFilled++;
        }
      }
    }

    console.log(`✅ Đã lấp đầy ${emptySlotsFilled} ô trống`);
  }

  // ===== HELPER METHODS =====

  /**
   * Tạo lesson mới
   */
  async createLesson(data) {
    const lesson = new Lesson(data);
    return await lesson.save();
  }

  /**
   * Đặt lịch cho giáo viên
   */
  bookTeacherSlot(constraints, teacherId, dayIndex, period) {
    const teacherSchedule = constraints.teacherSchedules.get(teacherId);
    if (teacherSchedule) {
      teacherSchedule.dailyLessons[dayIndex]++;
      teacherSchedule.currentLessons++;
    }
  }

  /**
   * Tìm giáo viên chuyên môn
   */
  async findSpecializedTeacher(subjectId, classId) {
    // Lấy giáo viên đúng từ assignmentByClassAndSubject nếu có
    if (
      this.assignmentByClassAndSubject &&
      this.assignmentByClassAndSubject.has(subjectId.toString())
    ) {
      const classMap = this.assignmentByClassAndSubject.get(
        subjectId.toString()
      );
      if (classMap && classMap.has((classId || this.classId).toString())) {
        return classMap.get((classId || this.classId).toString());
      }
    }
    
    // Nếu không có giáo viên được gán, tìm giáo viên có môn học này
    const Subject = require("../../subjects/models/subject.model");
    const subject = await Subject.findById(subjectId);
    if (subject) {
      const teacher = await User.findOne({
        subject: subjectId,
        role: { $in: ['teacher', 'homeroom_teacher'] },
        active: true
      });
      
      if (teacher) {
        return teacher;
      }
      
      // Nếu không có giáo viên, tạo mới giáo viên cho môn học này
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
        
        // Tạo giáo viên mới với tên môn học gốc
        const teacherName = `Giáo viên ${subject.subjectName}`;
        // Không có email từ Excel, để null để tự động tạo
        const newTeacher = await userService.createTeacherFromSchedule(teacherName, subject.subjectName, school._id, null);
        
        console.log(`✅ Đã tạo giáo viên mới cho môn ${subject.subjectName}: ${newTeacher.name}`);
        return newTeacher;
      } catch (error) {
        console.error(`❌ Lỗi tạo giáo viên cho môn ${subject.subjectName}:`, error.message);
        return null;
      }
    }
    
    // Nếu không có, trả về null (lesson sẽ không có teacher)
    return null;
  }

  /**
   * Kiểm tra slot hợp lý cho từng loại môn
   */
  checkSubjectSlotConstraint(subjectName, period) {
    if (this.FIXED_SUBJECTS.includes(subjectName)) return true;
    if (this.MAIN_SUBJECTS.includes(subjectName)) {
      // Môn chính chỉ xếp tiết 1-5
      return period >= 0 && period <= 4;
    }
    if (this.SEMI_MAIN_SUBJECTS.includes(subjectName)) {
      // Môn cận chính ưu tiên sáng, nhưng có thể xếp chiều nếu hết slot
      return period >= 0 && period <= 6;
    }
    if (this.MINOR_SUBJECTS.includes(subjectName)) {
      // Môn phụ chỉ xếp tiết 6-10, không xếp tiết 1-3
      return period >= 5 && period <= 9;
    }
    return true;
  }

  /**
   * Kiểm tra giáo viên có bị trùng lịch không (toàn trường)
   */
  checkTeacherConflict(constraints, teacherId, dayIndex, period) {
    if (!teacherId) return false;
    for (const [_, teacherSchedule] of constraints.teacherSchedules) {
      if (teacherSchedule.lessons) {
        for (const lesson of teacherSchedule.lessons) {
          if (lesson.dayIndex === dayIndex && lesson.period === period) {
            if (lesson.teacher && lesson.teacher.toString() === teacherId) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * Kiểm tra môn đã xuất hiện trong ngày chưa
   */
  checkSubjectInDay(constraints, subjectId, dayIndex) {
    for (let period = 0; period < 10; period++) {
      const lesson = constraints.schedule[dayIndex][period];
      if (lesson && lesson.subject && lesson.subject.toString() === subjectId) {
        return true;
      }
    }
    return false;
  }

  // ===== VALIDATION METHODS =====

  /**
   * Kiểm tra tất cả ràng buộc
   */
  validateAllConstraints(constraints) {
    const violations = [];

    this.validateTeacherConstraints(constraints, violations);
    this.validateSubjectRequirements(constraints, violations);
    this.validateDoublePeriodRequirements(constraints, violations);
    this.validateTimePreferences(constraints, violations);

    return {
      isValid: violations.length === 0,
      violations,
      totalViolations: violations.length,
    };
  }

  /**
   * Kiểm tra ràng buộc giáo viên
   */
  validateTeacherConstraints(constraints, violations) {
    for (const [teacherId, schedule] of constraints.teacherSchedules) {
      // Kiểm tra giới hạn tiết/tuần
      if (schedule.currentLessons > schedule.maxLessonsPerWeek) {
        violations.push({
          type: "teacher_overload",
          teacherId,
          message: `Giáo viên ${teacherId} vượt quá ${schedule.maxLessonsPerWeek} tiết/tuần`,
        });
      }

      // Kiểm tra giới hạn tiết/ngày
      for (let day = 0; day < 7; day++) {
        if (schedule.dailyLessons[day] > schedule.maxLessonsPerDay) {
          violations.push({
            type: "teacher_daily_overload",
            teacherId,
            day,
            message: `Giáo viên ${teacherId} vượt quá ${
              schedule.maxLessonsPerDay
            } tiết/ngày ${day + 1}`,
          });
        }
      }
    }
  }

  /**
   * Kiểm tra yêu cầu môn học
   */
  validateSubjectRequirements(constraints, violations) {
    for (const [subjectId, requirement] of constraints.subjectRequirements) {
      if (requirement.scheduledHours < requirement.weeklyHours) {
        violations.push({
          type: "subject_insufficient_hours",
          subjectId,
          subjectName: requirement.subject.subjectName,
          required: requirement.weeklyHours,
          scheduled: requirement.scheduledHours,
          message: `${requirement.subject.subjectName} thiếu ${
            requirement.weeklyHours - requirement.scheduledHours
          } tiết`,
        });
      }

      if (requirement.scheduledDoublePeriods < requirement.doublePeriods) {
        violations.push({
          type: "subject_insufficient_double_periods",
          subjectId,
          subjectName: requirement.subject.subjectName,
          required: requirement.doublePeriods,
          scheduled: requirement.scheduledDoublePeriods,
          message: `${requirement.subject.subjectName} thiếu ${
            requirement.doublePeriods - requirement.scheduledDoublePeriods
          } tiết đôi`,
        });
      }
    }
  }

  /**
   * Kiểm tra yêu cầu tiết đôi
   */
  validateDoublePeriodRequirements(constraints, violations) {
    // Kiểm tra các tiết đôi phải liên tiếp
    for (let day = 0; day < 7; day++) {
      for (let period = 0; period < 9; period++) {
        const lesson1 = constraints.schedule[day][period];
        const lesson2 = constraints.schedule[day][period + 1];

        if (
          lesson1 &&
          lesson2 &&
          lesson1.type === "double" &&
          lesson2.type === "double"
        ) {
          if (lesson1.subject.toString() !== lesson2.subject.toString()) {
            violations.push({
              type: "double_period_mismatch",
              day,
              period,
              message: `Tiết đôi không liên tiếp ở ngày ${day + 1}, tiết ${
                period + 1
              }`,
            });
          }
        }
      }
    }
  }

  /**
   * Kiểm tra ưu tiên thời gian
   */
  validateTimePreferences(constraints, violations) {
    // Kiểm tra môn học ưu tiên nên ở buổi sáng
    for (const [subjectId, requirement] of constraints.subjectRequirements) {
      if (requirement.morningPreference) {
        let morningLessons = 0;
        let totalLessons = 0;

        for (let day = 0; day < 7; day++) {
          for (let period = 0; period < 10; period++) {
            const lesson = constraints.schedule[day][period];
            if (
              lesson &&
              lesson.subject &&
              lesson.subject.toString() === subjectId
            ) {
              totalLessons++;
              if (period < 5) {
                // Buổi sáng
                morningLessons++;
              }
            }
          }
        }

        const morningRatio =
          totalLessons > 0 ? morningLessons / totalLessons : 0;
        if (morningRatio < 0.6) {
          // Ít nhất 60% ở buổi sáng
          violations.push({
            type: "morning_preference_violation",
            subjectId,
            subjectName: requirement.subject.subjectName,
            morningRatio,
            message: `${requirement.subject.subjectName} chỉ có ${(
              morningRatio * 100
            ).toFixed(1)}% tiết ở buổi sáng`,
          });
        }
      }
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Lưu lessons vào weekly schedule
   */
  async saveLessonsToWeeklySchedule(constraints, weeklyScheduleId) {
    const lessons = [];

    for (let day = 0; day < 7; day++) {
      for (let period = 0; period < 10; period++) {
        const lesson = constraints.schedule[day][period];
        if (lesson) {
          lessons.push(lesson);
        }
      }
    }

    // Cập nhật weekly schedule
    await WeeklySchedule.findByIdAndUpdate(weeklyScheduleId, {
      lessons: lessons.map((lesson) => lesson._id),
    });

    return lessons;
  }

  /**
   * In báo cáo lập lịch
   */
  printSchedulingReport(constraints, validationResult) {
    console.log("\n" + "=".repeat(60));
    console.log("📊 BÁO CÁO LẬP LỊCH");
    console.log("=".repeat(60));

    console.log(`📚 Tổng môn học: ${constraints.subjects.length}`);
    console.log(`👥 Tổng giáo viên: ${constraints.teacherSchedules.size}`);
    console.log(`📅 Tổng tiết/tuần: ${constraints.stats.totalWeeklyHours}`);
    console.log(`✅ Tiết đã xếp: ${constraints.stats.scheduledWeeklyHours}`);
    console.log(`🔗 Tiết đôi: ${constraints.stats.doublePeriods}`);
    console.log(
      `🌅 Môn ưu tiên buổi sáng: ${constraints.stats.prioritySubjectsInMorning}`
    );
    console.log(`📈 Ngày học kéo dài: ${constraints.stats.extendedDays}`);

    if (validationResult.violations.length > 0) {
      console.log(
        `\n⚠️ VI PHẠM RÀNG BUỘC (${validationResult.violations.length}):`
      );
      validationResult.violations.forEach((violation, index) => {
        console.log(`   ${index + 1}. ${violation.message}`);
      });
    } else {
      console.log(`\n✅ KHÔNG CÓ VI PHẠM RÀNG BUỘC`);
    }

    console.log("=".repeat(60));
  }

  // ===== SLOT FINDING METHODS =====

  /**
   * Tìm slot tốt nhất cho tiết đôi
   */
  findBestDoubleSlot(constraints, subject, teacher) {
    const scheduleConfig = constraints.scheduleConfig;
    let bestSlot = null;
    let bestScore = -1;

    for (const dayIndex of scheduleConfig.days) {
      for (let period = 0; period < 9; period++) {
        if (
          this.canScheduleDoubleSlot(
            constraints,
            teacher?._id.toString(),
            dayIndex,
            period,
            period + 1
          )
        ) {
          const score = this.calculateDoubleSlotScore(
            constraints,
            dayIndex,
            period,
            subject
          );
          if (score > bestScore) {
            bestScore = score;
            bestSlot = { dayIndex, startPeriod: period };
          }
        }
      }
    }

    return bestSlot;
  }

  /**
   * Kiểm tra có thể xếp tiết đôi không
   */
  canScheduleDoubleSlot(constraints, teacherId, dayIndex, period1, period2) {
    // Kiểm tra slot trống
    if (
      constraints.schedule[dayIndex][period1] ||
      constraints.schedule[dayIndex][period2]
    ) {
      return false;
    }

    // Kiểm tra giáo viên không bị conflict
    if (teacherId) {
      const teacherSchedule = constraints.teacherSchedules.get(teacherId);
      if (teacherSchedule) {
        if (
          teacherSchedule.dailyLessons[dayIndex] + 2 >
          teacherSchedule.maxLessonsPerDay
        ) {
          return false;
        }
      }
    }

    // Kiểm tra không có tiết đôi khác trong ngày
    if (this.hasDoublePeriodInDay(constraints, dayIndex)) {
      return false;
    }

    return true;
  }

  /**
   * Tính điểm cho slot tiết đôi
   */
  calculateDoubleSlotScore(constraints, dayIndex, period, subject) {
    let score = 0;

    // Ưu tiên buổi sáng cho môn học quan trọng
    if (period < 5 && this.PRIORITY_SUBJECTS.includes(subject.subjectName)) {
      score += 10;
    }

    // Ưu tiên không xếp cuối tuần
    if (dayIndex < 4) {
      score += 5;
    }

    // Ưu tiên không xếp đầu tuần
    if (dayIndex > 0) {
      score += 3;
    }

    return score;
  }

  /**
   * Kiểm tra đã có tiết đôi trong ngày chưa
   */
  hasDoublePeriodInDay(constraints, dayIndex) {
    for (let period = 0; period < 9; period++) {
      const lesson1 = constraints.schedule[dayIndex][period];
      const lesson2 = constraints.schedule[dayIndex][period + 1];
      if (
        lesson1 &&
        lesson2 &&
        lesson1.type === "double" &&
        lesson2.type === "double"
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Tìm slot tốt nhất cho tiết đơn
   */
  findBestSingleSlot(constraints, subject, teacher) {
    const scheduleConfig = constraints.scheduleConfig;
    let bestSlot = null;
    let bestScore = -1;

    for (const dayIndex of scheduleConfig.days) {
      for (let period = 0; period < 10; period++) {
        if (
          this.canScheduleSingleSlot(
            constraints,
            subject,
            teacher?._id.toString(),
            dayIndex,
            period
          )
        ) {
          const score = this.calculateSlotScore(
            constraints,
            subject,
            teacher,
            dayIndex,
            period
          );
          if (score > bestScore) {
            bestScore = score;
            bestSlot = { dayIndex, period };
          }
        }
      }
    }

    return bestSlot;
  }

  /**
   * Kiểm tra có thể xếp tiết đơn không
   */
  canScheduleSingleSlot(constraints, subject, teacherId, dayIndex, period) {
    // Kiểm tra slot trống
    if (constraints.schedule[dayIndex][period]) {
      return false;
    }

    // Kiểm tra giáo viên không bị conflict
    if (teacherId) {
      const teacherSchedule = constraints.teacherSchedules.get(teacherId);
      if (teacherSchedule) {
        if (
          teacherSchedule.dailyLessons[dayIndex] >=
          teacherSchedule.maxLessonsPerDay
        ) {
          return false;
        }
      }
    }

    // Kiểm tra không xếp môn học liên tiếp
    if (
      !this.checkConsecutiveSubjectLimit(
        constraints,
        subject._id.toString(),
        dayIndex,
        period
      )
    ) {
      return false;
    }

    return true;
  }

  /**
   * Kiểm tra giới hạn môn học liên tiếp
   */
  checkConsecutiveSubjectLimit(constraints, subjectId, dayIndex, period) {
    const maxConsecutive = 2;
    let consecutiveCount = 0;

    // Kiểm tra phía trước
    for (let i = period - 1; i >= 0 && consecutiveCount < maxConsecutive; i--) {
      const lesson = constraints.schedule[dayIndex][i];
      if (lesson && lesson.subject && lesson.subject.toString() === subjectId) {
        consecutiveCount++;
      } else {
        break;
      }
    }

    // Kiểm tra phía sau
    for (let i = period + 1; i < 10 && consecutiveCount < maxConsecutive; i++) {
      const lesson = constraints.schedule[dayIndex][i];
      if (lesson && lesson.subject && lesson.subject.toString() === subjectId) {
        consecutiveCount++;
      } else {
        break;
      }
    }

    return consecutiveCount < maxConsecutive;
  }

  /**
   * Tính điểm cho slot tiết đơn
   */
  calculateSlotScore(constraints, subject, teacher, dayIndex, period) {
    let score = 0;

    // Ưu tiên buổi sáng cho môn học quan trọng
    if (period < 5 && this.PRIORITY_SUBJECTS.includes(subject.subjectName)) {
      score += 8;
    }

    // Ưu tiên không xếp cuối tuần
    if (dayIndex < 4) {
      score += 3;
    }

    // Ưu tiên không xếp đầu tuần
    if (dayIndex > 0) {
      score += 2;
    }

    // Trừ điểm nếu xếp cuối ngày
    if (period >= 8) {
      score -= 2;
    }

    return score;
  }

  // ===== SCHEDULING HELPER METHODS =====

  /**
   * Xếp tiết đôi
   */
  async scheduleDoubleLesson(
    constraints,
    subject,
    teacher,
    dayIndex,
    startPeriod,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    const scheduledDate = new Date(
      weekStartDate.getTime() + dayIndex * 24 * 60 * 60 * 1000
    );
    // Luôn lấy giáo viên từ assignmentByClassAndSubject
    const assignedTeacher = await this.findSpecializedTeacher(
      subject._id,
      constraints.classId
    );
    subject.teacher = assignedTeacher;
  
    // Tạo lesson cho tiết 1
    const lesson1 = await this.createLesson({
      lessonId: `${constraints.classId.toString().slice(-6)}_${scheduledDate
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}_T${startPeriod + 1}`,
      class: constraints.classId,
      subject: subject._id,
      teacher: assignedTeacher?._id,
      academicYear: academicYearId,
      timeSlot: timeSlots[startPeriod]?._id,
      scheduledDate: scheduledDate,
      type: "double",
      status: "scheduled",
      createdBy,
    });

    // Tạo lesson cho tiết 2
    const lesson2 = await this.createLesson({
      lessonId: `${constraints.classId.toString().slice(-6)}_${scheduledDate
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}_T${startPeriod + 2}`,
      class: constraints.classId,
      subject: subject._id,
      teacher: assignedTeacher?._id,
      academicYear: academicYearId,
      timeSlot: timeSlots[startPeriod + 1]?._id,
      scheduledDate: scheduledDate,
      type: "double",
      status: "scheduled",
      createdBy,
    });

    // Cập nhật ma trận lịch
    constraints.schedule[dayIndex][startPeriod] = lesson1;
    constraints.schedule[dayIndex][startPeriod + 1] = lesson2;

    // Cập nhật lịch giáo viên
    if (assignedTeacher) {
      this.bookTeacherSlot(
        constraints,
        assignedTeacher._id.toString(),
        dayIndex,
        startPeriod
      );
      this.bookTeacherSlot(
        constraints,
        assignedTeacher._id.toString(),
        dayIndex,
        startPeriod + 1
      );
    }

    // Cập nhật thống kê
    constraints.stats.doublePeriods++;
    constraints.stats.scheduledWeeklyHours += 2;

    console.log(
      `✅ Đã xếp tiết đôi ${subject.subjectName} ngày ${dayIndex + 1}, tiết ${
        startPeriod + 1
      }-${startPeriod + 2}`
    );
  }

  /**
   * Xếp tiết đơn
   */
  async scheduleSingleLesson(
    constraints,
    subject,
    teacher,
    dayIndex,
    period,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    const scheduledDate = new Date(
      weekStartDate.getTime() + dayIndex * 24 * 60 * 60 * 1000
    );
    // Luôn lấy giáo viên từ assignmentByClassAndSubject
    const assignedTeacher = await this.findSpecializedTeacher(
      subject._id,
      constraints.classId
    );
    subject.teacher = assignedTeacher;

    const lesson = await this.createLesson({
      lessonId: `${constraints.classId.toString().slice(-6)}_${scheduledDate
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}_T${period + 1}`,
      class: constraints.classId,
      subject: subject._id,
      teacher: assignedTeacher?._id,
      academicYear: academicYearId,
      timeSlot: timeSlots[period]?._id,
      scheduledDate: scheduledDate,
      type: "regular",
      status: "scheduled",
      createdBy,
    });

    // Cập nhật ma trận lịch
    constraints.schedule[dayIndex][period] = lesson;

    // Cập nhật lịch giáo viên
    if (assignedTeacher) {
      this.bookTeacherSlot(
        constraints,
        assignedTeacher._id.toString(),
        dayIndex,
        period
      );
    }

    // Cập nhật thống kê
    constraints.stats.scheduledWeeklyHours++;
    if (period < 5 && this.PRIORITY_SUBJECTS.includes(subject.subjectName)) {
      constraints.stats.prioritySubjectsInMorning++;
    }

    console.log(
      `✅ Đã xếp tiết đơn ${subject.subjectName} ngày ${dayIndex + 1}, tiết ${
        period + 1
      }`
    );
  }

  /**
   * Tạo môn học bổ sung cho tiết cốt lõi
   */
  async createSupplementarySubjectsForCorePeriods(
    constraints,
    coreSlotsNeeded,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    for (const slot of coreSlotsNeeded) {
      const subject = this.findSubjectForCorePeriod(
        constraints,
        slot.dayIndex,
        slot.period
      );
      if (subject) {
        // Luôn lấy giáo viên từ assignmentByClassAndSubject
        const assignedTeacher = await this.findSpecializedTeacher(
          subject._id,
          constraints.classId
        );
        subject.teacher = assignedTeacher;

        const scheduledDate = new Date(
          weekStartDate.getTime() + slot.dayIndex * 24 * 60 * 60 * 1000
        );

        const lesson = await this.createLesson({
          lessonId: `${constraints.classId.toString().slice(-6)}_${scheduledDate
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "")}_T${slot.period}`,
          class: constraints.classId,
          subject: subject._id,
          teacher: assignedTeacher?._id,
          academicYear: academicYearId,
          timeSlot: timeSlots[slot.period - 1]?._id,
          scheduledDate: scheduledDate,
          type: "regular",
          status: "scheduled",
          createdBy,
        });

        constraints.schedule[slot.dayIndex][slot.period - 1] = lesson;

        if (assignedTeacher) {
          this.bookTeacherSlot(
            constraints,
            assignedTeacher._id.toString(),
            slot.dayIndex,
            slot.period - 1
          );
        }
      }
    }
  }

  /**
   * Tìm môn học cho tiết cốt lõi
   */
  findSubjectForCorePeriod(constraints, dayIndex, period) {
    // Tìm môn học chưa đủ tiết và có teacher
    for (const [subjectId, requirement] of constraints.subjectRequirements) {
      if (requirement.scheduledHours < requirement.weeklyHours) {
        const subject = requirement.subject;
        if (subject.teacher) {
          const teacherSchedule = constraints.teacherSchedules.get(
            subject.teacher._id.toString()
          );
          if (
            teacherSchedule &&
            teacherSchedule.dailyLessons[dayIndex] <
              teacherSchedule.maxLessonsPerDay
          ) {
            return subject;
          }
        }
      }
    }
    return null;
  }

  /**
   * Tìm ngày tốt nhất để thêm tiết
   */
  findBestDayForExtraLesson(constraints) {
    const scheduleConfig = constraints.scheduleConfig;
    let bestDay = -1;
    let minLessons = 10;

    for (const dayIndex of scheduleConfig.days) {
      const dayLessons = constraints.schedule[dayIndex].filter(
        (lesson) => lesson !== null
      );
      if (dayLessons.length < minLessons) {
        minLessons = dayLessons.length;
        bestDay = dayIndex;
      }
    }

    return bestDay;
  }

  /**
   * Thêm tiết phụ vào ngày
   */
  async addExtraLessonsToDay(
    constraints,
    dayIndex,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    // Tìm slot trống
    for (let period = 5; period < 10; period++) {
      if (!constraints.schedule[dayIndex][period]) {
        const subject = this.findSubjectForExtraLesson(constraints);
        if (subject && subject.teacher) {
          const scheduledDate = new Date(
            weekStartDate.getTime() + dayIndex * 24 * 60 * 60 * 1000
          );

          const lesson = await this.createLesson({
            lessonId: `${constraints.classId
              .toString()
              .slice(-6)}_${scheduledDate
              .toISOString()
              .slice(0, 10)
              .replace(/-/g, "")}_T${period + 1}`,
            class: constraints.classId,
            subject: subject._id,
            teacher: subject.teacher._id,
            academicYear: academicYearId,
            timeSlot: timeSlots[period]?._id,
            scheduledDate: scheduledDate,
            type: "regular",
            status: "scheduled",
            createdBy,
          });

          constraints.schedule[dayIndex][period] = lesson;

          this.bookTeacherSlot(
            constraints,
            subject.teacher._id.toString(),
            dayIndex,
            period
          );

          console.log(
            `✅ Đã thêm tiết ${subject.subjectName} ngày ${
              dayIndex + 1
            }, tiết ${period + 1}`
          );
          break;
        }
      }
    }
  }

  /**
   * Tìm môn học cho tiết phụ
   */
  findSubjectForExtraLesson(constraints) {
    // Tìm môn học chưa đủ tiết và có teacher
    for (const [subjectId, requirement] of constraints.subjectRequirements) {
      if (requirement.scheduledHours < requirement.weeklyHours) {
        const subject = requirement.subject;
        if (subject.teacher) {
          return subject;
        }
      }
    }
    return null;
  }
}

module.exports = ConstraintSchedulerService;
