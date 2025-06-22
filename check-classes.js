const mongoose = require('mongoose');
const Class = require('./src/modules/classes/models/class.model');

async function checkClasses() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecoschool');
    console.log('🔍 Checking classes in database...\n');
    
    const classes = await Class.find({}).lean();
    console.log(`Found ${classes.length} classes:`);
    
    classes.forEach(cls => {
      console.log(`- ${cls.className} | Year: ${cls.academicYear} | Active: ${cls.isActive}`);
    });
    
    // Check specific year
    const classes2024 = await Class.find({ academicYear: '2024-2025' }).lean();
    console.log(`\nClasses for 2024-2025: ${classes2024.length}`);
    
    // Check grade 12
    const grade12Classes = await Class.find({ 
      academicYear: '2024-2025', 
      gradeLevel: 12 
    }).lean();
    console.log(`Grade 12 classes for 2024-2025: ${grade12Classes.length}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

checkClasses(); 