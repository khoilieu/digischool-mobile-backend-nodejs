const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function checkTeacherSubjects() {
  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'manager@ecoschool.com',
      password: 'manager123'
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed');
      return;
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');

    // Get all users (including teachers)
    console.log('\n🔍 Checking all users and their subjects...');
    try {
      const usersResponse = await axios.get(`${BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          limit: 50
        }
      });

      if (usersResponse.data.success) {
        const users = usersResponse.data.data.users || [];
        console.log(`👥 Found ${users.length} users:`);
        
        const teachers = users.filter(u => u.role.includes('teacher') || u.role.includes('homeroom_teacher'));
        const students = users.filter(u => u.role.includes('student'));
        const managers = users.filter(u => u.role.includes('manager'));

        console.log(`\n📊 User breakdown:`);
        console.log(`   Teachers: ${teachers.length}`);
        console.log(`   Students: ${students.length}`);
        console.log(`   Managers: ${managers.length}`);

        console.log(`\n👨‍🏫 Teachers and their subjects:`);
        teachers.forEach(teacher => {
          const subjectInfo = teacher.subject ? 
            (typeof teacher.subject === 'object' ? teacher.subject.subjectName : teacher.subject) :
            'No subject assigned';
          console.log(`   ${teacher.name} (${teacher.email}) - ${subjectInfo}`);
        });

        // Check for teachers without subjects
        const teachersWithoutSubjects = teachers.filter(t => !t.subject);
        if (teachersWithoutSubjects.length > 0) {
          console.log(`\n⚠️ Teachers without subjects (${teachersWithoutSubjects.length}):`);
          teachersWithoutSubjects.forEach(teacher => {
            console.log(`   ${teacher.name} (${teacher.email})`);
          });
        }

      } else {
        console.log('❌ Could not get users');
      }
    } catch (error) {
      console.error('❌ Error getting users:', error.response?.data?.message || error.message);
    }

    // Also check subjects
    console.log('\n📚 Checking available subjects...');
    try {
      const subjectsResponse = await axios.get(`${BASE_URL}/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          limit: 50
        }
      });

      if (subjectsResponse.data.success) {
        const subjects = subjectsResponse.data.data.subjects || [];
        console.log(`📖 Found ${subjects.length} subjects:`);
        
        subjects.forEach(subject => {
          console.log(`   ${subject.subjectName} (${subject.subjectCode}) - Grade ${subject.gradeLevels?.join(', ') || 'N/A'} - ${subject.weeklyHours || 0} hours/week`);
        });

        // Check grade 12 subjects specifically
        const grade12Subjects = subjects.filter(s => s.gradeLevels && s.gradeLevels.includes(12));
        console.log(`\n🎯 Grade 12 subjects (${grade12Subjects.length}):`);
        grade12Subjects.forEach(subject => {
          console.log(`   ${subject.subjectName} - ${subject.weeklyHours || 0} hours/week`);
        });

      } else {
        console.log('❌ Could not get subjects');
      }
    } catch (error) {
      console.error('❌ Error getting subjects:', error.response?.data?.message || error.message);
    }

    // Check classes
    console.log('\n🏫 Checking classes...');
    try {
      const classesResponse = await axios.get(`${BASE_URL}/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          limit: 20
        }
      });

      if (classesResponse.data.success) {
        const classes = classesResponse.data.data.classes || [];
        console.log(`🏛️ Found ${classes.length} classes:`);
        
        classes.forEach(cls => {
          const homeroomTeacher = cls.homeroomTeacher ? 
            (typeof cls.homeroomTeacher === 'object' ? cls.homeroomTeacher.name : cls.homeroomTeacher) :
            'No homeroom teacher';
          console.log(`   ${cls.className} (Grade ${cls.gradeLevel}) - GVCN: ${homeroomTeacher}`);
        });

      } else {
        console.log('❌ Could not get classes');
      }
    } catch (error) {
      console.error('❌ Error getting classes:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

checkTeacherSubjects(); 