const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testData = {
  loginCredentials: {
    email: 'manager@ecoschool.com',
    password: 'manager123'
  },
  academicYear: '2024-2025',
  gradeLevel: 12
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${BASE_URL}/auth/login`, testData.loginCredentials);
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.error('❌ Login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testAuth() {
  try {
    console.log('🔍 Testing authentication...');
    const response = await axios.get(`${BASE_URL}/schedules/test-auth`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Auth test successful');
      console.log('👤 User info:', response.data.user);
      return true;
    }
  } catch (error) {
    console.error('❌ Auth test failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testOptimizedScheduling() {
  console.log('🚀 Testing Advanced Optimized Schedule Generation');
  console.log('=' .repeat(80));
  console.log('Constraints:');
  console.log('✅ Giáo viên dạy theo cụm (liên tiếp các lớp gần nhau)');
  console.log('✅ Học sinh không bị học lệch (cân bằng lý thuyết/thực hành)');
  console.log('✅ Mỗi giáo viên không dạy trùng tiết');
  console.log('✅ Mỗi phòng học chỉ phục vụ một lớp tại một thời điểm');
  console.log('✅ Mỗi môn tối đa 2 tiết liền kề trong ngày');
  console.log('=' .repeat(80));

  try {
    // Step 1: Test optimized schedule generation
    console.log('\n1. 🎯 Creating optimized schedules...');
    const optimizedResponse = await axios.post(`${BASE_URL}/schedules/initialize`, {
      academicYear: testData.academicYear,
      gradeLevel: testData.gradeLevel
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Optimized schedules created successfully!`);
    console.log(`📊 Results:`);
    console.log(JSON.stringify(optimizedResponse.data, null, 2));

    // Step 2: Get a specific schedule to check
    console.log('\n2. 📋 Checking specific schedule...');
    
    if (optimizedResponse.data.data && optimizedResponse.data.data.results && optimizedResponse.data.data.results.length > 0) {
      const firstResult = optimizedResponse.data.data.results[0];
      const scheduleId = firstResult.scheduleId;
      
      console.log(`🔍 Fetching schedule ${scheduleId}...`);
      
      try {
        const scheduleResponse = await axios.get(`${BASE_URL}/schedules/${scheduleId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        if (scheduleResponse.data.success) {
          const schedule = scheduleResponse.data.data;
          console.log(`📚 Schedule for ${firstResult.class}:`);
          console.log(`   Total periods scheduled: ${schedule.totalPeriodsPerWeek || 0}`);
          
          // Count actual periods
          let actualPeriods = 0;
          schedule.schedule.forEach(day => {
            actualPeriods += day.periods.length;
          });
          console.log(`   Actual periods in schedule: ${actualPeriods}`);
          
          // Show sample day
          if (schedule.schedule && schedule.schedule.length > 0) {
            const firstDay = schedule.schedule[0];
            console.log(`   Sample day (${firstDay.dayName}):`);
            firstDay.periods.forEach(period => {
              console.log(`     Tiết ${period.periodNumber}: ${period.subject || 'N/A'} (${period.timeStart}-${period.timeEnd})`);
            });
          }
        }
      } catch (schedError) {
        console.log(`   ⚠️ Could not fetch schedule details: ${schedError.response?.data?.message || schedError.message}`);
      }
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Error during optimized scheduling test:', error.response?.data || error.message);
  }
}

function analyzeOptimizationConstraints(schedule) {
  let totalViolations = 0;
  let totalPeriods = 0;
  const constraintChecks = {
    maxPeriodsPerDay: 0,
    consecutivePeriods: 0,
    theoryOnlyDays: 0
  };

  console.log(`   📊 Constraint Analysis for ${schedule.className}:`);

  schedule.schedule.forEach((day, dayIndex) => {
    if (day.periods.length === 0) return;

    totalPeriods += day.periods.length;

    // Check 1: Max 2 periods per subject per day
    const subjectCount = {};
    day.periods.forEach(period => {
      const subjectId = period.subject.toString();
      subjectCount[subjectId] = (subjectCount[subjectId] || 0) + 1;
    });

    Object.entries(subjectCount).forEach(([subjectId, count]) => {
      if (count > 2) {
        constraintChecks.maxPeriodsPerDay++;
        totalViolations++;
      }
    });

    // Check 2: Theory/Practical balance
    const theorySubjects = ['Literature', 'History', 'Geography', 'Civic'];
    const practicalSubjects = ['Physical', 'Art', 'Music', 'Technology'];
    
    let theoryCount = 0;
    let practicalCount = 0;
    
    day.periods.forEach(period => {
      const subjectName = period.subjectName || '';
      if (theorySubjects.some(t => subjectName.includes(t))) {
        theoryCount++;
      } else if (practicalSubjects.some(p => subjectName.includes(p))) {
        practicalCount++;
      }
    });

    if (theoryCount > 0 && practicalCount === 0 && day.periods.length > 3) {
      constraintChecks.theoryOnlyDays++;
    }

    // Check 3: Consecutive periods
    const sortedPeriods = [...day.periods].sort((a, b) => a.periodNumber - b.periodNumber);
    for (let i = 0; i < sortedPeriods.length - 2; i++) {
      const current = sortedPeriods[i];
      const next = sortedPeriods[i + 1];
      const afterNext = sortedPeriods[i + 2];
      
      if (current.subject === next.subject && 
          next.subject === afterNext.subject &&
          next.periodNumber === current.periodNumber + 1 &&
          afterNext.periodNumber === next.periodNumber + 1) {
        constraintChecks.consecutivePeriods++;
        totalViolations++;
      }
    }
  });

  // Display results
  console.log(`     Total periods: ${totalPeriods}`);
  console.log(`     Constraint violations: ${totalViolations}`);
  console.log(`     Max periods per day violations: ${constraintChecks.maxPeriodsPerDay}`);
  console.log(`     Consecutive periods violations: ${constraintChecks.consecutivePeriods}`);
  console.log(`     Theory-only days: ${constraintChecks.theoryOnlyDays}`);
  
  if (totalViolations === 0) {
    console.log(`     ✅ All constraints satisfied!`);
  } else {
    console.log(`     ⚠️ ${totalViolations} constraint violations found`);
  }
}

// Run the test
async function runTest() {
  console.log('Starting optimized schedule testing...');
  
  const loginSuccess = await login();
  if (loginSuccess) {
    const authSuccess = await testAuth();
    if (authSuccess) {
      await testOptimizedScheduling();
    } else {
      console.error('❌ Authentication test failed');
    }
  } else {
    console.error('❌ Cannot proceed without authentication');
  }
}

runTest(); 