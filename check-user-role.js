const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function checkUserRole() {
  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'manager@ecoschool.com',
      password: 'manager123'
    });

    console.log('📋 Login response:', JSON.stringify(loginResponse.data, null, 2));

    if (!loginResponse.data.success) {
      console.error('❌ Login failed');
      return;
    }

    // Check where token is
    const token = loginResponse.data.data?.token || loginResponse.data.token;
    
    if (!token) {
      console.error('❌ No token found in response');
      console.log('📋 Available fields:', Object.keys(loginResponse.data));
      if (loginResponse.data.data) {
        console.log('📋 Data fields:', Object.keys(loginResponse.data.data));
      }
      return;
    }

    console.log('✅ Login successful, token found');

    // Try to access protected route with debug
    console.log('🔍 Testing protected route...');
    
    try {
      const response = await axios.get(`${BASE_URL}/schedules/test-auth`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Success! User info:', response.data.user);
    } catch (error) {
      console.error('❌ Protected route failed:', error.response?.data || error.message);
    }

    // Try to decode token manually
    console.log('\n🔍 Decoding token...');
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('🎫 Token payload:', payload);
      } catch (decodeError) {
        console.error('❌ Could not decode token:', decodeError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

checkUserRole(); 