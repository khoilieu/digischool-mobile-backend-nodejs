const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Schedule = require('./src/modules/schedules/models/schedule.model');
const Class = require('./src/modules/classes/models/class.model');

async function deleteOldSchedulesGrade12() {
  try {
    console.log('🗑️ XÓA THỜI KHÓA BIỂU CŨ KHỐI 12\n');

    // Lấy tất cả lớp khối 12
    const classes = await Class.find({
      className: /^12/,
      academicYear: '2024-2025'
    });

    console.log(`📚 Tìm thấy ${classes.length} lớp khối 12:`);
    classes.forEach(c => console.log(`  - ${c.className}`));

    // Xóa tất cả schedules của khối 12
    const classIds = classes.map(c => c._id);
    const deleteResult = await Schedule.deleteMany({
      class: { $in: classIds },
      academicYear: '2024-2025'
    });

    console.log(`\n✅ Đã xóa ${deleteResult.deletedCount} thời khóa biểu cũ`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

deleteOldSchedulesGrade12(); 