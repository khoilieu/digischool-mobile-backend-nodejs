const Schedule = require('../models/schedule.model');

class TimetableSchedulerService {
  constructor() {
    this.TIME_SLOTS = [
      { period: 1, start: '07:00', end: '07:45', session: 'morning' },
      { period: 2, start: '07:50', end: '08:35', session: 'morning' },
      { period: 3, start: '08:40', end: '09:25', session: 'morning' },
      { period: 4, start: '09:45', end: '10:30', session: 'morning' },
      { period: 5, start: '10:35', end: '11:20', session: 'morning' },
      { period: 6, start: '12:30', end: '13:15', session: 'afternoon' },
      { period: 7, start: '13:20', end: '14:05', session: 'afternoon' },
      { period: 8, start: '14:10', end: '14:55', session: 'afternoon' },
      { period: 9, start: '15:00', end: '15:45', session: 'afternoon' },
      { period: 10, start: '15:50', end: '16:35', session: 'afternoon' }
    ];

    this.DAYS = [
      { dayOfWeek: 2, dayName: 'Monday' },
      { dayOfWeek: 3, dayName: 'Tuesday' },
      { dayOfWeek: 4, dayName: 'Wednesday' },
      { dayOfWeek: 5, dayName: 'Thursday' },
      { dayOfWeek: 6, dayName: 'Friday' },
      { dayOfWeek: 7, dayName: 'Saturday' }
    ];
  }

  async generateOptimalSchedule(classId, academicYear, subjects, teachers) {
    try {
      console.log(`🚀 Bắt đầu tạo thời khóa biểu cho lớp ${classId}...`);
      
      // Validate inputs
      if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
        throw new Error('Danh sách môn học không hợp lệ');
      }

      if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
        throw new Error('Danh sách giáo viên không hợp lệ');
      }

      // Get class info to obtain homeroom teacher ID
      const Class = require('../../classes/models/class.model');
      const classInfo = await Class.findById(classId).populate('homeroomTeacher');
      const homeroomTeacherId = classInfo?.homeroomTeacher?._id || teachers[0]._id;

      // Create teacher-subject mapping
      const teacherSubjectMap = new Map();
      teachers.forEach(teacher => {
        if (teacher && teacher._id && teacher.subject && teacher.subject._id) {
          const subjectId = teacher.subject._id.toString();
          if (!teacherSubjectMap.has(subjectId)) {
            teacherSubjectMap.set(subjectId, []);
          }
          teacherSubjectMap.get(subjectId).push(teacher);
        }
      });

      console.log(`📊 Teacher-Subject mapping: ${teacherSubjectMap.size} subjects mapped`);

      // Create schedule template with homeroom teacher ID
      const schedule = Schedule.createTemplate(classId, academicYear, homeroomTeacherId, homeroomTeacherId);
      
      // Add fixed periods first
      this.addFixedPeriods(schedule, homeroomTeacherId);

      // Create periods to schedule
      const periodsToSchedule = [];
      subjects.forEach(subject => {
        if (!subject || !subject._id) return;
        
        const subjectId = subject._id.toString();
        const availableTeachers = teacherSubjectMap.get(subjectId);
        
        if (!availableTeachers || availableTeachers.length === 0) {
          console.warn(`⚠️ Không có giáo viên cho môn ${subject.subjectName}`);
          return;
        }

        const periodsPerWeek = subject.weeklyHours || 2;
        for (let i = 0; i < periodsPerWeek; i++) {
          periodsToSchedule.push({
            subject: subject,
            teacher: availableTeachers[i % availableTeachers.length] // Round robin assignment
          });
        }
      });

      console.log(`📊 Tổng số tiết cần xếp: ${periodsToSchedule.length}`);

      // Simple scheduling algorithm
      let periodIndex = 0;
      for (let dayIndex = 0; dayIndex < this.DAYS.length && periodIndex < periodsToSchedule.length; dayIndex++) {
        const daySchedule = schedule.schedule[dayIndex];
        
        // Skip fixed periods
        const skipPeriods = [];
        if (dayIndex === 0) skipPeriods.push(1); // Monday period 1: Flag ceremony
        if (dayIndex === 5) skipPeriods.push(7); // Saturday period 7: Class meeting

        for (let periodNum = 1; periodNum <= 7 && periodIndex < periodsToSchedule.length; periodNum++) {
          if (skipPeriods.includes(periodNum)) continue;

          const period = periodsToSchedule[periodIndex];
          const timeSlot = this.TIME_SLOTS[periodNum - 1];

          // Add period to schedule
          daySchedule.periods.push({
            periodNumber: periodNum,
            subject: period.subject._id,
            teacher: period.teacher._id,
            session: timeSlot.session,
            timeStart: timeSlot.start,
            timeEnd: timeSlot.end,
            periodType: 'regular', // Đánh dấu là tiết chính quy
            status: 'not_started'
          });

          periodIndex++;
        }

        // Sort periods by period number
        daySchedule.periods.sort((a, b) => a.periodNumber - b.periodNumber);
      }

      console.log(`✅ Đã xếp ${periodIndex} tiết thành công`);
      console.log('✅ Tạo thời khóa biểu thành công');
      
      return schedule;

    } catch (error) {
      console.error(`❌ Lỗi tạo thời khóa biểu: ${error.message}`);
      throw error;
    }
  }

  addFixedPeriods(schedule, teacherId) {
    try {
      // Chào cờ: Thứ 2 tiết 1
      schedule.schedule[0].periods.push({
        periodNumber: 1,
        subject: null,
        teacher: teacherId,
        session: 'morning',
        timeStart: '07:00',
        timeEnd: '07:45',
        periodType: 'fixed', // Sử dụng periodType thay vì fixed flag
        status: 'not_started',
        fixed: true, // Giữ lại để tương thích
        specialType: 'flag_ceremony'
      });

      // Sinh hoạt lớp: Thứ 7 tiết 7
      schedule.schedule[5].periods.push({
        periodNumber: 7,
        subject: null,
        teacher: teacherId,
        session: 'afternoon',
        timeStart: '14:20',
        timeEnd: '15:05',
        periodType: 'fixed', // Sử dụng periodType thay vì fixed flag
        status: 'not_started',
        fixed: true, // Giữ lại để tương thích
        specialType: 'class_meeting'
      });

      console.log('✅ Đã thêm fixed periods (chào cờ, sinh hoạt lớp)');
    } catch (error) {
      console.error(`❌ Lỗi thêm fixed periods: ${error.message}`);
      throw error;
    }
  }
}

module.exports = TimetableSchedulerService; 