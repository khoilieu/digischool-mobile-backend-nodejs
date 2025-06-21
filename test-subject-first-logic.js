const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testSubjectFirstLogic() {
  try {
    // 1. Login
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

    // 2. Xóa schedules cũ
    console.log('\n🗑️ Deleting old schedules...');
    try {
      await axios.delete(`${BASE_URL}/schedules/cleanup`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Old schedules deleted');
    } catch (error) {
      console.log('⚠️ No old schedules to delete or error occurred');
    }

    // 3. Lấy danh sách classes
    console.log('\n📚 Getting classes...');
    const classesResponse = await axios.get(`${BASE_URL}/classes`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { limit: 10 }
    });

    if (!classesResponse.data.success) {
      console.error('❌ Could not get classes');
      return;
    }

    const classes = classesResponse.data.data.classes || [];
    console.log(`Found ${classes.length} classes`);

    if (classes.length === 0) {
      console.error('❌ No classes found');
      return;
    }

    // 4. Test với lớp đầu tiên
    const testClass = classes[0];
    console.log(`\n🎯 Testing with class: ${testClass.className} (ID: ${testClass._id})`);

    // 5. Tạo schedule với logic mới
    console.log('\n🚀 Creating schedule with subject-first logic...');
    const scheduleResponse = await axios.post(`${BASE_URL}/schedules/initialize`, {
      classId: testClass._id,
      academicYear: '2024-2025'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (scheduleResponse.data.success) {
      console.log('✅ Schedule created successfully!');
      console.log(`Schedule ID: ${scheduleResponse.data.data._id}`);
      
      // 6. Lấy và hiển thị schedule
      console.log('\n📋 Getting created schedule...');
      const getScheduleResponse = await axios.get(`${BASE_URL}/schedules/${scheduleResponse.data.data._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (getScheduleResponse.data.success) {
        const schedule = getScheduleResponse.data.data;
        console.log('\n📅 Schedule Overview:');
        console.log(`Class: ${schedule.class.className}`);
        console.log(`Academic Year: ${schedule.academicYear}`);
        console.log(`Status: ${schedule.status}`);
        
        // Hiển thị một số tiết học mẫu
        console.log('\n📖 Sample periods:');
        schedule.schedule.forEach((day, dayIndex) => {
          const dayName = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][dayIndex];
          if (day.periods && day.periods.length > 0) {
            console.log(`\n${dayName}:`);
            day.periods.slice(0, 3).forEach(period => {
              const subjectName = period.subject ? period.subject.subjectName : 'Special';
              const teacherName = period.teacher ? period.teacher.name : 'Unknown';
              console.log(`  Tiết ${period.periodNumber}: ${subjectName} - ${teacherName} (${period.timeStart}-${period.timeEnd})`);
            });
          }
        });

        // Thống kê
        let totalPeriods = 0;
        let subjectPeriods = 0;
        let specialPeriods = 0;

        schedule.schedule.forEach(day => {
          if (day.periods) {
            totalPeriods += day.periods.length;
            day.periods.forEach(period => {
              if (period.subject) {
                subjectPeriods++;
              } else {
                specialPeriods++;
              }
            });
          }
        });

        console.log('\n📊 Statistics:');
        console.log(`Total periods: ${totalPeriods}`);
        console.log(`Subject periods: ${subjectPeriods}`);
        console.log(`Special periods: ${specialPeriods}`);
        console.log(`Success rate: ${((subjectPeriods / (totalPeriods - specialPeriods)) * 100).toFixed(1)}%`);

      } else {
        console.error('❌ Could not get created schedule');
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

testSubjectFirstLogic(); 