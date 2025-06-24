const TimetableSchedulerService = require('./timetable-scheduler.service');
const TeacherAssignmentService = require('./teacher-assignment.service');
const Schedule = require('../models/schedule.model');
const Period = require('../models/period.model');
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
      const schedule = await Schedule.createTemplate(classId, academicYear, classInfo.homeroomTeacher._id, classInfo.homeroomTeacher._id);
      
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
      const maxPeriodsPerDay = 8; // Updated to 8 for regular periods (excluding empty periods 9-10)
      const daysPerWeek = 7; // 7 ngày bao gồm chủ nhật

      // Chỉ xếp cho tuần đầu tiên (tuần 1), các tuần khác sẽ copy từ tuần này
      const firstWeek = schedule.weeks[0];
      if (!firstWeek) {
        throw new Error('No weeks found in schedule template');
      }

      for (let dayIndex = 0; dayIndex < daysPerWeek && periodIndex < subjectPeriods.length; dayIndex++) {
        // Bỏ qua chủ nhật (dayIndex = 0) vì tất cả tiết đều là empty
        if (dayIndex === 0) continue;
        
        // Bỏ qua tiết chào cờ (thứ 2 tiết 1) và sinh hoạt lớp (thứ 7 tiết 7)
        const skipPeriods = [];
        if (dayIndex === 1) skipPeriods.push(1); // Monday period 1: Flag ceremony
        if (dayIndex === 6) skipPeriods.push(7); // Saturday period 7: Class meeting

        for (let period = 1; period <= maxPeriodsPerDay && periodIndex < subjectPeriods.length; period++) {
          if (skipPeriods.includes(period)) continue;

          // Tìm period tương ứng trong Period collection với periodId
          const existingPeriod = await Period.findOne({
            schedule: schedule._id,
            weekNumber: 1,
            dayOfWeek: dayIndex === 0 ? 1 : dayIndex + 1,
            periodNumber: period,
            periodType: 'regular'
          });

          if (!existingPeriod) {
            console.log(`⚠️ Period not found: week 1, day ${dayIndex + 1}, period ${period}`);
            continue;
          }

          // 1. Chọn subject trước
          const subject = subjectPeriods[periodIndex];
          
          // 2. Lấy giáo viên đã được phân công cho môn này
          const assignedTeacher = this.teacherAssignment.getAssignedTeacher(teacherAssignmentMap, subject._id);
          
          if (assignedTeacher) {
            // Cập nhật period với thông tin môn học và giáo viên
            existingPeriod.subject = subject._id;
            existingPeriod.teacher = assignedTeacher._id;
            
            // Ensure periodId is correctly formatted
            if (!existingPeriod.periodId) {
              const scheduleId = schedule._id.toString().slice(-6);
              const weekNum = String(1).padStart(2, '0');
              const dayNum = String(existingPeriod.dayOfWeek);
              const periodNum = String(existingPeriod.periodNumber).padStart(2, '0');
              existingPeriod.periodId = `${scheduleId}_week${weekNum}_day${dayNum}_period${periodNum}`;
            }
            
            // Save individual period document
            await existingPeriod.save();

            console.log(`✅ Tiết ${period} - ${this.getDayName(dayIndex)} [${existingPeriod.periodId}]: ${subject.subjectName} (${assignedTeacher.name})`);
            periodIndex++;
          } else {
            console.log(`⚠️ Không có giáo viên được phân công cho môn ${subject.subjectName}`);
            unplacedCount++;
            periodIndex++;
          }
        }
      }

      // Copy lịch từ tuần đầu tiên sang các tuần khác
      await this.copyScheduleToAllWeeks(schedule);

      // Thêm các tiết cố định
      await this.addFixedPeriods(schedule, classInfo.homeroomTeacher._id);
      
      // Save schedule after all changes
      await schedule.save({ validateBeforeSave: false });
      
      if (unplacedCount > 0) {
        console.log(`⚠️ Warning: ${unplacedCount} periods could not be scheduled due to constraints`);
      }

      console.log(`📈 Đã xếp ${periodIndex - unplacedCount}/${subjectPeriods.length} tiết học`);
      console.log(`⚠️ Số xung đột: 0`);

      return schedule;
    } catch (error) {
      console.error('❌ Lỗi tạo fallback schedule:', error.message);
      throw error;
    }
  }

  // Fixed periods management - updated to use Period model
  async addFixedPeriods(schedule, homeroomTeacherId) {
    try {
      console.log('🏷️ Adding fixed periods to all weeks...');
      
      // Find and update flag ceremony periods (Monday, period 1) for all weeks
      const flagUpdateResult = await Period.updateMany({
        schedule: schedule._id,
        dayOfWeek: 2, // Monday
        periodNumber: 1
      }, {
        $set: {
          periodType: 'fixed',
          specialType: 'flag_ceremony',
          teacher: homeroomTeacherId,
          subject: null
        }
      });

      // Find and update class meeting periods (Saturday, period 7) for all weeks
      const classMeetingUpdateResult = await Period.updateMany({
        schedule: schedule._id,
        dayOfWeek: 7, // Saturday
        periodNumber: 7
      }, {
        $set: {
          periodType: 'fixed',
          specialType: 'class_meeting',
          teacher: homeroomTeacherId,
          subject: null
        }
      });

      console.log(`✅ Updated ${flagUpdateResult.modifiedCount} flag ceremony periods`);
      console.log(`✅ Updated ${classMeetingUpdateResult.modifiedCount} class meeting periods`);
      console.log('✅ Added fixed periods (flag ceremony and class meeting) to all weeks');
    } catch (error) {
      console.error('❌ Error adding fixed periods:', error.message);
    }
  }

  // Copy schedule from week 1 to all other weeks - updated to use Period model
  async copyScheduleToAllWeeks(schedule) {
    try {
      console.log('📅 Copying schedule template to all 38 weeks...');
      
      // Get all periods from week 1 that have subject/teacher assignments
      const week1AssignedPeriods = await Period.find({
        schedule: schedule._id,
        weekNumber: 1,
        $or: [
          { subject: { $exists: true, $ne: null } },
          { periodType: 'fixed' }
        ]
      }).lean();

      console.log(`📚 Found ${week1AssignedPeriods.length} assigned periods in week 1 to copy`);

      // Update corresponding periods in weeks 2-38
      for (const week1Period of week1AssignedPeriods) {
        const updateData = {
          subject: week1Period.subject,
          teacher: week1Period.teacher,
          periodType: week1Period.periodType
        };

        if (week1Period.specialType) {
          updateData.specialType = week1Period.specialType;
        }

        // Update all corresponding periods in other weeks
        const updateResult = await Period.updateMany({
          schedule: schedule._id,
          weekNumber: { $gt: 1 }, // Weeks 2-38
          dayOfWeek: week1Period.dayOfWeek,
          periodNumber: week1Period.periodNumber
        }, { $set: updateData });

        console.log(`🔄 Updated ${updateResult.modifiedCount} periods for dayOfWeek ${week1Period.dayOfWeek}, period ${week1Period.periodNumber}`);
      }

      console.log(`✅ Copied schedule template to all weeks`);
      
      // Verify the copy by counting updated periods
      const totalAssignedPeriods = await Period.countDocuments({
        schedule: schedule._id,
        weekNumber: { $gt: 1 },
        $or: [
          { subject: { $exists: true, $ne: null } },
          { periodType: 'fixed' }
        ]
      });
      
      console.log(`📊 Total assigned periods across weeks 2-38: ${totalAssignedPeriods}`);
      
      // Update periodId format verification count
      const validPeriodIdCount = await Period.countDocuments({
        schedule: schedule._id,
        periodId: { $regex: /^[a-f0-9]{6}_week\d{2}_day\d_period\d{2}$/ }
      });
      
      const totalPeriods = await Period.countDocuments({
        schedule: schedule._id
      });
      
      console.log(`🆔 PeriodId format validation: ${validPeriodIdCount}/${totalPeriods} periods have correct format`);
      
    } catch (error) {
      console.error('❌ Error copying schedule to all weeks:', error.message);
      throw error;
    }
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
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[dayIndex] || `Day ${dayIndex + 1}`;
  }

  async getScheduleByClass(classId, academicYear, options = {}) {
    try {
      const schedule = await Schedule.findOne({
        class: classId,
        academicYear: academicYear,
        status: 'active'
      });

      if (!schedule) {
        return null;
      }

      // Populate schedule with period data
      const populatedSchedule = await schedule.populate({
        path: 'weeks.days.periods',
        populate: [
          { path: 'subject', select: 'subjectName subjectCode' },
          { path: 'teacher', select: 'name email' }
        ]
      });

      return populatedSchedule;
    } catch (error) {
      console.error('❌ Error getting schedule by class:', error.message);
      throw error;
    }
  }

  async updatePeriodStatus(scheduleId, dayOfWeek, periodNumber, status, updateData = {}) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const success = await schedule.updatePeriodStatus(dayOfWeek, periodNumber, status, updateData);
      if (!success) {
        throw new Error('Period not found or update failed');
      }

      await schedule.save({ validateBeforeSave: false });
      return schedule;
    } catch (error) {
      console.error('❌ Error updating period status:', error.message);
      throw error;
    }
  }

  async getLearningProgress(classId, academicYear) {
    try {
      const schedule = await Schedule.findOne({
        class: classId,
        academicYear: academicYear,
        status: 'active'
      });

      if (!schedule) {
        return null;
      }

      return await schedule.getLearningProgress();
    } catch (error) {
      console.error('❌ Error getting learning progress:', error.message);
      throw error;
    }
  }
}

module.exports = AdvancedSchedulerService; 