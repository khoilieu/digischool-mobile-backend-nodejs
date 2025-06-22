const Schedule = require('../models/schedule.model');
const TeacherSchedule = require('../models/teacher-schedule.model');
const Class = require('../../classes/models/class.model');
const Subject = require('../../subjects/models/subject.model');
const User = require('../../auth/models/user.model');
const AdvancedSchedulerService = require('./advanced-scheduler.service');
const TeacherAssignmentService = require('./teacher-assignment.service');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

class ScheduleService {
  
  constructor() {
    this.advancedScheduler = new AdvancedSchedulerService();
    this.teacherAssignment = new TeacherAssignmentService();
  }

  // Khởi tạo thời khóa biểu cho các lớp trong năm học
  async initializeSchedulesForAcademicYear(data, token) {
    try {
      // Verify token và lấy user info
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !user.role.some(role => ['admin', 'manager'].includes(role))) {
        throw new Error('Unauthorized: Only admin or manager can initialize schedules');
      }

      const { academicYear, gradeLevel, semester = 1 } = data;

      if (!academicYear) {
        throw new Error('Academic year is required');
      }

      let classes;
      
      if (gradeLevel) {
        // Nếu có gradeLevel, chỉ lấy lớp của khối đó
        classes = await this.getClassesByGradeAndYear(academicYear, gradeLevel);
        console.log(`📚 Found ${classes.length} classes for grade ${gradeLevel}`);
      } else {
        // Nếu không có gradeLevel, lấy tất cả lớp trong năm học
        classes = await Class.find({
          academicYear: academicYear,
          active: true
        }).populate('homeroomTeacher');
        console.log(`📚 Found ${classes.length} classes for academic year ${academicYear}`);
      }
      
      if (classes.length === 0) {
        const gradeMsg = gradeLevel ? `grade ${gradeLevel} in ` : '';
        throw new Error(`No classes found for ${gradeMsg}academic year ${academicYear}`);
      }

      const results = [];
      const teacherSchedulesCreated = new Map(); // Track teacher schedules created
      
      // Tạo thời khóa biểu cho từng lớp
      for (const classInfo of classes) {
        try {
          console.log(`\n🚀 Processing class: ${classInfo.className}`);
          
          // Kiểm tra xem lớp đã có thời khóa biểu active chưa
          const existingSchedule = await Schedule.findOne({
            class: classInfo._id,
            academicYear,
            status: 'active'
          });

          if (existingSchedule) {
            console.log(`⏭️ Skipping ${classInfo.className} - Schedule already exists`);
            results.push({
              class: classInfo.className,
              status: 'skipped',
              message: 'Schedule already exists'
            });
            continue;
          }

          // Sử dụng AdvancedSchedulerService để tạo thời khóa biểu cho lớp
          const schedule = await this.advancedScheduler.createOptimizedSchedule(
            classInfo._id, 
            academicYear
          );

          // Cập nhật thông tin bổ sung
          schedule.semester = semester;
          schedule.createdBy = user._id;
          schedule.status = 'active';
          
          // Lưu schedule cho lớp
          await schedule.save();

          console.log(`✅ Created class schedule for ${classInfo.className}`);

          // 🚀 TẠO SCHEDULE CHO GIÁO VIÊN
          const teacherScheduleResults = await this.createTeacherSchedulesFromClassSchedule(
            schedule, 
            classInfo, 
            user._id, 
            teacherSchedulesCreated
          );

          results.push({
            class: classInfo.className,
            status: 'created',
            scheduleId: schedule._id,
            totalPeriods: schedule.getTotalScheduledPeriods ? schedule.getTotalScheduledPeriods() : 0,
            optimizationScore: schedule.statistics?.optimizationScore || 0,
            teacherSchedules: teacherScheduleResults
          });

        } catch (error) {
          console.log(`❌ Error creating schedule for ${classInfo.className}: ${error.message}`);
          results.push({
            class: classInfo.className,
            status: 'error',
            message: error.message
          });
        }
      }

      const successCount = results.filter(r => r.status === 'created').length;
      const skipCount = results.filter(r => r.status === 'skipped').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      const totalTeacherSchedules = teacherSchedulesCreated.size;

      console.log(`\n📊 Summary: ${successCount} created, ${skipCount} skipped, ${errorCount} errors`);
      console.log(`👨‍🏫 Teacher schedules created/updated: ${totalTeacherSchedules}`);

      return {
        academicYear,
        gradeLevel: gradeLevel || 'all',
        semester,
        totalClasses: classes.length,
        summary: {
          created: successCount,
          skipped: skipCount,
          errors: errorCount,
          teacherSchedules: totalTeacherSchedules
        },
        results
      };

    } catch (error) {
      throw new Error(`Failed to initialize schedules: ${error.message}`);
    }
  }

  // Tạo schedule cho giáo viên từ class schedule
  async createTeacherSchedulesFromClassSchedule(classSchedule, classInfo, createdBy, teacherSchedulesCreated) {
    const teacherResults = [];
    const teachersInClass = new Set();

    try {
      // Thu thập tất cả giáo viên từ class schedule
      classSchedule.weeks.forEach(week => {
        week.days.forEach(day => {
          day.periods.forEach(period => {
            if (period.teacher && period.periodType !== 'empty') {
              teachersInClass.add(period.teacher.toString());
            }
          });
        });
      });

      console.log(`👨‍🏫 Found ${teachersInClass.size} teachers in ${classInfo.className}`);

      // Tạo/cập nhật schedule cho từng giáo viên
      for (const teacherId of teachersInClass) {
        try {
          let teacherSchedule;
          
          // Kiểm tra xem giáo viên đã có schedule chưa
          const existingTeacherSchedule = await TeacherSchedule.findOne({
            teacher: teacherId,
            academicYear: classSchedule.academicYear,
            status: 'active'
          });

          if (existingTeacherSchedule) {
            teacherSchedule = existingTeacherSchedule;
            console.log(`🔄 Updating existing teacher schedule for teacher ${teacherId}`);
          } else {
            // Tạo template mới cho giáo viên
            teacherSchedule = TeacherSchedule.createTemplate(
              teacherId,
              classSchedule.academicYear,
              createdBy
            );
            teacherSchedule.semester = classSchedule.semester;
            teacherSchedule.status = 'active';
            console.log(`🆕 Creating new teacher schedule for teacher ${teacherId}`);
          }

          // Copy periods từ class schedule sang teacher schedule
          await this.copyPeriodsToTeacherSchedule(classSchedule, teacherSchedule, teacherId, classInfo);

          // Lưu teacher schedule
          await teacherSchedule.save({ validateBeforeSave: false });

          teacherSchedulesCreated.set(teacherId, teacherSchedule._id);
          teacherResults.push({
            teacherId: teacherId,
            scheduleId: teacherSchedule._id,
            status: existingTeacherSchedule ? 'updated' : 'created'
          });

        } catch (teacherError) {
          console.error(`❌ Error creating teacher schedule for ${teacherId}: ${teacherError.message}`);
          teacherResults.push({
            teacherId: teacherId,
            status: 'error',
            message: teacherError.message
          });
        }
      }

      return teacherResults;

    } catch (error) {
      console.error(`❌ Error creating teacher schedules: ${error.message}`);
      return [];
    }
  }

  // Copy periods từ class schedule sang teacher schedule
  async copyPeriodsToTeacherSchedule(classSchedule, teacherSchedule, teacherId, classInfo) {
    classSchedule.weeks.forEach((classWeek, weekIndex) => {
      const teacherWeek = teacherSchedule.weeks[weekIndex];
      if (!teacherWeek) return;

      classWeek.days.forEach((classDay, dayIndex) => {
        const teacherDay = teacherWeek.days[dayIndex];
        if (!teacherDay) return;

        // Tìm tất cả periods của giáo viên này trong ngày
        const teacherPeriods = classDay.periods.filter(period => 
          period.teacher && period.teacher.toString() === teacherId.toString()
        );

        // Thêm periods vào teacher schedule
        teacherPeriods.forEach(period => {
          const teacherPeriod = {
            _id: new mongoose.Types.ObjectId(),
            periodNumber: period.periodNumber,
            class: classInfo._id,
            className: classInfo.className,
            subject: period.subject,
            session: period.session,
            timeStart: period.timeStart,
            timeEnd: period.timeEnd,
            periodType: period.periodType,
            status: 'scheduled', // Teacher schedule uses different status
            notes: period.notes,
            makeupInfo: period.makeupInfo,
            extracurricularInfo: period.extracurricularInfo
          };

          // periodId sẽ được tạo tự động trong pre-save hook
          teacherDay.periods.push(teacherPeriod);
        });
      });
    });

    // Cập nhật statistics
    teacherSchedule.statistics.totalPeriods = teacherSchedule.getTotalScheduledPeriods();
    
    // Cập nhật classes info
    const existingClassIndex = teacherSchedule.classes.findIndex(
      cls => cls.class.toString() === classInfo._id.toString()
    );
    
    if (existingClassIndex === -1) {
      teacherSchedule.classes.push({
        class: classInfo._id,
        className: classInfo.className,
        subject: null, // Sẽ được cập nhật sau
        periodsPerWeek: 0 // Sẽ được tính toán
      });
    }
  }



  // Tạo thời khóa biểu cho một lớp cụ thể
  async createScheduleForClass(classId, academicYear, semester, subjects, teachers, createdBy) {
    try {
      console.log(`🚀 Creating optimized schedule for class ${classId}...`);
      
      // Sử dụng thuật toán tối ưu hóa mới
      const optimizedSchedule = await this.advancedScheduler.createOptimizedSchedule(
        classId, 
        academicYear
      );
      
      // Cập nhật thông tin bổ sung
      optimizedSchedule.semester = semester;
      optimizedSchedule.createdBy = createdBy;
      optimizedSchedule.status = 'active';
      
      // Lưu vào database
              await optimizedSchedule.save({ validateBeforeSave: false });
      
      console.log(`✅ Optimized schedule created successfully with score: ${optimizedSchedule.statistics?.optimizationScore || 0}`);
      
      return optimizedSchedule;
      
    } catch (error) {
      console.log(`⚠️ Advanced scheduling failed, falling back to basic algorithm: ${error.message}`);
      
      // Get class info to obtain homeroom teacher ID
      const classInfo = await Class.findById(classId).populate('homeroomTeacher');
      const homeroomTeacherId = classInfo?.homeroomTeacher?._id || null;
      
      // Fallback to basic algorithm
      const schedule = Schedule.createTemplate(classId, academicYear, createdBy, homeroomTeacherId);
      schedule.semester = semester;

      // Phân bố môn học theo tuần (33 tiết)
      const weeklyDistribution = this.distributeSubjectsForWeek(subjects, 33);
      
      // Sắp xếp thời khóa biểu với logic phân công giáo viên đúng
      await this.arrangeScheduleWithTeacherAssignment(schedule, weeklyDistribution, classId);

      // Lưu vào database
      await schedule.save();
      
      return schedule;
    }
  }

  // Phân bố môn học trong tuần
  distributeSubjectsForWeek(subjects, totalPeriods) {
    const distribution = [];
    let remainingPeriods = totalPeriods;

    // Sắp xếp môn học theo số tiết/tuần giảm dần
    const sortedSubjects = subjects.sort((a, b) => b.weeklyHours - a.weeklyHours);

    for (const subject of sortedSubjects) {
      const periodsForSubject = Math.min(subject.weeklyHours, remainingPeriods);
      
      for (let i = 0; i < periodsForSubject; i++) {
        distribution.push({
          subject: subject._id,
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode,
          department: subject.department
        });
      }
      
      remainingPeriods -= periodsForSubject;
      if (remainingPeriods <= 0) break;
    }

    // Nếu còn tiết trống, phân bố thêm cho các môn chính
    const coreSubjects = subjects.filter(s => s.category === 'core');
    let index = 0;
    while (remainingPeriods > 0 && coreSubjects.length > 0) {
      const subject = coreSubjects[index % coreSubjects.length];
      distribution.push({
        subject: subject._id,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        department: subject.department
      });
      remainingPeriods--;
      index++;
    }

    return distribution;
  }

  // Sắp xếp thời khóa biểu với logic phân công giáo viên đúng
  async arrangeScheduleWithTeacherAssignment(schedule, distribution, teacherAssignmentMap) {
    try {
      // Lấy danh sách môn học từ distribution
      const uniqueSubjects = [];
      const subjectMap = new Map();
      
      distribution.forEach(item => {
        if (!subjectMap.has(item.subject.toString())) {
          uniqueSubjects.push({
            _id: item.subject,
            subjectName: item.subjectName,
            subjectCode: item.subjectCode,
            department: item.department
          });
          subjectMap.set(item.subject.toString(), true);
        }
      });

      // Tạo bản đồ phân công giáo viên
      const teacherAssignmentMap = await this.teacherAssignment.createTeacherAssignmentMap(
        classId, 
        uniqueSubjects
      );

      // Sắp xếp thời khóa biểu với giáo viên đã phân công
      this.arrangeScheduleWithAssignedTeachers(schedule, distribution, teacherAssignmentMap);

      return teacherAssignmentMap;

    } catch (error) {
      console.log(`⚠️ Teacher assignment failed: ${error.message}`);
      // Fallback to old method
      this.arrangeSchedule(schedule, distribution, []);
      return new Map();
    }
  }

  // Sắp xếp thời khóa biểu với giáo viên đã được phân công
  arrangeScheduleWithAssignedTeachers(schedule, distribution, teacherAssignmentMap) {
    const timeSlots = {
      morning: [
        { period: 1, start: '07:00', end: '07:45' },
        { period: 2, start: '07:50', end: '08:35' },
        { period: 3, start: '08:40', end: '09:25' },
        { period: 4, start: '09:45', end: '10:30' },
        { period: 5, start: '10:35', end: '11:20' }
      ],
      afternoon: [
        { period: 6, start: '13:30', end: '14:15' },
        { period: 7, start: '14:20', end: '15:05' }
      ]
    };

    // Tạo pool các môn học có sẵn
    const subjectPool = [...distribution];
    
    // Phân bố cho 6 ngày trong tuần (Thứ 2 - Thứ 7)
    for (let dayIndex = 0; dayIndex < schedule.schedule.length; dayIndex++) {
      const day = schedule.schedule[dayIndex];
      const dailySubjects = []; // Track subjects used in this day
      
      // Combine morning and afternoon slots for better distribution
      const allSlots = [
        ...timeSlots.morning.map(slot => ({...slot, session: 'morning'})),
        ...timeSlots.afternoon.map(slot => ({...slot, session: 'afternoon'}))
      ];

      // Phân bố các tiết trong ngày với ràng buộc
      for (let slotIndex = 0; slotIndex < allSlots.length && subjectPool.length > 0; slotIndex++) {
        const slot = allSlots[slotIndex];
        
        // Tìm môn học phù hợp cho tiết này
        const selectedSubject = this.selectSubjectForPeriodWithAssignment(
          subjectPool, 
          dailySubjects, 
          slotIndex, 
          teacherAssignmentMap, 
          day.dayOfWeek, 
          slot.period
        );
        
        if (selectedSubject) {
          // Thêm tiết học vào lịch
          day.periods.push({
            periodNumber: slot.period,
            subject: selectedSubject.subject,
            teacher: selectedSubject.teacher,
            session: slot.session,
            timeStart: slot.start,
            timeEnd: slot.end
          });
          
          // Track môn học đã sử dụng trong ngày
          dailySubjects.push({
            subject: selectedSubject.subject,
            periodIndex: slotIndex,
            subjectName: selectedSubject.subjectName
          });
          
          // Remove from pool
          const poolIndex = subjectPool.findIndex(s => s.subject.toString() === selectedSubject.subject.toString());
          if (poolIndex !== -1) {
            subjectPool.splice(poolIndex, 1);
          }
        }
      }
    }

    // Nếu còn thừa tiết chưa phân bố, cố gắng phân bố lại
    if (subjectPool.length > 0) {
      console.log(`⚠️ Warning: ${subjectPool.length} periods could not be scheduled due to constraints`);
      this.distributeRemainingPeriodsWithAssignment(schedule, subjectPool, teacherAssignmentMap, timeSlots);
    }
  }

  // Chọn môn học với giáo viên đã được phân công
  selectSubjectForPeriodWithAssignment(subjectPool, dailySubjects, currentPeriodIndex, teacherAssignmentMap, dayOfWeek, periodNumber) {
    // Tìm các môn đã có trong ngày và số lần xuất hiện
    const subjectCount = {};
    dailySubjects.forEach(item => {
      const subjectId = item.subject.toString();
      subjectCount[subjectId] = (subjectCount[subjectId] || 0) + 1;
    });

    // Tìm môn học của tiết trước đó (nếu có)
    const previousSubject = currentPeriodIndex > 0 ? dailySubjects[currentPeriodIndex - 1] : null;
    const twoPeriodsBefore = currentPeriodIndex > 1 ? dailySubjects[currentPeriodIndex - 2] : null;

    // Filter subjects based on constraints
    const validSubjects = subjectPool.filter(subjectInfo => {
      const subjectId = subjectInfo.subject.toString();
      
      // Ràng buộc 1: Mỗi môn tối đa 2 tiết/ngày
      if (subjectCount[subjectId] >= 2) {
        return false;
      }
      
      // Ràng buộc 2: Không được có 3 tiết liên tiếp cùng môn
      if (previousSubject && twoPeriodsBefore) {
        if (previousSubject.subject.toString() === subjectId && 
            twoPeriodsBefore.subject.toString() === subjectId) {
          return false;
        }
      }
      
      // Ràng buộc 3: Nếu môn này đã có 1 tiết và tiết trước cũng là môn này thì skip
      if (previousSubject && previousSubject.subject.toString() === subjectId) {
        if (subjectCount[subjectId] >= 1) {
          return false;
        }
      }
      
      return true;
    });

    // Ưu tiên các môn chưa được sử dụng trong ngày
    const unusedSubjects = validSubjects.filter(subjectInfo => {
      const subjectId = subjectInfo.subject.toString();
      return !subjectCount[subjectId];
    });

    const prioritySubjects = unusedSubjects.length > 0 ? unusedSubjects : validSubjects;
    
    // Tìm môn học có giáo viên đã được phân công
    for (const subjectInfo of prioritySubjects) {
      const assignedTeacher = this.teacherAssignment.getAssignedTeacher(teacherAssignmentMap, subjectInfo.subject);
      if (assignedTeacher) {
        return {
          subject: subjectInfo.subject,
          teacher: assignedTeacher._id,
          subjectName: subjectInfo.subjectName,
          subjectCode: subjectInfo.subjectCode
        };
      }
    }
    
    return null;
  }

  // Phân bố các tiết còn lại với giáo viên đã phân công
  distributeRemainingPeriodsWithAssignment(schedule, remainingPeriods, teacherAssignmentMap, timeSlots) {
    for (const subjectInfo of remainingPeriods) {
      let placed = false;
      
      for (let dayIndex = 0; dayIndex < schedule.schedule.length && !placed; dayIndex++) {
        const day = schedule.schedule[dayIndex];
        const maxPeriodsPerDay = 7; // 5 sáng + 2 chiều
        
        if (day.periods.length < maxPeriodsPerDay) {
          // Tìm slot trống
          const usedPeriods = day.periods.map(p => p.periodNumber);
          const allPeriods = [1, 2, 3, 4, 5, 6, 7];
          const availablePeriods = allPeriods.filter(p => !usedPeriods.includes(p));
          
          if (availablePeriods.length > 0) {
            const periodNumber = availablePeriods[0];
            const assignedTeacher = this.teacherAssignment.getAssignedTeacher(teacherAssignmentMap, subjectInfo.subject);
            
            if (assignedTeacher) {
              const slot = this.getTimeSlotByPeriod(periodNumber, timeSlots);
              if (slot) {
                day.periods.push({
                  periodNumber: periodNumber,
                  subject: subjectInfo.subject,
                  teacher: assignedTeacher._id,
                  session: slot.session,
                  timeStart: slot.start,
                  timeEnd: slot.end
                });
                placed = true;
              }
            }
          }
        }
      }
      
      if (!placed) {
        console.log(`⚠️ Could not place subject: ${subjectInfo.subjectName}`);
      }
    }
  }

  // Sắp xếp thời khóa biểu với ràng buộc: mỗi môn tối đa 2 tiết liền kề/ngày (phương thức cũ)
  arrangeSchedule(schedule, distribution, teachers) {
    const timeSlots = {
      morning: [
        { period: 1, start: '07:00', end: '07:45' },
        { period: 2, start: '07:50', end: '08:35' },
        { period: 3, start: '08:40', end: '09:25' },
        { period: 4, start: '09:45', end: '10:30' },
        { period: 5, start: '10:35', end: '11:20' }
      ],
      afternoon: [
        { period: 6, start: '13:30', end: '14:15' },
        { period: 7, start: '14:20', end: '15:05' }
      ]
    };

    // Tạo pool các môn học có sẵn
    const subjectPool = [...distribution];
    
    // Phân bố cho 6 ngày trong tuần (Thứ 2 - Thứ 7)
    for (let dayIndex = 0; dayIndex < schedule.schedule.length; dayIndex++) {
      const day = schedule.schedule[dayIndex];
      const dailySubjects = []; // Track subjects used in this day
      
      // Combine morning and afternoon slots for better distribution
      const allSlots = [
        ...timeSlots.morning.map(slot => ({...slot, session: 'morning'})),
        ...timeSlots.afternoon.map(slot => ({...slot, session: 'afternoon'}))
      ];

      // Phân bố các tiết trong ngày với ràng buộc
      for (let slotIndex = 0; slotIndex < allSlots.length && subjectPool.length > 0; slotIndex++) {
        const slot = allSlots[slotIndex];
        
        // Tìm môn học phù hợp cho tiết này
        const selectedSubject = this.selectSubjectForPeriod(
          subjectPool, 
          dailySubjects, 
          slotIndex, 
          teachers, 
          day.dayOfWeek, 
          slot.period
        );
        
        if (selectedSubject) {
          // Thêm tiết học vào lịch
          day.periods.push({
            periodNumber: slot.period,
            subject: selectedSubject.subject,
            teacher: selectedSubject.teacher,
            session: slot.session,
            timeStart: slot.start,
            timeEnd: slot.end
          });
          
          // Track môn học đã sử dụng trong ngày
          dailySubjects.push({
            subject: selectedSubject.subject,
            periodIndex: slotIndex,
            subjectName: selectedSubject.subjectName
          });
          
          // Remove from pool
          const poolIndex = subjectPool.findIndex(s => s.subject.toString() === selectedSubject.subject.toString());
          if (poolIndex !== -1) {
            subjectPool.splice(poolIndex, 1);
          }
        }
      }
    }

    // Nếu còn thừa tiết chưa phân bố, cố gắng phân bố lại
    if (subjectPool.length > 0) {
      console.log(`⚠️ Warning: ${subjectPool.length} periods could not be scheduled due to constraints`);
      this.distributeRemainingPeriods(schedule, subjectPool, teachers, timeSlots);
    }
  }

  // Chọn môn học phù hợp cho tiết học với ràng buộc
  selectSubjectForPeriod(subjectPool, dailySubjects, currentPeriodIndex, teachers, dayOfWeek, periodNumber) {
    // Tìm các môn đã có trong ngày và số lần xuất hiện
    const subjectCount = {};
    dailySubjects.forEach(item => {
      const subjectId = item.subject.toString();
      subjectCount[subjectId] = (subjectCount[subjectId] || 0) + 1;
    });

    // Tìm môn học của tiết trước đó (nếu có)
    const previousSubject = currentPeriodIndex > 0 ? dailySubjects[currentPeriodIndex - 1] : null;
    const twoPeriodsBefore = currentPeriodIndex > 1 ? dailySubjects[currentPeriodIndex - 2] : null;

    // Filter subjects based on constraints
    const validSubjects = subjectPool.filter(subjectInfo => {
      const subjectId = subjectInfo.subject.toString();
      
      // Ràng buộc 1: Mỗi môn tối đa 2 tiết/ngày
      if (subjectCount[subjectId] >= 2) {
        return false;
      }
      
      // Ràng buộc 2: Không được có 3 tiết liên tiếp cùng môn
      if (previousSubject && twoPeriodsBefore) {
        if (previousSubject.subject.toString() === subjectId && 
            twoPeriodsBefore.subject.toString() === subjectId) {
          return false;
        }
      }
      
      // Ràng buộc 3: Nếu môn này đã có 1 tiết và tiết trước cũng là môn này thì skip
      // (trừ khi đây là tiết thứ 2 liên tiếp được phép)
      if (previousSubject && previousSubject.subject.toString() === subjectId) {
        // Chỉ cho phép nếu môn này mới có 1 tiết trong ngày
        if (subjectCount[subjectId] >= 1) {
          return false;
        }
      }
      
      return true;
    });

    // Ưu tiên các môn chưa được sử dụng trong ngày
    const unusedSubjects = validSubjects.filter(subjectInfo => {
      const subjectId = subjectInfo.subject.toString();
      return !subjectCount[subjectId];
    });

    const prioritySubjects = unusedSubjects.length > 0 ? unusedSubjects : validSubjects;
    
    // Tìm giáo viên có sẵn cho các môn học ưu tiên
    for (const subjectInfo of prioritySubjects) {
      const teacher = this.findAvailableTeacher(teachers, subjectInfo.subject, dayOfWeek, periodNumber);
      if (teacher) {
        return {
          subject: subjectInfo.subject,
          teacher: teacher._id,
          subjectName: subjectInfo.subjectName,
          subjectCode: subjectInfo.subjectCode
        };
      }
    }
    
    return null;
  }

  // Phân bố các tiết còn lại nếu có
  distributeRemainingPeriods(schedule, remainingPeriods, teachers, timeSlots) {
    // Thử phân bố các tiết còn lại vào các slot trống
    for (const subjectInfo of remainingPeriods) {
      let placed = false;
      
      for (let dayIndex = 0; dayIndex < schedule.schedule.length && !placed; dayIndex++) {
        const day = schedule.schedule[dayIndex];
        const maxPeriodsPerDay = 7; // 5 sáng + 2 chiều
        
        if (day.periods.length < maxPeriodsPerDay) {
          // Tìm slot trống
          const usedPeriods = day.periods.map(p => p.periodNumber);
          const allPeriods = [1, 2, 3, 4, 5, 6, 7];
          const availablePeriods = allPeriods.filter(p => !usedPeriods.includes(p));
          
          if (availablePeriods.length > 0) {
            const periodNumber = availablePeriods[0];
            const teacher = this.findAvailableTeacher(teachers, subjectInfo.subject, day.dayOfWeek, periodNumber);
            
            if (teacher) {
              const slot = this.getTimeSlotByPeriod(periodNumber, timeSlots);
              if (slot) {
                day.periods.push({
                  periodNumber: periodNumber,
                  subject: subjectInfo.subject,
                  teacher: teacher._id,
                  session: slot.session,
                  timeStart: slot.start,
                  timeEnd: slot.end
                });
                placed = true;
              }
            }
          }
        }
      }
      
      if (!placed) {
        console.log(`⚠️ Could not place subject: ${subjectInfo.subjectName}`);
      }
    }
  }

  // Helper: Lấy time slot theo period number
  getTimeSlotByPeriod(periodNumber, timeSlots) {
    if (periodNumber >= 1 && periodNumber <= 5) {
      const slot = timeSlots.morning[periodNumber - 1];
      return { ...slot, session: 'morning' };
    } else if (periodNumber >= 6 && periodNumber <= 7) {
      const slot = timeSlots.afternoon[periodNumber - 6];
      return { ...slot, session: 'afternoon' };
    }
    return null;
  }

  // Tìm giáo viên có thể dạy môn học tại thời điểm cụ thể
  findAvailableTeacher(teachers, subjectId, dayOfWeek, periodNumber) {
    // Tìm giáo viên có thể dạy môn này
    const availableTeachers = teachers.filter(teacher => 
      teacher.subjects.some(subject => subject._id.toString() === subjectId.toString())
    );

    if (availableTeachers.length === 0) {
      return null; // Không có giáo viên có thể dạy môn này
    }

    // Logic đơn giản: trả về giáo viên đầu tiên
    // Trong thực tế, cần kiểm tra xung đột lịch dạy
    return availableTeachers[0];
  }

  // Lấy danh sách lớp theo khối và năm học
  async getClassesByGradeAndYear(academicYear, gradeLevel) {
    // Extract grade từ className (ví dụ: "12A1" -> grade 12)
    const gradePattern = new RegExp(`^${gradeLevel}[A-Z]`);
    
    return await Class.find({
      academicYear,
      className: { $regex: gradePattern },
      active: true
    }).populate('homeroomTeacher', 'name email');
  }

  // Lấy thời khóa biểu của một lớp
  async getClassSchedule(className, academicYear, weekNumber = 1) {
    try {
      // Tìm lớp theo tên
      const classInfo = await Class.findOne({
        className: className.toUpperCase(),
        academicYear,
        active: true
      });

      if (!classInfo) {
        throw new Error(`Class ${className} not found in academic year ${academicYear}`);
      }

      // Lấy thời khóa biểu
      const schedule = await Schedule.findOne({
        class: classInfo._id,
        academicYear,
        weekNumber,
        status: 'active'
      })
      .populate('class', 'className homeroomTeacher')
      .populate('schedule.periods.subject', 'subjectName subjectCode department')
      .populate('schedule.periods.teacher', 'name email')
      .populate('createdBy', 'name email');

      if (!schedule) {
        throw new Error(`No active schedule found for class ${className} in week ${weekNumber} of academic year ${academicYear}`);
      }

      return {
        class: {
          id: classInfo._id,
          name: classInfo.className,
          academicYear: classInfo.academicYear
        },
        schedule: {
          id: schedule._id,
          weekNumber: schedule.weekNumber,
          semester: schedule.semester,
          totalPeriods: schedule.getTotalScheduledPeriods(),
          status: schedule.status,
          dailySchedule: schedule.schedule.map(day => ({
            dayOfWeek: day.dayOfWeek,
            dayName: day.dayName,
            periods: day.periods.map(period => ({
              periodNumber: period.periodNumber,
              session: period.session,
              timeStart: period.timeStart,
              timeEnd: period.timeEnd,
              subject: {
                id: period.subject._id,
                name: period.subject.subjectName,
                code: period.subject.subjectCode,
                department: period.subject.department
              },
              teacher: {
                id: period.teacher._id,
                name: period.teacher.name,
                email: period.teacher.email
              }
            }))
          })),
          createdBy: schedule.createdBy,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt
        }
      };

    } catch (error) {
      throw new Error(`Failed to get class schedule: ${error.message}`);
    }
  }

  // Lấy danh sách thời khóa biểu với filter
  async getSchedules(filters) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        academicYear, 
        gradeLevel, 
        status = 'active',
        semester,
        className 
      } = filters;

      const query = {};
      
      if (academicYear) query.academicYear = academicYear;
      if (status) query.status = status;
      if (semester) query.semester = semester;

      // Nếu có className, tìm class trước
      if (className) {
        const classInfo = await Class.findOne({ 
          className: className.toUpperCase(),
          active: true 
        });
        if (classInfo) {
          query.class = classInfo._id;
        } else {
          return {
            schedules: [],
            totalCount: 0,
            totalPages: 0,
            currentPage: page,
            hasNext: false,
            hasPrev: false
          };
        }
      }

      // Nếu có gradeLevel, tìm tất cả lớp thuộc khối đó
      if (gradeLevel && !className) {
        const gradePattern = new RegExp(`^${gradeLevel}[A-Z]`);
        const classes = await Class.find({
          className: { $regex: gradePattern },
          active: true
        });
        query.class = { $in: classes.map(c => c._id) };
      }

      const totalCount = await Schedule.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limit);
      const skip = (page - 1) * limit;

      const schedules = await Schedule.find(query)
        .populate('class', 'className academicYear homeroomTeacher')
        .populate('schedule.periods.subject', 'subjectName subjectCode')
        .populate('schedule.periods.teacher', 'name email')
        .populate('createdBy', 'name email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        schedules: schedules.map(schedule => ({
          id: schedule._id,
          class: {
            id: schedule.class._id,
            name: schedule.class.className,
            academicYear: schedule.class.academicYear
          },
          semester: schedule.semester,
          weekNumber: schedule.weekNumber,
          totalPeriods: schedule.getTotalScheduledPeriods(),
          status: schedule.status,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt
        })),
        totalCount,
        totalPages,
        currentPage: page,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };

    } catch (error) {
      throw new Error(`Failed to get schedules: ${error.message}`);
    }
  }

  // Cập nhật trạng thái thời khóa biểu
  async updateScheduleStatus(scheduleId, status, token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !user.role.some(role => ['admin', 'manager', 'teacher'].includes(role))) {
        throw new Error('Unauthorized');
      }

      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      schedule.status = status;
      schedule.lastModifiedBy = user._id;
      
      await schedule.save();

      return {
        message: 'Schedule status updated successfully',
        schedule: {
          id: schedule._id,
          status: schedule.status,
          updatedAt: schedule.updatedAt
        }
      };

    } catch (error) {
      throw new Error(`Failed to update schedule status: ${error.message}`);
    }
  }

  // Lấy schedule theo ID
  async getScheduleById(scheduleId) {
    try {
      const schedule = await Schedule.findById(scheduleId)
        .populate('class', 'className academicYear homeroomTeacher')
        .populate('schedule.periods.subject', 'subjectName subjectCode department')
        .populate('schedule.periods.teacher', 'name email')
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      return {
        id: schedule._id,
        class: {
          id: schedule.class._id,
          name: schedule.class.className,
          academicYear: schedule.class.academicYear
        },
        semester: schedule.semester,
        weekNumber: schedule.weekNumber,
        totalPeriods: schedule.getTotalScheduledPeriods(),
        status: schedule.status,
        schedule: schedule.schedule,
        notes: schedule.notes,
        createdBy: schedule.createdBy,
        lastModifiedBy: schedule.lastModifiedBy,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt
      };
    } catch (error) {
      throw new Error(`Failed to get schedule by ID: ${error.message}`);
    }
  }

  // Thống kê schedule
  async getScheduleStats(academicYear) {
    try {
      const query = { academicYear };
      
      const totalSchedules = await Schedule.countDocuments(query);
      
      // Thống kê theo status
      const statusStats = await Schedule.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      // Thống kê theo semester
      const semesterStats = await Schedule.aggregate([
        { $match: query },
        { $group: { _id: '$semester', count: { $sum: 1 } } }
      ]);

      return {
        academicYear,
        totalSchedules,
        statusBreakdown: statusStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        semesterBreakdown: semesterStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      };
    } catch (error) {
      throw new Error(`Failed to get schedule stats: ${error.message}`);
    }
  }

  // Helper methods
  getTimeSlots() {
    return {
      morning: [
        { period: 1, start: '07:00', end: '07:45' },
        { period: 2, start: '07:50', end: '08:35' },
        { period: 3, start: '08:40', end: '09:25' },
        { period: 4, start: '09:45', end: '10:30' },
        { period: 5, start: '10:35', end: '11:20' }
      ],
      afternoon: [
        { period: 6, start: '13:30', end: '14:15' },
        { period: 7, start: '14:20', end: '15:05' }
      ]
    };
  }

  async getAcademicYearOptions() {
    try {
      const years = await Class.distinct('academicYear');
      return years.sort().reverse(); // Năm gần nhất trước
    } catch (error) {
      throw new Error(`Failed to get academic year options: ${error.message}`);
    }
  }

  // Lấy thời khóa biểu theo date range
  async getClassScheduleByDateRange(className, academicYear, startOfWeek, endOfWeek) {
    try {
      // Tìm lớp theo tên
      const classInfo = await Class.findOne({
        className: className.toUpperCase(),
        academicYear,
        active: true
      });

      if (!classInfo) {
        throw new Error(`Class ${className} not found in academic year ${academicYear}`);
      }

      // Lấy thời khóa biểu active
      const schedule = await Schedule.findOne({
        class: classInfo._id,
        academicYear,
        status: 'active'
      })
      .populate('class', 'className homeroomTeacher')
      .populate('schedule.periods.subject', 'subjectName subjectCode department')
      .populate('schedule.periods.teacher', 'name email')
      .populate('createdBy', 'name email');

      if (!schedule) {
        throw new Error(`No active schedule found for class ${className} in academic year ${academicYear}`);
      }

      // Parse dates
      const startDate = new Date(startOfWeek);
      const endDate = new Date(endOfWeek);
      
      // Calculate which days of week fall in the range
      const daysInRange = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        // Convert Sunday=0 to our format (Monday=2, Tuesday=3, etc.)
        if (dayOfWeek >= 1 && dayOfWeek <= 6) { // Monday to Saturday
          const ourDayOfWeek = dayOfWeek + 1;
          if (!daysInRange.some(day => day.dayOfWeek === ourDayOfWeek)) {
            daysInRange.push({
              dayOfWeek: ourDayOfWeek,
              date: new Date(d).toISOString().split('T')[0],
              dayName: ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]
            });
          }
        }
      }

      // Filter schedule for days in range
      const filteredSchedule = schedule.schedule.filter(day => 
        daysInRange.some(rangeDay => rangeDay.dayOfWeek === day.dayOfWeek)
      ).map(day => {
        const rangeDay = daysInRange.find(rd => rd.dayOfWeek === day.dayOfWeek);
        return {
          ...day.toObject(),
          date: rangeDay.date,
          periods: day.periods.map(period => ({
            periodNumber: period.periodNumber,
            session: period.session,
            timeStart: period.timeStart,
            timeEnd: period.timeEnd,
            subject: period.subject ? {
              id: period.subject._id,
              name: period.subject.subjectName,
              code: period.subject.subjectCode,
              department: period.subject.department
            } : null,
            teacher: period.teacher ? {
              id: period.teacher._id,
              name: period.teacher.name,
              email: period.teacher.email
            } : null
          }))
        };
      });

      return {
        class: {
          id: classInfo._id,
          name: classInfo.className,
          academicYear: classInfo.academicYear
        },
        schedule: {
          id: schedule._id,
          semester: schedule.semester,
          totalPeriods: schedule.getTotalScheduledPeriods(),
          status: schedule.status,
          dateRange: {
            startOfWeek,
            endOfWeek,
            daysInRange: daysInRange.length
          },
          dailySchedule: filteredSchedule,
          createdBy: schedule.createdBy,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt
        }
      };

    } catch (error) {
      throw new Error(`Failed to get class schedule by date range: ${error.message}`);
    }
  }

  // Lấy tất cả schedules có sẵn (cho debugging)
  async getAvailableSchedules(academicYear, className) {
    try {
      const query = {};
      
      if (academicYear) query.academicYear = academicYear;
      
      if (className) {
        const classInfo = await Class.findOne({ 
          className: className.toUpperCase(),
          active: true 
        });
        if (classInfo) {
          query.class = classInfo._id;
        }
      }

      const schedules = await Schedule.find(query)
        .populate('class', 'className academicYear')
        .select('class academicYear semester weekNumber status createdAt')
        .sort({ academicYear: -1, 'class.className': 1 });

      return {
        total: schedules.length,
        schedules: schedules.map(schedule => ({
          id: schedule._id,
          className: schedule.class.className,
          academicYear: schedule.academicYear,
          semester: schedule.semester,
          weekNumber: schedule.weekNumber,
          status: schedule.status,
          createdAt: schedule.createdAt
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get available schedules: ${error.message}`);
    }
  }

  // Kiểm tra lớp có tồn tại không
  async checkClassExists(className, academicYear) {
    try {
      const classInfo = await Class.findOne({
        className: className.toUpperCase(),
        academicYear,
        active: true
      }).populate('homeroomTeacher', 'name email');

      if (!classInfo) {
        return {
          exists: false,
          message: `Class ${className} not found in academic year ${academicYear}`,
          suggestions: await this.getSimilarClasses(className, academicYear)
        };
      }

      // Kiểm tra có schedule không
      const scheduleCount = await Schedule.countDocuments({
        class: classInfo._id,
        academicYear
      });

      return {
        exists: true,
        class: {
          id: classInfo._id,
          className: classInfo.className,
          academicYear: classInfo.academicYear,
          homeroomTeacher: classInfo.homeroomTeacher
        },
        schedules: {
          total: scheduleCount,
          hasActiveSchedule: scheduleCount > 0
        }
      };
    } catch (error) {
      throw new Error(`Failed to check class exists: ${error.message}`);
    }
  }

  // Helper: Tìm lớp tương tự
  async getSimilarClasses(className, academicYear) {
    try {
      // Lấy grade level từ className (ví dụ: 12A4 -> 12)
      const gradeMatch = className.match(/^(\d+)/);
      if (!gradeMatch) return [];

      const gradeLevel = gradeMatch[1];
      const gradePattern = new RegExp(`^${gradeLevel}[A-Z]`);
      
      const similarClasses = await Class.find({
        className: { $regex: gradePattern },
        academicYear,
        active: true
      }).select('className').limit(5);

      return similarClasses.map(c => c.className);
    } catch (error) {
      return [];
    }
  }

  // Cập nhật trạng thái tiết học
  async updatePeriodStatus(scheduleId, dayOfWeek, periodNumber, status, options = {}, token) {
    try {
      // Verify user permissions
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !['admin', 'manager', 'teacher'].includes(user.role)) {
        throw new Error('Unauthorized to update period status');
      }

      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Validate status
      const validStatuses = ['not_started', 'completed', 'absent', 'makeup'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Update period status
      const updated = schedule.updatePeriodStatus(dayOfWeek, periodNumber, status, options);
      if (!updated) {
        throw new Error(`Period ${periodNumber} not found for day ${dayOfWeek}`);
      }

      schedule.lastModifiedBy = user._id;
      await schedule.save();

      return {
        message: 'Period status updated successfully',
        schedule: schedule,
        updatedPeriod: {
          dayOfWeek,
          periodNumber,
          status,
          updatedAt: new Date()
        }
      };

    } catch (error) {
      throw new Error(`Failed to update period status: ${error.message}`);
    }
  }

  // Lấy tiến độ học tập của lớp
  async getLearningProgress(className, academicYear, options = {}) {
    try {
      const classInfo = await Class.findOne({
        className: className.toUpperCase(),
        academicYear,
        active: true
      });

      if (!classInfo) {
        throw new Error(`Class ${className} not found in academic year ${academicYear}`);
      }

      const schedule = await Schedule.findOne({
        class: classInfo._id,
        academicYear,
        status: 'active'
      })
      .populate('schedule.periods.subject', 'subjectName subjectCode department')
      .populate('schedule.periods.teacher', 'name email');

      if (!schedule) {
        throw new Error(`No active schedule found for class ${className}`);
      }

      // Lấy tiến độ tổng quan
      const overallProgress = schedule.getLearningProgress();
      
      // Lấy tiến độ theo môn học
      const progressBySubject = schedule.getProgressBySubject();
      
      // Populate subject info cho progress by subject
      const populatedProgressBySubject = {};
      for (const [subjectId, progress] of Object.entries(progressBySubject)) {
        const subject = await Subject.findById(subjectId).select('subjectName subjectCode department');
        if (subject) {
          populatedProgressBySubject[subjectId] = {
            ...progress,
            subject: {
              id: subject._id,
              name: subject.subjectName,
              code: subject.subjectCode,
              department: subject.department
            }
          };
        }
      }

      // Lấy chi tiết periods nếu yêu cầu
      let detailedSchedule = null;
      if (options.includeDetails) {
        detailedSchedule = schedule.schedule.map(day => ({
          dayOfWeek: day.dayOfWeek,
          dayName: day.dayName,
          periods: day.periods.map(period => ({
            periodNumber: period.periodNumber,
            session: period.session,
            timeStart: period.timeStart,
            timeEnd: period.timeEnd,
            status: period.status,
            actualDate: period.actualDate,
            completedAt: period.completedAt,
            notes: period.notes,
            attendance: period.attendance,
            subject: {
              id: period.subject._id,
              name: period.subject.subjectName,
              code: period.subject.subjectCode,
              department: period.subject.department
            },
            teacher: {
              id: period.teacher._id,
              name: period.teacher.name,
              email: period.teacher.email
            }
          }))
        }));
      }

      return {
        class: {
          id: classInfo._id,
          name: classInfo.className,
          academicYear: classInfo.academicYear
        },
        schedule: {
          id: schedule._id,
          semester: schedule.semester,
          weekNumber: schedule.weekNumber
        },
        progress: {
          overall: overallProgress,
          bySubject: populatedProgressBySubject,
          details: detailedSchedule
        },
        generatedAt: new Date()
      };

    } catch (error) {
      throw new Error(`Failed to get learning progress: ${error.message}`);
    }
  }

  // Lấy báo cáo điểm danh
  async getAttendanceReport(className, academicYear, options = {}) {
    try {
      const progress = await this.getLearningProgress(className, academicYear, { includeDetails: true });
      
      const attendanceReport = {
        class: progress.class,
        schedule: progress.schedule,
        summary: {
          totalPeriods: progress.progress.overall.totalPeriods,
          attendedPeriods: progress.progress.overall.completedPeriods + progress.progress.overall.makeupPeriods,
          absentPeriods: progress.progress.overall.absentPeriods,
          attendanceRate: progress.progress.overall.attendanceRate
        },
        bySubject: {},
        dailyReport: []
      };

      // Group by subject
      Object.entries(progress.progress.bySubject).forEach(([subjectId, subjectProgress]) => {
        attendanceReport.bySubject[subjectId] = {
          subject: subjectProgress.subject,
          totalPeriods: subjectProgress.total,
          attendedPeriods: subjectProgress.completed + subjectProgress.makeup,
          absentPeriods: subjectProgress.absent,
          attendanceRate: subjectProgress.attendanceRate
        };
      });

      // Daily attendance report
      if (progress.progress.details) {
        progress.progress.details.forEach(day => {
          const dayReport = {
            dayOfWeek: day.dayOfWeek,
            dayName: day.dayName,
            totalPeriods: day.periods.length,
            attendedPeriods: day.periods.filter(p => ['completed', 'makeup'].includes(p.status)).length,
            absentPeriods: day.periods.filter(p => p.status === 'absent').length,
            periods: day.periods.map(period => ({
              periodNumber: period.periodNumber,
              subject: period.subject.name,
              teacher: period.teacher.name,
              status: period.status,
              attendance: period.attendance
            }))
          };
          
          dayReport.attendanceRate = dayReport.totalPeriods > 0 
            ? (dayReport.attendedPeriods / dayReport.totalPeriods * 100).toFixed(2)
            : 0;
            
          attendanceReport.dailyReport.push(dayReport);
        });
      }

      return attendanceReport;

    } catch (error) {
      throw new Error(`Failed to get attendance report: ${error.message}`);
    }
  }

  // Bulk update period statuses
  async bulkUpdatePeriodStatus(scheduleId, updates, token) {
    try {
      // Verify user permissions
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !['admin', 'manager', 'teacher'].includes(user.role)) {
        throw new Error('Unauthorized to update period status');
      }

      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const results = [];
      const validStatuses = ['not_started', 'completed', 'absent', 'makeup'];

      for (const update of updates) {
        const { dayOfWeek, periodNumber, status, options = {} } = update;
        
        if (!validStatuses.includes(status)) {
          results.push({
            dayOfWeek,
            periodNumber,
            success: false,
            error: `Invalid status: ${status}`
          });
          continue;
        }

        const updated = schedule.updatePeriodStatus(dayOfWeek, periodNumber, status, options);
        results.push({
          dayOfWeek,
          periodNumber,
          success: updated,
          error: updated ? null : 'Period not found'
        });
      }

      schedule.lastModifiedBy = user._id;
      await schedule.save();

      return {
        message: 'Bulk update completed',
        results,
        totalUpdates: updates.length,
        successfulUpdates: results.filter(r => r.success).length,
        failedUpdates: results.filter(r => !r.success).length
      };

    } catch (error) {
      throw new Error(`Failed to bulk update period status: ${error.message}`);
    }
  }

  // Lấy lịch dạy của giáo viên theo khoảng thời gian
  async getTeacherScheduleByDateRange(teacherId, academicYear, startOfWeek, endOfWeek) {
    try {
      // Validate teacher exists
      const teacher = await User.findById(teacherId).populate('subject', 'subjectName subjectCode').select('name email role subject');
      
      console.log('🔍 Found teacher:', {
        id: teacher?._id,
        name: teacher?.name,
        role: teacher?.role,
        roleType: typeof teacher?.role,
        isArray: Array.isArray(teacher?.role)
      });
      
      if (!teacher) {
        throw new Error('Teacher not found - user does not exist');
      }
      
      // Check if role includes 'teacher' (handle both string and array)
      const hasTeacherRole = Array.isArray(teacher.role) 
        ? teacher.role.includes('teacher')
        : teacher.role === 'teacher';
        
      if (!hasTeacherRole) {
        throw new Error(`User found but role is ${JSON.stringify(teacher.role)}, not teacher`);
      }

      // Parse dates
      const startDate = new Date(startOfWeek);
      const endDate = new Date(endOfWeek);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
      }

      // Generate days in range
      const daysInRange = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        // Skip Sunday (0) and only include Monday (1) to Saturday (6)
        if (dayOfWeek >= 1 && dayOfWeek <= 6) {
          daysInRange.push({
            date: currentDate.toISOString().split('T')[0],
            dayOfWeek: dayOfWeek + 1, // Convert to our format (Monday = 2, Saturday = 7)
            dayName: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek - 1]
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Find all schedules where this teacher teaches
      const schedules = await Schedule.find({
        academicYear,
        status: 'active',
        'schedule.periods.teacher': teacherId
      })
      .populate('class', 'className academicYear')
      .populate('schedule.periods.subject', 'subjectName subjectCode department')
      .populate('schedule.periods.teacher', 'name email')
      .lean();

      console.log(`📋 Found ${schedules.length} schedules for teacher ${teacher.name}`);

      // Extract teacher's periods from all schedules
      const teacherPeriods = [];
      
      schedules.forEach(schedule => {
        schedule.schedule.forEach(day => {
          // Only include days in our date range
          const dayInRange = daysInRange.find(rd => rd.dayOfWeek === day.dayOfWeek);
          if (dayInRange) {
            // Filter periods taught by this teacher
            const teacherDayPeriods = day.periods.filter(period => 
              period.teacher && period.teacher._id.toString() === teacherId.toString()
            );

            if (teacherDayPeriods.length > 0) {
              teacherPeriods.push({
                date: dayInRange.date,
                dayOfWeek: day.dayOfWeek,
                dayName: day.dayName,
                class: {
                  id: schedule.class._id,
                  name: schedule.class.className
                },
                periods: teacherDayPeriods.map(period => ({
                  periodNumber: period.periodNumber,
                  session: period.session,
                  timeStart: period.timeStart,
                  timeEnd: period.timeEnd,
                  status: period.status,
                  actualDate: period.actualDate,
                  completedAt: period.completedAt,
                  notes: period.notes,
                  attendance: period.attendance,
                  subject: period.subject ? {
                    id: period.subject._id,
                    name: period.subject.subjectName,
                    code: period.subject.subjectCode,
                    department: period.subject.department
                  } : null,
                  fixed: period.fixed || false,
                  specialType: period.specialType || null,
                  periodType: period.periodType || 'regular',
                  makeupInfo: period.makeupInfo,
                  extracurricularInfo: period.extracurricularInfo
                }))
              });
            }
          }
        });
      });

      // Group by date and sort
      const groupedByDate = {};
      teacherPeriods.forEach(daySchedule => {
        if (!groupedByDate[daySchedule.date]) {
          groupedByDate[daySchedule.date] = {
            date: daySchedule.date,
            dayOfWeek: daySchedule.dayOfWeek,
            dayName: daySchedule.dayName,
            classes: []
          };
        }
        
        groupedByDate[daySchedule.date].classes.push({
          class: daySchedule.class,
          periods: daySchedule.periods
        });
      });

      // Convert to array and sort by dayOfWeek (Monday=2, Tuesday=3, etc.)
      const dailySchedule = Object.values(groupedByDate).sort((a, b) => 
        a.dayOfWeek - b.dayOfWeek
      );

      // Create weekly schedule format for easier reading
      const weeklySchedule = {};
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayNamesVN = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      
      // Initialize all days using English day names as keys
      dayNames.forEach((dayName, index) => {
        const dayOfWeek = index + 2; // Monday = 2
        weeklySchedule[dayName] = {
          dayName: dayName,
          dayNameVN: dayNamesVN[index],
          dayOfWeek: dayOfWeek,
          date: null,
          periods: []
        };
      });

      // Fill in the actual schedule data
      dailySchedule.forEach(day => {
        const dayName = dayNames[day.dayOfWeek - 2];
        if (weeklySchedule[dayName]) {
          weeklySchedule[dayName].date = day.date;
          
          // Flatten all periods from all classes for this day
          day.classes.forEach(classSchedule => {
            classSchedule.periods.forEach(period => {
              weeklySchedule[dayName].periods.push({
                className: classSchedule.class.name,
                periodNumber: period.periodNumber,
                timeStart: period.timeStart,
                timeEnd: period.timeEnd,
                subject: period.subject?.name || 'Fixed Period',
                status: period.status,
                fixed: period.fixed,
                specialType: period.specialType,
                periodType: period.periodType,
                makeupInfo: period.makeupInfo,
                extracurricularInfo: period.extracurricularInfo
              });
            });
          });

          // Sort periods by period number
          weeklySchedule[dayName].periods.sort((a, b) => a.periodNumber - b.periodNumber);
        }
      });

      // Calculate statistics with period type breakdown
      const totalPeriods = teacherPeriods.reduce((sum, day) => sum + day.periods.length, 0);
      const completedPeriods = teacherPeriods.reduce((sum, day) => 
        sum + day.periods.filter(p => p.status === 'completed').length, 0
      );
      const absentPeriods = teacherPeriods.reduce((sum, day) => 
        sum + day.periods.filter(p => p.status === 'absent').length, 0
      );

      // Period type statistics
      const periodTypeStats = {
        regular: 0,
        makeup: 0,
        extracurricular: 0,
        fixed: 0
      };

      teacherPeriods.forEach(day => {
        day.periods.forEach(period => {
          const periodType = period.periodType || 'regular';
          if (periodTypeStats[periodType] !== undefined) {
            periodTypeStats[periodType]++;
          }
        });
      });

      return {
        teacher: {
          id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          subject: teacher.subject
        },
        dateRange: {
          startOfWeek,
          endOfWeek,
          daysInRange: daysInRange.length
        },
        statistics: {
          totalPeriods,
          completedPeriods,
          absentPeriods,
          pendingPeriods: totalPeriods - completedPeriods - absentPeriods,
          completionRate: totalPeriods > 0 ? ((completedPeriods / totalPeriods) * 100).toFixed(2) : 0,
          periodTypeBreakdown: periodTypeStats
        },
        weeklySchedule, // New format: organized by day of week
        dailySchedule,  // Original format: organized by date
        totalClasses: schedules.length,
        generatedAt: new Date()
      };

    } catch (error) {
      throw new Error(`Failed to get teacher schedule by date range: ${error.message}`);
    }
  }

  // Lấy thống kê theo loại tiết học
  async getPeriodTypeStatistics(className, academicYear) {
    try {
      const classInfo = await Class.findOne({
        className: className.toUpperCase(),
        academicYear,
        active: true
      });

      if (!classInfo) {
        throw new Error(`Class ${className} not found in academic year ${academicYear}`);
      }

      const schedule = await Schedule.findOne({
        class: classInfo._id,
        academicYear,
        status: 'active'
      });

      if (!schedule) {
        throw new Error(`No active schedule found for class ${className}`);
      }

      const stats = schedule.getPeriodTypeStatistics();

      return {
        class: {
          id: classInfo._id,
          name: classInfo.className,
          academicYear: classInfo.academicYear
        },
        statistics: stats,
        generatedAt: new Date()
      };

    } catch (error) {
      throw new Error(`Failed to get period type statistics: ${error.message}`);
    }
  }

  // Lấy danh sách tiết học theo loại
  async getPeriodsByType(className, academicYear, periodType) {
    try {
      const classInfo = await Class.findOne({
        className: className.toUpperCase(),
        academicYear,
        active: true
      });

      if (!classInfo) {
        throw new Error(`Class ${className} not found in academic year ${academicYear}`);
      }

      const schedule = await Schedule.findOne({
        class: classInfo._id,
        academicYear,
        status: 'active'
      })
      .populate('schedule.periods.subject', 'subjectName subjectCode department')
      .populate('schedule.periods.teacher', 'name email');

      if (!schedule) {
        throw new Error(`No active schedule found for class ${className}`);
      }

      const periods = schedule.getPeriodsByType(periodType);

      return {
        class: {
          id: classInfo._id,
          name: classInfo.className,
          academicYear: classInfo.academicYear
        },
        periodType,
        totalPeriods: periods.length,
        periods: periods.map(period => ({
          ...period,
          subject: period.subject ? {
            id: period.subject._id,
            name: period.subject.subjectName,
            code: period.subject.subjectCode,
            department: period.subject.department
          } : null,
          teacher: period.teacher ? {
            id: period.teacher._id,
            name: period.teacher.name,
            email: period.teacher.email
          } : null
        })),
        generatedAt: new Date()
      };

    } catch (error) {
      throw new Error(`Failed to get periods by type: ${error.message}`);
    }
  }

  // Nhận biết loại tiết học
  async identifyPeriodType(className, academicYear, dayOfWeek, periodNumber) {
    try {
      const classInfo = await Class.findOne({
        className: className.toUpperCase(),
        academicYear,
        active: true
      });

      if (!classInfo) {
        throw new Error(`Class ${className} not found in academic year ${academicYear}`);
      }

      const schedule = await Schedule.findOne({
        class: classInfo._id,
        academicYear,
        status: 'active'
      })
      .populate('schedule.periods.subject', 'subjectName subjectCode department')
      .populate('schedule.periods.teacher', 'name email');

      if (!schedule) {
        throw new Error(`No active schedule found for class ${className}`);
      }

      const periodInfo = schedule.identifyPeriodType(dayOfWeek, periodNumber);

      if (!periodInfo) {
        return {
          class: {
            id: classInfo._id,
            name: classInfo.className,
            academicYear: classInfo.academicYear
          },
          dayOfWeek,
          periodNumber,
          exists: false,
          message: 'Period not found'
        };
      }

      return {
        class: {
          id: classInfo._id,
          name: classInfo.className,
          academicYear: classInfo.academicYear
        },
        dayOfWeek,
        periodNumber,
        exists: true,
        periodType: periodInfo.periodType,
        isRegular: periodInfo.isRegular,
        isMakeup: periodInfo.isMakeup,
        isExtracurricular: periodInfo.isExtracurricular,
        isFixed: periodInfo.isFixed,
        details: {
          subject: periodInfo.details.subject ? {
            id: periodInfo.details.subject._id,
            name: periodInfo.details.subject.subjectName,
            code: periodInfo.details.subject.subjectCode,
            department: periodInfo.details.subject.department
          } : null,
          teacher: periodInfo.details.teacher ? {
            id: periodInfo.details.teacher._id,
            name: periodInfo.details.teacher.name,
            email: periodInfo.details.teacher.email
          } : null,
          status: periodInfo.details.status,
          makeupInfo: periodInfo.details.makeupInfo,
          extracurricularInfo: periodInfo.details.extracurricularInfo,
          specialType: periodInfo.details.specialType
        }
      };

    } catch (error) {
      throw new Error(`Failed to identify period type: ${error.message}`);
    }
  }

  // Thêm tiết dạy bù
  async addMakeupPeriod(scheduleId, dayOfWeek, periodNumber, teacherId, subjectId, makeupInfo, timeSlot, token) {
    try {
      // Verify user permissions
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !['admin', 'manager', 'teacher'].includes(user.role)) {
        throw new Error('Unauthorized to add makeup period');
      }

      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Validate teacher and subject
      const teacher = await User.findById(teacherId);
      if (!teacher || !teacher.role.includes('teacher')) {
        throw new Error('Invalid teacher');
      }

      const subject = await Subject.findById(subjectId);
      if (!subject) {
        throw new Error('Invalid subject');
      }

      // Generate time slot if not provided
      if (!timeSlot) {
        const defaultTimeSlots = this.getTimeSlots();
        const allSlots = [...defaultTimeSlots.morning, ...defaultTimeSlots.afternoon];
        timeSlot = allSlots.find(slot => slot.period === periodNumber);
        
        if (!timeSlot) {
          throw new Error('Invalid period number');
        }
      }

      // Add makeup period
      const success = schedule.addMakeupPeriod(
        dayOfWeek,
        periodNumber,
        teacherId,
        subjectId,
        makeupInfo,
        timeSlot
      );

      if (!success) {
        throw new Error('Failed to add makeup period - slot may be occupied');
      }

      schedule.lastModifiedBy = user._id;
      await schedule.save();

      return {
        message: 'Makeup period added successfully',
        schedule: schedule,
        addedPeriod: {
          dayOfWeek,
          periodNumber,
          periodType: 'makeup',
          teacher: teacher.name,
          subject: subject.subjectName,
          makeupInfo
        }
      };

    } catch (error) {
      throw new Error(`Failed to add makeup period: ${error.message}`);
    }
  }

  // Thêm hoạt động ngoại khóa
  async addExtracurricularPeriod(scheduleId, dayOfWeek, periodNumber, teacherId, extracurricularInfo, timeSlot, token) {
    try {
      // Verify user permissions
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !['admin', 'manager', 'teacher'].includes(user.role)) {
        throw new Error('Unauthorized to add extracurricular period');
      }

      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Validate teacher
      const teacher = await User.findById(teacherId);
      if (!teacher || !teacher.role.includes('teacher')) {
        throw new Error('Invalid teacher');
      }

      // Generate time slot if not provided
      if (!timeSlot) {
        const defaultTimeSlots = this.getTimeSlots();
        const allSlots = [...defaultTimeSlots.morning, ...defaultTimeSlots.afternoon];
        timeSlot = allSlots.find(slot => slot.period === periodNumber);
        
        if (!timeSlot) {
          throw new Error('Invalid period number');
        }
      }

      // Add extracurricular period
      const success = schedule.addExtracurricularPeriod(
        dayOfWeek,
        periodNumber,
        teacherId,
        extracurricularInfo,
        timeSlot
      );

      if (!success) {
        throw new Error('Failed to add extracurricular period - slot may be occupied');
      }

      schedule.lastModifiedBy = user._id;
      await schedule.save();

      return {
        message: 'Extracurricular period added successfully',
        schedule: schedule,
        addedPeriod: {
          dayOfWeek,
          periodNumber,
          periodType: 'extracurricular',
          teacher: teacher.name,
          extracurricularInfo
        }
      };

    } catch (error) {
      throw new Error(`Failed to add extracurricular period: ${error.message}`);
    }
  }

  // Lấy danh sách slot trống
  async getAvailableSlots(className, academicYear) {
    try {
      const classInfo = await Class.findOne({
        className: className.toUpperCase(),
        academicYear,
        active: true
      });

      if (!classInfo) {
        throw new Error(`Class ${className} not found in academic year ${academicYear}`);
      }

      const schedule = await Schedule.findOne({
        class: classInfo._id,
        academicYear,
        status: 'active'
      });

      if (!schedule) {
        throw new Error(`No active schedule found for class ${className}`);
      }

      const availableSlots = [];
      const timeSlots = this.getTimeSlots();
      const allSlots = [
        ...timeSlots.morning.map(slot => ({ ...slot, session: 'morning' })),
        ...timeSlots.afternoon.map(slot => ({ ...slot, session: 'afternoon' }))
      ];

      schedule.schedule.forEach(day => {
        const occupiedPeriods = day.periods.map(p => p.periodNumber);
        
        allSlots.forEach(slot => {
          if (!occupiedPeriods.includes(slot.period)) {
            availableSlots.push({
              dayOfWeek: day.dayOfWeek,
              dayName: day.dayName,
              periodNumber: slot.period,
              session: slot.session,
              timeStart: slot.start,
              timeEnd: slot.end
            });
          }
        });
      });

      return {
        class: {
          id: classInfo._id,
          name: classInfo.className,
          academicYear: classInfo.academicYear
        },
        totalAvailableSlots: availableSlots.length,
        availableSlots: availableSlots.sort((a, b) => {
          if (a.dayOfWeek !== b.dayOfWeek) {
            return a.dayOfWeek - b.dayOfWeek;
          }
          return a.periodNumber - b.periodNumber;
        }),
        generatedAt: new Date()
      };

    } catch (error) {
      throw new Error(`Failed to get available slots: ${error.message}`);
    }
  }

  // Lấy chi tiết tiết học
  async getPeriodDetails(className, academicYear, dayOfWeek, periodNumber) {
    try {
      const classInfo = await Class.findOne({
        className: className.toUpperCase(),
        academicYear,
        active: true
      });

      if (!classInfo) {
        throw new Error(`Class ${className} not found in academic year ${academicYear}`);
      }

      const schedule = await Schedule.findOne({
        class: classInfo._id,
        academicYear,
        status: 'active'
      })
      .populate('schedule.periods.subject', 'subjectName subjectCode department weeklyHours')
      .populate('schedule.periods.teacher', 'name email role')
      .populate('class', 'className academicYear homeroomTeacher')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

      if (!schedule) {
        throw new Error(`No active schedule found for class ${className}`);
      }

      const periodDetails = schedule.getPeriodDetails(dayOfWeek, periodNumber);

      if (!periodDetails) {
        return {
          class: {
            id: classInfo._id,
            name: classInfo.className,
            academicYear: classInfo.academicYear
          },
          schedule: {
            id: schedule._id,
            status: schedule.status,
            createdBy: schedule.createdBy,
            lastModifiedBy: schedule.lastModifiedBy,
            createdAt: schedule.createdAt,
            updatedAt: schedule.updatedAt
          },
          dayOfWeek,
          periodNumber,
          exists: false,
          message: `No period found for ${periodDetails?.basic?.dayNameVN || `day ${dayOfWeek}`} period ${periodNumber}`
        };
      }

      // Populate subject and teacher information
      if (periodDetails.academic.subject) {
        const populatedSubject = await Subject.findById(periodDetails.academic.subject).select('subjectName subjectCode department weeklyHours category');
        periodDetails.academic.subject = populatedSubject ? {
          id: populatedSubject._id,
          name: populatedSubject.subjectName,
          code: populatedSubject.subjectCode,
          department: populatedSubject.department,
          weeklyHours: populatedSubject.weeklyHours,
          category: populatedSubject.category
        } : null;
      }

      if (periodDetails.academic.teacher) {
        const populatedTeacher = await User.findById(periodDetails.academic.teacher).select('name email role');
        periodDetails.academic.teacher = populatedTeacher ? {
          id: populatedTeacher._id,
          name: populatedTeacher.name,
          email: populatedTeacher.email,
          role: populatedTeacher.role
        } : null;
      }

      return {
        class: {
          id: classInfo._id,
          name: classInfo.className,
          academicYear: classInfo.academicYear,
          homeroomTeacher: schedule.class.homeroomTeacher
        },
        schedule: {
          id: schedule._id,
          status: schedule.status,
          semester: schedule.semester,
          weekNumber: schedule.weekNumber,
          totalPeriods: schedule.getTotalScheduledPeriods(),
          createdBy: schedule.createdBy,
          lastModifiedBy: schedule.lastModifiedBy,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt
        },
        exists: true,
        period: periodDetails,
        generatedAt: new Date()
      };

    } catch (error) {
      throw new Error(`Failed to get period details: ${error.message}`);
    }
  }

  // Đánh giá tiết học
  async evaluatePeriod(scheduleId, dayOfWeek, periodNumber, evaluationData, evaluatorId, evaluatorRole) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Kiểm tra tiết học có tồn tại không
      const daySchedule = schedule.getScheduleByDay(dayOfWeek);
      if (!daySchedule) {
        throw new Error(`No schedule found for day ${dayOfWeek}`);
      }

      const period = daySchedule.periods.find(p => p.periodNumber === periodNumber);
      if (!period) {
        throw new Error(`No period found for day ${dayOfWeek}, period ${periodNumber}`);
      }

      // Kiểm tra tiết học đã hoàn thành chưa
      if (period.status !== 'completed') {
        throw new Error('Can only evaluate completed periods');
      }

      // Thực hiện đánh giá
      const evaluation = schedule.evaluatePeriod(
        dayOfWeek, 
        periodNumber, 
        evaluationData, 
        evaluatorId, 
        evaluatorRole
      );

      if (!evaluation) {
        throw new Error('Failed to evaluate period');
      }

      // Lưu thay đổi
      await schedule.save();

      // Populate thông tin evaluator
      const evaluator = await User.findById(evaluatorId).select('name email role');

      return {
        scheduleId: schedule._id,
        dayOfWeek,
        periodNumber,
        evaluation: {
          ...evaluation,
          evaluatedBy: evaluator ? {
            id: evaluator._id,
            name: evaluator.name,
            email: evaluator.email,
            role: evaluator.role
          } : evaluation.evaluatedBy
        },
        evaluatedAt: new Date()
      };

    } catch (error) {
      throw new Error(`Failed to evaluate period: ${error.message}`);
    }
  }

  // Lấy đánh giá tiết học
  async getPeriodEvaluation(scheduleId, dayOfWeek, periodNumber) {
    try {
      const schedule = await Schedule.findById(scheduleId)
        .populate('schedule.periods.evaluation.evaluatedBy', 'name email role');

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const evaluation = schedule.getPeriodEvaluation(dayOfWeek, periodNumber);

      if (!evaluation) {
        return {
          scheduleId: schedule._id,
          dayOfWeek,
          periodNumber,
          hasEvaluation: false,
          message: 'No evaluation found for this period'
        };
      }

      return {
        scheduleId: schedule._id,
        dayOfWeek,
        periodNumber,
        hasEvaluation: true,
        evaluation: {
          overallRating: evaluation.overallRating,
          overallRatingText: ['', 'Kém', 'Trung bình', 'Khá', 'Tốt', 'Xuất sắc'][evaluation.overallRating] || 'Chưa đánh giá',
          criteria: evaluation.criteria,
          feedback: evaluation.feedback,
          evaluatedBy: evaluation.evaluatedBy,
          evaluatedAt: evaluation.evaluatedAt,
          evaluatorRole: evaluation.evaluatorRole,
          evaluatorRoleVN: {
            'admin': 'Quản trị viên',
            'manager': 'Quản lý',
            'principal': 'Hiệu trưởng',
            'head_teacher': 'Tổ trưởng',
            'peer_teacher': 'Giáo viên đồng nghiệp'
          }[evaluation.evaluatorRole] || 'Không xác định'
        }
      };

    } catch (error) {
      throw new Error(`Failed to get period evaluation: ${error.message}`);
    }
  }
  // ========== API MỚI CHO SCHEMA TUẦN-NGÀY-TIẾT ==========

  // Lấy chi tiết tiết học theo ID
  async getPeriodById(scheduleId, periodId) {
    try {
      const schedule = await Schedule.findById(scheduleId)
        .populate('weeks.days.periods.subject', 'subjectName subjectCode department')
        .populate('weeks.days.periods.teacher', 'name email')
        .populate('class', 'className academicYear');

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const periodDetails = schedule.getPeriodDetailsById(periodId);
      if (!periodDetails) {
        throw new Error('Period not found');
      }

      return {
        schedule: {
          id: schedule._id,
          class: schedule.class,
          academicYear: schedule.academicYear
        },
        period: periodDetails
      };
    } catch (error) {
      throw new Error(`Failed to get period by ID: ${error.message}`);
    }
  }

  // Lấy danh sách tiết rỗng
  async getEmptySlots(scheduleId, weekNumber = null) {
    try {
      const schedule = await Schedule.findById(scheduleId)
        .populate('class', 'className academicYear');

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const emptySlots = schedule.getAvailableEmptySlots(weekNumber);

      return {
        schedule: {
          id: schedule._id,
          class: schedule.class,
          academicYear: schedule.academicYear
        },
        weekNumber: weekNumber,
        totalEmptySlots: emptySlots.length,
        emptySlots: emptySlots
      };
    } catch (error) {
      throw new Error(`Failed to get empty slots: ${error.message}`);
    }
  }

  // Lấy thời khóa biểu theo tuần
  async getScheduleByWeek(scheduleId, weekNumber) {
    try {
      const schedule = await Schedule.findById(scheduleId)
        .populate('weeks.days.periods.subject', 'subjectName subjectCode department')
        .populate('weeks.days.periods.teacher', 'name email')
        .populate('class', 'className academicYear');

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const week = schedule.getScheduleByWeek(weekNumber);
      if (!week) {
        throw new Error(`Week ${weekNumber} not found`);
      }

      return {
        schedule: {
          id: schedule._id,
          class: schedule.class,
          academicYear: schedule.academicYear,
          totalWeeks: schedule.totalWeeks
        },
        week: {
          weekNumber: week.weekNumber,
          startDate: week.startDate,
          endDate: week.endDate,
          days: week.days.map(day => ({
            dayOfWeek: day.dayOfWeek,
            dayName: day.dayName,
            dayNameVN: ['', 'CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][day.dayOfWeek],
            date: day.date,
            periods: day.periods.map(period => ({
              id: period._id,
              periodNumber: period.periodNumber,
              periodType: period.periodType,
              session: period.session,
              timeStart: period.timeStart,
              timeEnd: period.timeEnd,
              status: period.status,
              subject: period.subject ? {
                id: period.subject._id,
                name: period.subject.subjectName,
                code: period.subject.subjectCode,
                department: period.subject.department
              } : null,
              teacher: period.teacher ? {
                id: period.teacher._id,
                name: period.teacher.name,
                email: period.teacher.email
              } : null,
              fixed: period.fixed,
              specialType: period.specialType,
              makeupInfo: period.makeupInfo,
              extracurricularInfo: period.extracurricularInfo
            }))
          }))
        }
      };
    } catch (error) {
      throw new Error(`Failed to get schedule by week: ${error.message}`);
    }
  }

  // Cập nhật trạng thái tiết học theo ID
  async updatePeriodStatusById(scheduleId, periodId, status, options, token) {
    try {
      // Verify token và lấy user info
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        throw new Error('User not found');
      }

      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const success = schedule.updatePeriodStatusById(periodId, status, options);
      if (!success) {
        throw new Error('Period not found or update failed');
      }

      // Cập nhật lastModifiedBy
      schedule.lastModifiedBy = user._id;
      await schedule.save();

      const updatedPeriod = schedule.getPeriodDetailsById(periodId);

      return {
        message: 'Period status updated successfully',
        updatedPeriod: updatedPeriod
      };
    } catch (error) {
      throw new Error(`Failed to update period status: ${error.message}`);
    }
  }

  // Thêm tiết dạy bù vào slot rỗng
  async addMakeupToEmptySlot(scheduleId, periodId, teacherId, subjectId, makeupInfo, token) {
    try {
      // Verify token và lấy user info
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        throw new Error('User not found');
      }

      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const success = schedule.addMakeupPeriodToEmptySlot(periodId, teacherId, subjectId, makeupInfo);
      if (!success) {
        throw new Error('Failed to add makeup period - slot may not be empty or not found');
      }

      // Cập nhật lastModifiedBy
      schedule.lastModifiedBy = user._id;
      await schedule.save();

      const updatedPeriod = schedule.getPeriodDetailsById(periodId);

      return {
        message: 'Makeup period added successfully',
        period: updatedPeriod
      };
    } catch (error) {
      throw new Error(`Failed to add makeup period: ${error.message}`);
    }
  }

  // Thêm hoạt động ngoại khóa vào slot rỗng
  async addExtracurricularToEmptySlot(scheduleId, periodId, teacherId, extracurricularInfo, token) {
    try {
      // Verify token và lấy user info
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        throw new Error('User not found');
      }

      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const success = schedule.addExtracurricularToEmptySlot(periodId, teacherId, extracurricularInfo);
      if (!success) {
        throw new Error('Failed to add extracurricular activity - slot may not be empty or not found');
      }

      // Cập nhật lastModifiedBy
      schedule.lastModifiedBy = user._id;
      await schedule.save();

      const updatedPeriod = schedule.getPeriodDetailsById(periodId);

      return {
        message: 'Extracurricular activity added successfully',
        period: updatedPeriod
      };
    } catch (error) {
      throw new Error(`Failed to add extracurricular activity: ${error.message}`);
    }
  }

  // Helper method to save schedule with proper validation settings
  async saveScheduleWithValidation(schedule) {
    try {
      return await schedule.save({ validateBeforeSave: false });
    } catch (error) {
      console.error('Error saving schedule:', error.message);
      throw error;
    }
  }
}

module.exports = new ScheduleService(); 