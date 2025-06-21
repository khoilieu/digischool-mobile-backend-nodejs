const TimetableSchedulerService = require('./timetable-scheduler.service');
const TeacherAssignmentService = require('./teacher-assignment.service');
const Schedule = require('../models/schedule.model');
const Class = require('../../classes/models/class.model');
const Subject = require('../../subjects/models/subject.model');
const User = require('../../auth/models/user.model');

class AdvancedSchedulerService {
  constructor() {
    this.timetableScheduler = new TimetableSchedulerService();
    this.teacherAssignment = new TeacherAssignmentService();
  }

  async createOptimizedSchedule(classId, academicYear) {
    try {
      console.log(`🚀 Creating optimized schedule for class ${classId}...`);
      
      // 1. Lấy thông tin lớp
      const classInfo = await Class.findById(classId).populate('homeroomTeacher');
      if (!classInfo) {
        throw new Error('Không tìm thấy lớp học');
      }

      if (!classInfo.homeroomTeacher) {
        throw new Error('Lớp học chưa có giáo viên chủ nhiệm');
      }

      console.log(`📚 Lớp: ${classInfo.className}, GVCN: ${classInfo.homeroomTeacher.name}`);

      // 2. Lấy môn học theo cấp lớp
      const gradeLevel = this.extractGradeFromClassName(classInfo.className);
      const subjects = await Subject.find({
        gradeLevels: gradeLevel,
        isActive: true
      }).lean();

      if (!subjects || subjects.length === 0) {
        throw new Error(`Không tìm thấy môn học cho cấp lớp ${gradeLevel}`);
      }

      console.log(`📖 Tìm thấy ${subjects.length} môn học cho cấp lớp ${gradeLevel}`);

      // 3. Lấy giáo viên
      const subjectIds = subjects.map(s => s._id);
      const teachers = await User.find({
        role: { $in: ['teacher', 'homeroom_teacher'] },
        subject: { $in: subjectIds },
        active: true
      }).populate('subject').lean();

      console.log(`👨‍🏫 Tìm thấy ${teachers.length} giáo viên`);

      // 4. Thêm GVCN nếu cần
      const homeroomTeacher = classInfo.homeroomTeacher;
      if (homeroomTeacher.subject) {
        const homeroomSubject = await Subject.findById(homeroomTeacher.subject).lean();
        if (homeroomSubject && homeroomSubject.gradeLevels.includes(gradeLevel)) {
          const existingTeacher = teachers.find(t => t._id.toString() === homeroomTeacher._id.toString());
          if (!existingTeacher) {
            teachers.push({
              ...homeroomTeacher,
              subject: homeroomSubject
            });
            console.log(`✅ Đã thêm GVCN ${homeroomTeacher.name} dạy môn ${homeroomSubject.subjectName}`);
          }
        }
      }

      if (teachers.length === 0) {
        throw new Error('Không tìm thấy giáo viên phù hợp');
      }

      // 5. Log mapping
      console.log('📋 Teacher-Subject mapping:');
    teachers.forEach(teacher => {
        if (teacher.subject) {
          console.log(`  - ${teacher.name}: ${teacher.subject.subjectName || 'Unknown'}`);
        }
      });

      // 6. Tạo lịch với logic phân công giáo viên đúng và kiểm tra xung đột
      console.log('🚀 Tạo thời khóa biểu với logic phân công giáo viên đúng và kiểm tra xung đột...');
      
      // Tạo bản đồ phân công giáo viên
      const teacherAssignmentMap = await this.teacherAssignment.createTeacherAssignmentMap(
        classId, 
        subjects
      );

      // In báo cáo phân công
      this.teacherAssignment.printAssignmentReport(teacherAssignmentMap, classInfo.className);

      // Tạo thời khóa biểu với kiểm tra xung đột
      const optimizedSchedule = await this.teacherAssignment.createOptimizedScheduleWithConflictCheck(
        classId, 
        subjects, 
        teacherAssignmentMap, 
        classInfo.className
      );
      
      console.log('✅ Thời khóa biểu đã được tạo thành công với logic phân công đúng');
      
      // In báo cáo workload sau khi tạo xong tất cả lớp
      if (this.isLastClass) {
        this.teacherAssignment.printWorkloadSummary();
      }
      
      return optimizedSchedule;

    } catch (error) {
      console.error(`❌ Lỗi tạo thời khóa biểu: ${error.message}`);
      throw error;
    }
  }

