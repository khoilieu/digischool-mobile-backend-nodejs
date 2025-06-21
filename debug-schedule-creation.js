const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Class = require('./src/modules/classes/models/class.model');
const Subject = require('./src/modules/subjects/models/subject.model');
const User = require('./src/modules/auth/models/user.model');
const Schedule = require('./src/modules/schedules/models/schedule.model');

async function debugScheduleCreation() {
  try {
    console.log('🔍 DEBUG SCHEDULE CREATION\n');

    // 1. Kiểm tra lớp 12A1
    const classInfo = await Class.findOne({
      className: '12A1',
      academicYear: '2024-2025'
    }).populate('homeroomTeacher').lean();

    console.log('1. Thông tin lớp:');
    console.log(`   - Tên lớp: ${classInfo.className}`);
    console.log(`   - Chủ nhiệm: ${classInfo.homeroomTeacher?.name || 'Chưa có'}`);
    console.log(`   - Grade Level: ${classInfo.gradeLevel || 'Chưa xác định'}`);
    console.log(`   - Raw object:`, JSON.stringify(classInfo, null, 2));

    // 2. Kiểm tra môn học
    const gradeLevel = classInfo.gradeLevel || 12;
    const subjects = await Subject.find({
      gradeLevels: gradeLevel,
      isActive: true
    }).lean();

    console.log(`\n2. Môn học cho cấp lớp ${gradeLevel}:`);
    console.log(`   - Số môn tìm thấy: ${subjects.length}`);
    subjects.forEach(s => {
      console.log(`   - ${s.subjectName} (${s.subjectCode}) - ${s.periodsPerWeek || 3} tiết/tuần`);
    });

    // 3. Kiểm tra giáo viên
    const subjectIds = subjects.map(s => s._id);
    const teachers = await User.find({
      role: { $in: ['teacher', 'homeroom_teacher'] },
      'subject': { $in: subjectIds },
      active: true
    }).populate('subject', 'subjectName subjectCode');

    console.log(`\n3. Giáo viên có thể dạy:`);
    console.log(`   - Số giáo viên tìm thấy: ${teachers.length}`);
    teachers.forEach(t => {
      const subjectName = t.subject ? t.subject.subjectName : 'Không có môn';
      console.log(`   - ${t.name}: ${subjectName}`);
    });

    // 4. Kiểm tra thời khóa biểu hiện tại
    const schedule = await Schedule.findOne({
      class: classInfo._id,
      academicYear: '2024-2025'
    });

    if (schedule) {
      console.log(`\n4. Thời khóa biểu hiện tại:`);
      console.log(`   - Schedule ID: ${schedule._id}`);
      console.log(`   - Status: ${schedule.status}`);
      console.log(`   - Số ngày có lịch: ${schedule.schedule?.length || 0}`);
      
      if (schedule.schedule && schedule.schedule.length > 0) {
        let totalPeriods = 0;
        schedule.schedule.forEach((day, index) => {
          const periodsCount = day.periods?.length || 0;
          totalPeriods += periodsCount;
          console.log(`   - ${day.dayOfWeek} (${['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][index]}): ${periodsCount} tiết`);
        });
        console.log(`   - Tổng số tiết: ${totalPeriods}`);
        
        // Hiển thị chi tiết một vài tiết
        console.log(`\n   Chi tiết một số tiết:`);
        schedule.schedule.forEach((day, dayIndex) => {
          if (day.periods && day.periods.length > 0) {
            console.log(`   ${['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][dayIndex]}:`);
            day.periods.slice(0, 3).forEach(period => {
              console.log(`     - Tiết ${period.periodNumber}: ${period.subject ? 'Có môn học' : 'Không có môn học'} - ${period.teacher ? 'Có giáo viên' : 'Không có giáo viên'}`);
            });
          }
        });
      }
    } else {
      console.log(`\n4. Không tìm thấy thời khóa biểu`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugScheduleCreation(); 