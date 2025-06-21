const axios = require('axios');

async function testValidation() {
  try {
    console.log('🔍 Testing API validation...');
    
    // Login
    const login = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'manager@ecoschool.com',
      password: 'manager123'
    });
    
    const token = login.data.data.token;
    console.log('✅ Login OK');
    
    // Test 1: Only academicYear (should work)
    console.log('\n📝 Test 1: Only academicYear');
    try {
      const response = await axios.post('http://localhost:3000/api/schedules/initialize', {
        academicYear: '2024-2025'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Test 1 passed');
    } catch (error) {
      console.log('❌ Test 1 failed:', error.response?.data?.message);
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          console.log(`   - ${err.field}: ${err.message}`);
        });
      }
    }
    
    // Test 2: With gradeLevel (should also work)
    console.log('\n📝 Test 2: With gradeLevel');
    try {
      const response = await axios.post('http://localhost:3000/api/schedules/initialize', {
        academicYear: '2024-2025',
        gradeLevel: 12
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Test 2 passed');
    } catch (error) {
      console.log('❌ Test 2 failed:', error.response?.data?.message);
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          console.log(`   - ${err.field}: ${err.message}`);
        });
      }
    }
    
    // Test 3: Invalid academicYear format
    console.log('\n📝 Test 3: Invalid academicYear format');
    try {
      const response = await axios.post('http://localhost:3000/api/schedules/initialize', {
        academicYear: '2024'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Test 3 should have failed');
    } catch (error) {
      console.log('✅ Test 3 correctly failed:', error.response?.data?.message);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testValidation(); 