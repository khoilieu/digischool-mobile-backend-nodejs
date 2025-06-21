const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Class = require('./src/modules/classes/models/class.model');

async function fixGradeLevel() {
  try {
    console.log('🔧 SỬA GRADE LEVEL CHO CÁC LỚP\n');

    // Cập nhật grade level cho tất cả lớp
    const classes = await Class.find({
      academicYear: '2024-2025'
    });

    console.log(`📚 Tìm thấy ${classes.length} lớp:`);
    
    for (const classInfo of classes) {
      const gradeLevel = parseInt(classInfo.className.match(/\d+/)[0]);
      
      await Class.updateOne(
        { _id: classInfo._id },
        { $set: { gradeLevel: gradeLevel } }
      );
      
      console.log(`✅ ${classInfo.className} -> Grade Level: ${gradeLevel}`);
    }

    console.log(`\n✅ Đã cập nhật grade level cho ${classes.length} lớp`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

fixGradeLevel(); 