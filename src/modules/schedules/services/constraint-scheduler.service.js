const Lesson = require('../models/lesson.model');
const WeeklySchedule = require('../models/weekly-schedule.model');
const User = require('../../auth/models/user.model');

class ConstraintSchedulerService {
  constructor() {
    // Môn học ưu tiên cần có tiết đôi
    this.PRIORITY_SUBJECTS = ['Mathematics', 'Literature', 'English'];
    
    // Độ ưu tiên các môn học
    this.SUBJECT_PRIORITIES = {
      'Mathematics': 10,
      'Literature': 9, 
      'English': 8,
      'Physics': 7,
      'Chemistry': 6,
      'Biology': 5,
      'History': 4,
      'Geography': 3,
      'Physical Education': 2,
      'Arts': 1
    };
    
    // Định nghĩa tiết học
    this.MORNING_PERIODS = [1, 2, 3, 4, 5];
    this.AFTERNOON_PERIODS = [6, 7, 8, 9, 10];
    this.BREAK_AFTER_PERIOD = 5; // Nghỉ lớn sau tiết 5
  }

  /**
   * HÀM CHÍNH - Tạo thời khóa biểu với ràng buộc
   */
  async createConstraintBasedSchedule(weeklyScheduleId, classId, academicYearId, weekNum, weekStartDate, timeSlots, subjects, homeroomTeacher, createdBy) {
    console.log(`\n🎯 BẮT ĐẦU TẠO THỜI KHÓA BIỂU VỚI RÀNG BUỘC - Tuần ${weekNum}`);
    console.log('='.repeat(60));
    
    // Khởi tạo hệ thống ràng buộc
    const constraints = await this.initializeConstraintSystem(classId, subjects, homeroomTeacher, timeSlots);
    
    // Thực hiện các giai đoạn lập lịch
    await this.scheduleFixedPeriods(constraints, weekStartDate, timeSlots, homeroomTeacher, createdBy, academicYearId);
    await this.scheduleDoublePeriods(constraints, weekStartDate, timeSlots, createdBy, academicYearId);
    await this.scheduleSinglePeriods(constraints, weekStartDate, timeSlots, createdBy, academicYearId);
    await this.fillEmptySlots(constraints, weekStartDate, timeSlots, homeroomTeacher, createdBy, academicYearId);
    
    // Kiểm tra và báo cáo
    const validationResult = this.validateAllConstraints(constraints);
    const lessons = await this.saveLessonsToWeeklySchedule(constraints, weeklyScheduleId);
    this.printSchedulingReport(constraints, validationResult);
    
    return lessons;
  }

