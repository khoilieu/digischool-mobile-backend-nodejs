const axios = require('axios');

async function debugCurlAPI() {
  try {
    console.log('🚀 Debug CURL API Initialize...');
    
    // 1. Login to get token
    console.log('\n🔑 Step 1: Login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'manager@ecoschool.com',
      password: 'manager123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token received');
    
    // 2. Test the exact same request as curl
    console.log('\n📋 Step 2: Initialize schedules (same as curl)...');
    
    const requestData = {
      academicYear: '2024-2025',
      gradeLevel: 12,
      semester: 1
    };
    
    console.log('Request data:', JSON.stringify(requestData, null, 2));
    
    try {
      const response = await axios.post('http://localhost:3000/api/schedules/initialize', requestData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 seconds timeout
      });
      
      console.log('✅ API call successful!');
      console.log('Status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
    } catch (apiError) {
      console.error('❌ API call failed');
      console.error('Status:', apiError.response?.status);
      console.error('Status Text:', apiError.response?.statusText);
      console.error('Error message:', apiError.response?.data?.message);
      
      if (apiError.response?.data?.errors) {
        console.error('Validation errors:', apiError.response.data.errors);
      }
      
      if (apiError.response?.data) {
        console.error('Full error response:', JSON.stringify(apiError.response.data, null, 2));
      }
      
      // If it's a timeout or network error
      if (apiError.code === 'ECONNABORTED') {
        console.error('⏰ Request timed out');
      } else if (apiError.code === 'ECONNREFUSED') {
        console.error('🔌 Connection refused - is the server running?');
      }
      
      throw apiError;
    }
    
    // 3. Check if any schedules were created
    console.log('\n🔍 Step 3: Verify created schedules...');
    try {
      const verifyResponse = await axios.get('http://localhost:3000/api/schedules/available?academicYear=2024-2025', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Available schedules:', JSON.stringify(verifyResponse.data, null, 2));
      
    } catch (verifyError) {
      console.error('❌ Failed to verify schedules:', verifyError.response?.data?.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the debug
debugCurlAPI().catch(console.error); 