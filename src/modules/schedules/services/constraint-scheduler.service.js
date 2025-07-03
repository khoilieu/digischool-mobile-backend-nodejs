const Lesson = require("../models/lesson.model");
const WeeklySchedule = require("../models/weekly-schedule.model");
const User = require("../../auth/models/user.model");

class ConstraintSchedulerService {
  constructor() {
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

    // NEW: Cấu hình lịch học tuần
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

    // NEW: Yêu cầu tối thiểu
    this.MINIMUM_EXTENDED_DAYS = 2; // Tối thiểu 2 ngày học >5 tiết
    this.CORE_PERIODS = [1, 2, 3, 4, 5]; // Tiết 1-5 phải là subject
  }

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

    // Thêm giáo viên bộ môn
    for (const subject of constraints.subjects) {
      const teacher = await this.findSpecializedTeacher(subject._id);
      if (teacher) teacherIds.add(teacher._id.toString());
    }

    // Khởi tạo lịch cho từng giáo viên
    for (const teacherId of teacherIds) {
      constraints.teacherSchedules.set(teacherId, {
        schedule: Array(7)
          .fill()
          .map(() => Array(10).fill(false)),
        workload: { daily: Array(7).fill(0), weekly: 0 },
        constraints: {
          maxLessonsPerDay: 8,
          maxLessonsPerWeek: 30,
          unavailableTimes: [],
        },
      });
    }
  }

  /**
   * NEW: Khởi tạo yêu cầu môn học với đầy đủ weeklyHours
   */
  initializeSubjectRequirements(constraints) {
    let totalWeeklyHours = 0;

    constraints.subjects.forEach((subject) => {
      const weeklyHours = subject.weeklyHours || 3;
      const isPriority = this.PRIORITY_SUBJECTS.includes(subject.subjectName);

      // Tính số tiết đôi dựa trên tổng số tiết và ưu tiên
      let targetDoublePeriods = 0;
      if (weeklyHours >= 4) {
        // 4+ tiết → 2 tiết đôi (sử dụng hết 4 tiết)
        targetDoublePeriods = 2;
      } else if (weeklyHours >= 3 && isPriority) {
        // 3 tiết môn ưu tiên → 1 tiết đôi + 1 tiết đơn
        targetDoublePeriods = 1;
      } else if (weeklyHours >= 2 && isPriority) {
        // 2 tiết môn ưu tiên → 1 tiết đôi
        targetDoublePeriods = 1;
      }

      constraints.subjectRequirements.set(subject._id.toString(), {
        subject,
        required: weeklyHours,
        scheduled: 0,
        doublePeriods: 0,
        isPriority,
        targetDoublePeriods,
        maxDoublePeriodsPerDay: 1,
        dailyScheduled: Array(7).fill(0),
        // NEW: Theo dõi tiết core (1-5) vs tiết chiều (6-10)
        corePeriodsScheduled: 0,
        afternoonPeriodsScheduled: 0,
      });

      totalWeeklyHours += weeklyHours;
    });

    constraints.stats.totalWeeklyHours = totalWeeklyHours;
    console.log(
      `📊 Tổng tiết/tuần theo subject.weeklyHours: ${totalWeeklyHours} tiết`
    );
  }

  /**
   * GIAI ĐOẠN 1: Xếp tiết cố định với options
   */
  async scheduleFixedPeriods(
    constraints,
    weekStartDate,
    timeSlots,
    homeroomTeacher,
    createdBy,
    academicYearId
  ) {
    console.log("🏷️ Giai đoạn 1: Xếp tiết cố định...");

    const { classMeetingDay, classMeetingPeriod } = constraints.scheduleConfig;

    // Chào cờ thứ 2 tiết 1
    const mondayDate = new Date(weekStartDate);
    const flagLesson = await this.createLesson({
      classId: constraints.classId,
      academicYearId,
      dayIndex: 0,
      period: 1,
      type: "fixed",
      fixedInfo: { type: "flag_ceremony", description: "Chào cờ" },
      teacher: homeroomTeacher,
      date: mondayDate,
      timeSlot: timeSlots[0],
      createdBy,
    });

    constraints.schedule[0][0] = flagLesson;
    this.bookTeacherSlot(constraints, homeroomTeacher._id, 0, 1);

    // Sinh hoạt lớp theo config
    const classMeetingDate = new Date(weekStartDate);
    classMeetingDate.setDate(weekStartDate.getDate() + classMeetingDay);
    const classMeetingLesson = await this.createLesson({
      classId: constraints.classId,
      academicYearId,
      dayIndex: classMeetingDay,
      period: classMeetingPeriod,
      type: "fixed",
      fixedInfo: { type: "class_meeting", description: "Sinh hoạt lớp" },
      teacher: homeroomTeacher,
      date: classMeetingDate,
      timeSlot: timeSlots[classMeetingPeriod - 1],
      createdBy,
    });

    constraints.schedule[classMeetingDay][classMeetingPeriod - 1] =
      classMeetingLesson;
    this.bookTeacherSlot(
      constraints,
      homeroomTeacher._id,
      classMeetingDay,
      classMeetingPeriod
    );

    console.log(
      `✅ Tiết cố định: Chào cờ (T2-T1), Sinh hoạt lớp (${
        constraints.scheduleConfig.name.split(" - ")[1]
      }-T${classMeetingPeriod})`
    );
  }

  /**
   * GIAI ĐOẠN 2: Xếp tiết đôi theo target (4 tiết → 2 tiết đôi ở 2 ngày khác nhau)
   */
  async scheduleDoublePeriods(
    constraints,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    console.log("🔗 Giai đoạn 2: Xếp tiết đôi (Văn, Toán, Anh)...");

    // Lọc các môn cần tiết đôi
    const subjectsNeedingDouble = constraints.subjects.filter((subject) => {
      const requirement = constraints.subjectRequirements.get(
        subject._id.toString()
      );
      return requirement.targetDoublePeriods > 0;
    });

    // Sắp xếp ưu tiên: môn có nhiều tiết đôi nhất trước
    subjectsNeedingDouble.sort((a, b) => {
      const reqA = constraints.subjectRequirements.get(a._id.toString());
      const reqB = constraints.subjectRequirements.get(b._id.toString());
      return reqB.targetDoublePeriods - reqA.targetDoublePeriods;
    });

    for (const subject of subjectsNeedingDouble) {
      const requirement = constraints.subjectRequirements.get(
        subject._id.toString()
      );
      const teacher = await this.findSpecializedTeacher(subject._id);

      if (!teacher) {
        constraints.violations.push({
          type: "NO_SPECIALIZED_TEACHER",
          subject: subject.subjectName,
          priority: "CRITICAL",
        });
        continue;
      }

      // Xếp số tiết đôi theo target (ví dụ: Toán 4 tiết → 2 tiết đôi ở 2 ngày khác nhau)
      for (let dp = 0; dp < requirement.targetDoublePeriods; dp++) {
        const slot = this.findBestDoubleSlot(constraints, subject, teacher);

        if (slot) {
          await this.scheduleDoubleLesson(
            constraints,
            subject,
            teacher,
            slot.dayIndex,
            slot.startPeriod,
            weekStartDate,
            timeSlots,
            createdBy,
            academicYearId
          );

          requirement.doublePeriods++;
          requirement.scheduled += 2;
          constraints.stats.doublePeriods++;

          // Kiểm tra có trong buổi sáng không
          if (this.MORNING_PERIODS.includes(slot.startPeriod)) {
            constraints.stats.prioritySubjectsInMorning++;
          }

          console.log(
            `✅ Tiết đôi: ${subject.subjectName} - Ngày ${
              slot.dayIndex + 1
            }, T${slot.startPeriod}-${slot.startPeriod + 1}`
          );
        } else {
          console.log(
            `⚠️ Không thể xếp tiết đôi ${dp + 1}/${
              requirement.targetDoublePeriods
            } cho ${subject.subjectName}`
          );
          constraints.violations.push({
            type: "CANNOT_SCHEDULE_DOUBLE_PERIOD",
            subject: subject.subjectName,
            reason: `Không tìm được khe cho tiết đôi ${dp + 1}/${
              requirement.targetDoublePeriods
            }`,
            priority: "HIGH",
          });
        }
      }
    }
  }

  /**
   * Tìm khe trống tốt nhất cho tiết đôi - RÃI ĐỀU T2-T6, MỖI NGÀY TỐI ĐA 1 CẶP
   */
  findBestDoubleSlot(constraints, subject, teacher) {
    const requirement = constraints.subjectRequirements.get(
      subject._id.toString()
    );
    const workingDays = constraints.scheduleConfig.days; // Lấy ngày làm việc từ config

    // RÀNG BUỘC: Không xếp tiết đôi qua giờ nghỉ lớn (sau tiết 5)
    const morningSlots = [
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ];
    const afternoonSlots = [
      [6, 7],
      [7, 8],
      [8, 9],
    ];

    // RÀNG BUỘC: Môn ưu tiên vào buổi sáng
    const slotsToCheck = this.PRIORITY_SUBJECTS.includes(subject.subjectName)
      ? [...morningSlots, ...afternoonSlots]
      : [...afternoonSlots, ...morningSlots];

    // Tạo danh sách các slot khả dụng với điểm số
    const availableSlots = [];

    // Kiểm tra các ngày làm việc theo config
    for (const dayIndex of workingDays) {
      // RÀNG BUỘC: Kiểm tra không có tiết nào của môn này trong ngày
      if (requirement.dailyScheduled[dayIndex] > 0) {
        continue; // Skip this day if subject already has lessons
      }

      // RÀNG BUỘC MỚI: Kiểm tra ngày này đã có tiết đôi chưa (tối đa 1 cặp/ngày)
      if (this.hasDoublePeriodInDay(constraints, dayIndex)) {
        continue; // Skip if this day already has a double period
      }

      for (const [period1, period2] of slotsToCheck) {
        if (
          this.canScheduleDoubleSlot(
            constraints,
            teacher._id,
            dayIndex,
            period1,
            period2
          )
        ) {
          // Tính điểm ưu tiên để rãi đều
          let score = this.calculateDoubleSlotScore(
            constraints,
            dayIndex,
            period1,
            subject
          );

          availableSlots.push({
            dayIndex,
            startPeriod: period1,
            score,
          });
        }
      }
    }

    // Sắp xếp theo điểm (cao nhất trước)
    availableSlots.sort((a, b) => b.score - a.score);

    return availableSlots.length > 0 ? availableSlots[0] : null;
  }

  /**
   * Kiểm tra xem ngày đã có tiết đôi chưa
   */
  hasDoublePeriodInDay(constraints, dayIndex) {
    // Kiểm tra các cặp tiết liên tiếp có cùng môn không
    for (let period = 1; period <= 9; period++) {
      const lesson1 = constraints.schedule[dayIndex][period - 1];
      const lesson2 = constraints.schedule[dayIndex][period];

      if (
        lesson1 &&
        lesson2 &&
        lesson1.subject &&
        lesson2.subject &&
        lesson1.subject.toString() === lesson2.subject.toString()
      ) {
        return true; // Đã có tiết đôi
      }
    }
    return false;
  }

  /**
   * Tính điểm cho slot tiết đôi để rãi đều
   */
  calculateDoubleSlotScore(constraints, dayIndex, period, subject) {
    let score = 0;

    // Đếm số tiết đôi đã có trong ngày này
    let doubleLessonsThisDay = 0;
    for (let p = 0; p < 10; p++) {
      if (constraints.schedule[dayIndex][p] !== null) {
        doubleLessonsThisDay++;
      }
    }

    // Ưu tiên ngày có ít tiết đôi hơn (để rãi đều)
    score += (10 - doubleLessonsThisDay) * 20;

    // Ưu tiên buổi sáng cho môn quan trọng
    if (this.PRIORITY_SUBJECTS.includes(subject.subjectName) && period <= 5) {
      score += 30;
    }

    // Ưu tiên các ngày T2, T4, T6 cho tiết đôi (rãi đều trong tuần)
    if ([0, 2, 4].includes(dayIndex)) {
      score += 25;
    }

    // Tránh tiết đầu và cuối ngày
    if (period === 1 || period >= 9) {
      score -= 10;
    }

    return score;
  }

  /**
   * Kiểm tra có thể xếp tiết đôi không
   */
  canScheduleDoubleSlot(constraints, teacherId, dayIndex, period1, period2) {
    // RÀNG BUỘC: Một lớp tại một thời điểm CHỈ học 1 môn
    if (
      constraints.schedule[dayIndex][period1 - 1] !== null ||
      constraints.schedule[dayIndex][period2 - 1] !== null
    )
      return false;

    // RÀNG BUỘC: Một giáo viên KHÔNG được dạy 2 tiết cùng lúc
    const teacherSchedule = constraints.teacherSchedules.get(
      teacherId.toString()
    );
    if (!teacherSchedule) return false;

    if (
      teacherSchedule.schedule[dayIndex][period1 - 1] ||
      teacherSchedule.schedule[dayIndex][period2 - 1]
    )
      return false;

    // RÀNG BUỘC: Không vượt quá maxLessonsPerDay
    if (
      teacherSchedule.workload.daily[dayIndex] + 2 >
      teacherSchedule.constraints.maxLessonsPerDay
    )
      return false;

    return true;
  }

  /**
   * Xếp tiết đôi với liên kết đúng
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
    const date = new Date(weekStartDate);
    date.setDate(weekStartDate.getDate() + dayIndex);

    const lesson1 = await this.createLesson({
      classId: constraints.classId,
      academicYearId,
      dayIndex,
      period: startPeriod,
      type: "regular",
      subject,
      teacher,
      date,
      timeSlot: timeSlots[startPeriod - 1],
      createdBy,
      notes: `Tiết đôi - Phần 1/2`,
    });

    const lesson2 = await this.createLesson({
      classId: constraints.classId,
      academicYearId,
      dayIndex,
      period: startPeriod + 1,
      type: "regular",
      subject,
      teacher,
      date,
      timeSlot: timeSlots[startPeriod],
      createdBy,
      notes: `Tiết đôi - Phần 2/2`,
    });

    constraints.schedule[dayIndex][startPeriod - 1] = lesson1;
    constraints.schedule[dayIndex][startPeriod] = lesson2;

    this.bookTeacherSlot(constraints, teacher._id, dayIndex, startPeriod);
    this.bookTeacherSlot(constraints, teacher._id, dayIndex, startPeriod + 1);

    // Update subject requirements including daily tracking
    const requirement = constraints.subjectRequirements.get(
      subject._id.toString()
    );
    requirement.scheduled += 2;
    requirement.doublePeriods += 1;
    requirement.dailyScheduled[dayIndex] += 2; // Track daily lessons

    return [lesson1, lesson2];
  }

  /**
   * GIAI ĐOẠN 3: Xếp tiết đơn - ĐẢM BẢO TIẾT 1-5 LUÔN CÓ SUBJECT...
   */
  async scheduleSinglePeriods(
    constraints,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    console.log(
      "📚 Giai đoạn 3: Xếp tiết đơn - ĐẢM BẢO TIẾT 1-5 LUÔN CÓ SUBJECT..."
    );

    const remainingPeriods = [];

    // Tạo danh sách tiết còn lại cần xếp
    for (const subject of constraints.subjects) {
      const requirement = constraints.subjectRequirements.get(
        subject._id.toString()
      );
      const remaining = requirement.required - requirement.scheduled;

      for (let i = 0; i < remaining; i++) {
        const teacher = await this.findSpecializedTeacher(subject._id);
        if (teacher) {
          remainingPeriods.push({
            subject,
            teacher,
            priority: this.SUBJECT_PRIORITIES[subject.subjectName] || 1,
          });
        }
      }
    }

    // Sắp xếp theo độ ưu tiên
    remainingPeriods.sort((a, b) => b.priority - a.priority);

    // GIAI ĐOẠN 3A: BẮT BUỘC PHẢI ĐIỀN TIẾT 1-5 (CORE PERIODS)
    console.log("🏛️ GIAI ĐOẠN 3A: BẮT BUỘC điền tiết 1-5 (CORE PERIODS)...");
    await this.enforceCorePeriods(
      constraints,
      remainingPeriods,
      weekStartDate,
      timeSlots,
      createdBy,
      academicYearId
    );

    // Filter out scheduled periods
    const stillRemaining = remainingPeriods.filter((period) => {
      const requirement = constraints.subjectRequirements.get(
        period.subject._id.toString()
      );
      return requirement.scheduled < requirement.required;
    });

    // GIAI ĐOẠN 3B: Điền tiết còn lại vào tiết 6-8 (ưu tiên), 9-10 (hạn chế)
    console.log(
      "🌆 GIAI ĐOẠN 3B: Điền tiết còn lại - Ưu tiên T6-8, hạn chế T9-10..."
    );

    // Ưu tiên tiết 6-8 trước
    for (const period of stillRemaining) {
      const requirement = constraints.subjectRequirements.get(
        period.subject._id.toString()
      );
      if (requirement.scheduled >= requirement.required) continue;

      const slot = this.findBestSingleSlotInRange(
        constraints,
        period.subject,
        period.teacher,
        6,
        8
      );

      if (slot) {
        await this.scheduleSingleLesson(
          constraints,
          period.subject,
          period.teacher,
          slot.dayIndex,
          slot.period,
          weekStartDate,
          timeSlots,
          createdBy,
          academicYearId
        );

        requirement.scheduled++;
        console.log(
          `✅ Tiết đơn (T6-8): ${period.subject.subjectName} - Ngày ${
            slot.dayIndex + 1
          }, T${slot.period}`
        );
      }
    }

    // Sau đó mới dùng tiết 9-10 nếu cần thiết
    for (const period of stillRemaining) {
      const requirement = constraints.subjectRequirements.get(
        period.subject._id.toString()
      );
      if (requirement.scheduled >= requirement.required) continue;

      const slot = this.findBestSingleSlotInRange(
        constraints,
        period.subject,
        period.teacher,
        9,
        10
      );

      if (slot) {
        await this.scheduleSingleLesson(
          constraints,
          period.subject,
          period.teacher,
          slot.dayIndex,
          slot.period,
          weekStartDate,
          timeSlots,
          createdBy,
          academicYearId
        );

        requirement.scheduled++;
        console.log(
          `⚠️ Tiết đơn (T9-10): ${period.subject.subjectName} - Ngày ${
            slot.dayIndex + 1
          }, T${slot.period}`
        );
      } else {
        constraints.violations.push({
          type: "CANNOT_SCHEDULE_SINGLE_PERIOD",
          subject: period.subject.subjectName,
          reason: "Không tìm được khe trống phù hợp",
          priority: "MEDIUM",
        });
      }
    }

    // Kiểm tra và đảm bảo ít nhất 2 ngày có > 5 tiết
    await this.ensureMinimumExtendedDays(
      constraints,
      weekStartDate,
      timeSlots,
      createdBy,
      academicYearId
    );
  }

  /**
   * MỚI: BẮT BUỘC điền tiết 1-5 (thứ 2-6) với subject
   */
  async enforceCorePeriods(
    constraints,
    remainingPeriods,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    console.log("🏛️ Bắt buộc điền tất cả tiết 1-5 (T2-T6) với subject...");

    // Đếm số slot trống trong tiết 1-5
    let emptyCoreSlots = 0;
    const coreSlotsNeeded = [];

    for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
      // T2-T6
      for (let period = 1; period <= 5; period++) {
        if (constraints.schedule[dayIndex][period - 1] === null) {
          emptyCoreSlots++;
          coreSlotsNeeded.push({ dayIndex, period });
        }
      }
    }

    console.log(
      `🎯 Cần điền ${emptyCoreSlots} tiết trống trong core periods (T1-5)`
    );

    // Nếu không đủ subject để điền, phải tạo thêm
    while (coreSlotsNeeded.length > 0 && remainingPeriods.length > 0) {
      const slot = coreSlotsNeeded.shift();
      const period = remainingPeriods.shift();

      if (
        this.canScheduleSingleSlot(
          constraints,
          period.subject,
          period.teacher._id,
          slot.dayIndex,
          slot.period
        )
      ) {
        await this.scheduleSingleLesson(
          constraints,
          period.subject,
          period.teacher,
          slot.dayIndex,
          slot.period,
          weekStartDate,
          timeSlots,
          createdBy,
          academicYearId
        );

        const requirement = constraints.subjectRequirements.get(
          period.subject._id.toString()
        );
        requirement.scheduled++;
        requirement.dailyScheduled[slot.dayIndex]++;

        console.log(
          `🏛️ CORE PERIOD: ${period.subject.subjectName} - Ngày ${
            slot.dayIndex + 1
          }, T${slot.period}`
        );
      } else {
        // Nếu không thể xếp, thử với subject khác
        remainingPeriods.push(period);
        coreSlotsNeeded.push(slot);

        // Tránh vòng lặp vô hạn
        if (remainingPeriods.length < coreSlotsNeeded.length) {
          console.log(
            "⚠️ Không đủ subject để điền tất cả core periods, sẽ tạo subject bổ sung..."
          );
          await this.createSupplementarySubjectsForCorePeriods(
            constraints,
            coreSlotsNeeded,
            weekStartDate,
            timeSlots,
            createdBy,
            academicYearId
          );
          break;
        }
      }
    }

    // Nếu vẫn còn core slots trống, cần xử lý đặc biệt
    if (coreSlotsNeeded.length > 0) {
      console.log(
        `⚠️ Vẫn còn ${coreSlotsNeeded.length} core slots trống, đang xử lý...`
      );
      await this.createSupplementarySubjectsForCorePeriods(
        constraints,
        coreSlotsNeeded,
        weekStartDate,
        timeSlots,
        createdBy,
        academicYearId
      );
    }
  }

  /**
   * MỚI: Tạo subject bổ sung để điền core periods
   */
  async createSupplementarySubjectsForCorePeriods(
    constraints,
    coreSlotsNeeded,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    console.log("🔧 Tạo subject bổ sung để điền core periods...");

    // Tìm subject có thể mở rộng thêm tiết
    const extensibleSubjects = constraints.subjects.filter((subject) => {
      const requirement = constraints.subjectRequirements.get(
        subject._id.toString()
      );
      return requirement.scheduled >= requirement.required; // Đã đủ tiết nhưng có thể thêm
    });

    // Sắp xếp theo độ ưu tiên
    extensibleSubjects.sort((a, b) => {
      const priorityA = this.SUBJECT_PRIORITIES[a.subjectName] || 1;
      const priorityB = this.SUBJECT_PRIORITIES[b.subjectName] || 1;
      return priorityB - priorityA;
    });

    for (const slot of coreSlotsNeeded) {
      let scheduled = false;

      // Thử từng subject có thể mở rộng
      for (const subject of extensibleSubjects) {
        const teacher = await this.findSpecializedTeacher(subject._id);
        if (
          teacher &&
          this.canScheduleSingleSlot(
            constraints,
            subject,
            teacher._id,
            slot.dayIndex,
            slot.period
          )
        ) {
          await this.scheduleSingleLesson(
            constraints,
            subject,
            teacher,
            slot.dayIndex,
            slot.period,
            weekStartDate,
            timeSlots,
            createdBy,
            academicYearId
          );

          const requirement = constraints.subjectRequirements.get(
            subject._id.toString()
          );
          requirement.scheduled++;
          requirement.dailyScheduled[slot.dayIndex]++;

          console.log(
            `🔧 SUPPLEMENTARY: ${subject.subjectName} - Ngày ${
              slot.dayIndex + 1
            }, T${slot.period}`
          );
          scheduled = true;
          break;
        }
      }

      if (!scheduled) {
        console.log(
          `❌ Không thể điền slot: Ngày ${slot.dayIndex + 1}, T${slot.period}`
        );
        constraints.violations.push({
          type: "CANNOT_FILL_CORE_PERIOD",
          dayIndex: slot.dayIndex,
          period: slot.period,
          reason: "Không có subject phù hợp",
          priority: "CRITICAL",
        });
      }
    }
  }

  /**
   * Tìm khe trống tốt nhất cho tiết đơn - CHỈ T2-T6
   */
  findBestSingleSlot(constraints, subject, teacher) {
    return this.findBestSingleSlotInRange(constraints, subject, teacher, 1, 10);
  }

  /**
   * Tìm khe trống tốt nhất cho tiết đơn trong khoảng tiết nhất định
   */
  findBestSingleSlotInRange(
    constraints,
    subject,
    teacher,
    startPeriod,
    endPeriod
  ) {
    const requirement = constraints.subjectRequirements.get(
      subject._id.toString()
    );
    const workingDays = constraints.scheduleConfig.days; // Lấy ngày làm việc từ config
    const slots = [];

    // Tạo danh sách tất cả khe có thể - theo ngày làm việc
    for (const dayIndex of workingDays) {
      // RÀNG BUỘC: Ưu tiên ngày chưa có môn này
      const hasSubjectToday = requirement.dailyScheduled[dayIndex] > 0;

      for (let period = startPeriod; period <= endPeriod; period++) {
        if (
          this.canScheduleSingleSlot(
            constraints,
            subject,
            teacher._id,
            dayIndex,
            period
          )
        ) {
          let score = this.calculateSlotScore(
            constraints,
            subject,
            teacher,
            dayIndex,
            period
          );

          // Bonus điểm cho ngày chưa có môn này
          if (!hasSubjectToday) {
            score += 100;
          }

          // BONUS CỰC LỚN cho tiết 1-5 để đảm bảo luôn đầy
          if (period >= 1 && period <= 5) {
            score += 500; // Tăng từ 200 lên 500
          }

          // Penalty cho tiết 9-10 để hạn chế sử dụng
          if (period >= 9 && period <= 10) {
            score -= 100;
          }

          // Bonus trung bình cho tiết 6-8
          if (period >= 6 && period <= 8) {
            score += 50;
          }

          // Bonus cho việc rãi đều qua các ngày
          let lessonsThisDay = 0;
          for (let p = 0; p < 10; p++) {
            if (constraints.schedule[dayIndex][p] !== null) {
              lessonsThisDay++;
            }
          }
          // Ưu tiên ngày có ít tiết hơn
          score += (10 - lessonsThisDay) * 15;

          // CRITICAL: Nếu đây là core period (1-5) và slot trống, bonus cực lớn
          if (
            period >= 1 &&
            period <= 5 &&
            constraints.schedule[dayIndex][period - 1] === null
          ) {
            score += 1000; // Bonus cực lớn
          }

          slots.push({
            dayIndex,
            period,
            score,
          });
        }
      }
    }

    // Sắp xếp theo điểm (cao nhất trước)
    slots.sort((a, b) => b.score - a.score);
    return slots.length > 0 ? slots[0] : null;
  }

  /**
   * GIAI ĐOẠN 4: Đảm bảo tiết 1-5 luôn có môn học (không được trống)
   */
  async ensureCorePeriodRequirements(
    constraints,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    console.log("🎯 Giai đoạn 4: Đảm bảo tiết 1-5 luôn có môn học...");

    const workingDays = constraints.scheduleConfig.days;
    let corePeriodsFixed = 0;

    // Kiểm tra từng ngày làm việc
    for (const dayIndex of workingDays) {
      // Kiểm tra tiết 1-5 của ngày này
      for (let period = 1; period <= this.CORE_PERIODS.length; period++) {
        const currentLesson = constraints.schedule[dayIndex][period - 1];

        if (currentLesson === null) {
          // Tìm môn học phù hợp để điền vào khe trống
          const suitableSubject = this.findSubjectForCorePeriod(
            constraints,
            dayIndex,
            period
          );

          if (suitableSubject) {
            const teacher = await this.findSpecializedTeacher(
              suitableSubject._id
            );

            if (
              teacher &&
              this.canScheduleSingleSlot(
                constraints,
                suitableSubject,
                teacher._id,
                dayIndex,
                period
              )
            ) {
              // Tạo tiết học bổ sung
              await this.scheduleSingleLesson(
                constraints,
                suitableSubject,
                teacher,
                dayIndex,
                period,
                weekStartDate,
                timeSlots,
                createdBy,
                academicYearId
              );

              const requirement = constraints.subjectRequirements.get(
                suitableSubject._id.toString()
              );
              requirement.scheduled++;
              requirement.corePeriodsScheduled++;
              requirement.dailyScheduled[dayIndex]++;

              corePeriodsFixed++;
              console.log(
                `✅ Điền tiết core: ${suitableSubject.subjectName} - Ngày ${
                  dayIndex + 1
                }, T${period}`
              );
            } else {
              // Tạo tiết tự học nếu không tìm được môn phù hợp
              const selfStudyDate = new Date(weekStartDate);
              selfStudyDate.setDate(weekStartDate.getDate() + dayIndex);

              const selfStudyLesson = await this.createLesson({
                classId: constraints.classId,
                academicYearId,
                dayIndex,
                period,
                type: "self_study",
                fixedInfo: { type: "self_study", description: "Tự học" },
                teacher: constraints.homeroomTeacher,
                date: selfStudyDate,
                timeSlot: timeSlots[period - 1],
                createdBy,
              });

              constraints.schedule[dayIndex][period - 1] = selfStudyLesson;
              this.bookTeacherSlot(
                constraints,
                constraints.homeroomTeacher._id,
                dayIndex,
                period
              );

              corePeriodsFixed++;
              console.log(
                `⚠️ Tạo tiết tự học: Ngày ${
                  dayIndex + 1
                }, T${period} (không tìm được môn phù hợp)`
              );
            }
          }
        }
      }
    }

    console.log(`✅ Đã điền ${corePeriodsFixed} tiết core trống`);
  }

  /**
   * Tìm môn học phù hợp để điền vào tiết core
   */
  findSubjectForCorePeriod(constraints, dayIndex, period) {
    // Tìm môn học chưa đủ tiết và phù hợp với tiết core
    const suitableSubjects = [];

    for (const [subjectId, requirement] of constraints.subjectRequirements) {
      if (requirement.scheduled < requirement.required) {
        // Kiểm tra môn này có thể học vào tiết này không
        if (requirement.dailyScheduled[dayIndex] < 2) {
          // Tối đa 2 tiết/ngày
          suitableSubjects.push({
            subject: requirement.subject,
            remainingHours: requirement.required - requirement.scheduled,
            isPriority: requirement.isPriority,
          });
        }
      }
    }

    if (suitableSubjects.length === 0) return null;

    // Sắp xếp ưu tiên: môn ưu tiên trước, môn thiếu nhiều tiết trước
    suitableSubjects.sort((a, b) => {
      if (a.isPriority !== b.isPriority) {
        return b.isPriority ? 1 : -1; // Môn ưu tiên trước
      }
      return b.remainingHours - a.remainingHours; // Môn thiếu nhiều tiết trước
    });

    return suitableSubjects[0].subject;
  }

  /**
   * GIAI ĐOẠN 5: Đảm bảo ít nhất 2 ngày có > 5 tiết có subject
   */
  async ensureMinimumExtendedDays(
    constraints,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    console.log("📊 Kiểm tra ít nhất 2 ngày có > 5 tiết...");

    let extendedDays = 0;
    const dayStats = [];
    const workingDays = constraints.scheduleConfig.days; // Lấy ngày làm việc từ config

    // Đếm số tiết có subject mỗi ngày làm việc
    for (const dayIndex of workingDays) {
      let subjectLessons = 0;
      for (let period = 0; period < 10; period++) {
        const lesson = constraints.schedule[dayIndex][period];
        if (lesson && lesson.subject) {
          subjectLessons++;
        }
      }

      dayStats.push({
        dayIndex,
        subjectLessons,
        isExtended: subjectLessons > 5,
      });

      if (subjectLessons > 5) {
        extendedDays++;
      }

      const dayName =
        dayIndex === 0
          ? "T2"
          : dayIndex === 1
          ? "T3"
          : dayIndex === 2
          ? "T4"
          : dayIndex === 3
          ? "T5"
          : dayIndex === 4
          ? "T6"
          : "T7";
      console.log(
        `   ${dayName}: ${subjectLessons} tiết có subject ${
          subjectLessons > 5 ? "✅" : ""
        }`
      );
    }

    // Nếu chưa đủ 2 ngày extended, thêm tiết vào các ngày cần thiết
    if (extendedDays < this.MINIMUM_EXTENDED_DAYS) {
      console.log(
        `⚠️ Chỉ có ${extendedDays} ngày > 5 tiết, cần thêm ${
          this.MINIMUM_EXTENDED_DAYS - extendedDays
        } ngày...`
      );

      // Tìm ngày có ít tiết nhất để thêm
      const candidateDays = dayStats
        .filter((d) => !d.isExtended && d.subjectLessons <= 8) // Không quá tải
        .sort((a, b) => b.subjectLessons - a.subjectLessons); // Ưu tiên ngày có nhiều tiết hơn

      for (
        let i = 0;
        i <
        Math.min(
          this.MINIMUM_EXTENDED_DAYS - extendedDays,
          candidateDays.length
        );
        i++
      ) {
        const targetDay = candidateDays[i];
        const dayName =
          targetDay.dayIndex === 0
            ? "T2"
            : targetDay.dayIndex === 1
            ? "T3"
            : targetDay.dayIndex === 2
            ? "T4"
            : targetDay.dayIndex === 3
            ? "T5"
            : targetDay.dayIndex === 4
            ? "T6"
            : "T7";
        console.log(`🎯 Thêm tiết cho ${dayName}...`);

        // Thêm tiết vào tiết 6-10 cho ngày này
        await this.addExtraLessonsToDay(
          constraints,
          targetDay.dayIndex,
          weekStartDate,
          timeSlots,
          createdBy,
          academicYearId
        );
      }
    } else {
      console.log(`✅ Đã có ${extendedDays} ngày > 5 tiết, đạt yêu cầu`);
    }
  }

  /**
   * Thêm tiết bổ sung cho một ngày
   */
  async addExtraLessonsToDay(
    constraints,
    dayIndex,
    weekStartDate,
    timeSlots,
    createdBy,
    academicYearId
  ) {
    // Tìm môn học có thể thêm tiết
    for (const subject of constraints.subjects) {
      const requirement = constraints.subjectRequirements.get(
        subject._id.toString()
      );

      // Chỉ thêm nếu môn này chưa có tiết trong ngày này
      if (requirement.dailyScheduled[dayIndex] === 0) {
        const teacher = await this.findSpecializedTeacher(subject._id);
        if (teacher) {
          // Tìm slot trong tiết 6-10
          for (let period = 6; period <= 10; period++) {
            if (
              this.canScheduleSingleSlot(
                constraints,
                subject,
                teacher._id,
                dayIndex,
                period
              )
            ) {
              await this.scheduleSingleLesson(
                constraints,
                subject,
                teacher,
                dayIndex,
                period,
                weekStartDate,
                timeSlots,
                createdBy,
                academicYearId
              );

              requirement.scheduled++;
              requirement.dailyScheduled[dayIndex]++;

              console.log(
                `   ➕ Thêm ${subject.subjectName} - Ngày ${
                  dayIndex + 1
                }, T${period}`
              );
              return; // Chỉ thêm 1 tiết
            }
          }
        }
      }
    }
  }

  /**
   * Tính điểm ưu tiên cho khe thời gian
   */
  calculateSlotScore(constraints, subject, teacher, dayIndex, period) {
    let score = 0;

    // RÀNG BUỘC: Môn ưu tiên vào buổi sáng
    if (
      this.PRIORITY_SUBJECTS.includes(subject.subjectName) &&
      this.MORNING_PERIODS.includes(period)
    ) {
      score += 50;
    }

    // RÀNG BUỘC: Thể dục không tiết 1 và sau ăn trường
    if (subject.subjectName === "Physical Education") {
      if (period === 1) score -= 100; // Không tiết đầu
      if (period === 6) score -= 50; // Không sau ăn trường
    }

    // RÀNG BUỘC: Môn thực hành ưu tiên buổi chiều
    const practicalSubjects = [
      "Computer Science",
      "Chemistry Lab",
      "Physics Lab",
    ];
    if (
      practicalSubjects.includes(subject.subjectName) &&
      this.AFTERNOON_PERIODS.includes(period)
    ) {
      score += 30;
    }

    // Cân bằng khối lượng giáo viên
    const teacherSchedule = constraints.teacherSchedules.get(
      teacher._id.toString()
    );
    if (teacherSchedule) {
      const dailyLoad = teacherSchedule.workload.daily[dayIndex];
      if (dailyLoad < 3) score += 20; // Ưu tiên ngày ít việc
      if (dailyLoad > 6) score -= 30; // Tránh ngày quá tải
    }

    return score;
  }

  /**
   * Kiểm tra có thể xếp tiết đơn không
   */
  canScheduleSingleSlot(constraints, subject, teacherId, dayIndex, period) {
    // Kiểm tra cơ bản
    if (constraints.schedule[dayIndex][period - 1] !== null) return false;

    const teacherSchedule = constraints.teacherSchedules.get(
      teacherId.toString()
    );
    if (!teacherSchedule) return false;

    if (teacherSchedule.schedule[dayIndex][period - 1]) return false;

    // Giới hạn tiết/ngày
    if (
      teacherSchedule.workload.daily[dayIndex] >=
      teacherSchedule.constraints.maxLessonsPerDay
    )
      return false;

    // RÀNG BUỘC: Không quá 3 tiết liên tiếp cùng môn
    if (
      this.checkConsecutiveSubjectLimit(
        constraints,
        subject._id,
        dayIndex,
        period
      )
    )
      return false;

    return true;
  }

  /**
   * Kiểm tra giới hạn tiết liên tiếp (tối đa 3)
   */
  checkConsecutiveSubjectLimit(constraints, subjectId, dayIndex, period) {
    let count = 1; // Bao gồm tiết hiện tại

    // Kiểm tra ngược lại
    for (let p = period - 1; p >= 1; p--) {
      const lesson = constraints.schedule[dayIndex][p - 1];
      if (
        lesson &&
        lesson.subject &&
        lesson.subject.toString() === subjectId.toString()
      ) {
        count++;
      } else break;
    }

    // Kiểm tra tiến tới
    for (let p = period + 1; p <= 10; p++) {
      const lesson = constraints.schedule[dayIndex][p - 1];
      if (
        lesson &&
        lesson.subject &&
        lesson.subject.toString() === subjectId.toString()
      ) {
        count++;
      } else break;
    }

    return count > 3;
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
    const date = new Date(weekStartDate);
    date.setDate(weekStartDate.getDate() + dayIndex);

    const lesson = await this.createLesson({
      classId: constraints.classId,
      academicYearId,
      dayIndex,
      period,
      type: "regular",
      subject,
      teacher,
      date,
      timeSlot: timeSlots[period - 1],
      createdBy,
    });

    constraints.schedule[dayIndex][period - 1] = lesson;
    this.bookTeacherSlot(constraints, teacher._id, dayIndex, period);

    // Update daily tracking
    const requirement = constraints.subjectRequirements.get(
      subject._id.toString()
    );
    requirement.dailyScheduled[dayIndex] += 1;

    return lesson;
  }

  /**
   * GIAI ĐOẠN 4: Điền khe trống
   */
  async fillEmptySlots(
    constraints,
    weekStartDate,
    timeSlots,
    homeroomTeacher,
    createdBy,
    academicYearId
  ) {
    console.log("🔄 Giai đoạn 4: Điền khe trống - KIỂM TRA CORE PERIODS...");

    // KIỂM TRA: Tiết 1-5 KHÔNG ĐƯỢC TRỐNG
    let corePeriodViolations = 0;
    for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
      for (let period = 1; period <= 5; period++) {
        if (constraints.schedule[dayIndex][period - 1] === null) {
          corePeriodViolations++;
          console.log(
            `❌ VI PHẠM: Tiết ${period} ngày ${
              dayIndex + 1
            } vẫn trống trong core periods!`
          );

          constraints.violations.push({
            type: "CORE_PERIOD_EMPTY",
            dayIndex: dayIndex,
            period: period,
            reason: "Tiết 1-5 không được để trống",
            priority: "CRITICAL",
          });
        }
      }
    }

    if (corePeriodViolations > 0) {
      console.log(
        `🚨 CẢNH BÁO: ${corePeriodViolations} tiết trong core periods (1-5) vẫn trống!`
      );
    } else {
      console.log("✅ Tất cả core periods (1-5) đã có subject");
    }

    // T2-T6 (dayIndex 0-4): CHỈ điền tiết 6-10 nếu trống
    for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
      for (let period = 6; period <= 10; period++) {
        if (constraints.schedule[dayIndex][period - 1] === null) {
          const date = new Date(weekStartDate);
          date.setDate(weekStartDate.getDate() + dayIndex);

          const emptyLesson = await this.createLesson({
            classId: constraints.classId,
            academicYearId,
            dayIndex,
            period,
            type: "empty",
            teacher: homeroomTeacher,
            date,
            timeSlot: timeSlots[period - 1],
            createdBy,
            notes: "Tiết trống - Tiết 6-10",
          });

          constraints.schedule[dayIndex][period - 1] = emptyLesson;
        }
      }
    }

    // Xử lý thứ 7 và chủ nhật theo loại lịch
    const scheduleType = constraints.scheduleConfig.name;
    const workingDays = constraints.scheduleConfig.days;

    if (scheduleType.includes("Thứ 7")) {
      // MONDAY_TO_SATURDAY
      console.log("📅 Lịch thứ 2-7: Thứ 7 có tiết học, chỉ CN trống...");

      // Thứ 7 (dayIndex 5): Điền tiết 6-10 nếu trống (tiết 1-5 đã có từ các giai đoạn trước)
      if (workingDays.includes(5)) {
        console.log("   📚 Thứ 7: Điền tiết 6-10 nếu trống");
        for (let period = 6; period <= 10; period++) {
          if (constraints.schedule[5][period - 1] === null) {
            const date = new Date(weekStartDate);
            date.setDate(weekStartDate.getDate() + 5);

            const emptyLesson = await this.createLesson({
              classId: constraints.classId,
              academicYearId,
              dayIndex: 5,
              period,
              type: "empty",
              teacher: homeroomTeacher,
              date,
              timeSlot: timeSlots[period - 1],
              createdBy,
              notes: "Thứ 7 - Tiết trống buổi chiều",
            });

            constraints.schedule[5][period - 1] = emptyLesson;
          }
        }
      }

      // Chủ nhật (dayIndex 6): TẤT CẢ 10 tiết trống
      console.log("   🔸 Chủ nhật: 10 tiết trống");
      for (let period = 1; period <= 10; period++) {
        const date = new Date(weekStartDate);
        date.setDate(weekStartDate.getDate() + 6);

        const emptyLesson = await this.createLesson({
          classId: constraints.classId,
          academicYearId,
          dayIndex: 6,
          period,
          type: "empty",
          teacher: homeroomTeacher,
          date,
          timeSlot: timeSlots[period - 1],
          createdBy,
          notes: "Chủ nhật - Tiết trống",
        });

        constraints.schedule[6][period - 1] = emptyLesson;
      }
    } else {
      // MONDAY_TO_FRIDAY
      console.log("📅 Lịch thứ 2-6: Thứ 7 và CN đều trống...");

      // Thứ 7 và CN (dayIndex 5-6): TẤT CẢ 10 tiết trống
      for (let dayIndex = 5; dayIndex < 7; dayIndex++) {
        const dayName = dayIndex === 5 ? "Thứ 7" : "Chủ nhật";
        console.log(`   🔸 ${dayName}: 10 tiết trống`);

        for (let period = 1; period <= 10; period++) {
          const date = new Date(weekStartDate);
          date.setDate(weekStartDate.getDate() + dayIndex);

          const emptyLesson = await this.createLesson({
            classId: constraints.classId,
            academicYearId,
            dayIndex,
            period,
            type: "empty",
            teacher: homeroomTeacher,
            date,
            timeSlot: timeSlots[period - 1],
            createdBy,
            notes: `${dayName} - Tiết trống`,
          });

          constraints.schedule[dayIndex][period - 1] = emptyLesson;
        }
      }
    }
  }

  /**
   * Tạo lesson với ID đúng và kiểm tra trùng lặp
   */
  async createLesson(data) {
    const date = data.date.toISOString().slice(0, 10).replace(/-/g, "");
    const classIdShort = data.classId.toString().slice(-6);
    const timeSlotIdShort = data.timeSlot._id.toString().slice(-4);
    const timestamp = Date.now().toString().slice(-3); // Add timestamp to ensure uniqueness
    const lessonId = `${classIdShort}_${date}_${timeSlotIdShort}_${timestamp}`;

    const lessonData = {
      lessonId,
      class: data.classId,
      academicYear: data.academicYearId,
      timeSlot: data.timeSlot._id,
      scheduledDate: data.date,
      type: data.type,
      status: "scheduled",
      createdBy: data.createdBy,
    };

    if (data.subject) lessonData.subject = data.subject._id;
    if (data.teacher) lessonData.teacher = data.teacher._id;
    if (data.fixedInfo) lessonData.fixedInfo = data.fixedInfo;
    if (data.notes) lessonData.notes = data.notes;

    try {
      const lesson = new Lesson(lessonData);
      await lesson.save();
      return lesson;
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error, try with different timestamp
        const newTimestamp = (Date.now() + Math.random() * 1000)
          .toString()
          .slice(-3);
        const newLessonId = `${classIdShort}_${date}_${timeSlotIdShort}_${newTimestamp}`;
        lessonData.lessonId = newLessonId;

        const lesson = new Lesson(lessonData);
        await lesson.save();
        return lesson;
      }
      throw error;
    }
  }

  /**
   * Đặt chỗ cho giáo viên
   */
  bookTeacherSlot(constraints, teacherId, dayIndex, period) {
    const teacherSchedule = constraints.teacherSchedules.get(
      teacherId.toString()
    );
    if (teacherSchedule) {
      teacherSchedule.schedule[dayIndex][period - 1] = true;
      teacherSchedule.workload.daily[dayIndex]++;
      teacherSchedule.workload.weekly++;
    }
  }

  /**
   * Tìm giáo viên chuyên môn
   */
  async findSpecializedTeacher(subjectId) {
    return await User.findOne({
      subject: subjectId,
      role: { $in: ["teacher", "homeroom_teacher"] },
      active: true,
    });
  }

  /**
   * KIỂM TRA: Tất cả ràng buộc
   */
  validateAllConstraints(constraints) {
    const violations = [];

    this.validateTeacherConstraints(constraints, violations);
    this.validateSubjectRequirements(constraints, violations);
    this.validateDoublePeriodRequirements(constraints, violations);
    this.validateTimePreferences(constraints, violations);

    return { isValid: violations.length === 0, violations };
  }

  /**
   * Kiểm tra ràng buộc giáo viên (CRITICAL)
   */
  validateTeacherConstraints(constraints, violations) {
    for (const [teacherId, teacherData] of constraints.teacherSchedules) {
      // Giới hạn hàng ngày
      teacherData.workload.daily.forEach((daily, dayIndex) => {
        if (daily > teacherData.constraints.maxLessonsPerDay) {
          violations.push({
            type: "TEACHER_DAILY_OVERLOAD",
            teacherId,
            day: dayIndex,
            actual: daily,
            limit: teacherData.constraints.maxLessonsPerDay,
            priority: "CRITICAL",
          });
        }
      });

      // Giới hạn hàng tuần
      if (
        teacherData.workload.weekly > teacherData.constraints.maxLessonsPerWeek
      ) {
        violations.push({
          type: "TEACHER_WEEKLY_OVERLOAD",
          teacherId,
          actual: teacherData.workload.weekly,
          limit: teacherData.constraints.maxLessonsPerWeek,
          priority: "CRITICAL",
        });
      }
    }
  }

  /**
   * Kiểm tra yêu cầu môn học - đảm bảo đủ weeklyHours
   */
  validateSubjectRequirements(constraints, violations) {
    let totalRequiredHours = 0;
    let totalScheduledHours = 0;

    for (const [subjectId, requirement] of constraints.subjectRequirements) {
      totalRequiredHours += requirement.required;
      totalScheduledHours += requirement.scheduled;

      if (requirement.scheduled < requirement.required) {
        violations.push({
          type: "INSUFFICIENT_PERIODS",
          subject: requirement.subject.subjectName,
          required: requirement.required,
          scheduled: requirement.scheduled,
          deficit: requirement.required - requirement.scheduled,
          priority: "HIGH",
        });
      }

      // Kiểm tra có quá nhiều tiết không
      if (requirement.scheduled > requirement.required) {
        violations.push({
          type: "EXCESSIVE_PERIODS",
          subject: requirement.subject.subjectName,
          required: requirement.required,
          scheduled: requirement.scheduled,
          excess: requirement.scheduled - requirement.required,
          priority: "MEDIUM",
        });
      }
    }

    // Cập nhật thống kê tổng
    constraints.stats.scheduledWeeklyHours = totalScheduledHours;

    // Kiểm tra tổng số tiết
    if (totalScheduledHours < totalRequiredHours) {
      violations.push({
        type: "TOTAL_WEEKLY_HOURS_INSUFFICIENT",
        required: totalRequiredHours,
        scheduled: totalScheduledHours,
        deficit: totalRequiredHours - totalScheduledHours,
        priority: "CRITICAL",
      });
    }

    console.log(
      `📊 Tổng tiết: ${totalScheduledHours}/${totalRequiredHours} (${(
        (totalScheduledHours / totalRequiredHours) *
        100
      ).toFixed(1)}%)`
    );
  }

  /**
   * Kiểm tra yêu cầu tiết đôi
   */
  validateDoublePeriodRequirements(constraints, violations) {
    for (const [subjectId, requirement] of constraints.subjectRequirements) {
      if (
        requirement.targetDoublePeriods > 0 &&
        requirement.doublePeriods < requirement.targetDoublePeriods
      ) {
        violations.push({
          type: "INSUFFICIENT_DOUBLE_PERIODS",
          subject: requirement.subject.subjectName,
          required: requirement.targetDoublePeriods,
          scheduled: requirement.doublePeriods,
          priority: "HIGH",
        });
      }
    }
  }

  /**
   * Kiểm tra ưu tiên thời gian
   */
  validateTimePreferences(constraints, violations) {
    let priorityInMorning = 0;
    let totalPriority = 0;

    // Đếm môn ưu tiên trong buổi sáng
    for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
      for (let period = 1; period <= 10; period++) {
        const lesson = constraints.schedule[dayIndex][period - 1];
        if (lesson && lesson.subject) {
          const subject = constraints.subjects.find(
            (s) => s._id.toString() === lesson.subject.toString()
          );
          if (subject && this.PRIORITY_SUBJECTS.includes(subject.subjectName)) {
            totalPriority++;
            if (this.MORNING_PERIODS.includes(period)) priorityInMorning++;
          }
        }
      }
    }

    // Kiểm tra tỷ lệ 60%
    if (totalPriority > 0 && priorityInMorning / totalPriority < 0.6) {
      violations.push({
        type: "PRIORITY_SUBJECTS_NOT_IN_MORNING",
        actual: ((priorityInMorning / totalPriority) * 100).toFixed(1) + "%",
        expected: "60%+",
        priority: "MEDIUM",
      });
    }
  }

  /**
   * Lưu lessons vào weekly schedule
   */
  async saveLessonsToWeeklySchedule(constraints, weeklyScheduleId) {
    const lessonIds = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      for (let period = 1; period <= 10; period++) {
        const lesson = constraints.schedule[dayIndex][period - 1];
        if (lesson) lessonIds.push(lesson._id);
      }
    }

    const weeklySchedule = await WeeklySchedule.findById(weeklyScheduleId);
    weeklySchedule.lessons = lessonIds;
    weeklySchedule.stats = {
      totalLessons: lessonIds.length,
      subjectLessons: lessonIds.length,
      emptySlots: 0,
      constraintViolations: 0,
    };
    await weeklySchedule.save();

    return lessonIds;
  }

  /**
   * In báo cáo toàn diện
   */
  printSchedulingReport(constraints, validationResult) {
    console.log(`\n📊 BÁO CÁO TẠO THỜI KHÓA BIỂU VỚI RÀNG BUỘC`);
    console.log("=".repeat(60));

    const totalScheduled = Array.from(
      constraints.subjectRequirements.values()
    ).reduce((sum, req) => sum + req.scheduled, 0);

    console.log(`📈 TỔNG QUAN:`);
    console.log(`  Tổng tiết đã xếp: ${totalScheduled}`);
    console.log(`  Tiết đôi đã tạo: ${constraints.stats.doublePeriods}`);
    console.log(
      `  Môn ưu tiên buổi sáng: ${constraints.stats.prioritySubjectsInMorning}`
    );

    console.log(`\n📚 CHI TIẾT MÔN HỌC:`);
    for (const [subjectId, req] of constraints.subjectRequirements) {
      const completion = ((req.scheduled / req.required) * 100).toFixed(1);
      const doubleInfo =
        req.targetDoublePeriods > 0
          ? ` (${req.doublePeriods}/${req.targetDoublePeriods} tiết đôi)`
          : "";
      console.log(
        `  ${req.subject.subjectName}: ${req.scheduled}/${req.required} (${completion}%)${doubleInfo}`
      );
    }

    console.log(`\n👨‍🏫 KHỐI LƯỢNG GIÁO VIÊN:`);
    for (const [teacherId, data] of constraints.teacherSchedules) {
      const dailyLoads = data.workload.daily.join("-");
      console.log(
        `  GV ${teacherId.slice(-6)}: ${
          data.workload.weekly
        } tiết/tuần (${dailyLoads} hàng ngày)`
      );
    }

    // Báo cáo vi phạm
    if (validationResult.violations.length === 0) {
      console.log(`\n✅ TẤT CẢ RÀNG BUỘC ĐÃ ĐƯỢC THỎA MÃN!`);
    } else {
      console.log(
        `\n❌ VI PHẠM RÀNG BUỘC (${validationResult.violations.length}):`
      );

      const critical = validationResult.violations.filter(
        (v) => v.priority === "CRITICAL"
      );
      const high = validationResult.violations.filter(
        (v) => v.priority === "HIGH"
      );
      const medium = validationResult.violations.filter(
        (v) => v.priority === "MEDIUM"
      );

      if (critical.length > 0) {
        console.log(`  🚨 NGHIÊM TRỌNG (${critical.length}):`);
        critical.forEach((v) =>
          console.log(
            `    - ${v.type}: ${v.subject || "Chi tiết trong đối tượng"}`
          )
        );
      }

      if (high.length > 0) {
        console.log(`  ⚠️ CAO (${high.length}):`);
        high.forEach((v) =>
          console.log(
            `    - ${v.type}: ${v.subject || "Chi tiết trong đối tượng"}`
          )
        );
      }

      if (medium.length > 0) {
        console.log(`  📋 TRUNG BÌNH (${medium.length}):`);
        medium.forEach((v) =>
          console.log(
            `    - ${v.type}: ${v.actual || "Chi tiết trong đối tượng"}`
          )
        );
      }
    }

    console.log(`\n🎯 HOÀN THÀNH TẠO THỜI KHÓA BIỂU`);
    console.log("=".repeat(60));
  }
}

module.exports = ConstraintSchedulerService;
