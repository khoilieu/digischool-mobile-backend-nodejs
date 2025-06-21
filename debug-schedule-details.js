const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function debugScheduleDetails() {
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

    // Get first schedule details
    const scheduleId = '6856355d3adb51c3c23a9f93'; // From previous test
    
    console.log(`🔍 Getting schedule details for ${scheduleId}...`);
    try {
      const scheduleResponse = await axios.get(`${BASE_URL}/schedules/${scheduleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (scheduleResponse.data.success) {
        const schedule = scheduleResponse.data.data;
        console.log('\n📊 Schedule Details:');
        console.log(`   Class: ${schedule.className || 'N/A'}`);
        console.log(`   Academic Year: ${schedule.academicYear || 'N/A'}`);
        console.log(`   Status: ${schedule.status || 'N/A'}`);
        console.log(`   Created: ${schedule.createdAt || 'N/A'}`);
        
        if (schedule.weeklySchedule && schedule.weeklySchedule.length > 0) {
          console.log('\n📅 Weekly Schedule:');
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          
          schedule.weeklySchedule.forEach((day, dayIndex) => {
            console.log(`\n   ${days[dayIndex] || `Day ${dayIndex + 1}`}:`);
            if (day.periods && day.periods.length > 0) {
              day.periods.forEach((period, periodIndex) => {
                const periodInfo = period.subject ? 
                  `${period.subject.subjectName || 'Unknown Subject'} (${period.teacher?.name || 'No Teacher'})` :
                  'Empty';
                console.log(`     Period ${periodIndex + 1}: ${periodInfo}`);
              });
            } else {
              console.log('     No periods found');
            }
          });
        } else {
          console.log('\n❌ No weekly schedule found');
        }

        if (schedule.statistics) {
          console.log('\n📈 Statistics:');
          console.log(JSON.stringify(schedule.statistics, null, 2));
        }

      } else {
        console.log('❌ Could not get schedule details');
      }
    } catch (error) {
      console.error('❌ Error getting schedule:', error.response?.data?.message || error.message);
    }

    // Also check if subjects and teachers exist
    console.log('\n🔍 Checking subjects...');
    try {
      const subjectsResponse = await axios.get(`${BASE_URL}/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          limit: 20
        }
      });

      if (subjectsResponse.data.success) {
        const subjects = subjectsResponse.data.data.subjects || [];
        console.log(`📚 Found ${subjects.length} subjects:`);
        subjects.slice(0, 5).forEach(subject => {
          console.log(`   ${subject.subjectName} (${subject.subjectCode}) - ${subject.weeklyHours} hours/week`);
        });
        if (subjects.length > 5) {
          console.log(`   ... and ${subjects.length - 5} more`);
        }
      }
    } catch (error) {
      console.error('❌ Error getting subjects:', error.response?.data?.message || error.message);
    }

    console.log('\n🔍 Checking teachers...');
    try {
      const teachersResponse = await axios.get(`${BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          role: 'teacher',
          limit: 10
        }
      });

      if (teachersResponse.data.success) {
        const teachers = teachersResponse.data.data.users || [];
        console.log(`👨‍🏫 Found ${teachers.length} teachers:`);
        teachers.slice(0, 5).forEach(teacher => {
          const subjects = teacher.subjects ? teacher.subjects.map(s => s.subjectName || s).join(', ') : 'No subjects';
          console.log(`   ${teacher.name} - ${subjects}`);
        });
      }
    } catch (error) {
      console.error('❌ Error getting teachers:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

debugScheduleDetails(); 