  /**
   * Khởi tạo hệ thống theo dõi ràng buộc
   */
  async initializeConstraintSystem(classId, subjects, homeroomTeacher, timeSlots) {
    const constraints = {
      classId, subjects, homeroomTeacher, timeSlots,
      // Ma trận lịch học: [ngày][tiết] = lesson hoặc null
      schedule: Array(7).fill().map(() => Array(10).fill(null)),
      // Theo dõi lịch giáo viên
      teacherSchedules: new Map(),
      // Yêu cầu môn học
      subjectRequirements: new Map(),
      // Vi phạm ràng buộc
      violations: [],
      // Thống kê
      stats: { totalLessons: 0, doublePeriods: 0, prioritySubjectsInMorning: 0 }
    };

    await this.initializeTeacherSchedules(constraints);
    this.initializeSubjectRequirements(constraints);
    
    console.log(`✅ Hệ thống khởi tạo: ${subjects.length} môn học, ${constraints.teacherSchedules.size} giáo viên`);
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
        schedule: Array(7).fill().map(() => Array(10).fill(false)),
        workload: { daily: Array(7).fill(0), weekly: 0 },
        constraints: { 
          maxLessonsPerDay: 8, 
          maxLessonsPerWeek: 30,
          unavailableTimes: []
        }
      });
    }
  }

  /**
   * Khởi tạo yêu cầu môn học bao gồm tiết đôi
   */
  initializeSubjectRequirements(constraints) {
    constraints.subjects.forEach(subject => {
      const weeklyHours = subject.weeklyHours || 3;
      const isPriority = this.PRIORITY_SUBJECTS.includes(subject.subjectName);
      
      // LOGIC MỚI: Tính số tiết đôi dựa trên tổng số tiết
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
        targetDoublePeriods, // Số tiết đôi cần đạt
        maxDoublePeriodsPerDay: 1, // Tối đa 1 tiết đôi/ngày cho mỗi môn
        dailyScheduled: Array(7).fill(0) // Theo dõi số tiết đã xếp mỗi ngày
      });
    });
  }

  /**
   * GIAI ĐOẠN 1: Xếp tiết cố định (CRITICAL)
   */
  async scheduleFixedPeriods(constraints, weekStartDate, timeSlots, homeroomTeacher, createdBy, academicYearId) {
    console.log('🏷️ Giai đoạn 1: Xếp tiết cố định...');
    
    // RÀNG BUỘC: GVCN PHẢI có tiết chào cờ (tiết 1 thứ 2)
    const mondayDate = new Date(weekStartDate);
    const flagLesson = await this.createLesson({
      classId: constraints.classId, academicYearId, dayIndex: 0, period: 1,
      type: 'fixed', fixedInfo: { type: 'flag_ceremony', description: 'Chào cờ' },
      teacher: homeroomTeacher, date: mondayDate, timeSlot: timeSlots[0], createdBy
    });
    
    constraints.schedule[0][0] = flagLesson;
    this.bookTeacherSlot(constraints, homeroomTeacher._id, 0, 1);
    
    // Sinh hoạt lớp thứ 7 tiết 5
    const saturdayDate = new Date(weekStartDate);
    saturdayDate.setDate(weekStartDate.getDate() + 5);
    const classMeetingLesson = await this.createLesson({
      classId: constraints.classId, academicYearId, dayIndex: 5, period: 5,
      type: 'fixed', fixedInfo: { type: 'class_meeting', description: 'Sinh hoạt lớp' },
      teacher: homeroomTeacher, date: saturdayDate, timeSlot: timeSlots[4], createdBy
    });
    
    constraints.schedule[5][4] = classMeetingLesson;
    this.bookTeacherSlot(constraints, homeroomTeacher._id, 5, 5);
    
    console.log('✅ Tiết cố định: Chào cờ (T2-T1), Sinh hoạt lớp (T7-T5)');
  }

  /**
   * GIAI ĐOẠN 2: Xếp tiết đôi theo target (4 tiết → 2 tiết đôi ở 2 ngày khác nhau)
   */
  async scheduleDoublePeriods(constraints, weekStartDate, timeSlots, createdBy, academicYearId) {
    console.log('🔗 Giai đoạn 2: Xếp tiết đôi (Văn, Toán, Anh)...');
    
    // Lọc các môn cần tiết đôi
    const subjectsNeedingDouble = constraints.subjects.filter(subject => {
      const requirement = constraints.subjectRequirements.get(subject._id.toString());
      return requirement.targetDoublePeriods > 0;
    });
    
    // Sắp xếp ưu tiên: môn có nhiều tiết đôi nhất trước
    subjectsNeedingDouble.sort((a, b) => {
      const reqA = constraints.subjectRequirements.get(a._id.toString());
      const reqB = constraints.subjectRequirements.get(b._id.toString());
      return reqB.targetDoublePeriods - reqA.targetDoublePeriods;
    });
    
    for (const subject of subjectsNeedingDouble) {
      const requirement = constraints.subjectRequirements.get(subject._id.toString());
      const teacher = await this.findSpecializedTeacher(subject._id);
      
      if (!teacher) {
        constraints.violations.push({
          type: 'NO_SPECIALIZED_TEACHER', 
          subject: subject.subjectName, 
          priority: 'CRITICAL'
        });
        continue;
      }
      
      // Xếp số tiết đôi theo target (ví dụ: Toán 4 tiết → 2 tiết đôi ở 2 ngày khác nhau)
      for (let dp = 0; dp < requirement.targetDoublePeriods; dp++) {
        const slot = this.findBestDoubleSlot(constraints, subject, teacher);
        
        if (slot) {
          await this.scheduleDoubleLesson(constraints, subject, teacher, slot.dayIndex, 
            slot.startPeriod, weekStartDate, timeSlots, createdBy, academicYearId);
          
          requirement.doublePeriods++;
          requirement.scheduled += 2;
          constraints.stats.doublePeriods++;
          
          // Kiểm tra có trong buổi sáng không
          if (this.MORNING_PERIODS.includes(slot.startPeriod)) {
            constraints.stats.prioritySubjectsInMorning++;
          }
          
          console.log(`✅ Tiết đôi: ${subject.subjectName} - Ngày ${slot.dayIndex + 1}, T${slot.startPeriod}-${slot.startPeriod + 1}`);
        } else {
          console.log(`⚠️ Không thể xếp tiết đôi ${dp + 1}/${requirement.targetDoublePeriods} cho ${subject.subjectName}`);
          constraints.violations.push({
            type: 'CANNOT_SCHEDULE_DOUBLE_PERIOD',
            subject: subject.subjectName,
            reason: `Không tìm được khe cho tiết đôi ${dp + 1}/${requirement.targetDoublePeriods}`,
            priority: 'HIGH'
          });
        }
      }
    }
  }

  /**
   * Tìm khe trống tốt nhất cho tiết đôi với tất cả ràng buộc
   */
  findBestDoubleSlot(constraints, subject, teacher) {
    const requirement = constraints.subjectRequirements.get(subject._id.toString());
    
    // RÀNG BUỘC: Không xếp tiết đôi qua giờ nghỉ lớn (sau tiết 5)
    const morningSlots = [[1,2], [2,3], [3,4], [4,5]];
    const afternoonSlots = [[6,7], [7,8], [8,9]];
    
    // RÀNG BUỘC: Môn ưu tiên vào buổi sáng
    const slotsToCheck = this.PRIORITY_SUBJECTS.includes(subject.subjectName) 
      ? [...morningSlots, ...afternoonSlots] : [...afternoonSlots, ...morningSlots];
    
    // Kiểm tra từng ngày (T2-T7)
    for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
      // RÀNG BUỘC: Kiểm tra không có tiết nào của môn này trong ngày
      if (requirement.dailyScheduled[dayIndex] > 0) {
        continue; // Skip this day if subject already has lessons
      }
      
      for (const [period1, period2] of slotsToCheck) {
        if (this.canScheduleDoubleSlot(constraints, teacher._id, dayIndex, period1, period2)) {
          return { dayIndex, startPeriod: period1 };
        }
      }
    }
    return null;
  }

  /**
   * Kiểm tra có thể xếp tiết đôi không
   */
  canScheduleDoubleSlot(constraints, teacherId, dayIndex, period1, period2) {
    // RÀNG BUỘC: Một lớp tại một thời điểm CHỈ học 1 môn
    if (constraints.schedule[dayIndex][period1 - 1] !== null || 
        constraints.schedule[dayIndex][period2 - 1] !== null) return false;
    
    // RÀNG BUỘC: Một giáo viên KHÔNG được dạy 2 tiết cùng lúc
    const teacherSchedule = constraints.teacherSchedules.get(teacherId.toString());
    if (!teacherSchedule) return false;
    
    if (teacherSchedule.schedule[dayIndex][period1 - 1] || 
        teacherSchedule.schedule[dayIndex][period2 - 1]) return false;
    
    // RÀNG BUỘC: Không vượt quá maxLessonsPerDay
    if (teacherSchedule.workload.daily[dayIndex] + 2 > teacherSchedule.constraints.maxLessonsPerDay) return false;
    
    return true;
  }

  /**
   * Xếp tiết đôi với liên kết đúng
   */
  async scheduleDoubleLesson(constraints, subject, teacher, dayIndex, startPeriod, weekStartDate, timeSlots, createdBy, academicYearId) {
    const date = new Date(weekStartDate);
    date.setDate(weekStartDate.getDate() + dayIndex);
    
    const lesson1 = await this.createLesson({
      classId: constraints.classId, academicYearId, dayIndex, period: startPeriod,
      type: 'regular', subject, teacher, date, timeSlot: timeSlots[startPeriod - 1],
      createdBy, notes: `Tiết đôi - Phần 1/2`
    });
    
    const lesson2 = await this.createLesson({
      classId: constraints.classId, academicYearId, dayIndex, period: startPeriod + 1,
      type: 'regular', subject, teacher, date, timeSlot: timeSlots[startPeriod],
      createdBy, notes: `Tiết đôi - Phần 2/2`
    });
    
    constraints.schedule[dayIndex][startPeriod - 1] = lesson1;
    constraints.schedule[dayIndex][startPeriod] = lesson2;
    
    this.bookTeacherSlot(constraints, teacher._id, dayIndex, startPeriod);
    this.bookTeacherSlot(constraints, teacher._id, dayIndex, startPeriod + 1);
    
    // Update subject requirements including daily tracking
    const requirement = constraints.subjectRequirements.get(subject._id.toString());
    requirement.scheduled += 2;
    requirement.doublePeriods += 1;
    requirement.dailyScheduled[dayIndex] += 2; // Track daily lessons
    
    return [lesson1, lesson2];
  }

  /**
   * GIAI ĐOẠN 3: Xếp tiết đơn còn lại
   */
  async scheduleSinglePeriods(constraints, weekStartDate, timeSlots, createdBy, academicYearId) {
    console.log('📚 Giai đoạn 3: Xếp tiết đơn còn lại...');
    
    const remainingPeriods = [];
    
    // Tạo danh sách tiết còn lại cần xếp
    for (const subject of constraints.subjects) {
      const requirement = constraints.subjectRequirements.get(subject._id.toString());
      const remaining = requirement.required - requirement.scheduled;
      
      for (let i = 0; i < remaining; i++) {
        const teacher = await this.findSpecializedTeacher(subject._id);
        if (teacher) {
          remainingPeriods.push({
            subject, 
            teacher, 
            priority: this.SUBJECT_PRIORITIES[subject.subjectName] || 1
          });
        }
      }
    }
    
    // Sắp xếp theo độ ưu tiên
    remainingPeriods.sort((a, b) => b.priority - a.priority);
    
    // Xếp từng tiết
    for (const period of remainingPeriods) {
      const slot = this.findBestSingleSlot(constraints, period.subject, period.teacher);
      
      if (slot) {
        await this.scheduleSingleLesson(constraints, period.subject, period.teacher,
          slot.dayIndex, slot.period, weekStartDate, timeSlots, createdBy, academicYearId);
        
        const requirement = constraints.subjectRequirements.get(period.subject._id.toString());
        requirement.scheduled++;
        
        console.log(`✅ Tiết đơn: ${period.subject.subjectName} - Ngày ${slot.dayIndex + 1}, T${slot.period}`);
      } else {
        constraints.violations.push({
          type: 'CANNOT_SCHEDULE_SINGLE_PERIOD',
          subject: period.subject.subjectName,
          reason: 'Không tìm được khe trống phù hợp',
          priority: 'MEDIUM'
        });
      }
    }
  }

  /**
   * Tìm khe trống tốt nhất cho tiết đơn
   */
  findBestSingleSlot(constraints, subject, teacher) {
    const requirement = constraints.subjectRequirements.get(subject._id.toString());
    const slots = [];
    
    // Tạo danh sách tất cả khe có thể
    for (let dayIndex = 0; dayIndex < 6; dayIndex++) { // T2-T7
      // RÀNG BUỘC: Ưu tiên ngày chưa có môn này
      const hasSubjectToday = requirement.dailyScheduled[dayIndex] > 0;
      
      for (let period = 1; period <= 10; period++) {
        if (this.canScheduleSingleSlot(constraints, subject, teacher._id, dayIndex, period)) {
          let score = this.calculateSlotScore(constraints, subject, teacher, dayIndex, period);
          
          // Bonus điểm cho ngày chưa có môn này
          if (!hasSubjectToday) {
            score += 100;
          }
          
          slots.push({
            dayIndex, period, score
          });
        }
      }
    }
    
    // Sắp xếp theo điểm (cao nhất trước)
    slots.sort((a, b) => b.score - a.score);
    return slots.length > 0 ? slots[0] : null;
  }

  /**
   * Tính điểm ưu tiên cho khe thời gian
   */
  calculateSlotScore(constraints, subject, teacher, dayIndex, period) {
    let score = 0;
    
    // RÀNG BUỘC: Môn ưu tiên vào buổi sáng
    if (this.PRIORITY_SUBJECTS.includes(subject.subjectName) && this.MORNING_PERIODS.includes(period)) {
      score += 50;
    }
    
    // RÀNG BUỘC: Thể dục không tiết 1 và sau ăn trường
    if (subject.subjectName === 'Physical Education') {
      if (period === 1) score -= 100; // Không tiết đầu
      if (period === 6) score -= 50;  // Không sau ăn trường
    }
    
    // RÀNG BUỘC: Môn thực hành ưu tiên buổi chiều
    const practicalSubjects = ['Computer Science', 'Chemistry Lab', 'Physics Lab'];
    if (practicalSubjects.includes(subject.subjectName) && this.AFTERNOON_PERIODS.includes(period)) {
      score += 30;
    }
    
    // Cân bằng khối lượng giáo viên
    const teacherSchedule = constraints.teacherSchedules.get(teacher._id.toString());
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
    
    const teacherSchedule = constraints.teacherSchedules.get(teacherId.toString());
    if (!teacherSchedule) return false;
    
    if (teacherSchedule.schedule[dayIndex][period - 1]) return false;
    
    // Giới hạn tiết/ngày
    if (teacherSchedule.workload.daily[dayIndex] >= teacherSchedule.constraints.maxLessonsPerDay) return false;
    
    // RÀNG BUỘC: Không quá 3 tiết liên tiếp cùng môn
    if (this.checkConsecutiveSubjectLimit(constraints, subject._id, dayIndex, period)) return false;
    
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
      if (lesson && lesson.subject && lesson.subject.toString() === subjectId.toString()) {
        count++;
      } else break;
    }
    
    // Kiểm tra tiến tới
    for (let p = period + 1; p <= 10; p++) {
      const lesson = constraints.schedule[dayIndex][p - 1];
      if (lesson && lesson.subject && lesson.subject.toString() === subjectId.toString()) {
        count++;
      } else break;
    }
    
    return count > 3;
  }

  /**
   * Xếp tiết đơn
   */
  async scheduleSingleLesson(constraints, subject, teacher, dayIndex, period, weekStartDate, timeSlots, createdBy, academicYearId) {
    const date = new Date(weekStartDate);
    date.setDate(weekStartDate.getDate() + dayIndex);
    
    const lesson = await this.createLesson({
      classId: constraints.classId, academicYearId, dayIndex, period,
      type: 'regular', subject, teacher, date,
      timeSlot: timeSlots[period - 1], createdBy
    });
    
    constraints.schedule[dayIndex][period - 1] = lesson;
    this.bookTeacherSlot(constraints, teacher._id, dayIndex, period);
    
    // Update daily tracking
    const requirement = constraints.subjectRequirements.get(subject._id.toString());
    requirement.dailyScheduled[dayIndex] += 1;
    
    return lesson;
  }

  /**
   * GIAI ĐOẠN 4: Điền khe trống
   */
  async fillEmptySlots(constraints, weekStartDate, timeSlots, homeroomTeacher, createdBy, academicYearId) {
    console.log('🔄 Giai đoạn 4: Điền khe trống...');
    
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      for (let period = 1; period <= 10; period++) {
        if (constraints.schedule[dayIndex][period - 1] === null) {
          const date = new Date(weekStartDate);
          date.setDate(weekStartDate.getDate() + dayIndex);
          
          const emptyLesson = await this.createLesson({
            classId: constraints.classId, academicYearId, dayIndex, period,
            type: 'empty', teacher: homeroomTeacher, date,
            timeSlot: timeSlots[period - 1], createdBy
          });
          
          constraints.schedule[dayIndex][period - 1] = emptyLesson;
        }
      }
    }
  }

  /**
   * Tạo lesson với ID đúng
   */
  async createLesson(data) {
    const date = data.date.toISOString().slice(0, 10).replace(/-/g, '');
    const classIdShort = data.classId.toString().slice(-6);
    const timeSlotIdShort = data.timeSlot._id.toString().slice(-4);
    const lessonId = `${classIdShort}_${date}_${timeSlotIdShort}`;
    
    const lessonData = {
      lessonId, 
      class: data.classId, 
      academicYear: data.academicYearId,
      timeSlot: data.timeSlot._id, 
      scheduledDate: data.date,
      type: data.type, 
      status: 'scheduled', 
      createdBy: data.createdBy
    };
    
    if (data.subject) lessonData.subject = data.subject._id;
    if (data.teacher) lessonData.teacher = data.teacher._id;
    if (data.fixedInfo) lessonData.fixedInfo = data.fixedInfo;
    if (data.notes) lessonData.notes = data.notes;
    
    const lesson = new Lesson(lessonData);
    await lesson.save();
    return lesson;
  }

  /**
   * Đặt chỗ cho giáo viên
   */
  bookTeacherSlot(constraints, teacherId, dayIndex, period) {
    const teacherSchedule = constraints.teacherSchedules.get(teacherId.toString());
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
      role: { $in: ['teacher', 'homeroom_teacher'] },
      active: true
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
            type: 'TEACHER_DAILY_OVERLOAD', 
            teacherId, 
            day: dayIndex,
            actual: daily, 
            limit: teacherData.constraints.maxLessonsPerDay,
            priority: 'CRITICAL'
          });
        }
      });
      
      // Giới hạn hàng tuần
      if (teacherData.workload.weekly > teacherData.constraints.maxLessonsPerWeek) {
        violations.push({
          type: 'TEACHER_WEEKLY_OVERLOAD',
          teacherId,
          actual: teacherData.workload.weekly,
          limit: teacherData.constraints.maxLessonsPerWeek,
          priority: 'CRITICAL'
        });
      }
    }
  }

  /**
   * Kiểm tra yêu cầu môn học
   */
  validateSubjectRequirements(constraints, violations) {
    for (const [subjectId, requirement] of constraints.subjectRequirements) {
      if (requirement.scheduled < requirement.required) {
        violations.push({
          type: 'INSUFFICIENT_PERIODS', 
          subject: requirement.subject.subjectName,
          required: requirement.required, 
          scheduled: requirement.scheduled,
          priority: 'HIGH'
        });
      }
    }
  }

  /**
   * Kiểm tra yêu cầu tiết đôi
   */
  validateDoublePeriodRequirements(constraints, violations) {
    for (const [subjectId, requirement] of constraints.subjectRequirements) {
      if (requirement.targetDoublePeriods > 0 && requirement.doublePeriods < requirement.targetDoublePeriods) {
        violations.push({
          type: 'INSUFFICIENT_DOUBLE_PERIODS', 
          subject: requirement.subject.subjectName,
          required: requirement.targetDoublePeriods, 
          scheduled: requirement.doublePeriods,
          priority: 'HIGH'
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
          const subject = constraints.subjects.find(s => s._id.toString() === lesson.subject.toString());
          if (subject && this.PRIORITY_SUBJECTS.includes(subject.subjectName)) {
            totalPriority++;
            if (this.MORNING_PERIODS.includes(period)) priorityInMorning++;
          }
        }
      }
    }
    
    // Kiểm tra tỷ lệ 60%
    if (totalPriority > 0 && (priorityInMorning / totalPriority) < 0.6) {
      violations.push({
        type: 'PRIORITY_SUBJECTS_NOT_IN_MORNING',
        actual: (priorityInMorning / totalPriority * 100).toFixed(1) + '%',
        expected: '60%+',
        priority: 'MEDIUM'
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
      constraintViolations: 0
    };
    await weeklySchedule.save();
    
    return lessonIds;
  }

  /**
   * In báo cáo toàn diện
   */
  printSchedulingReport(constraints, validationResult) {
    console.log(`\n📊 BÁO CÁO TẠO THỜI KHÓA BIỂU VỚI RÀNG BUỘC`);
    console.log('='.repeat(60));
    
    const totalScheduled = Array.from(constraints.subjectRequirements.values())
      .reduce((sum, req) => sum + req.scheduled, 0);
    
    console.log(`📈 TỔNG QUAN:`);
    console.log(`  Tổng tiết đã xếp: ${totalScheduled}`);
    console.log(`  Tiết đôi đã tạo: ${constraints.stats.doublePeriods}`);
    console.log(`  Môn ưu tiên buổi sáng: ${constraints.stats.prioritySubjectsInMorning}`);
    
    console.log(`\n📚 CHI TIẾT MÔN HỌC:`);
    for (const [subjectId, req] of constraints.subjectRequirements) {
      const completion = (req.scheduled / req.required * 100).toFixed(1);
      const doubleInfo = req.targetDoublePeriods > 0 ? ` (${req.doublePeriods}/${req.targetDoublePeriods} tiết đôi)` : '';
      console.log(`  ${req.subject.subjectName}: ${req.scheduled}/${req.required} (${completion}%)${doubleInfo}`);
    }
    
    console.log(`\n👨‍🏫 KHỐI LƯỢNG GIÁO VIÊN:`);
    for (const [teacherId, data] of constraints.teacherSchedules) {
      const dailyLoads = data.workload.daily.join('-');
      console.log(`  GV ${teacherId.slice(-6)}: ${data.workload.weekly} tiết/tuần (${dailyLoads} hàng ngày)`);
    }
    
    // Báo cáo vi phạm
    if (validationResult.violations.length === 0) {
      console.log(`\n✅ TẤT CẢ RÀNG BUỘC ĐÃ ĐƯỢC THỎA MÃN!`);
    } else {
      console.log(`\n❌ VI PHẠM RÀNG BUỘC (${validationResult.violations.length}):`);
      
      const critical = validationResult.violations.filter(v => v.priority === 'CRITICAL');
      const high = validationResult.violations.filter(v => v.priority === 'HIGH');
      const medium = validationResult.violations.filter(v => v.priority === 'MEDIUM');
      
      if (critical.length > 0) {
        console.log(`  🚨 NGHIÊM TRỌNG (${critical.length}):`);
        critical.forEach(v => console.log(`    - ${v.type}: ${v.subject || 'Chi tiết trong đối tượng'}`));
      }
      
      if (high.length > 0) {
        console.log(`  ⚠️ CAO (${high.length}):`);
        high.forEach(v => console.log(`    - ${v.type}: ${v.subject || 'Chi tiết trong đối tượng'}`));
      }
      
      if (medium.length > 0) {
        console.log(`  📋 TRUNG BÌNH (${medium.length}):`);
        medium.forEach(v => console.log(`    - ${v.type}: ${v.actual || 'Chi tiết trong đối tượng'}`));
      }
    }
    
    console.log(`\n🎯 HOÀN THÀNH TẠO THỜI KHÓA BIỂU`);
    console.log('='.repeat(60));
  }
}

module.exports = ConstraintSchedulerService;
