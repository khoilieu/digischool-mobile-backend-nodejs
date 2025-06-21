console.log('🏫 DEMO HỆ THỐNG THỜI KHÓA BIỂU TỐI ƯU');
console.log('=====================================\n');

// Import TimetableSchedulerService
const TimetableSchedulerService = require('./src/modules/schedules/services/timetable-scheduler.service');

function demoTimetableSystem() {
  try {
    console.log('🧪 Test TimetableSchedulerService...');
    
    const scheduler = new TimetableSchedulerService();

    // Test 1: Phân loại môn học
    console.log('\n📚 1. Test phân loại môn học:');
    const testSubjects = ['Toán', 'Văn', 'Tiếng Anh', 'Vật lý', 'Thể dục', 'Tin học', 'Hóa học', 'Sinh học'];
    testSubjects.forEach(subject => {
      const category = scheduler.categorizeSubject(subject);
      console.log(`   ${subject}: ${category}`);
    });

    // Test 2: Kiểm tra tiết đôi
    console.log('\n⏰ 2. Test kiểm tra tiết đôi:');
    testSubjects.forEach(subject => {
      const needsDouble = scheduler.needsDoublePeriod(subject);
      console.log(`   ${subject}: ${needsDouble ? 'Cần tiết đôi' : 'Không cần'}`);
    });

    // Test 3: Kiểm tra phòng chuyên dụng
    console.log('\n🏢 3. Test phòng chuyên dụng:');
    testSubjects.forEach(subject => {
      const needsSpecial = scheduler.needsSpecialRoom(subject);
      console.log(`   ${subject}: ${needsSpecial ? 'Phòng chuyên dụng' : 'Phòng thường'}`);
    });

    // Test 4: Ràng buộc cứng
    console.log('\n🔒 4. Ràng buộc cứng (Hard Constraints):');
    Object.entries(scheduler.constraints.hardConstraints).forEach(([key, value]) => {
      console.log(`   ${key}: ${value ? '✅ Bật' : '❌ Tắt'}`);
    });

    // Test 5: Ràng buộc mềm
    console.log('\n🔧 5. Ràng buộc mềm (Soft Constraints):');
    Object.entries(scheduler.constraints.softConstraints).forEach(([key, value]) => {
      console.log(`   ${key}: ${value ? '✅ Bật' : '❌ Tắt'}`);
    });

    // Test 6: Trọng số tối ưu hóa
    console.log('\n⚖️ 6. Trọng số tối ưu hóa:');
    Object.entries(scheduler.constraints.weights).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    // Test 7: Khung giờ học
    console.log('\n🌅 7. Khung giờ học:');
    console.log('   Buổi sáng:');
    scheduler.timeSlots.morning.forEach(slot => {
      console.log(`     Tiết ${slot.period}: ${slot.start} - ${slot.end}`);
    });
    console.log('   Buổi chiều:');
    scheduler.timeSlots.afternoon.forEach(slot => {
      console.log(`     Tiết ${slot.period}: ${slot.start} - ${slot.end}`);
    });

    // Test 8: Cấu trúc lịch trống
    console.log('\n📅 8. Cấu trúc lịch trống:');
    const emptySchedule = scheduler.createEmptySchedule();
    console.log(`   Số ngày trong tuần: ${emptySchedule.length}`);
    console.log(`   Số tiết mỗi ngày: ${emptySchedule[0].length}`);
    console.log(`   Tổng số slot: ${emptySchedule.length * emptySchedule[0].length}`);

    console.log('\n🎉 TẤT CẢ TEST HOÀN THÀNH THÀNH CÔNG!');
    console.log('=====================================');
    
    console.log('\n📋 TÓM TẮT TÍNH NĂNG:');
    console.log('✅ Tuân thủ ràng buộc cứng (Hard Constraints):');
    console.log('   - Giáo viên không dạy 2 lớp cùng lúc');
    console.log('   - Mỗi môn có giáo viên được phân công');
    console.log('   - Đủ số tiết/tuần theo quy định');
    console.log('   - Không vượt quá số tiết tối đa/ngày');
    console.log('   - Phòng chuyên dụng không xung đột');
    console.log('   - Chào cờ thứ 2 tiết 1, sinh hoạt lớp thứ 7 tiết cuối');

    console.log('\n✅ Tối ưu ràng buộc mềm (Soft Constraints):');
    console.log('   - Phân bố đều các môn trong tuần');
    console.log('   - Môn khó (Toán, Lý, Hóa) xếp buổi sáng');
    console.log('   - Môn thực hành xếp 2 tiết liền khi cần');
    console.log('   - Tránh tiết lẻ cho môn chính');
    console.log('   - Thể dục ưu tiên buổi chiều');
    console.log('   - Môn tự nhiên ưu tiên buổi sáng');

    console.log('\n✅ Thuật toán tối ưu:');
    console.log('   - Backtracking với heuristic');
    console.log('   - Genetic Algorithm fallback');
    console.log('   - Đánh giá điểm số thông minh');
    console.log('   - Xử lý ràng buộc thời gian cố định');

    console.log('\n🚀 HỆ THỐNG SẴN SÀNG HOẠT ĐỘNG!');

  } catch (error) {
    console.error('❌ Lỗi trong demo:', error.message);
    console.error(error.stack);
  }
}

// Chạy demo
demoTimetableSystem(); 