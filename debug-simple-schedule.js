const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const AdvancedSchedulerService = require('./src/modules/schedules/services/advanced-scheduler.service');
const Class = require('./src/modules/classes/models/class.model');

async function debugSimpleSchedule() {
  try {
    console.log('🔍 DEBUG SIMPLE SCHEDULE CREATION\n');

    // Lấy lớp 12A1
    const classInfo = await Class.findOne({
      className: '12A1',
      academicYear: '2024-2025'
    });

    if (!classInfo) {
      throw new Error('Không tìm thấy lớp 12A1');
    }

    console.log(`📚 Test tạo thời khóa biểu cho lớp: ${classInfo.className}`);

    // Tạo scheduler
    const scheduler = new AdvancedSchedulerService();

    // Test tạo thời khóa biểu
    console.log('🚀 Bắt đầu tạo thời khóa biểu...');
    
    const schedule = await scheduler.createOptimizedSchedule(
      classInfo._id, 
      '2024-2025'
    );

    console.log('✅ Thành công! Schedule ID:', schedule._id);
    console.log('📊 Tổng số tiết:', schedule.getTotalScheduledPeriods ? schedule.getTotalScheduledPeriods() : 'Không xác định');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugSimpleSchedule(); 