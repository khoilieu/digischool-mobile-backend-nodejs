// Test Learning Progress và Attendance Tracking
// Chạy: node test-learning-progress.js

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

async function demo() {
  console.log('🎓 Learning Progress & Attendance Tracking Demo');
  console.log('================================================\n');

  try {
    // 1. Lấy schedule ID cho lớp 12A4
    console.log('📅 Step 1: Get schedule ID for class 12A4');
    const available = await request('/available?academicYear=2024-2025&className=12A4');
    
    if (!available.data.success || available.data.data.schedules.length === 0) {
      console.log('❌ No schedule found for class 12A4');
      return;
    }
    
    const schedule = available.data.data.schedules[0];
    const scheduleId = schedule.id;
    console.log(`✅ Found schedule: ${scheduleId}`);
    console.log('\n' + '='.repeat(50) + '\n');

    // 2. Mark một số tiết đã hoàn thành
    console.log('✅ Step 2: Mark some periods as completed');
    
    // Mark thứ 2 tiết 1 hoàn thành
    const completed1 = await request(`/${scheduleId}/mark-completed`, 'PATCH', {
      dayOfWeek: 2, // Monday
      periodNumber: 1,
      attendance: {
        presentStudents: 35,
        absentStudents: 3,
        totalStudents: 38
      },
      notes: 'Completed lesson on Literature introduction'
    });
    console.log(`Mark Period 1 Monday: Status ${completed1.status}`);
    if (completed1.data.success) {
      console.log('✅ Period marked as completed');
    } else {
      console.log('❌ Error:', completed1.data.message);
    }

    // Mark thứ 2 tiết 2 hoàn thành
    const completed2 = await request(`/${scheduleId}/mark-completed`, 'PATCH', {
      dayOfWeek: 2, // Monday
      periodNumber: 2,
      attendance: {
        presentStudents: 37,
        absentStudents: 1,
        totalStudents: 38
      },
      notes: 'Completed Math lesson on derivatives'
    });
    console.log(`Mark Period 2 Monday: Status ${completed2.status}`);
    
    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Mark một tiết vắng mặt
    console.log('❌ Step 3: Mark a period as absent');
    const absent = await request(`/${scheduleId}/mark-absent`, 'PATCH', {
      dayOfWeek: 3, // Tuesday
      periodNumber: 1,
      notes: 'Teacher was sick, no substitute available'
    });
    console.log(`Mark Period 1 Tuesday absent: Status ${absent.status}`);
    if (absent.data.success) {
      console.log('✅ Period marked as absent');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');

    // 4. Bulk update một số tiết
    console.log('📋 Step 4: Bulk update multiple periods');
    const bulkUpdate = await request(`/${scheduleId}/bulk-period-status`, 'PATCH', {
      updates: [
        {
          dayOfWeek: 2,
          periodNumber: 3,
          status: 'completed',
          options: {
            attendance: { presentStudents: 36, absentStudents: 2, totalStudents: 38 },
            notes: 'Physics lab session completed'
          }
        },
        {
          dayOfWeek: 3,
          periodNumber: 2,
          status: 'makeup',
          options: {
            notes: 'Makeup class for previous absence'
          }
        },
        {
          dayOfWeek: 4,
          periodNumber: 1,
          status: 'completed',
          options: {
            attendance: { presentStudents: 38, absentStudents: 0, totalStudents: 38 },
            notes: 'Chemistry practical completed'
          }
        }
      ]
    });
    console.log(`Bulk update: Status ${bulkUpdate.status}`);
    if (bulkUpdate.data.success) {
      console.log(`✅ Updated ${bulkUpdate.data.data.successfulUpdates}/${bulkUpdate.data.data.totalUpdates} periods`);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');

    // 5. Lấy learning progress
    console.log('📊 Step 5: Get learning progress');
    const progress = await request('/progress?className=12A4&academicYear=2024-2025&includeDetails=true');
    console.log(`Learning Progress: Status ${progress.status}`);
    
    if (progress.data.success) {
      const overallProgress = progress.data.data.progress.overall;
      console.log('📈 Overall Progress:');
      console.log(`  • Total Periods: ${overallProgress.totalPeriods}`);
      console.log(`  • Completed: ${overallProgress.completedPeriods}`);
      console.log(`  • Absent: ${overallProgress.absentPeriods}`);
      console.log(`  • Makeup: ${overallProgress.makeupPeriods}`);
      console.log(`  • Not Started: ${overallProgress.notStartedPeriods}`);
      console.log(`  • Completion Rate: ${overallProgress.completionRate}%`);
      console.log(`  • Attendance Rate: ${overallProgress.attendanceRate}%`);
      
      console.log('\n📚 Progress by Subject (first 3):');
      const subjects = Object.values(progress.data.data.progress.bySubject).slice(0, 3);
      subjects.forEach(subject => {
        console.log(`  • ${subject.subject.name}:`);
        console.log(`    - Completed: ${subject.completed}/${subject.total} (${subject.completionRate}%)`);
        console.log(`    - Attendance: ${subject.attendanceRate}%`);
      });
    }
    
    console.log('\n' + '='.repeat(50) + '\n');

    // 6. Lấy attendance report
    console.log('📋 Step 6: Get attendance report');
    const attendance = await request('/attendance-report?className=12A4&academicYear=2024-2025');
    console.log(`Attendance Report: Status ${attendance.status}`);
    
    if (attendance.data.success) {
      const report = attendance.data.data;
      console.log('📊 Attendance Summary:');
      console.log(`  • Total Periods: ${report.summary.totalPeriods}`);
      console.log(`  • Attended: ${report.summary.attendedPeriods}`);
      console.log(`  • Absent: ${report.summary.absentPeriods}`);
      console.log(`  • Attendance Rate: ${report.summary.attendanceRate}%`);
      
      console.log('\n📅 Daily Report (first 3 days):');
      report.dailyReport.slice(0, 3).forEach(day => {
        console.log(`  • ${day.dayName}:`);
        console.log(`    - Attended: ${day.attendedPeriods}/${day.totalPeriods} (${day.attendanceRate}%)`);
        console.log(`    - Absent: ${day.absentPeriods}`);
      });
    }

    console.log('\n' + '='.repeat(50) + '\n');
    console.log('🎉 Learning Progress Demo Complete!');
    console.log('\n📝 Available APIs:');
    console.log('1. PATCH /api/schedules/:scheduleId/period-status - Update period status');
    console.log('2. PATCH /api/schedules/:scheduleId/mark-completed - Mark period completed');
    console.log('3. PATCH /api/schedules/:scheduleId/mark-absent - Mark period absent');
    console.log('4. PATCH /api/schedules/:scheduleId/bulk-period-status - Bulk update periods');
    console.log('5. GET /api/schedules/progress - Get learning progress');
    console.log('6. GET /api/schedules/attendance-report - Get attendance report');
    
    console.log('\n🔧 Period Statuses:');
    console.log('• not_started - Chưa học');
    console.log('• completed - Học xong'); 
    console.log('• absent - Vắng tiết');
    console.log('• makeup - Tiết bù');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

demo(); 