  async createFallbackSchedule(classId, academicYear, subjects, teachers, classInfo) {
    try {
      console.log('🔧 Tạo fallback schedule với logic phân công giáo viên đúng...');
      const schedule = Schedule.createTemplate(classId, academicYear, classInfo.homeroomTeacher._id);
      
      // Tạo bản đồ phân công giáo viên đúng logic
      const teacherAssignmentMap = await this.teacherAssignment.createTeacherAssignmentMap(
        classId, 
        subjects
      );

      // In báo cáo phân công
      this.teacherAssignment.printAssignmentReport(teacherAssignmentMap, classInfo.className);

      // Tạo danh sách môn học cần xếp theo số tiết
      const subjectPeriods = [];
      subjects.forEach(subject => {
        const periodsPerWeek = subject.periodsPerWeek || 3;
        for (let i = 0; i < periodsPerWeek; i++) {
          subjectPeriods.push(subject);
        }
      });

      console.log(`📊 Tổng số tiết cần xếp: ${subjectPeriods.length}`);

      let periodIndex = 0;
      let unplacedCount = 0;
      const maxPeriodsPerDay = 7;
      const daysPerWeek = 6;

      for (let dayIndex = 0; dayIndex < daysPerWeek && periodIndex < subjectPeriods.length; dayIndex++) {
        const daySchedule = schedule.schedule[dayIndex];
        
        // Bỏ qua tiết chào cờ (thứ 2 tiết 1) và sinh hoạt lớp (thứ 7 tiết 7)
        const skipPeriods = [];
        if (dayIndex === 0) skipPeriods.push(1); // Thứ 2 tiết 1: Chào cờ
        if (dayIndex === 5) skipPeriods.push(7); // Thứ 7 tiết 7: Sinh hoạt lớp

        for (let period = 1; period <= maxPeriodsPerDay && periodIndex < subjectPeriods.length; period++) {
          if (skipPeriods.includes(period)) continue;

          // 1. Chọn subject trước
          const subject = subjectPeriods[periodIndex];
          
          // 2. Lấy giáo viên đã được phân công cho môn này
          const assignedTeacher = this.teacherAssignment.getAssignedTeacher(teacherAssignmentMap, subject._id);
          
          if (assignedTeacher) {
            const timeSlot = this.getTimeSlot(period);
            
            daySchedule.periods.push({
              periodNumber: period,
              subject: subject._id,
              teacher: assignedTeacher._id,
              session: timeSlot.session,
              timeStart: timeSlot.start,
              timeEnd: timeSlot.end,
              status: 'not_started'
            });

            console.log(`✅ Tiết ${period} - ${this.getDayName(dayIndex)}: ${subject.subjectName} (${assignedTeacher.name})`);
            periodIndex++;
          } else {
            console.log(`⚠️ Không có giáo viên được phân công cho môn ${subject.subjectName}`);
            unplacedCount++;
            periodIndex++;
          }
        }
      }

      // Thêm các tiết cố định
      this.addFixedPeriods(schedule, classInfo.homeroomTeacher._id);
      
      if (unplacedCount > 0) {
        console.log(`⚠️ Warning: ${unplacedCount} periods could not be scheduled due to constraints`);
      }

      console.log(`📈 Đã xếp ${periodIndex - unplacedCount}/${subjectPeriods.length} tiết học`);
      
      // Save the fallback schedule
      await schedule.save();
    return schedule;

    } catch (error) {
      throw new Error(`Lỗi tạo thời khóa biểu fallback: ${error.message}`);
    }
  }

  addFixedPeriods(schedule, homeroomTeacherId) {
    schedule.schedule[0].periods.unshift({
      periodNumber: 1,
      subject: null,
      teacher: homeroomTeacherId,
      session: 'morning',
      timeStart: '07:00',
      timeEnd: '07:45',
      status: 'not_started',
      fixed: true,
      specialType: 'flag_ceremony'
    });

    schedule.schedule[5].periods.push({
      periodNumber: 7,
      subject: null,
      teacher: homeroomTeacherId,
      session: 'afternoon',
      timeStart: '14:20',
      timeEnd: '15:05',
      status: 'not_started',
      fixed: true,
      specialType: 'class_meeting'
    });
  }

  getTimeSlot(periodNumber) {
    const timeSlots = [
      { start: '07:00', end: '07:45', session: 'morning' },
      { start: '07:50', end: '08:35', session: 'morning' },
      { start: '08:40', end: '09:25', session: 'morning' },
      { start: '09:45', end: '10:30', session: 'morning' },
      { start: '10:35', end: '11:20', session: 'morning' },
      { start: '13:30', end: '14:15', session: 'afternoon' },
      { start: '14:20', end: '15:05', session: 'afternoon' }
    ];
    return timeSlots[periodNumber - 1] || timeSlots[0];
  }

  extractGradeFromClassName(className) {
    const match = className.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 12;
  }

  getDayName(dayIndex) {
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[dayIndex] || `Day ${dayIndex + 1}`;
  }

  async getScheduleByClass(classId, academicYear, options = {}) {
    try {
      const query = {
        class: classId,
        academicYear,
        status: 'active'
      };

      if (options.semester) {
        query.semester = options.semester;
      }

      if (options.weekNumber) {
        query.weekNumber = options.weekNumber;
      }

      const schedule = await Schedule.findOne(query)
        .populate('class')
        .populate('schedule.periods.subject')
        .populate('schedule.periods.teacher', 'name email')
        .populate('createdBy', 'name email')
        .lean();

      return schedule;
    } catch (error) {
      throw new Error(`Error fetching schedule: ${error.message}`);
    }
  }

  async updatePeriodStatus(scheduleId, dayOfWeek, periodNumber, status, updateData = {}) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const success = schedule.updatePeriodStatus(dayOfWeek, periodNumber, status, updateData);
      if (!success) {
        throw new Error('Period not found or update failed');
      }

      await schedule.save();
      return schedule;
    } catch (error) {
      throw new Error(`Error updating period status: ${error.message}`);
    }
  }

  async getLearningProgress(classId, academicYear) {
    try {
      const schedule = await this.getScheduleByClass(classId, academicYear);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const overallProgress = schedule.getLearningProgress();
      const subjectProgress = schedule.getProgressBySubject();

      return {
        overall: overallProgress,
        bySubject: subjectProgress,
        classInfo: {
          className: schedule.class.className,
          academicYear: schedule.academicYear,
          semester: schedule.semester
        }
      };
    } catch (error) {
      throw new Error(`Error getting learning progress: ${error.message}`);
    }
  }
}

module.exports = AdvancedSchedulerService; 