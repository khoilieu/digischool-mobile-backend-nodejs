const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function checkClasses() {
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

    // Get all classes
    console.log('🔍 Getting all classes...');
    try {
      const classesResponse = await axios.get(`${BASE_URL}/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          limit: 100
        }
      });

      if (classesResponse.data.success) {
        const classes = classesResponse.data.data.classes || [];
        console.log(`📋 Found ${classes.length} classes:`);
        
        const gradeGroups = {};
        classes.forEach(cls => {
          const grade = cls.gradeLevel || 'Unknown';
          if (!gradeGroups[grade]) {
            gradeGroups[grade] = [];
          }
          gradeGroups[grade].push(cls.className);
        });

        Object.entries(gradeGroups).forEach(([grade, classNames]) => {
          console.log(`   Grade ${grade}: ${classNames.join(', ')}`);
        });

        // Check academic years
        const academicYears = [...new Set(classes.map(c => c.academicYear).filter(Boolean))];
        console.log(`\n📅 Academic Years: ${academicYears.join(', ')}`);

      } else {
        console.log('❌ Could not get classes');
      }
    } catch (error) {
      console.error('❌ Error getting classes:', error.response?.data?.message || error.message);
    }

    // Also check schedules
    console.log('\n🔍 Getting existing schedules...');
    try {
      const schedulesResponse = await axios.get(`${BASE_URL}/schedules`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          limit: 100
        }
      });

      if (schedulesResponse.data.success) {
        const schedules = schedulesResponse.data.data.schedules || [];
        console.log(`📋 Found ${schedules.length} existing schedules:`);
        
        schedules.forEach(schedule => {
          console.log(`   ${schedule.className || 'Unknown'} (${schedule.academicYear}) - Status: ${schedule.status}`);
        });

      } else {
        console.log('❌ Could not get schedules');
      }
    } catch (error) {
      console.error('❌ Error getting schedules:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

checkClasses(); 