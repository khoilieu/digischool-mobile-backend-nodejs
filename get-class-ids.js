const mongoose = require('mongoose');
const Class = require('./src/modules/classes/models/class.model');

async function getClassIds() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecoschool');
    console.log('🔍 Getting class IDs from database...\n');
    
    // Kiểm tra tất cả classes trước
    const allClasses = await Class.find({}).lean();
    console.log(`📋 Total classes in database: ${allClasses.length}`);
    
    // Thử query trực tiếp collection
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Thử tìm collection classes
    const classesCollection = db.collection('classes');
    const directClasses = await classesCollection.find({}).toArray();
    console.log(`📋 Direct query classes: ${directClasses.length}`);
    
    if (directClasses.length > 0) {
      console.log('Sample direct class:', directClasses[0]);
    }
    
    if (allClasses.length > 0) {
      console.log('Sample class:', allClasses[0]);
    }
    
    // Lấy tất cả classes cho năm học 2024-2025
    const classes = await Class.find({ 
      academicYear: '2024-2025'
    }).lean();
    
    console.log(`📋 Found ${classes.length} classes for 2024-2025:`);
    console.log('==========================================');
    
    classes.forEach(cls => {
      console.log(`Class: ${cls.className}`);
      console.log(`ID: ${cls._id}`);
      console.log(`Grade: ${cls.gradeLevel}`);
      console.log(`Academic Year: ${cls.academicYear}`);
      console.log(`Active: ${cls.active}`);
      console.log('------------------------------------------');
    });
    
    // Lấy riêng lớp 12
    const grade12Classes = classes.filter(cls => cls.gradeLevel === 12);
    console.log(`\n📚 Grade 12 classes (${grade12Classes.length}):`);
    grade12Classes.forEach(cls => {
      console.log(`- ${cls.className}: ${cls._id}`);
    });
    
    // Export ra object để dễ sử dụng
    const classIds = {};
    classes.forEach(cls => {
      classIds[cls.className] = cls._id.toString();
    });
    
    console.log('\n📝 Class IDs object:');
    console.log(JSON.stringify(classIds, null, 2));
    
    await mongoose.disconnect();
    
    return classIds;
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

getClassIds(); 