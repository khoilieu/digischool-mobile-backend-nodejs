const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const AdvancedSchedulerService = require('./src/modules/schedules/services/advanced-scheduler.service');
const Class = require('./src/modules/classes/models/class.model');
const Schedule = require('./src/modules/schedules/models/schedule.model');

async function testInitializeGrade12() {
  try {
    console.log('🚀 TEST INITIALIZE GRADE 12 SCHEDULES\n');

    // Xóa thời khóa biểu cũ
    const deleteResult = await Schedule.deleteMany({
      academicYear: '2024-2025',
      semester: 1
    });
    console.log(`🗑️ Đã xóa ${deleteResult.deletedCount} thời khóa biểu cũ\n`);

    // Lấy tất cả lớp khối 12
    const grade12Classes = await Class.find({
      gradeLevel: 12,
      academicYear: '2024-2025'
    }).sort({ className: 1 });

    console.log(`📚 Tìm thấy ${grade12Classes.length} lớp khối 12:`);
    grade12Classes.forEach(cls => {
      console.log(`  - ${cls.className}`);
    });
    console.log('');

    // Tạo scheduler và reset teacher schedules
    const scheduler = new AdvancedSchedulerService();
    scheduler.teacherAssignment.resetTeacherSchedules();
    console.log('🔄 Đã reset teacher schedules\n');

    // Tạo thời khóa biểu cho từng lớp
    const results = [];
    for (const classInfo of grade12Classes) {
      console.log(`🚀 Processing class: ${classInfo.className}`);
      
      try {
        const schedule = await scheduler.createOptimizedSchedule(
          classInfo._id, 
          '2024-2025'
        );
        
        results.push({
          className: classInfo.className,
          scheduleId: schedule._id,
          status: 'success',
          totalPeriods: schedule.getTotalScheduledPeriods ? schedule.getTotalScheduledPeriods() : 'N/A'
        });
        
        console.log(`✅ Created schedule for ${classInfo.className}\n`);
        
      } catch (error) {
        console.error(`❌ Failed to create schedule for ${classInfo.className}: ${error.message}`);
        results.push({
          className: classInfo.className,
          status: 'failed',
          error: error.message
        });
      }
    }

    // Báo cáo kết quả
    console.log('\n📊 SUMMARY REPORT:');
    console.log('='.repeat(50));
    results.forEach(result => {
      if (result.status === 'success') {
        console.log(`✅ ${result.className}: ${result.totalPeriods} periods`);
      } else {
        console.log(`❌ ${result.className}: ${result.error}`);
      }
    });

    const successCount = results.filter(r => r.status === 'success').length;
    console.log(`\n🎯 Successfully created ${successCount}/${results.length} schedules`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testInitializeGrade12(); 