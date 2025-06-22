const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDQ3NTYzMCwiZXhwIjoxNzUwNTYyMDMwfQ.mxMBe8OzD7XjHUBP-Oy8FQipSPcNm0CV61e-isxpLwI';

async function testTeacherSchedule() {
  console.log('🚀 TEST TEACHER SCHEDULE API\n');

  try {
    // 1. Get list of teachers first
    console.log('📋 Getting list of teachers...');
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
      
      teachers.slice(0, 5).forEach((teacher, index) => {
        const subjectName = teacher.subject?.subjectName || 'No subject';
        console.log(`   ${index + 1}. ${teacher.name} (${teacher._id}) - ${subjectName}`);
      });

      if (teachers.length > 0) {
        // 2. Test teacher schedule API with first teacher
        const testTeacher = teachers[0];
        console.log(`\n🔍 Testing schedule for teacher: ${testTeacher.name}`);
        
        const scheduleResponse = await axios.get(`${BASE_URL}/schedules/teacher`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            teacherId: testTeacher._id,
            academicYear: '2024-2025',
            startOfWeek: '2024-12-19',
            endOfWeek: '2024-12-25'
          }
        });

        if (scheduleResponse.data.success) {
          const schedule = scheduleResponse.data.data;
          console.log('✅ Teacher schedule retrieved successfully!');
          console.log(`📊 Statistics:`);
          console.log(`   - Total periods: ${schedule.statistics.totalPeriods}`);
          console.log(`   - Completed periods: ${schedule.statistics.completedPeriods}`);
          console.log(`   - Pending periods: ${schedule.statistics.pendingPeriods}`);
          console.log(`   - Completion rate: ${schedule.statistics.completionRate}%`);
          console.log(`   - Total classes: ${schedule.totalClasses}`);

          console.log(`\n📅 Daily schedule:`);
          schedule.dailySchedule.forEach(day => {
            console.log(`   ${day.dayName} (${day.date}):`);
            day.classes.forEach(classSchedule => {
              console.log(`     📚 Class ${classSchedule.class.name}:`);
              classSchedule.periods.forEach(period => {
                const subjectName = period.subject?.name || 'Fixed Period';
                const status = period.status === 'not_started' ? '⏳' : 
                              period.status === 'completed' ? '✅' : 
                              period.status === 'absent' ? '❌' : '🔄';
                console.log(`       ${status} Period ${period.periodNumber} (${period.timeStart}-${period.timeEnd}): ${subjectName}`);
              });
            });
          });

        } else {
          console.log('❌ Failed to get teacher schedule:', scheduleResponse.data.message);
        }

        // 3. Generate curl command
        console.log(`\n📋 CURL command for this teacher:`);
        console.log(`curl --location 'http://localhost:3000/api/schedules/teacher?teacherId=${testTeacher._id}&academicYear=2024-2025&startOfWeek=2024-12-19&endOfWeek=2024-12-25' \\`);
        console.log(`--header 'Authorization: Bearer ${token}'`);

      } else {
        console.log('❌ No teachers found');
      }
    } else {
      console.log('❌ Failed to get teachers:', teachersResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testTeacherSchedule(); 