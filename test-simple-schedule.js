const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testSimpleSchedule() {
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

    // Get classes
    console.log('\n📚 Getting classes...');
    const classesResponse = await axios.get(`${BASE_URL}/classes`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { limit: 5 }
    });

    if (!classesResponse.data.success || !classesResponse.data.data.classes.length) {
      console.error('❌ No classes found');
      return;
    }

    const testClass = classesResponse.data.data.classes[0];
    console.log(`🎯 Testing with class: ${testClass.className}`);

    // Delete old schedules for this class
    console.log('\n🗑️ Cleaning up old schedules...');
    try {
      await axios.delete(`${BASE_URL}/schedules/cleanup`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.log('ℹ️ No old schedules to clean');
    }

    // Create new schedule
    console.log('\n🚀 Creating new schedule...');
    const scheduleResponse = await axios.post(`${BASE_URL}/schedules/initialize`, {
      classId: testClass._id,
      academicYear: '2024-2025'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (scheduleResponse.data.success) {
      console.log('✅ Schedule created successfully!');
      
      // Get the created schedule
      const scheduleId = scheduleResponse.data.data._id;
      console.log(`📋 Getting created schedule (ID: ${scheduleId})...`);
      
      const getScheduleResponse = await axios.get(`${BASE_URL}/schedules/${scheduleId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (getScheduleResponse.data.success) {
        const schedule = getScheduleResponse.data.data;
        
        console.log('\n📅 Schedule Details:');
        console.log(`Class: ${schedule.class.className}`);
        console.log(`Academic Year: ${schedule.academicYear}`);
        console.log(`Status: ${schedule.status}`);
        
        // Count periods
        let totalPeriods = 0;
        let subjectPeriods = 0;
        let specialPeriods = 0;
        
        console.log('\n📖 Daily Schedule:');
        schedule.schedule.forEach((day, dayIndex) => {
          const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
          console.log(`\n${dayNames[dayIndex]}:`);
          
          if (day.periods && day.periods.length > 0) {
            day.periods.forEach(period => {
              totalPeriods++;
              const subjectName = period.subject ? period.subject.subjectName : 'Đặc biệt';
              const teacherName = period.teacher ? period.teacher.name : 'Chưa xác định';
              
              if (period.subject) {
                subjectPeriods++;
              } else {
                specialPeriods++;
              }
              
              console.log(`  Tiết ${period.periodNumber}: ${subjectName} - ${teacherName} (${period.timeStart}-${period.timeEnd})`);
            });
          } else {
            console.log('  Không có tiết học');
          }
        });
        
        console.log('\n📊 Statistics:');
        console.log(`Total periods: ${totalPeriods}`);
        console.log(`Subject periods: ${subjectPeriods}`);
        console.log(`Special periods: ${specialPeriods}`);
        
        if (totalPeriods > 0) {
          const successRate = ((subjectPeriods / totalPeriods) * 100).toFixed(1);
          console.log(`Success rate: ${successRate}%`);
        }
        
        if (subjectPeriods > 0) {
          console.log('✅ Schedule creation successful with subject-first logic!');
        } else {
          console.log('⚠️ No subject periods were scheduled');
        }
        
      } else {
        console.error('❌ Could not retrieve created schedule');
      }
      
    } else {
      console.error('❌ Schedule creation failed:', scheduleResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
}

testSimpleSchedule(); 