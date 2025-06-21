const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecoschool', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema (simplified for populate)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: [String]
});

// Class Schema (simplified for fetching)
const classSchema = new mongoose.Schema({
  className: String,
  academicYear: String,
  homeroomTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  active: Boolean
});

const User = mongoose.model('User', userSchema);
const Class = mongoose.model('Class', classSchema);

async function getClasses() {
  try {
    console.log('Fetching classes from database...');
    const classes = await Class.find({ active: true })
      .populate('homeroomTeacher', 'name email')
      .sort({ academicYear: -1, className: 1 });
    
    console.log('\nFound classes:');
    console.log('================');
    if (classes.length === 0) {
      console.log('❌ No classes found in database');
      console.log('Creating sample classes for testing...');
      
      // Create sample classes
      const sampleClasses = [
        { className: '10A1', academicYear: '2024-2025', active: true },
        { className: '10A2', academicYear: '2024-2025', active: true },
        { className: '11A1', academicYear: '2024-2025', active: true },
        { className: '11A2', academicYear: '2024-2025', active: true },
        { className: '12A1', academicYear: '2024-2025', active: true },
        { className: '12A2', academicYear: '2024-2025', active: true }
      ];
      
      console.log('Sample classes that will be used:');
      sampleClasses.forEach(cls => {
        console.log(`- ${cls.className} (${cls.academicYear})`);
      });
      
      return sampleClasses;
    }
    
    classes.forEach(cls => {
      console.log(`ID: ${cls._id}`);
      console.log(`Class: ${cls.className}`);
      console.log(`Academic Year: ${cls.academicYear}`);
      console.log(`Homeroom Teacher: ${cls.homeroomTeacher?.name || 'Not assigned'}`);
      console.log('---');
    });
    
    return classes;
  } catch (error) {
    console.error('Error fetching classes:', error);
    console.log('Using sample classes instead...');
    
    // Return sample classes as fallback
    const sampleClasses = [
      { className: '10A1', academicYear: '2024-2025', active: true },
      { className: '10A2', academicYear: '2024-2025', active: true },
      { className: '11A1', academicYear: '2024-2025', active: true },
      { className: '11A2', academicYear: '2024-2025', active: true },
      { className: '12A1', academicYear: '2024-2025', active: true },
      { className: '12A2', academicYear: '2024-2025', active: true }
    ];
    
    console.log('\nUsing sample classes:');
    sampleClasses.forEach(cls => {
      console.log(`- ${cls.className} (${cls.academicYear})`);
    });
    
    return sampleClasses;
  } finally {
    mongoose.connection.close();
  }
}

getClasses(); 