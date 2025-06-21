// Test cuối cùng - Demo API Schedule với date range
const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDM0MTIzNywiZXhwIjoxNzUwNDI3NjM3fQ.K6BlMUk-zfcxqnZ8hN6aZ8zfg7ZmvfuXuruG6KA-D0o';

function request(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/schedules${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('🎯 Demo Schedule API với Date Range');
  console.log('====================================\n');

  try {
    // 1. Tạo schedules mới với status active
    console.log('📅 Creating new schedules with active status...');
    const newSchedules = await request('/initialize', 'POST', {
      academicYear: "2024-2025",
      gradeLevel: 12,
      semester: 1
    });
    console.log(`Status: ${newSchedules.status}`);
    if (newSchedules.data.success) {
      console.log(`✅ Created ${newSchedules.data.data.totalClasses} schedules`);
    } else {
      console.log('❌ Error:', newSchedules.data.message);
    }
    console.log('\n' + '='.repeat(50) + '\n');

    // 2. Test với date range (cách mới)
    console.log('🗓️ Testing with date range (startOfWeek -> endOfWeek):');
    const startOfWeek = '2024-12-16'; // Monday
    const endOfWeek = '2024-12-22';   // Sunday
    
    const scheduleByRange = await request(`/class?className=12A4&academicYear=2024-2025&startOfWeek=${startOfWeek}&endOfWeek=${endOfWeek}`);
    console.log(`Status: ${scheduleByRange.status}`);
    
    if (scheduleByRange.data.success) {
      const schedule = scheduleByRange.data.data.schedule;
      console.log(`✅ Schedule found for class ${scheduleByRange.data.data.class.name}`);
      console.log(`📊 Total periods: ${schedule.totalPeriods}`);
      console.log(`📅 Date range: ${schedule.dateRange.startOfWeek} to ${schedule.dateRange.endOfWeek}`);
      console.log(`📝 Days in range: ${schedule.dateRange.daysInRange}`);
      
      // Show sample schedule
      if (schedule.dailySchedule && schedule.dailySchedule.length > 0) {
        console.log('\n📋 Sample daily schedule:');
        const firstDay = schedule.dailySchedule[0];
        console.log(`${firstDay.dayName} (${firstDay.date}):`);
        firstDay.periods.slice(0, 3).forEach(period => {
          console.log(`  - Period ${period.periodNumber} (${period.timeStart}-${period.timeEnd}): ${period.subject.name} - ${period.teacher.name}`);
        });
      }
    } else {
      console.log('❌ Error:', scheduleByRange.data.error?.message || scheduleByRange.data.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Test với weekNumber (cách cũ)
    console.log('📅 Testing with weekNumber (old way):');
    const scheduleByWeek = await request('/class?className=12A4&academicYear=2024-2025&weekNumber=1');
    console.log(`Status: ${scheduleByWeek.status}`);
    
    if (scheduleByWeek.data.success) {
      console.log('✅ Old method also works!');
    } else {
      console.log('❌ Error:', scheduleByWeek.data.error?.message || scheduleByWeek.data.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');
    console.log('🎉 Final Demo Complete!');
    console.log('\n📝 Summary of NEW APIs:');
    console.log('1. POST /api/schedules/initialize - Create schedules (now with active status)');
    console.log('2. GET /api/schedules/class?className=12A4&academicYear=2024-2025&startOfWeek=2024-12-16&endOfWeek=2024-12-22');
    console.log('3. GET /api/schedules/available - View all available schedules');
    console.log('4. GET /api/schedules/check-class - Check if class exists');
    console.log('\n✨ Features:');
    console.log('• 33 periods per week (Morning: 5 periods, Afternoon: 2 periods)');
    console.log('• Query by date range (startOfWeek to endOfWeek)');
    console.log('• Automatic schedule creation with active status');
    console.log('• Full validation and error handling');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main(); 