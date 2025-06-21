const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecoschool', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Subject Schema (simplified for fetching)
const subjectSchema = new mongoose.Schema({
  subjectName: String,
  subjectCode: String,
  department: String,
  gradeLevels: [Number],
  weeklyHours: Number,
  category: String
});

const Subject = mongoose.model('Subject', subjectSchema);

async function getSubjects() {
  try {
    console.log('Fetching subjects from database...');
    const subjects = await Subject.find({}).sort({ subjectName: 1 });
    
    console.log('\nFound subjects:');
    console.log('================');
    subjects.forEach(subject => {
      console.log(`ID: ${subject._id}`);
      console.log(`Name: ${subject.subjectName}`);
      console.log(`Code: ${subject.subjectCode}`);
      console.log(`Department: ${subject.department}`);
      console.log('---');
    });
    
    return subjects;
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return [];
  } finally {
    mongoose.connection.close();
  }
}

getSubjects(); 