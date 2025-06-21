const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Subject = require('./src/modules/subjects/models/subject.model');
const User = require('./src/modules/auth/models/user.model');

async function debugTeachers() {
  try {
    console.log('🔍 DEBUG TEACHERS\n');

    // 1. Lấy tất cả môn học khối 12
    const subjects = await Subject.find({
      gradeLevels: 12,
      isActive: true
    }).lean();

    console.log(`1. Môn học khối 12: ${subjects.length} môn`);
    const subjectIds = subjects.map(s => s._id);
    console.log(`   Subject IDs: ${subjectIds.map(id => id.toString()).join(', ')}`);

    // 2. Kiểm tra tất cả giáo viên
    const allTeachers = await User.find({
      role: { $in: ['teacher', 'homeroom_teacher'] },
      active: true
    }).populate('subjects', 'subjectName subjectCode');

    console.log(`\n2. Tất cả giáo viên active: ${allTeachers.length}`);
    allTeachers.forEach(t => {
      const subjectNames = t.subjects?.map(s => s.subjectName).join(', ') || 'Không có môn';
      console.log(`   - ${t.name} (${t.role}): ${subjectNames}`);
    });

    // 3. Kiểm tra giáo viên có subjects field
    const teachersWithSubjects = await User.find({
      role: { $in: ['teacher', 'homeroom_teacher'] },
      subjects: { $exists: true, $ne: [] },
      active: true
    }).populate('subjects', 'subjectName subjectCode');

    console.log(`\n3. Giáo viên có subjects field: ${teachersWithSubjects.length}`);
    teachersWithSubjects.forEach(t => {
      const subjectNames = t.subjects?.map(s => s.subjectName).join(', ') || 'Không có môn';
      console.log(`   - ${t.name}: ${subjectNames}`);
    });

    // 4. Kiểm tra query cụ thể
    const teachersForGrade12 = await User.find({
      role: { $in: ['teacher', 'homeroom_teacher'] },
      'subjects': { $in: subjectIds },
      active: true
    }).populate('subjects', 'subjectName subjectCode');

    console.log(`\n4. Giáo viên có thể dạy khối 12: ${teachersForGrade12.length}`);
    teachersForGrade12.forEach(t => {
      const subjectNames = t.subjects?.map(s => s.subjectName).join(', ') || 'Không có môn';
      console.log(`   - ${t.name}: ${subjectNames}`);
    });

    // 5. Kiểm tra schema của User
    const sampleUser = await User.findOne({ role: 'teacher' });
    if (sampleUser) {
      console.log(`\n5. Schema mẫu của User:`);
      console.log(`   - _id: ${sampleUser._id}`);
      console.log(`   - name: ${sampleUser.name}`);
      console.log(`   - role: ${sampleUser.role}`);
      console.log(`   - subjects: ${sampleUser.subjects}`);
      console.log(`   - subject: ${sampleUser.subject}`);
      console.log(`   - active: ${sampleUser.active}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugTeachers(); 