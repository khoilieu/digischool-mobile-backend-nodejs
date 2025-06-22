const mongoose = require('mongoose');
const Class = require('./src/modules/classes/models/class.model');
const User = require('./src/modules/auth/models/user.model');

async function createTestClasses() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecoschool');
    console.log('🔍 Creating test classes for 2024-2025...\n');
    
    // Tìm một teacher để làm homeroom teacher
    const teacher = await User.findOne({ role: { $in: ['teacher'] } });
    if (!teacher) {
      console.log('❌ No teacher found, creating test classes without homeroom teacher');
    }
    
    // Tạo lớp 12
    const grade12Classes = [
      { className: '12A1', gradeLevel: 12 },
      { className: '12A2', gradeLevel: 12 },
      { className: '12A3', gradeLevel: 12 },
      { className: '12A4', gradeLevel: 12 }
    ];
    
    for (const classData of grade12Classes) {
      // Check if class already exists
      const existingClass = await Class.findOne({
        className: classData.className,
        academicYear: '2024-2025'
      });
      
      if (existingClass) {
        console.log(`⏭️ Class ${classData.className} already exists`);
        continue;
      }
      
      const newClass = new Class({
        className: classData.className,
        gradeLevel: classData.gradeLevel,
        academicYear: '2024-2025',
        capacity: 35,
        currentStudents: 0,
        homeroomTeacher: teacher?._id,
        isActive: true,
        description: `Grade ${classData.gradeLevel} class for academic year 2024-2025`
      });
      
      await newClass.save();
      console.log(`✅ Created class: ${classData.className}`);
    }
    
    // Tạo thêm một số lớp khác
    const otherClasses = [
      { className: '11A1', gradeLevel: 11 },
      { className: '11A2', gradeLevel: 11 },
      { className: '10A1', gradeLevel: 10 },
      { className: '10A2', gradeLevel: 10 }
    ];
    
    for (const classData of otherClasses) {
      const existingClass = await Class.findOne({
        className: classData.className,
        academicYear: '2024-2025'
      });
      
      if (existingClass) {
        console.log(`⏭️ Class ${classData.className} already exists`);
        continue;
      }
      
      const newClass = new Class({
        className: classData.className,
        gradeLevel: classData.gradeLevel,
        academicYear: '2024-2025',
        capacity: 35,
        currentStudents: 0,
        homeroomTeacher: teacher?._id,
        isActive: true,
        description: `Grade ${classData.gradeLevel} class for academic year 2024-2025`
      });
      
      await newClass.save();
      console.log(`✅ Created class: ${classData.className}`);
    }
    
    // Kiểm tra lại
    const allClasses = await Class.find({ academicYear: '2024-2025' }).lean();
    console.log(`\n📊 Total classes created for 2024-2025: ${allClasses.length}`);
    
    const grade12Count = await Class.countDocuments({ 
      academicYear: '2024-2025', 
      gradeLevel: 12 
    });
    console.log(`📊 Grade 12 classes: ${grade12Count}`);
    
    await mongoose.disconnect();
    console.log('\n🎉 Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

createTestClasses(); 