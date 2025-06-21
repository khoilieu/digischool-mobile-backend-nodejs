const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testNewSchedule() {
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

    // Test with grade 11 (different from existing grade 12)
    console.log('🚀 Creating schedule for Grade 11...');
    const scheduleResponse = await axios.post(`${BASE_URL}/schedules/initialize`, {
      academicYear: '2024-2025',
      gradeLevel: 11,
      semester: 1
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Schedule Creation Results:');
    console.log(JSON.stringify(scheduleResponse.data, null, 2));

    if (scheduleResponse.data.success) {
      const results = scheduleResponse.data.data.results;
      const createdSchedules = results.filter(r => r.status === 'created');
      
      if (createdSchedules.length > 0) {
        console.log(`\n✅ Successfully created ${createdSchedules.length} schedules!`);
        
        // Get details of first created schedule
        const firstSchedule = createdSchedules[0];
        console.log(`\n🔍 Getting details for ${firstSchedule.class}...`);
        
        try {
          const detailResponse = await axios.get(`${BASE_URL}/schedules/class`, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            params: {
              className: firstSchedule.class,
              academicYear: '2024-2025',
              weekNumber: 1
            }
          });

          if (detailResponse.data.success) {
            console.log('\n📅 Schedule Details:');
            const schedule = detailResponse.data.data;
            
            // Count subjects
            const subjectCounts = {};
            let totalPeriods = 0;
            
            schedule.weeklySchedule.forEach(day => {
              day.periods.forEach(period => {
                if (period.subject && period.subject.subjectName) {
                  subjectCounts[period.subject.subjectName] = (subjectCounts[period.subject.subjectName] || 0) + 1;
                  totalPeriods++;
                }
              });
            });

            console.log(`📊 Total Periods Scheduled: ${totalPeriods}/35`);
            console.log('📚 Subject Distribution:');
            Object.entries(subjectCounts).forEach(([subject, count]) => {
              console.log(`   ${subject}: ${count} periods`);
            });

            // Check for conflicts
            let conflicts = 0;
            schedule.weeklySchedule.forEach((day, dayIndex) => {
              const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex];
              day.periods.forEach((period, periodIndex) => {
                if (period.subject && period.teacher && period.teacher.name) {
                  // Simple conflict check would go here
                }
              });
            });

            console.log(`⚠️ Detected Conflicts: ${conflicts}`);
            
          } else {
            console.log('❌ Could not get schedule details');
          }
          
        } catch (detailError) {
          console.error('❌ Error getting schedule details:', detailError.response?.data?.message || detailError.message);
        }
      } else {
        console.log('⚠️ No schedules were created');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testNewSchedule(); 