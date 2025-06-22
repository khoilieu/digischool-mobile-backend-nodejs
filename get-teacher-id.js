const mongoose = require('mongoose');
const User = require('./src/modules/auth/models/user.model');

async function getTeacherIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/digital-school', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('🔗 Connected to MongoDB');

    // Get teachers with their subjects
    const teachers = await User.find({ role: 'teacher' })
      .populate('subject', 'subjectName')
      .limit(10)
      .lean();

    console.log(`\n👨‍🏫 Found ${teachers.length} teachers:\n`);

    teachers.forEach((teacher, index) => {
      const subjectName = teacher.subject?.subjectName || 'No subject';
      console.log(`${index + 1}. ${teacher.name}`);
      console.log(`   ID: ${teacher._id}`);
      console.log(`   Subject: ${subjectName}`);
      console.log(`   Email: ${teacher.email}\n`);
    });

    if (teachers.length > 0) {
      const firstTeacher = teachers[0];
      console.log('📋 CURL COMMAND FOR TEACHER SCHEDULE:');
      console.log('='.repeat(60));
      console.log(`curl --location 'http://localhost:3000/api/schedules/teacher?teacherId=${firstTeacher._id}&academicYear=2024-2025&startOfWeek=2024-12-19&endOfWeek=2024-12-25' \\`);
      console.log(`--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDQ3NTYzMCwiZXhwIjoxNzUwNTYyMDMwfQ.mxMBe8OzD7XjHUBP-Oy8FQipSPcNm0CV61e-isxpLwI'`);
      
      console.log(`\n🎯 This will show schedule for: ${firstTeacher.name} (${firstTeacher.subject?.subjectName || 'No subject'})`);
      console.log(`📅 Date range: 2024-12-19 to 2024-12-25`);
      
      console.log(`\n📝 Expected response format:`);
      console.log(`{`);
      console.log(`  "success": true,`);
      console.log(`  "data": {`);
      console.log(`    "teacher": {`);
      console.log(`      "id": "${firstTeacher._id}",`);
      console.log(`      "name": "${firstTeacher.name}",`);
      console.log(`      "subject": "${firstTeacher.subject?.subjectName || 'No subject'}"`);
      console.log(`    },`);
      console.log(`    "dailySchedule": [`);
      console.log(`      {`);
      console.log(`        "date": "2024-12-19",`);
      console.log(`        "dayName": "Thursday",`);
      console.log(`        "classes": [`);
      console.log(`          {`);
      console.log(`            "class": { "name": "12A3" },`);
      console.log(`            "periods": [`);
      console.log(`              {`);
      console.log(`                "periodNumber": 2,`);
      console.log(`                "timeStart": "07:50",`);
      console.log(`                "timeEnd": "08:35",`);
      console.log(`                "subject": { "name": "Mathematics" },`);
      console.log(`                "status": "not_started"`);
      console.log(`              }`);
      console.log(`            ]`);
      console.log(`          }`);
      console.log(`        ]`);
      console.log(`      }`);
      console.log(`    ]`);
      console.log(`  }`);
      console.log(`}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

getTeacherIds(); 