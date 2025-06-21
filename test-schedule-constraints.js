const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testData = {
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NmIxMjNhNjc0YzU0NDRmYTNhZWUyYiIsInJvbGUiOiJtYW5hZ2VyIiwiaWF0IjoxNzM1MDM5NTQ2LCJleHAiOjE3MzUxMjU5NDZ9.C7fA4KrK3QqHvZv5KW1X9p9vEv0JvvCGqsZuC7ZA8sA',
  academicYear: '2024-2025',
  gradeLevel: 12,
  className: '12A4'
};

async function testScheduleConstraints() {
  console.log('🔍 Testing Schedule Constraints: Maximum 2 Adjacent Periods per Subject per Day');
  console.log('=' .repeat(80));

  try {
    // Step 1: Initialize schedules
    console.log('\n1. Initializing schedules...');
    const initResponse = await axios.post(`${BASE_URL}/schedules/initialize`, {
      academicYear: testData.academicYear,
      gradeLevel: testData.gradeLevel
    }, {
      headers: {
        'Authorization': `Bearer ${testData.token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Schedules initialized: ${initResponse.data.data.length} classes`);

    // Step 2: Get specific class schedule
    console.log('\n2. Getting class schedule to analyze constraints...');
    const scheduleResponse = await axios.get(`${BASE_URL}/schedules/class`, {
      params: {
        className: testData.className,
        academicYear: testData.academicYear,
        weekNumber: 1
      },
      headers: {
        'Authorization': `Bearer ${testData.token}`
      }
    });

    const schedule = scheduleResponse.data.data;
    console.log(`✅ Retrieved schedule for class: ${schedule.className}`);

    // Step 3: Analyze constraints
    console.log('\n3. Analyzing schedule constraints...');
    analyzeScheduleConstraints(schedule);

    // Step 4: Test with another class
    console.log('\n4. Testing with class 12A1...');
    const schedule2Response = await axios.get(`${BASE_URL}/schedules/class`, {
      params: {
        className: '12A1',
        academicYear: testData.academicYear,
        weekNumber: 1
      },
      headers: {
        'Authorization': `Bearer ${testData.token}`
      }
    });

    if (schedule2Response.data.success) {
      console.log(`✅ Retrieved schedule for class: 12A1`);
      analyzeScheduleConstraints(schedule2Response.data.data);
    }

  } catch (error) {
    console.error('❌ Error during test:', error.response?.data || error.message);
  }
}

function analyzeScheduleConstraints(schedule) {
  let violationCount = 0;
  let totalPeriods = 0;
  
  console.log(`\n📊 Analyzing schedule for ${schedule.className}:`);
  console.log('-'.repeat(60));

  schedule.schedule.forEach((day, dayIndex) => {
    console.log(`\n📅 ${day.dayOfWeek}:`);
    
    if (day.periods.length === 0) {
      console.log('   No periods scheduled');
      return;
    }

    // Count subjects per day
    const subjectCount = {};
    day.periods.forEach(period => {
      const subjectId = period.subject.toString();
      subjectCount[subjectId] = (subjectCount[subjectId] || 0) + 1;
    });

    // Check for violations (more than 2 periods of same subject per day)
    Object.entries(subjectCount).forEach(([subjectId, count]) => {
      if (count > 2) {
        console.log(`   ⚠️  VIOLATION: Subject ${subjectId} has ${count} periods in one day`);
        violationCount++;
      }
    });

    // Sort periods by period number for adjacency check
    const sortedPeriods = [...day.periods].sort((a, b) => a.periodNumber - b.periodNumber);
    
    // Display periods
    sortedPeriods.forEach(period => {
      const subjectInfo = period.subject.subjectName || period.subject;
      console.log(`   Tiết ${period.periodNumber} (${period.timeStart}-${period.timeEnd}): ${subjectInfo} - ${period.session}`);
    });

    // Check for adjacent periods constraint
    for (let i = 0; i < sortedPeriods.length - 2; i++) {
      const current = sortedPeriods[i];
      const next = sortedPeriods[i + 1];
      const afterNext = sortedPeriods[i + 2];
      
      // Check if 3 consecutive periods are the same subject
      if (current.subject.toString() === next.subject.toString() && 
          next.subject.toString() === afterNext.subject.toString() &&
          next.periodNumber === current.periodNumber + 1 &&
          afterNext.periodNumber === next.periodNumber + 1) {
        console.log(`   ⚠️  VIOLATION: 3 consecutive periods of same subject (periods ${current.periodNumber}-${afterNext.periodNumber})`);
        violationCount++;
      }
    }

    totalPeriods += day.periods.length;
  });

  console.log(`\n📈 Summary for ${schedule.className}:`);
  console.log(`   Total periods: ${totalPeriods}`);
  console.log(`   Constraint violations: ${violationCount}`);
  
  if (violationCount === 0) {
    console.log('   ✅ All constraints satisfied!');
  } else {
    console.log('   ❌ Constraints violated!');
  }
}

// Run the test
testScheduleConstraints(); 