const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function verifyTeacherSubjects() {
  try {
    // Login
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

    // Get users
    console.log('\n👨‍🏫 Getting users...');
    const usersResponse = await axios.get(`${BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        limit: 50
      }
    });

    if (!usersResponse.data.success) {
      console.error('❌ Could not get users');
      return;
    }

    const users = usersResponse.data.data.users || [];
    const teachers = users.filter(u => u.role.includes('teacher') || u.role.includes('homeroom_teacher'));
    const teachersWithSubjects = teachers.filter(t => t.subject);

    console.log(`📊 Results:`);
    console.log(`   Total users: ${users.length}`);
    console.log(`   Total teachers: ${teachers.length}`);
    console.log(`   Teachers with subjects: ${teachersWithSubjects.length}`);
    console.log(`   Teachers without subjects: ${teachers.length - teachersWithSubjects.length}`);

    if (teachersWithSubjects.length > 0) {
      console.log(`\n✅ Teachers with subjects (showing first 10):`);
      teachersWithSubjects.slice(0, 10).forEach(teacher => {
        console.log(`   ${teacher.name} -> Subject ID: ${teacher.subject}`);
      });
    }

    if (teachers.length - teachersWithSubjects.length > 0) {
      console.log(`\n⚠️ Teachers without subjects (showing first 10):`);
      teachers.filter(t => !t.subject).slice(0, 10).forEach(teacher => {
        console.log(`   ${teacher.name} (${teacher.email})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

verifyTeacherSubjects(); 