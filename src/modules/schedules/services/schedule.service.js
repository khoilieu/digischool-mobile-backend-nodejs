const jwt = require('jsonwebtoken');
const Schedule = require('../models/schedule.model');
const Period = require('../models/period.model');
const TeacherSchedule = require('../models/teacher-schedule.model');
const AcademicYear = require('../models/academic-year.model');
const TimeSlot = require('../models/time-slot.model');
const Lesson = require('../models/lesson.model');
const WeeklySchedule = require('../models/weekly-schedule.model');
const LessonTemplate = require('../models/lesson-template.model');
const Class = require('../../classes/models/class.model');
const Subject = require('../../subjects/models/subject.model');
const User = require('../../auth/models/user.model');
const AdvancedSchedulerService = require('./advanced-scheduler.service');
const mongoose = require('mongoose');

class ScheduleService {
  constructor() {
    this.advancedScheduler = new AdvancedSchedulerService();
  }

  // NEW: Khởi tạo thời khóa biểu với architecture mới (Lesson-based)
  async initializeSchedulesWithNewArchitecture(data, token) {
    try {
      const { academicYear, gradeLevel, semester = 1 } = data;
      
      // Verify user permissions
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !['admin', 'manager'].includes(user.role[0])) {
        throw new Error('Unauthorized to create schedules');
      }

      console.log(`🚀 Starting NEW schedule initialization for grade ${gradeLevel}, academic year ${academicYear}`);

      // Đảm bảo Academic Year exists
      let academicYearDoc = await AcademicYear.findOne({ name: academicYear });
      if (!academicYearDoc) {
        console.log(`📅 Creating Academic Year: ${academicYear}`);
        academicYearDoc = new AcademicYear({
          name: academicYear,
          startDate: new Date('2024-08-12'),
          endDate: new Date('2025-05-30'),
          totalWeeks: 38,
          isActive: true
        });
        await academicYearDoc.save();
      }

      // Đảm bảo Time Slots exist
      await this.ensureTimeSlots();

      // Lấy danh sách lớp theo khối
      const classes = await Class.find({
        className: new RegExp(`^${gradeLevel}`),
        academicYear,
        active: true
      }).populate('homeroomTeacher');

      if (!classes || classes.length === 0) {
        throw new Error(`No classes found for grade ${gradeLevel} in academic year ${academicYear}`);
      }

      console.log(`📚 Found ${classes.length} classes: ${classes.map(c => c.className).join(', ')}`);

      const results = [];
      let createdSchedulesCount = 0;

      // NEW: Tạo thời khóa biểu cho tất cả lớp với multi-class scheduler
      const classesToCreate = [];
      
      // Phân loại lớp: tạo mới vs đã tồn tại
      for (const classInfo of classes) {
        console.log(`\n🎯 Processing class: ${classInfo.className}`);
        
        // Kiểm tra xem lớp đã có thời khóa biểu chưa
        const existingSchedule = await Schedule.findByClassAndYear(classInfo._id, academicYearDoc._id);

        if (existingSchedule) {
          console.log(`⚠️ Schedule already exists for ${classInfo.className}, skipping...`);
          results.push({
            classId: classInfo._id,
            className: classInfo.className,
            status: 'skipped',
            message: 'Schedule already exists'
          });
        } else {
          classesToCreate.push(classInfo);
        }
      }

      // Tạo schedules cho tất cả lớp cần tạo mới
      if (classesToCreate.length > 0) {
        try {
          console.log(`\n🎯 Creating schedules for ${classesToCreate.length} classes with optimized teacher distribution...`);
          
          // Tạo schedules cho tất cả lớp cùng lúc
          const schedules = await this.createMultiClassSchedulesWithLessons(
            classesToCreate,
            academicYearDoc._id,
            user._id
          );

          // Activate và tạo results cho từng schedule
          for (let i = 0; i < schedules.length; i++) {
            const schedule = schedules[i];
            const classInfo = classesToCreate[i];
            
            await schedule.activate();

            console.log(`✅ Successfully created schedule for ${classInfo.className}`);
            
            results.push({
              classId: classInfo._id,
              className: classInfo.className,
              status: 'created',
              scheduleId: schedule._id,
              totalWeeks: schedule.statistics.totalWeeks,
              totalLessons: schedule.statistics.totalLessons
            });
            
            createdSchedulesCount++;
          }

        } catch (error) {
          console.error(`❌ Failed to create multi-class schedules:`, error.message);
          
          // Mark all classes as failed
          for (const classInfo of classesToCreate) {
            results.push({
              classId: classInfo._id,
              className: classInfo.className,
              status: 'failed',
              error: error.message
            });
          }
        }
      }

      const summary = {
        totalClasses: classes.length,
        createdSchedules: createdSchedulesCount,
        skippedSchedules: results.filter(r => r.status === 'skipped').length,
        failedSchedules: results.filter(r => r.status === 'failed').length,
        successRate: ((createdSchedulesCount / classes.length) * 100).toFixed(2) + '%'
      };

      console.log('\n📊 Schedule Creation Summary:');
      console.log(`- Total Classes: ${summary.totalClasses}`);
      console.log(`- Created: ${summary.createdSchedules}`);
      console.log(`- Skipped: ${summary.skippedSchedules}`);
      console.log(`- Failed: ${summary.failedSchedules}`);
      console.log(`- Success Rate: ${summary.successRate}`);

      return {
        summary,
        results,
        useNewArchitecture: true
      };

    } catch (error) {
      throw new Error(`Failed to initialize schedules with new architecture: ${error.message}`);
    }
  }

  // Helper method để tạo schedule với lessons cho một lớp
  async createScheduleWithLessons(classId, academicYearId, createdBy, homeroomTeacher) {
    console.log(`🏗️ Creating schedule with lessons for class ${classId}...`);

    // Tạo schedule chính
    const schedule = await Schedule.createSchedule(classId, academicYearId, createdBy);

    // Lấy time slots
    const timeSlots = await TimeSlot.getAllActive();

    // Lấy subjects cho grade level này
    const classDoc = await Class.findById(classId);
    const subjects = await Subject.find({
      gradeLevels: classDoc.className.startsWith('12') ? 12 : 
                   classDoc.className.startsWith('11') ? 11 : 10,
      isActive: true
    });

    console.log(`📚 Found ${subjects.length} subjects for grade`);

    // Tạo 38 tuần
    const academicYear = await AcademicYear.findById(academicYearId);
    const startDate = new Date(academicYear.startDate);
    
    for (let weekNum = 1; weekNum <= 38; weekNum++) {
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(startDate.getDate() + (weekNum - 1) * 7);
      
      // Điều chỉnh để thứ 2 là ngày đầu tuần
      const dayOfWeek = weekStartDate.getDay();
      const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
      if (daysToMonday > 0) {
        weekStartDate.setDate(weekStartDate.getDate() + daysToMonday);
      }

      // Tạo weekly schedule
      const weeklySchedule = await WeeklySchedule.createWeek(
        classId,
        academicYearId,
        weekNum,
        weekStartDate,
        createdBy
      );

      // Tạo lessons cho tuần này
      await this.createLessonsForWeek(
        weeklySchedule._id,
        classId,
        academicYearId,
        weekNum,
        weekStartDate,
        timeSlots,
        subjects,
        homeroomTeacher,
        createdBy
      );

      // Add weekly schedule to main schedule
      await schedule.addWeeklySchedule(weeklySchedule._id);
      await weeklySchedule.publish();
    }

    // Update statistics
    await schedule.updateStatistics();

    return schedule;
  }

  // NEW: Tạo schedules cho nhiều lớp với teacher distribution tối ưu
  async createMultiClassSchedulesWithLessons(classes, academicYearId, createdBy) {
    console.log(`\n🎯 Creating schedules for ${classes.length} classes with optimized teacher distribution...`);

    // Lấy time slots và subjects
    const timeSlots = await TimeSlot.getAllActive();
    const academicYear = await AcademicYear.findById(academicYearId);
    const startDate = new Date(academicYear.startDate);

    // Lấy subjects cho grade level
    const gradeLevel = classes[0].className.startsWith('12') ? 12 : 
                      classes[0].className.startsWith('11') ? 11 : 10;
    const subjects = await Subject.find({
      gradeLevels: gradeLevel,
      isActive: true
    });

    console.log(`📚 Found ${subjects.length} subjects for grade ${gradeLevel}`);

    // Tạo schedules và weekly schedules cho tất cả lớp
    const schedules = [];
    const weeklySchedulesByWeek = []; // [week][classIndex] = weeklyScheduleId

    for (const classInfo of classes) {
      const schedule = await Schedule.createSchedule(classInfo._id, academicYearId, createdBy);
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
      const classIds = classes.map(c => c._id);
      const homeroomTeachers = classes.map(c => c.homeroomTeacher);

      // Create lessons for all classes in this week
      await this.createLessonsForMultipleClasses(
        weeklyScheduleIds,
        classIds,
        academicYearId,
        weekNum,
        weekStartDate,
        timeSlots,
        subjects,
        homeroomTeachers,
        createdBy
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

    console.log(`✅ Successfully created ${classes.length} optimized schedules`);
    return schedules;
  }

  // NEW: Multi-class constraint-based scheduling với phân bổ giáo viên tối ưu
  async createLessonsForWeek(weeklyScheduleId, classId, academicYearId, weekNum, weekStartDate, timeSlots, subjects, homeroomTeacher, createdBy) {
    // For single class, use the simple constraint scheduler
    const ConstraintSchedulerService = require('./constraint-scheduler.service');
    const constraintScheduler = new ConstraintSchedulerService();
    
    return await constraintScheduler.createConstraintBasedSchedule(
      weeklyScheduleId, classId, academicYearId, weekNum, weekStartDate, 
      timeSlots, subjects, homeroomTeacher, createdBy
    );
  }

  // NEW: Multi-class scheduling method for creating different schedules
  async createLessonsForMultipleClasses(weeklyScheduleIds, classIds, academicYearId, weekNum, weekStartDate, timeSlots, subjects, homeroomTeachers, createdBy) {
    const MultiClassSchedulerService = require('./multi-class-scheduler.service');
    const multiClassScheduler = new MultiClassSchedulerService();
    
    return await multiClassScheduler.createMultiClassSchedules(
      weeklyScheduleIds, classIds, academicYearId, weekNum, weekStartDate,
      timeSlots, subjects, homeroomTeachers, createdBy
    );
  }

  // Initialize constraint tracking system
  initializeConstraintSystem(classId, subjects, homeroomTeacher, timeSlots) {
    const constraints = {
      // Core data
      classId,
      subjects,
      homeroomTeacher,
      timeSlots,
      
      // Schedule matrix: [dayIndex][period] = lesson or null
      schedule: Array(7).fill().map(() => Array(10).fill(null)),
      
      // Teacher tracking: teacherId -> { schedule: [dayIndex][period], workload: {...} }
      teacherSchedules: new Map(),
      
      // Subject requirements: subjectId -> { required: X, scheduled: Y, doublePeriods: Z }
      subjectRequirements: new Map(),
      
      // Priority subjects for double periods
      prioritySubjects: ['Mathematics', 'Literature', 'English'],
      
      // Time preferences
      morningPeriods: [1, 2, 3, 4, 5], // periods 1-5
      afternoonPeriods: [6, 7, 8, 9, 10], // periods 6-10
      
      // Constraint violations tracking
      violations: [],
      
      // Statistics
      stats: {
        totalLessons: 0,
        doublePeriods: 0,
        constraintViolations: 0
      }
    };

    // Initialize teacher schedules
    this.initializeTeacherSchedules(constraints);
    
    // Initialize subject requirements
    this.initializeSubjectRequirements(constraints);
    
    return constraints;
  }

  // Initialize teacher schedule tracking
  initializeTeacherSchedules(constraints) {
    // Add homeroom teacher
    if (constraints.homeroomTeacher) {
      constraints.teacherSchedules.set(constraints.homeroomTeacher._id.toString(), {
        schedule: Array(7).fill().map(() => Array(10).fill(false)),
        workload: { daily: Array(7).fill(0), weekly: 0 },
        maxLessonsPerDay: 8,
        maxLessonsPerWeek: 30,
        unavailableTimes: [] // Can be extended from teacher profile
      });
    }

    // Add subject teachers
    constraints.subjects.forEach(subject => {
      // Find specialized teacher for this subject
      this.findSpecializedTeacher(subject._id).then(teacher => {
        if (teacher && !constraints.teacherSchedules.has(teacher._id.toString())) {
          constraints.teacherSchedules.set(teacher._id.toString(), {
            schedule: Array(7).fill().map(() => Array(10).fill(false)),
            workload: { daily: Array(7).fill(0), weekly: 0 },
            maxLessonsPerDay: 8,
            maxLessonsPerWeek: 30,
            unavailableTimes: []
          });
        }
      });
    });
  }

  // Initialize subject requirements
  initializeSubjectRequirements(constraints) {
    constraints.subjects.forEach(subject => {
      const weeklyHours = subject.weeklyHours || 3;
      const requiresDoublePeriods = constraints.prioritySubjects.includes(subject.subjectName);
      
      constraints.subjectRequirements.set(subject._id.toString(), {
        subject: subject,
        required: weeklyHours,
        scheduled: 0,
        doublePeriods: 0,
        requiresDoublePeriods: requiresDoublePeriods,
        minDoublePeriods: requiresDoublePeriods ? Math.floor(weeklyHours * 0.6 / 2) : 0
      });
    });
  }

  // Step 1: Schedule fixed periods (CRITICAL priority)
  async scheduleFixedPeriods(constraints, weekStartDate, timeSlots, homeroomTeacher, createdBy) {
    console.log('🏷️ Scheduling fixed periods...');
    
    // Schedule flag ceremony (Monday, period 1)
    const mondayDate = new Date(weekStartDate);
    mondayDate.setDate(weekStartDate.getDate() + 0); // Monday
    
    const flagLesson = await this.createLesson({
      classId: constraints.classId,
      dayIndex: 0,
      period: 1,
      type: 'fixed',
      fixedInfo: { type: 'flag_ceremony', description: 'Chào cờ' },
      teacher: homeroomTeacher,
      date: mondayDate,
      timeSlot: timeSlots[0],
      createdBy
    });
    
    constraints.schedule[0][0] = flagLesson;
    this.bookTeacherSlot(constraints, homeroomTeacher._id, 0, 1);
    
    // Schedule class meeting (Saturday, period 5)
    const saturdayDate = new Date(weekStartDate);
    saturdayDate.setDate(weekStartDate.getDate() + 5); // Saturday
    
    const classMeetingLesson = await this.createLesson({
      classId: constraints.classId,
      dayIndex: 5,
      period: 5,
      type: 'fixed',
      fixedInfo: { type: 'class_meeting', description: 'Sinh hoạt lớp' },
      teacher: homeroomTeacher,
      date: saturdayDate,
      timeSlot: timeSlots[4],
      createdBy
    });
    
    constraints.schedule[5][4] = classMeetingLesson;
    this.bookTeacherSlot(constraints, homeroomTeacher._id, 5, 5);
    
    console.log('✅ Fixed periods scheduled successfully');
  }

  // Step 2: Schedule double periods for priority subjects (HIGH priority)
  async scheduleDoublePeriods(constraints, subjects, weekStartDate, timeSlots, createdBy) {
    console.log('🔗 Scheduling double periods for priority subjects...');
    
    const prioritySubjects = subjects.filter(s => 
      constraints.prioritySubjects.includes(s.subjectName)
    );
    
    for (const subject of prioritySubjects) {
      const requirement = constraints.subjectRequirements.get(subject._id.toString());
      const teacher = await this.findSpecializedTeacher(subject._id);
      
      if (!teacher) continue;
      
      // Schedule required double periods
      for (let dp = 0; dp < requirement.minDoublePeriods; dp++) {
        const slot = await this.findBestDoubleSlot(constraints, subject, teacher);
        
        if (slot) {
          await this.scheduleDoubleLesson(
            constraints, 
            subject, 
            teacher, 
            slot.dayIndex, 
            slot.startPeriod, 
            weekStartDate, 
            timeSlots, 
            createdBy
          );
          
          requirement.doublePeriods++;
          requirement.scheduled += 2;
          constraints.stats.doublePeriods++;
          
          console.log(`✅ Double period scheduled: ${subject.subjectName} on day ${slot.dayIndex + 1}, periods ${slot.startPeriod}-${slot.startPeriod + 1}`);
        } else {
          console.log(`⚠️ Could not find slot for double period: ${subject.subjectName}`);
        }
      }
    }
  }

  // Step 3: Schedule remaining single periods
  async scheduleSinglePeriods(constraints, subjects, weekStartDate, timeSlots, createdBy) {
    console.log('📚 Scheduling remaining single periods...');
    
    // Create list of remaining periods to schedule
    const remainingPeriods = [];
    
    for (const subject of subjects) {
      const requirement = constraints.subjectRequirements.get(subject._id.toString());
      const remaining = requirement.required - requirement.scheduled;
      
      for (let i = 0; i < remaining; i++) {
        remainingPeriods.push({
          subject: subject,
          priority: this.getSubjectPriority(subject),
          teacher: await this.findSpecializedTeacher(subject._id)
        });
      }
    }
    
    // Sort by priority (high priority subjects first)
    remainingPeriods.sort((a, b) => b.priority - a.priority);
    
    // Schedule each period
    for (const period of remainingPeriods) {
      if (!period.teacher) continue;
      
      const slot = await this.findBestSingleSlot(constraints, period.subject, period.teacher);
      
      if (slot) {
        const lesson = await this.scheduleSingleLesson(
          constraints,
          period.subject,
          period.teacher,
          slot.dayIndex,
          slot.period,
          weekStartDate,
          timeSlots,
          createdBy
        );
        
        const requirement = constraints.subjectRequirements.get(period.subject._id.toString());
        requirement.scheduled++;
        
        console.log(`✅ Single period scheduled: ${period.subject.subjectName} on day ${slot.dayIndex + 1}, period ${slot.period}`);
      } else {
        constraints.violations.push({
          type: 'CANNOT_SCHEDULE_PERIOD',
          subject: period.subject.subjectName,
          reason: 'No available time slot found'
        });
      }
    }
  }

  // Find best slot for double period
  async findBestDoubleSlot(constraints, subject, teacher) {
    const morningSlots = [[1,2], [2,3], [3,4]]; // periods 1-2, 2-3, 3-4
    const afternoonSlots = [[6,7], [7,8], [8,9]]; // periods 6-7, 7-8, 8-9
    
    // Priority subjects prefer morning slots
    const slotsToCheck = constraints.prioritySubjects.includes(subject.subjectName) 
      ? [...morningSlots, ...afternoonSlots]
      : [...afternoonSlots, ...morningSlots];
    
    for (let dayIndex = 0; dayIndex < 6; dayIndex++) { // Monday to Saturday
      for (const [period1, period2] of slotsToCheck) {
        if (this.canScheduleDoubleSlot(constraints, teacher._id, dayIndex, period1, period2)) {
          return { dayIndex, startPeriod: period1 };
        }
      }
    }
    
    return null;
  }

  // Check if double slot is available
  canScheduleDoubleSlot(constraints, teacherId, dayIndex, period1, period2) {
    // Check class availability
    if (constraints.schedule[dayIndex][period1 - 1] !== null || 
        constraints.schedule[dayIndex][period2 - 1] !== null) {
      return false;
    }
    
    // Check teacher availability
    const teacherSchedule = constraints.teacherSchedules.get(teacherId.toString());
    if (!teacherSchedule) return false;
    
    if (teacherSchedule.schedule[dayIndex][period1 - 1] || 
        teacherSchedule.schedule[dayIndex][period2 - 1]) {
      return false;
    }
    
    // Check daily workload limit
    if (teacherSchedule.workload.daily[dayIndex] + 2 > teacherSchedule.maxLessonsPerDay) {
      return false;
    }
    
    return true;
  }

  // Schedule double lesson
  async scheduleDoubleLesson(constraints, subject, teacher, dayIndex, startPeriod, weekStartDate, timeSlots, createdBy) {
    const date = new Date(weekStartDate);
    date.setDate(weekStartDate.getDate() + dayIndex);
    
    // Create first lesson
    const lesson1 = await this.createLesson({
      classId: constraints.classId,
      dayIndex,
      period: startPeriod,
      type: 'regular',
      subject,
      teacher,
      date,
      timeSlot: timeSlots[startPeriod - 1],
      createdBy,
      isDoublePeriod: true,
      doublePeriodPosition: 'first'
    });
    
    // Create second lesson
    const lesson2 = await this.createLesson({
      classId: constraints.classId,
      dayIndex,
      period: startPeriod + 1,
      type: 'regular',
      subject,
      teacher,
      date,
      timeSlot: timeSlots[startPeriod],
      createdBy,
      isDoublePeriod: true,
      doublePeriodPosition: 'second'
    });
    
    // Update schedule
    constraints.schedule[dayIndex][startPeriod - 1] = lesson1;
    constraints.schedule[dayIndex][startPeriod] = lesson2;
    
    // Book teacher slots
    this.bookTeacherSlot(constraints, teacher._id, dayIndex, startPeriod);
    this.bookTeacherSlot(constraints, teacher._id, dayIndex, startPeriod + 1);
    
    return [lesson1, lesson2];
  }

  // Create individual lesson object
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
    
    if (data.subject) {
      lessonData.subject = data.subject._id;
    }
    
    if (data.teacher) {
      lessonData.teacher = data.teacher._id;
    }
    
    if (data.fixedInfo) {
      lessonData.fixedInfo = data.fixedInfo;
    }
    
    if (data.isDoublePeriod) {
      lessonData.notes = `Double period - ${data.doublePeriodPosition}`;
    }
    
    const lesson = new Lesson(lessonData);
    await lesson.save();
    
    return lesson;
  }

  // Book teacher time slot
  bookTeacherSlot(constraints, teacherId, dayIndex, period) {
    const teacherSchedule = constraints.teacherSchedules.get(teacherId.toString());
    if (teacherSchedule) {
      teacherSchedule.schedule[dayIndex][period - 1] = true;
      teacherSchedule.workload.daily[dayIndex]++;
      teacherSchedule.workload.weekly++;
    }
  }

  // Get subject priority for scheduling order
  getSubjectPriority(subject) {
    const priorityMap = {
      'Mathematics': 10,
      'Literature': 9,
      'English': 8,
      'Physics': 7,
      'Chemistry': 6,
      'Biology': 5,
      'History': 4,
      'Geography': 3,
      'Physical Education': 2
    };
    
    return priorityMap[subject.subjectName] || 1;
  }

  // Find specialized teacher for subject
  async findSpecializedTeacher(subjectId) {
    const teacher = await User.findOne({
      subject: subjectId,
      role: { $in: ['teacher', 'homeroom_teacher'] },
      active: true
    });
    
    return teacher;
  }

  // Validate all constraints
  validateAllConstraints(constraints) {
    const violations = [];
    
    // Check teacher constraints
    this.validateTeacherConstraints(constraints, violations);
    
    // Check subject requirements
    this.validateSubjectRequirements(constraints, violations);
    
    // Check double period requirements
    this.validateDoublePeriodRequirements(constraints, violations);
    
    return {
      isValid: violations.length === 0,
      violations: violations
    };
  }

  // Validate teacher constraints
  validateTeacherConstraints(constraints, violations) {
    for (const [teacherId, teacherData] of constraints.teacherSchedules) {
      // Check daily workload limits
      teacherData.workload.daily.forEach((daily, dayIndex) => {
        if (daily > teacherData.maxLessonsPerDay) {
          violations.push({
            type: 'TEACHER_DAILY_OVERLOAD',
            teacherId,
            day: dayIndex,
            actual: daily,
            limit: teacherData.maxLessonsPerDay
          });
        }
      });
      
      // Check weekly workload limit
      if (teacherData.workload.weekly > teacherData.maxLessonsPerWeek) {
        violations.push({
          type: 'TEACHER_WEEKLY_OVERLOAD',
          teacherId,
          actual: teacherData.workload.weekly,
          limit: teacherData.maxLessonsPerWeek
        });
      }
    }
  }

  // Print scheduling summary
  printSchedulingSummary(constraints, validationResult) {
    console.log(`\n📊 SCHEDULING SUMMARY`);
    console.log('='.repeat(50));
    console.log(`Total lessons scheduled: ${constraints.stats.totalLessons}`);
    console.log(`Double periods created: ${constraints.stats.doublePeriods}`);
    console.log(`Constraint violations: ${validationResult.violations.length}`);
    
    if (validationResult.violations.length > 0) {
      console.log(`\n❌ VIOLATIONS:`);
      validationResult.violations.forEach(v => {
        console.log(`  - ${v.type}: ${v.reason || 'Details in violation object'}`);
      });
    } else {
      console.log(`\n✅ All constraints satisfied!`);
    }
  }

  // Helper method để đảm bảo time slots exist
  async ensureTimeSlots() {
    const existingSlots = await TimeSlot.countDocuments();
    if (existingSlots === 0) {
      console.log('⏰ Creating default time slots...');
      await TimeSlot.createDefaultTimeSlots();
    }
  }

  // Khởi tạo thời khóa biểu cho các lớp trong năm học (38 tuần, 7 ngày/tuần bao gồm chủ nhật) - LEGACY
  async initializeSchedulesForAcademicYear(data, token) {
    try {
      const { academicYear, gradeLevel } = data;
      
      // Verify user permissions
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !['admin', 'manager'].includes(user.role[0])) {
        throw new Error('Unauthorized to create schedules');
      }

      console.log(`🚀 Starting schedule initialization for grade ${gradeLevel}, academic year ${academicYear}`);

      // Lấy danh sách lớp theo khối
      const classes = await Class.find({
        className: new RegExp(`^${gradeLevel}`),
        academicYear,
        active: true
      }).populate('homeroomTeacher');

      if (!classes || classes.length === 0) {
        throw new Error(`No classes found for grade ${gradeLevel} in academic year ${academicYear}`);
      }

      console.log(`📚 Found ${classes.length} classes: ${classes.map(c => c.className).join(', ')}`);

      const results = [];
      let createdSchedulesCount = 0;

      // Tạo thời khóa biểu cho từng lớp
      for (const classInfo of classes) {
        try {
          console.log(`\n🎯 Processing class: ${classInfo.className}`);
          
          // Kiểm tra xem lớp đã có thời khóa biểu active chưa
          const existingSchedule = await Schedule.findOne({
            class: classInfo._id,
            academicYear,
            status: 'active'
          });

          if (existingSchedule) {
            console.log(`⚠️ Schedule already exists for ${classInfo.className}, skipping...`);
            results.push({
              classId: classInfo._id,
              className: classInfo.className,
              status: 'skipped',
              message: 'Schedule already exists'
            });
            continue;
          }

          // Tạo thời khóa biểu tối ưu
          const schedule = await this.advancedScheduler.createOptimizedSchedule(
            classInfo._id,
            academicYear
          );

          if (schedule) {
            schedule.status = 'active';
            await schedule.save({ validateBeforeSave: false });

            console.log(`✅ Successfully created schedule for ${classInfo.className}`);
            
            results.push({
              classId: classInfo._id,
              className: classInfo.className,
              status: 'created',
              scheduleId: schedule._id,
              optimizationScore: this.calculateOptimizationScore(schedule)
            });
            
            createdSchedulesCount++;
          }

        } catch (classError) {
          console.error(`❌ Failed to create schedule for ${classInfo.className}:`, classError.message);
          
          results.push({
            classId: classInfo._id,
            className: classInfo.className,
            status: 'failed',
            error: classError.message
          });
        }
      }

      const summary = {
        totalClasses: classes.length,
        createdSchedules: createdSchedulesCount,
        skippedSchedules: results.filter(r => r.status === 'skipped').length,
        failedSchedules: results.filter(r => r.status === 'failed').length,
        successRate: ((createdSchedulesCount / classes.length) * 100).toFixed(2) + '%'
      };

      console.log('\n📊 Schedule Creation Summary:');
      console.log(`- Total Classes: ${summary.totalClasses}`);
      console.log(`- Created: ${summary.createdSchedules}`);
      console.log(`- Skipped: ${summary.skippedSchedules}`);
      console.log(`- Failed: ${summary.failedSchedules}`);
      console.log(`- Success Rate: ${summary.successRate}`);

      return {
        summary,
        results
      };

    } catch (error) {
      throw new Error(`Failed to initialize schedules: ${error.message}`);
    }
  }

  // Tính điểm tối ưu hóa cho thời khóa biểu (updated for Period model)
  async calculateOptimizationScore(schedule) {
    try {
      console.log(`📊 Calculating optimization score for schedule ${schedule._id}...`);
      
      const totalRegularPeriods = await Period.countDocuments({
        schedule: schedule._id,
        periodType: 'regular'
      });
      
      const assignedPeriods = await Period.countDocuments({
        schedule: schedule._id,
        periodType: 'regular',
        subject: { $exists: true, $ne: null },
        teacher: { $exists: true, $ne: null }
      });
      
      // Check for valid periodId format
      const validPeriodIds = await Period.countDocuments({
        schedule: schedule._id,
        periodId: { $regex: /^[a-f0-9]{6}_week\d{2}_day\d_period\d{2}$/ }
      });
      
      const totalPeriods = await Period.countDocuments({
        schedule: schedule._id
      });
      
      // Tính phần trăm phân công
      const assignmentRate = totalRegularPeriods > 0 ? (assignedPeriods / totalRegularPeriods) : 0;
      // Tính phần trăm periodId hợp lệ
      const periodIdValidityRate = totalPeriods > 0 ? (validPeriodIds / totalPeriods) : 0;
      
      // Tổng điểm dựa trên cả assignment và periodId validity
      const score = Math.round((assignmentRate * 0.7 + periodIdValidityRate * 0.3) * 100);
      
      console.log(`📈 Optimization Score: ${score}% (${assignedPeriods}/${totalRegularPeriods} assigned, ${validPeriodIds}/${totalPeriods} valid periodIds)`);
      
      // Log sample periodIds for verification
      const samplePeriods = await Period.find({
        schedule: schedule._id,
        periodId: { $exists: true, $ne: null }
      }).select('periodId weekNumber dayOfWeek periodNumber').limit(3).lean();
      
      if (samplePeriods.length > 0) {
        console.log(`🆔 Sample periodIds: ${samplePeriods.map(p => p.periodId).join(', ')}`);
      }
      
      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error('❌ Error calculating optimization score:', error.message);
      return 0;
    }
  }

  // Tạo thời khóa biểu cho một lớp cụ thể
  async initializeScheduleForClass(data, token) {
    try {
      const { classId, academicYear } = data;
      
      // Verify permissions
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !['admin', 'manager', 'teacher'].includes(user.role[0])) {
        throw new Error('Unauthorized to create schedule');
      }

      const schedule = await this.advancedScheduler.createOptimizedSchedule(classId, academicYear);
      
      if (schedule) {
        schedule.status = 'active';
        await schedule.save({ validateBeforeSave: false });
      }

      return {
        scheduleId: schedule._id,
        optimizationScore: this.calculateOptimizationScore(schedule),
        message: 'Schedule created successfully'
      };

    } catch (error) {
      throw new Error(`Failed to create schedule for class: ${error.message}`);
    }
  }

  // Lấy thời khóa biểu của lớp theo tuần (updated for Period model)
  async getClassSchedule(className, academicYear, weekNumber = 1) {
    try {
      const classInfo = await Class.findOne({ className, academicYear });
      if (!classInfo) {
        throw new Error(`Class ${className} not found in academic year ${academicYear}`);
      }

      const schedule = await Schedule.findOne({
        class: classInfo._id,
        academicYear,
        status: 'active'
      })
      .populate('class', 'className academicYear')
      .lean();

      if (!schedule) {
        throw new Error(`No active schedule found for class ${className}`);
      }

      // Get the specific week
      const week = schedule.weeks.find(w => w.weekNumber === weekNumber);
      if (!week) {
        throw new Error(`Week ${weekNumber} not found in schedule`);
      }

      // Populate periods for the week
      const periodIds = [];
      week.days.forEach(day => {
        periodIds.push(...day.periods);
      });

      const periods = await Period.find({
        _id: { $in: periodIds }
      })
      .populate('subject', 'subjectName subjectCode')
      .populate('teacher', 'name email')
      .lean();

      // Create period lookup map
      const periodMap = {};
      periods.forEach(period => {
        periodMap[period._id.toString()] = period;
      });

      // Populate periods in days
      week.days.forEach(day => {
        day.periods = day.periods.map(periodId => periodMap[periodId.toString()]).filter(Boolean);
      });

      return {
        schedule: {
          _id: schedule._id,
          class: schedule.class,
          academicYear: schedule.academicYear,
          status: schedule.status,
          totalWeeks: schedule.totalWeeks
        },
        week: week
      };

    } catch (error) {
      throw new Error(`Error fetching class schedule: ${error.message}`);
    }
  }

  // Lấy thời khóa biểu theo khoảng ngày (updated for Period model)
  async getClassScheduleByDateRange(className, academicYear, startOfWeek, endOfWeek) {
    try {
      console.log(`🔍 Getting schedule for ${className}, ${academicYear}, ${startOfWeek} to ${endOfWeek}`);
      
      const classInfo = await Class.findOne({ className, academicYear });
      if (!classInfo) {
        throw new Error(`Class ${className} not found in academic year ${academicYear}`);
      }

      const schedule = await Schedule.findOne({
        class: classInfo._id,
        academicYear,
        status: 'active'
      })
      .populate('class', 'className academicYear gradeLevel')
      .lean();

      if (!schedule) {
        throw new Error(`No active schedule found for class ${className}`);
      }

      const startDate = new Date(startOfWeek);
      const endDate = new Date(endOfWeek);
      
      // Find weeks that fall within the date range
      const relevantWeeks = schedule.weeks.filter(week => {
        const weekStart = new Date(week.startDate);
        const weekEnd = new Date(week.endDate);
        return weekStart <= endDate && weekEnd >= startDate;
      });

      if (relevantWeeks.length === 0) {
        throw new Error(`No weeks found in date range ${startOfWeek} to ${endOfWeek}`);
      }

      console.log(`📅 Found ${relevantWeeks.length} weeks in date range`);

      // Get all period IDs from relevant weeks
      const periodIds = [];
      relevantWeeks.forEach(week => {
        week.days.forEach(day => {
          periodIds.push(...day.periods);
        });
      });

      // Fetch all periods with population and include periodId
      const periods = await Period.find({
        _id: { $in: periodIds }
      })
      .populate('subject', 'subjectName subjectCode')
      .populate('teacher', 'name email')
      .select('_id periodId weekNumber dayOfWeek dayName date periodNumber subject teacher session timeStart timeEnd periodType status notes')
      .lean();

      console.log(`📚 Found ${periods.length} periods total`);

      // Log sample periodIds for verification
      const samplePeriods = periods.slice(0, 3);
      if (samplePeriods.length > 0) {
        console.log(`🆔 Sample periodIds: ${samplePeriods.map(p => p.periodId).join(', ')}`);
      }

      // Create period lookup map
      const periodMap = {};
      periods.forEach(period => {
        periodMap[period._id.toString()] = period;
      });

      // Populate periods in weeks and days
      relevantWeeks.forEach(week => {
        week.days.forEach(day => {
          day.periods = day.periods.map(periodId => periodMap[periodId.toString()]).filter(Boolean);
          // Sort periods by period number
          day.periods.sort((a, b) => a.periodNumber - b.periodNumber);
        });
      });

      // Create weekly schedule format for compatibility
      const weeklySchedule = [];
      
      // Create all 7 days of week structure
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
        let dayFound = false;
        
        // Look for this day in relevant weeks
        relevantWeeks.forEach(week => {
          const dayInWeek = week.days.find(day => day.dayOfWeek === dayOfWeek);
          if (dayInWeek) {
            const dayDate = new Date(dayInWeek.date);
            if (dayDate >= startDate && dayDate <= endDate) {
              weeklySchedule.push({
                dayOfWeek: dayInWeek.dayOfWeek,
                dayName: dayInWeek.dayName,
                date: dayInWeek.date,
                periods: dayInWeek.periods || []
              });
              dayFound = true;
            }
          }
        });
        
        // If no day found, create empty structure
        if (!dayFound) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + (dayOfWeek - 1));
          
          if (currentDate <= endDate) {
            weeklySchedule.push({
              dayOfWeek: dayOfWeek,
              dayName: dayNames[dayOfWeek - 1],
              date: currentDate.toISOString().split('T')[0],
              periods: []
            });
          }
        }
      }

      console.log(`📊 Returning schedule with ${weeklySchedule.length} days`);

      return {
        class: schedule.class,
        academicYear: schedule.academicYear,
        weeks: relevantWeeks,
        weeklySchedule: weeklySchedule,
        dateRange: {
          startOfWeek,
          endOfWeek
        },
        metadata: {
          totalWeeks: schedule.totalWeeks,
          scheduleId: schedule._id,
          status: schedule.status,
          totalPeriods: periods.length,
          periodIdFormat: 'scheduleId_week##_day#_period##'
        }
      };

    } catch (error) {
      console.error('❌ Error in getClassScheduleByDateRange:', error.message);
      throw new Error(`Error fetching schedule by date range: ${error.message}`);
    }
  }

  // Update period status (updated for Period model)
  async updatePeriodStatus(scheduleId, dayOfWeek, periodNumber, status, options = {}, token) {
    try {
      // Verify permissions
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !['admin', 'manager', 'teacher'].includes(user.role[0])) {
        throw new Error('Unauthorized to update period status');
      }

      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Find the period directly using Period model
      const period = await Period.findOne({
        schedule: scheduleId,
        dayOfWeek: dayOfWeek,
        periodNumber: periodNumber
      });

      if (!period) {
        throw new Error('Period not found');
      }

      // Update the period status
      const success = await period.updateStatus(status, {
        ...options,
        updatedBy: user._id
      });

      if (!success) {
        throw new Error('Failed to update period status');
      }

      console.log(`✅ Updated period status: ${period.periodId} -> ${status}`);

      return {
        success: true,
        message: 'Period status updated successfully',
        periodId: period.periodId,
        period: {
          weekNumber: period.weekNumber,
          dayOfWeek: period.dayOfWeek,
          periodNumber: period.periodNumber,
          status: period.status
        }
      };

    } catch (error) {
      throw new Error(`Error updating period status: ${error.message}`);
    }
  }

  // Get learning progress (updated for Period model)
  async getLearningProgress(className, academicYear, options = {}) {
    try {
      const classInfo = await Class.findOne({ className, academicYear });
      if (!classInfo) {
        throw new Error(`Class ${className} not found`);
      }

      const schedule = await Schedule.findOne({
        class: classInfo._id,
        academicYear,
        status: 'active'
      });

      if (!schedule) {
        throw new Error(`No active schedule found for class ${className}`);
      }

      // Get overall progress using Schedule method (which uses Period aggregation)
      const overallProgress = await schedule.getLearningProgress();
      
      // Get subject progress
      const subjectProgress = await schedule.getProgressBySubject();

      // Get period type statistics
      const periodTypeStats = await schedule.getPeriodTypeStatistics();

      return {
        overall: overallProgress,
        bySubject: subjectProgress,
        byType: periodTypeStats,
        classInfo: {
          className: classInfo.className,
          academicYear: academicYear,
          gradeLevel: classInfo.gradeLevel
        }
      };

    } catch (error) {
      throw new Error(`Error getting learning progress: ${error.message}`);
    }
  }

  // Updated methods that work with Period model
  async calculateOverallProgress(schedule) {
    return await schedule.getLearningProgress();
  }

  async calculateSubjectProgress(schedule) {
    return await schedule.getProgressBySubject();
  }

  async getProgressDetails(schedule) {
    const overall = await this.calculateOverallProgress(schedule);
    const bySubject = await this.calculateSubjectProgress(schedule);
    
    return {
      overall,
      bySubject,
      lastUpdated: new Date()
    };
  }

  // Helper method để lấy tên ngày tiếng Việt
  getDayNameVN(dayOfWeek) {
    const dayNames = {
      1: 'Chủ nhật',
      2: 'Thứ 2', 
      3: 'Thứ 3',
      4: 'Thứ 4',
      5: 'Thứ 5',
      6: 'Thứ 6',
      7: 'Thứ 7'
    };
    return dayNames[dayOfWeek] || 'Unknown';
  }

  // Lấy khung giờ học (10 tiết)
  getTimeSlots() {
    return [
      { period: 1, start: '07:00', end: '07:45', session: 'morning' },
      { period: 2, start: '07:50', end: '08:35', session: 'morning' },
      { period: 3, start: '08:40', end: '09:25', session: 'morning' },
      { period: 4, start: '09:45', end: '10:30', session: 'morning' },
      { period: 5, start: '10:35', end: '11:20', session: 'morning' },
      { period: 6, start: '13:30', end: '14:15', session: 'afternoon' },
      { period: 7, start: '14:20', end: '15:05', session: 'afternoon' },
      { period: 8, start: '15:10', end: '15:55', session: 'afternoon' },
      { period: 9, start: '16:00', end: '16:45', session: 'afternoon' },
      { period: 10, start: '16:50', end: '17:35', session: 'afternoon' }
    ];
  }

  // Lấy danh sách lớp theo khối và năm học
  async getClassesByGradeAndYear(academicYear, gradeLevel) {
    try {
      const classes = await Class.find({
        className: new RegExp(`^${gradeLevel}`),
        academicYear,
        active: true
      }).populate('homeroomTeacher', 'name email').lean();

      return classes;
    } catch (error) {
      throw new Error(`Failed to get classes: ${error.message}`);
    }
  }

  // Kiểm tra lớp có tồn tại không
  async checkClassExists(className, academicYear) {
    try {
      const classInfo = await Class.findOne({ className, academicYear });
      
      return {
        exists: !!classInfo,
        class: classInfo ? {
          id: classInfo._id,
          className: classInfo.className,
          academicYear: classInfo.academicYear,
          gradeLevel: classInfo.gradeLevel
        } : null
      };
    } catch (error) {
      throw new Error(`Failed to check class existence: ${error.message}`);
    }
  }

  // Lấy danh sách schedules có sẵn
  async getAvailableSchedules(academicYear, className) {
    try {
      const query = { academicYear };
      
      if (className) {
        const classInfo = await Class.findOne({ className, academicYear });
        if (classInfo) {
          query.class = classInfo._id;
        }
      }

      const schedules = await Schedule.find(query)
        .populate('class', 'className academicYear gradeLevel')
        .select('class academicYear status totalWeeks createdAt')
        .lean();

      return {
        total: schedules.length,
        schedules: schedules.map(schedule => ({
          id: schedule._id,
          className: schedule.class.className,
          academicYear: schedule.academicYear,
          gradeLevel: schedule.class.gradeLevel,
          status: schedule.status,
          totalWeeks: schedule.totalWeeks,
          createdAt: schedule.createdAt
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get available schedules: ${error.message}`);
    }
  }

  // Lấy thông tin schedule theo ID
  async getScheduleById(scheduleId) {
    try {
      const schedule = await Schedule.findById(scheduleId)
        .populate('class', 'className academicYear gradeLevel')
        .populate('weeks.days.periods.subject', 'subjectName subjectCode')
        .populate('weeks.days.periods.teacher', 'name email')
        .populate('createdBy', 'name email')
        .lean();

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      return schedule;
    } catch (error) {
      throw new Error(`Failed to get schedule: ${error.message}`);
    }
  }

  // Lấy thống kê thời khóa biểu
  async getScheduleStats(academicYear) {
    try {
      const totalSchedules = await Schedule.countDocuments({ academicYear });
      const activeSchedules = await Schedule.countDocuments({ academicYear, status: 'active' });
      const draftSchedules = await Schedule.countDocuments({ academicYear, status: 'draft' });
      
      const gradeStats = await Schedule.aggregate([
        { $match: { academicYear } },
        { $lookup: { from: 'classes', localField: 'class', foreignField: '_id', as: 'classInfo' } },
        { $unwind: '$classInfo' },
        { $group: { _id: '$classInfo.gradeLevel', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);

      return {
        academicYear,
        summary: {
          totalSchedules,
          activeSchedules,
          draftSchedules,
          archivedSchedules: totalSchedules - activeSchedules - draftSchedules
        },
        byGrade: gradeStats.map(stat => ({
          gradeLevel: stat._id,
          scheduleCount: stat.count
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get schedule statistics: ${error.message}`);
    }
  }

  // Lấy danh sách năm học
  async getAcademicYearOptions() {
    try {
      const years = await Schedule.distinct('academicYear');
      return years.sort().reverse();
    } catch (error) {
      throw new Error(`Failed to get academic year options: ${error.message}`);
    }
  }

  // Cập nhật trạng thái schedule
  async updateScheduleStatus(scheduleId, status, token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !['admin', 'manager'].includes(user.role[0])) {
        throw new Error('Unauthorized to update schedule status');
      }

      const schedule = await Schedule.findByIdAndUpdate(
        scheduleId,
        { 
          status, 
          lastModifiedBy: user._id 
        },
        { new: true }
      ).populate('class', 'className');

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      return {
        message: `Schedule status updated to ${status}`,
        schedule: {
          id: schedule._id,
          className: schedule.class.className,
          status: schedule.status
        }
      };
    } catch (error) {
      throw new Error(`Failed to update schedule status: ${error.message}`);
    }
  }

  // Xóa schedule
  async deleteSchedule(scheduleId, token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !['admin'].includes(user.role[0])) {
        throw new Error('Unauthorized to delete schedule');
      }

      const schedule = await Schedule.findByIdAndDelete(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      return {
        message: 'Schedule deleted successfully'
      };
    } catch (error) {
      throw new Error(`Failed to delete schedule: ${error.message}`);
    }
  }

  // Lấy danh sách schedules với filter
  async getSchedules(filters) {
    try {
      const { page = 1, limit = 10, academicYear, gradeLevel, status } = filters;
      
      const query = {};
      if (academicYear) query.academicYear = academicYear;
      if (status) query.status = status;

      let schedules = await Schedule.find(query)
        .populate('class', 'className academicYear gradeLevel')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // Filter by grade level if specified
      if (gradeLevel) {
        schedules = schedules.filter(schedule => 
          schedule.class.gradeLevel === gradeLevel
        );
      }

      const total = await Schedule.countDocuments(query);

      return {
        schedules: schedules.map(schedule => ({
          id: schedule._id,
          className: schedule.class.className,
          academicYear: schedule.academicYear,
          gradeLevel: schedule.class.gradeLevel,
          status: schedule.status,
          totalWeeks: schedule.totalWeeks,
          createdBy: schedule.createdBy?.name,
          createdAt: schedule.createdAt
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get schedules: ${error.message}`);
    }
  }

  // Save schedule với validation
  async saveScheduleWithValidation(schedule) {
    try {
      // Verify all periods have valid periodId format
      const totalPeriods = await Period.countDocuments({
        schedule: schedule._id
      });
      
      const validPeriodIds = await Period.countDocuments({
        schedule: schedule._id,
        periodId: { $regex: /^[a-f0-9]{6}_week\d{2}_day\d_period\d{2}$/ }
      });
      
      if (validPeriodIds < totalPeriods) {
        console.log(`⚠️ Warning: ${totalPeriods - validPeriodIds} periods have invalid periodId format`);
        
        // Fix invalid periodIds
        const periodsWithInvalidIds = await Period.find({
          schedule: schedule._id,
          $or: [
            { periodId: { $exists: false } },
            { periodId: null },
            { periodId: { $not: { $regex: /^[a-f0-9]{6}_week\d{2}_day\d_period\d{2}$/ } } }
          ]
        });
        
        console.log(`🔧 Fixing ${periodsWithInvalidIds.length} periods with invalid periodIds...`);
        
        for (const period of periodsWithInvalidIds) {
          const scheduleId = schedule._id.toString().slice(-6);
          const weekNum = String(period.weekNumber).padStart(2, '0');
          const dayNum = String(period.dayOfWeek);
          const periodNum = String(period.periodNumber).padStart(2, '0');
          const newPeriodId = `${scheduleId}_week${weekNum}_day${dayNum}_period${periodNum}`;
          
          period.periodId = newPeriodId;
          await period.save();
          
          console.log(`🆔 Fixed periodId: ${newPeriodId}`);
        }
      }
      
      await schedule.save({ validateBeforeSave: false });
      console.log(`✅ Schedule saved with ${totalPeriods} periods`);
      
      return schedule;
    } catch (error) {
      console.error('Failed to save schedule:', error);
      throw error;
    }
  }

  // Helper method to verify period integrity
  async verifyPeriodIntegrity(scheduleId) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Count periods by type
      const periodStats = await Period.aggregate([
        { $match: { schedule: schedule._id } },
        {
          $group: {
            _id: '$periodType',
            count: { $sum: 1 },
            validPeriodIds: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: '$periodId', regex: /^[a-f0-9]{6}_week\d{2}_day\d_period\d{2}$/ } },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      const totalPeriods = await Period.countDocuments({ schedule: schedule._id });
      
      console.log(`📊 Period Integrity Report for Schedule ${scheduleId}:`);
      console.log(`- Total Periods: ${totalPeriods}`);
      
      periodStats.forEach(stat => {
        console.log(`- ${stat._id}: ${stat.count} periods (${stat.validPeriodIds} valid periodIds)`);
      });

      return {
        totalPeriods,
        stats: periodStats,
        isValid: periodStats.every(stat => stat.count === stat.validPeriodIds)
      };
    } catch (error) {
      console.error('Error verifying period integrity:', error.message);
      throw error;
    }
  }

  // API MỚI: Lấy lịch học theo ngày cụ thể với đầy đủ thông tin
  async getDaySchedule(className, academicYear, date) {
    try {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      
      // Tìm lớp học
      const classInfo = await Class.findOne({ className, academicYear });
      if (!classInfo) {
        throw new Error(`Class ${className} not found for academic year ${academicYear}`);
      }
      
      // Tìm schedule
      const schedule = await Schedule.findOne({
        class: classInfo._id,
        academicYear,
        status: 'active'
      });
      
      if (!schedule) {
        throw new Error(`No active schedule found for class ${className}`);
      }
      
      // Tìm periods cho ngày cụ thể
      const periods = await Period.find({
        schedule: schedule._id,
        date: {
          $gte: targetDate,
          $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) // Next day
        }
      })
      .populate('subject', 'subjectName subjectCode')
      .populate('teacher', 'name email')
      .sort({ periodNumber: 1 });
      
      // Tính thống kê ngày
      const stats = {
        totalPeriods: periods.length,
        regularPeriods: periods.filter(p => p.periodType === 'regular').length,
        emptyPeriods: periods.filter(p => p.periodType === 'empty').length,
        completedPeriods: periods.filter(p => p.status === 'completed').length,
        upcomingPeriods: periods.filter(p => p.status === 'not_started').length
      };
      
      return {
        date: targetDate,
        className,
        academicYear,
        dayOfWeek: targetDate.getDay() === 0 ? 7 : targetDate.getDay() + 1, // Convert to 1-7 format
        periods: periods.map(period => ({
          id: period._id,
          periodId: period.periodId,
          periodNumber: period.periodNumber,
          subject: period.subject,
          teacher: period.teacher,
          periodType: period.periodType,
          status: period.status,
          timeStart: period.timeStart,
          timeEnd: period.timeEnd,
          notes: period.notes
        })),
        stats
      };
    } catch (error) {
      throw new Error(`Failed to get day schedule: ${error.message}`);
    }
  }

  // API MỚI: Lấy thông tin chi tiết của tiết học với metadata đầy đủ
  async getDetailedPeriodInfo(periodId) {
    try {
      const period = await Period.findById(periodId)
        .populate('class', 'className')
        .populate('schedule', 'academicYear')
        .populate('subject', 'subjectName subjectCode department')
        .populate('teacher', 'name email role')
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');
      
      if (!period) {
        return null;
      }
      
      // Lấy thông tin chi tiết từ Schedule model
      const schedule = await Schedule.findById(period.schedule);
      const detailedInfo = await schedule.getPeriodDetailsById(periodId);
      
      // Thêm thông tin bổ sung
      return {
        ...detailedInfo,
        
        // Thông tin audit
        audit: {
          createdBy: period.createdBy,
          createdAt: period.createdAt,
          lastModifiedBy: period.lastModifiedBy,
          updatedAt: period.updatedAt
        },
        
        // Thông tin lớp và năm học
        context: {
          class: period.class,
          academicYear: period.schedule.academicYear
        },
        
        // Thống kê liên quan
        statistics: await this.getPeriodStatistics(period)
      };
    } catch (error) {
      throw new Error(`Failed to get detailed period info: ${error.message}`);
    }
  }

  // Helper method để lấy thống kê period
  async getPeriodStatistics(period) {
    try {
      // Thống kê theo teacher
      const teacherStats = period.teacher ? await Period.aggregate([
        { $match: { teacher: period.teacher, schedule: period.schedule } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]) : [];
      
      // Thống kê theo subject
      const subjectStats = period.subject ? await Period.aggregate([
        { $match: { subject: period.subject, schedule: period.schedule } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]) : [];
      
      return {
        teacher: teacherStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        subject: subjectStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error getting period statistics:', error.message);
      return { teacher: {}, subject: {} };
    }
  }

  // API MỚI: Bulk update nhiều tiết học cùng lúc
  async bulkUpdatePeriods(periodsData, userId) {
    try {
      const results = {
        updated: 0,
        failed: 0,
        errors: []
      };
      
      for (const periodData of periodsData) {
        try {
          const { periodId, updates } = periodData;
          
          const period = await Period.findById(periodId);
          if (!period) {
            results.failed++;
            results.errors.push(`Period ${periodId} not found`);
            continue;
          }
          
          // Apply updates
          Object.keys(updates).forEach(key => {
            if (key !== '_id' && key !== 'periodId') {
              period[key] = updates[key];
            }
          });
          
          period.lastModifiedBy = userId;
          await period.save();
          
          results.updated++;
        } catch (periodError) {
          results.failed++;
          results.errors.push(`Error updating period ${periodData.periodId}: ${periodError.message}`);
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Failed to bulk update periods: ${error.message}`);
    }
  }

  // API MỚI: Lấy lịch giảng dạy của giáo viên theo tuần
  async getTeacherWeeklySchedule(teacherId, weekNumber, academicYear) {
    try {
      const periods = await Period.find({
        teacher: teacherId,
        weekNumber: weekNumber
      })
      .populate('class', 'className')
      .populate('subject', 'subjectName subjectCode')
      .populate('schedule', 'academicYear')
      .sort({ dayOfWeek: 1, periodNumber: 1 });
      
      // Filter by academic year
      const filteredPeriods = periods.filter(p => 
        p.schedule && p.schedule.academicYear === academicYear
      );
      
      // Group by day
      const weekSchedule = {};
      const dayNames = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      for (let day = 1; day <= 7; day++) {
        weekSchedule[dayNames[day]] = filteredPeriods
          .filter(p => p.dayOfWeek === day)
          .map(p => ({
            id: p._id,
            periodId: p.periodId,
            periodNumber: p.periodNumber,
            class: p.class,
            subject: p.subject,
            periodType: p.periodType,
            status: p.status,
            timeStart: p.timeStart,
            timeEnd: p.timeEnd,
            date: p.date
          }));
      }
      
      // Calculate stats
      const stats = {
        totalPeriods: filteredPeriods.length,
        regularPeriods: filteredPeriods.filter(p => p.periodType === 'regular').length,
        makeupPeriods: filteredPeriods.filter(p => p.periodType === 'makeup').length,
        completedPeriods: filteredPeriods.filter(p => p.status === 'completed').length,
        classes: [...new Set(filteredPeriods.map(p => p.class.className))],
        subjects: [...new Set(filteredPeriods.map(p => p.subject?.subjectName).filter(Boolean))]
      };
      
      return {
        teacherId,
        weekNumber,
        academicYear,
        schedule: weekSchedule,
        stats
      };
    } catch (error) {
      throw new Error(`Failed to get teacher weekly schedule: ${error.message}`);
    }
  }

  // API MỚI: Search và filter periods với điều kiện phức tạp
  async searchPeriods(filters) {
    try {
      const query = {};
      
      // Build query based on filters
      if (filters.teacher) query.teacher = filters.teacher;
      if (filters.subject) query.subject = filters.subject;
      if (filters.class) query.class = filters.class;
      if (filters.schedule) query.schedule = filters.schedule;
      if (filters.periodType) query.periodType = filters.periodType;
      if (filters.status) query.status = filters.status;
      if (filters.weekNumber) query.weekNumber = parseInt(filters.weekNumber);
      if (filters.dayOfWeek) query.dayOfWeek = parseInt(filters.dayOfWeek);
      if (filters.periodNumber) query.periodNumber = parseInt(filters.periodNumber);
      
      // Date range filter
      if (filters.startDate || filters.endDate) {
        query.date = {};
        if (filters.startDate) query.date.$gte = new Date(filters.startDate);
        if (filters.endDate) query.date.$lte = new Date(filters.endDate);
      }
      
      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;
      
      const periods = await Period.find(query)
        .populate('class', 'className')
        .populate('subject', 'subjectName subjectCode')
        .populate('teacher', 'name email')
        .populate('schedule', 'academicYear')
        .sort({ weekNumber: 1, dayOfWeek: 1, periodNumber: 1 })
        .skip(skip)
        .limit(limit);
      
      const total = await Period.countDocuments(query);
      
      return {
        periods: periods.map(p => ({
          id: p._id,
          periodId: p.periodId,
          class: p.class,
          subject: p.subject,
          teacher: p.teacher,
          schedule: p.schedule,
          weekNumber: p.weekNumber,
          dayOfWeek: p.dayOfWeek,
          dayName: p.dayName,
          periodNumber: p.periodNumber,
          periodType: p.periodType,
          status: p.status,
          date: p.date,
          timeStart: p.timeStart,
          timeEnd: p.timeEnd
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        filters: query
      };
    } catch (error) {
      throw new Error(`Failed to search periods: ${error.message}`);
    }
  }

  // NEW: Get detailed lesson schedule by date range using Lesson model
  async getDetailedLessonScheduleByDateRange(className, academicYear, startOfWeek, endOfWeek) {
    try {
      console.log(`🔍 Getting detailed lesson schedule for ${className}, ${academicYear}, ${startOfWeek} to ${endOfWeek}`);
      
      const classInfo = await Class.findOne({ className, academicYear });
      if (!classInfo) {
        throw new Error(`Class ${className} not found in academic year ${academicYear}`);
      }

      const startDate = new Date(startOfWeek);
      const endDate = new Date(endOfWeek);
      endDate.setHours(23, 59, 59, 999); // End of day

      // Find all lessons in the date range for this class
      const lessons = await Lesson.find({
        class: classInfo._id,
        scheduledDate: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .populate('subject', 'subjectName subjectCode department weeklyHours')
      .populate('teacher', 'name email phoneNumber role')
      .populate('timeSlot', 'period startTime endTime')
      .populate('academicYear', 'name startDate endDate isActive')
      .sort({ scheduledDate: 1, 'timeSlot.period': 1 })
      .lean();

      console.log(`📚 Found ${lessons.length} lessons in date range`);

      // Group lessons by date and organize by day
      const scheduleByDay = {};
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      lessons.forEach(lesson => {
        const dateKey = lesson.scheduledDate.toISOString().split('T')[0];
        const dayOfWeek = lesson.scheduledDate.getDay();
        
        if (!scheduleByDay[dateKey]) {
          scheduleByDay[dateKey] = {
            date: dateKey,
            dayOfWeek: dayOfWeek,
            dayName: dayNames[dayOfWeek],
            dayNameVN: this.getDayNameVN(dayOfWeek + 1), // Convert to 1-7 format
            lessons: []
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
            startTime: lesson.timeSlot?.startTime || '',
            endTime: lesson.timeSlot?.endTime || ''
          },
          subject: lesson.subject ? {
            _id: lesson.subject._id,
            name: lesson.subject.subjectName,
            code: lesson.subject.subjectCode,
            department: lesson.subject.department,
            weeklyHours: lesson.subject.weeklyHours
          } : null,
          teacher: lesson.teacher ? {
            _id: lesson.teacher._id,
            name: lesson.teacher.name,
            email: lesson.teacher.email,
            phoneNumber: lesson.teacher.phoneNumber,
            role: lesson.teacher.role
          } : null,
          topic: lesson.topic || '',
          notes: lesson.notes || '',
          actualDate: lesson.actualDate,
          evaluation: lesson.evaluation || null,
          attendance: lesson.attendance || null,
          makeupInfo: lesson.makeupInfo || null,
          extracurricularInfo: lesson.extracurricularInfo || null,
          fixedInfo: lesson.fixedInfo || null,
          createdAt: lesson.createdAt,
          updatedAt: lesson.updatedAt
        };

        scheduleByDay[dateKey].lessons.push(lessonInfo);
      });

      // Sort lessons by period within each day
      Object.values(scheduleByDay).forEach(day => {
        day.lessons.sort((a, b) => a.period - b.period);
      });

      // Convert to array and sort by date
      const weeklySchedule = Object.values(scheduleByDay).sort((a, b) => new Date(a.date) - new Date(b.date));

      // Fill in missing days with empty structure
      const fullWeekSchedule = [];
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
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
            lessons: []
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate statistics
      const totalLessons = lessons.length;
      const completedLessons = lessons.filter(l => l.status === 'completed').length;
      const scheduledLessons = lessons.filter(l => l.status === 'scheduled').length;
      const cancelledLessons = lessons.filter(l => l.status === 'cancelled').length;

      const subjectStats = {};
      lessons.forEach(lesson => {
        if (lesson.subject) {
          if (!subjectStats[lesson.subject.subjectCode]) {
            subjectStats[lesson.subject.subjectCode] = {
              subjectName: lesson.subject.subjectName,
              total: 0,
              completed: 0,
              scheduled: 0,
              cancelled: 0
            };
          }
          subjectStats[lesson.subject.subjectCode].total++;
          subjectStats[lesson.subject.subjectCode][lesson.status]++;
        }
      });

      console.log(`📊 Returning detailed schedule with ${fullWeekSchedule.length} days and ${totalLessons} lessons`);

      return {
        success: true,
        class: {
          _id: classInfo._id,
          className: classInfo.className,
          academicYear: classInfo.academicYear,
          gradeLevel: classInfo.gradeLevel,
          homeroomTeacher: classInfo.homeroomTeacher
        },
        dateRange: {
          startOfWeek,
          endOfWeek,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        schedule: fullWeekSchedule,
        statistics: {
          totalLessons,
          completedLessons,
          scheduledLessons,
          cancelledLessons,
          completionRate: totalLessons > 0 ? ((completedLessons / totalLessons) * 100).toFixed(2) + '%' : '0%',
          subjectStats
        },
        metadata: {
          totalDays: fullWeekSchedule.length,
          daysWithLessons: weeklySchedule.length,
          architecture: 'lesson-based',
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Error in getDetailedLessonScheduleByDateRange:', error.message);
      throw new Error(`Error fetching detailed lesson schedule: ${error.message}`);
    }
  }
}

module.exports = new ScheduleService(); 