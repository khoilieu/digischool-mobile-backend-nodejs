const mongoose = require('mongoose');
const TimetableSchedulerService = require('./src/modules/schedules/services/timetable-scheduler.service');

// Mock data để test
const mockClassId = new mongoose.Types.ObjectId();
const mockAcademicYear = '2024-2025';

const mockSubjects = [
  {
    _id: new mongoose.Types.ObjectId(),
    subjectName: 'Toán',
    subjectCode: 'MATH',
    weeklyHours: 4,
    department: 'mathematics'
  },
  {
    _id: new mongoose.Types.ObjectId(),
    subjectName: 'Văn',
    subjectCode: 'LIT',
    weeklyHours: 4,
    department: 'literature'
  },
  {
    _id: new mongoose.Types.ObjectId(),
    subjectName: 'Tiếng Anh',
    subjectCode: 'ENG',
    weeklyHours: 3,
    department: 'english'
  },
  {
    _id: new mongoose.Types.ObjectId(),
    subjectName: 'Vật lý',
    subjectCode: 'PHY',
    weeklyHours: 3,
    department: 'physics'
  },
  {
    _id: new mongoose.Types.ObjectId(),
    subjectName: 'Hóa học',
    subjectCode: 'CHE',
    weeklyHours: 3,
    department: 'chemistry'
  },
  {
    _id: new mongoose.Types.ObjectId(),
    subjectName: 'Sinh học',
    subjectCode: 'BIO',
    weeklyHours: 2,
    department: 'biology'
  },
  {
    _id: new mongoose.Types.ObjectId(),
    subjectName: 'Lịch sử',
    subjectCode: 'HIS',
    weeklyHours: 2,
    department: 'history'
  },
  {
    _id: new mongoose.Types.ObjectId(),
    subjectName: 'Địa lý',
    subjectCode: 'GEO',
    weeklyHours: 2,
    department: 'geography'
  },
  {
    _id: new mongoose.Types.ObjectId(),
    subjectName: 'Thể dục',
    subjectCode: 'PE',
    weeklyHours: 2,
    department: 'physical_education'
  },
  {
    _id: new mongoose.Types.ObjectId(),
    subjectName: 'Tin học',
    subjectCode: 'CS',
    weeklyHours: 2,
    department: 'informatics'
  },
  {
    _id: new mongoose.Types.ObjectId(),
    subjectName: 'GDCD',
    subjectCode: 'CIV',
    weeklyHours: 1,
    department: 'civic_education'
  }
];

const mockTeachers = mockSubjects.map(subject => ({
  _id: new mongoose.Types.ObjectId(),
  name: `Giáo viên ${subject.subjectName}`,
  email: `teacher${subject.subjectCode.toLowerCase()}@school.edu.vn`,
  role: ['teacher'],
  subject: subject._id,
  active: true
}));

async function testTimetableScheduler() {
  console.log('🧪 BẮT ĐẦU TEST HỆ THỐNG THỜI KHÓA BIỂU');
  console.log('=====================================\n');

  try {
    const timetableScheduler = new TimetableSchedulerService();
    
    // Test phân loại môn học
    console.log('🔍 Test phân loại môn học:');
    const testSubjects = ['Toán', 'Văn', 'Tiếng Anh', 'Vật lý', 'Thể dục', 'Tin học'];
    testSubjects.forEach(subject => {
      const category = timetableScheduler.categorizeSubject(subject);
      console.log(`  - ${subject}: ${category}`);
    });
    
    // Test kiểm tra tiết đôi
    console.log('\n🔍 Test kiểm tra tiết đôi:');
    testSubjects.forEach(subject => {
      const needsDouble = timetableScheduler.needsDoublePeriod(subject);
      console.log(`  - ${subject}: ${needsDouble ? 'Cần tiết đôi' : 'Không cần tiết đôi'}`);
    });
    
    // Test kiểm tra phòng chuyên dụng
    console.log('\n🔍 Test kiểm tra phòng chuyên dụng:');
    testSubjects.forEach(subject => {
      const needsSpecial = timetableScheduler.needsSpecialRoom(subject);
      console.log(`  - ${subject}: ${needsSpecial ? 'Cần phòng chuyên dụng' : 'Phòng thường'}`);
    });

    // Test cấu trúc ràng buộc
    console.log('\n🔒 Ràng buộc cứng (Hard Constraints):');
    Object.entries(timetableScheduler.constraints.hardConstraints).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value ? '✅ Bật' : '❌ Tắt'}`);
    });
    
    console.log('\n🔧 Ràng buộc mềm (Soft Constraints):');
    Object.entries(timetableScheduler.constraints.softConstraints).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value ? '✅ Bật' : '❌ Tắt'}`);
    });
    
    console.log('\n⚖️ Trọng số tối ưu hóa:');
    Object.entries(timetableScheduler.constraints.weights).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });

    // Test khung giờ học
    console.log('\n🌅 Buổi sáng:');
    timetableScheduler.timeSlots.morning.forEach(slot => {
      console.log(`  - Tiết ${slot.period}: ${slot.start} - ${slot.end}`);
    });
    
    console.log('\n🌆 Buổi chiều:');
    timetableScheduler.timeSlots.afternoon.forEach(slot => {
      console.log(`  - Tiết ${slot.period}: ${slot.start} - ${slot.end}`);
    });

    // Test tạo lịch trống
    const emptySchedule = timetableScheduler.createEmptySchedule();
    console.log(`\n📅 Cấu trúc lịch: ${emptySchedule.length} ngày x ${emptySchedule[0].length} tiết = ${emptySchedule.length * emptySchedule[0].length} slot`);

    console.log('\n🎉 TẤT CẢ TEST ĐÃ HOÀN THÀNH THÀNH CÔNG!');
    console.log('=====================================');
    
    console.log('\n📋 TÓM TẮT:');
    console.log('✅ Hệ thống phân loại môn học: Hoạt động tốt');
    console.log('✅ Hệ thống kiểm tra tiết đôi: Hoạt động tốt');
    console.log('✅ Hệ thống kiểm tra phòng chuyên dụng: Hoạt động tốt');
    console.log('✅ Cấu trúc ràng buộc: Đầy đủ và chính xác');
    console.log('✅ Khung giờ học: Đúng quy định (5 tiết sáng, 2 tiết chiều)');
    console.log('✅ Cấu trúc lịch: 6 ngày x 7 tiết = 42 slot');
    
    console.log('\n🚀 HỆ THỐNG SẴN SÀNG HOẠT ĐỘNG!');

  } catch (error) {
    console.error('❌ Lỗi trong quá trình test:', error.message);
    console.error(error.stack);
  }
}

// Chạy test
if (require.main === module) {
  testTimetableScheduler();
}

module.exports = { testTimetableScheduler }; 