const mongoose = require('mongoose');
const Schedule = require('./src/modules/schedules/models/schedule.model');
const Class = require('./src/modules/classes/models/class.model');
const Subject = require('./src/modules/subjects/models/subject.model');
const User = require('./src/modules/auth/models/user.model');
const ScheduleService = require('./src/modules/schedules/services/schedule.service');

// Kết nối database
mongoose.connect('mongodb://localhost:27017/ecoschool', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createCorrectSchedule() {
  try {
    console.log('🔄 TẠO THỜI KHÓA BIỂU VỚI LOGIC PHÂN CÔNG GIÁO VIÊN ĐÚNG\n');

    // 1. Tìm lớp 12A3
    console.log('🔍 Đang tìm lớp 12A3...');
    
    // Debug: Xem tất cả lớp có sẵn
    const allClasses = await Class.find({}).select('className academicYear');
    console.log('📋 Tất cả lớp có sẵn:');
    allClasses.forEach(cls => {
      console.log(`   - ${cls.className} (${cls.academicYear})`);
    });
    
    const classInfo = await Class.findOne({
      className: '12A3',
      academicYear: '2024-2025'
    }).populate('homeroomTeacher');

    if (!classInfo) {
      throw new Error('Không tìm thấy lớp 12A3');
    }

    console.log(`📚 Lớp: ${classInfo.className}`);
    console.log(`👨‍🏫 Chủ nhiệm: ${classInfo.homeroomTeacher?.name || 'Chưa có'}`);

    // 2. Xóa schedule cũ nếu có
    await Schedule.deleteMany({
      class: classInfo._id,
      academicYear: '2024-2025'
    });
    console.log('🗑️ Đã xóa thời khóa biểu cũ');

    // 3. Lấy môn học cho lớp 12
    const subjects = await Subject.find({
      gradeLevels: 12,
      isActive: true
    });

    console.log(`📖 Tìm thấy ${subjects.length} môn học:`);
    subjects.forEach(subject => {
      console.log(`   - ${subject.subjectName} (${subject.periodsPerWeek} tiết/tuần)`);
    });

    // 4. Lấy giáo viên
    const teachers = await User.find({
      role: 'teacher',
      active: true
    }).populate('subjects');

    console.log(`👥 Tìm thấy ${teachers.length} giáo viên`);

    // 5. Tạo thời khóa biểu mới
    const scheduleService = new ScheduleService();
    
    const newSchedule = await scheduleService.createScheduleForClass(
      classInfo._id,
      '2024-2025',
      1,
      subjects,
      teachers,
      classInfo.homeroomTeacher._id
    );

    console.log('✅ Tạo thời khóa biểu thành công!');
    console.log(`   Schedule ID: ${newSchedule._id}`);
    console.log(`   Tổng số tiết: ${newSchedule.getTotalScheduledPeriods()}`);

    // 6. Phân tích kết quả
    console.log('\n📊 PHÂN TÍCH PHÂN CÔNG GIÁO VIÊN:');
    
    const subjectTeacherMap = new Map();
    const teacherSubjectCount = new Map();
    
    // Populate để lấy thông tin chi tiết
    await newSchedule.populate([
      { path: 'schedule.periods.subject', select: 'subjectName subjectCode' },
      { path: 'schedule.periods.teacher', select: 'name email' }
    ]);

    newSchedule.schedule.forEach(day => {
      day.periods.forEach(period => {
        if (period.subject && period.teacher) {
          const subjectName = period.subject.subjectName;
          const teacherName = period.teacher.name;
          
          // Map môn học -> giáo viên
          if (!subjectTeacherMap.has(subjectName)) {
            subjectTeacherMap.set(subjectName, new Set());
          }
          subjectTeacherMap.get(subjectName).add(teacherName);
          
          // Map giáo viên -> môn học
          if (!teacherSubjectCount.has(teacherName)) {
            teacherSubjectCount.set(teacherName, new Set());
          }
          teacherSubjectCount.get(teacherName).add(subjectName);
        }
      });
    });

    console.log('\nMôn học và giáo viên dạy:');
    subjectTeacherMap.forEach((teachers, subject) => {
      const teacherList = Array.from(teachers);
      const status = teacherList.length > 1 ? '❌ SAI - Nhiều giáo viên' : '✅ ĐÚNG';
      console.log(`   ${subject}: ${teacherList.join(', ')} ${status}`);
    });

    console.log('\nSố môn mỗi giáo viên dạy:');
    teacherSubjectCount.forEach((subjects, teacher) => {
      const subjectList = Array.from(subjects);
      console.log(`   ${teacher}: ${subjectList.length} môn (${subjectList.join(', ')})`);
    });

    // 7. Kiểm tra chủ nhiệm
    const homeroomTeacher = classInfo.homeroomTeacher?.name;
    if (homeroomTeacher && teacherSubjectCount.has(homeroomTeacher)) {
      const homeroomSubjects = Array.from(teacherSubjectCount.get(homeroomTeacher));
      console.log(`\n⭐ Giáo viên chủ nhiệm ${homeroomTeacher} dạy: ${homeroomSubjects.join(', ')}`);
    }

    console.log('\n🎉 HOÀN THÀNH!');

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

createCorrectSchedule(); 