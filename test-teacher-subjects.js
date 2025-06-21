const mongoose = require('mongoose');
const User = require('./src/modules/auth/models/user.model');
const Subject = require('./src/modules/subjects/models/subject.model');

async function testTeacherSubjects() {
  try {
    // Kết nối database
    await mongoose.connect('mongodb://localhost:27017/ecoschool', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('🔗 Connected to MongoDB');
    
    // Lấy một teacher với subjects được populate
    const teacher = await User.findOne({
      role: { $in: ['teacher', 'homeroom_teacher'] },
      active: true
    }).populate('subjects', 'subjectName subjectCode');
    
    if (!teacher) {
      console.log('❌ No teacher found');
      return;
    }
    
    console.log('\n📊 Teacher Data Structure:');
    console.log('Teacher ID:', teacher._id.toString());
    console.log('Teacher Name:', teacher.name);
    console.log('Subjects type:', typeof teacher.subjects);
    console.log('Subjects is Array:', Array.isArray(teacher.subjects));
    console.log('Subjects length:', teacher.subjects?.length || 0);
    
    if (teacher.subjects && teacher.subjects.length > 0) {
      console.log('\n📚 Subject Details:');
      teacher.subjects.forEach((subject, index) => {
        console.log(`Subject ${index + 1}:`);
        console.log('  - Type:', typeof subject);
        console.log('  - Is ObjectId:', subject instanceof mongoose.Types.ObjectId);
        console.log('  - Has _id:', !!subject._id);
        console.log('  - ID:', subject._id?.toString() || 'N/A');
        console.log('  - Name:', subject.subjectName || 'N/A');
        console.log('  - Code:', subject.subjectCode || 'N/A');
        console.log('  - Full object:', JSON.stringify(subject, null, 2));
      });
    }
    
    // Lấy một subject để test matching
    const testSubject = await Subject.findOne();
    if (testSubject) {
      console.log('\n🔍 Testing Subject Matching:');
      console.log('Test Subject ID:', testSubject._id.toString());
      console.log('Test Subject Name:', testSubject.subjectName);
      
      const canTeach = teacher.subjects.some(s => {
        if (!s) return false;
        
        // Nếu s là ObjectId (chưa populate)
        if (typeof s === 'string' || s instanceof mongoose.Types.ObjectId) {
          const match = s.toString() === testSubject._id.toString();
          console.log(`  - ObjectId match: ${s.toString()} === ${testSubject._id.toString()} = ${match}`);
          return match;
        }
        
        // Nếu s là object đã populate
        if (s._id) {
          const match = s._id.toString() === testSubject._id.toString();
          console.log(`  - Object match: ${s._id.toString()} === ${testSubject._id.toString()} = ${match}`);
          return match;
        }
        
        return false;
      });
      
      console.log('Can teach result:', canTeach);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testTeacherSubjects(); 