const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function quickTest() {
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

    // Test schedule creation
    console.log('\n🚀 Testing schedule creation...');
    const scheduleResponse = await axios.post(`${BASE_URL}/schedules/initialize`, {
      academicYear: '2024-2025',
      gradeLevel: 12,
      semester: 1
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (scheduleResponse.data.success) {
      console.log('✅ Schedule creation successful!');
      console.log('📊 Results:', JSON.stringify(scheduleResponse.data.data, null, 2));
    } else {
      console.log('❌ Schedule creation failed:', scheduleResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.log('📋 Validation errors:', error.response.data.errors);
    }
  }
}

quickTest(); 