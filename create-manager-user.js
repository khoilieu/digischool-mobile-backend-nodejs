const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function createManagerUser() {
  try {
    console.log('🔧 Creating manager user...');
    
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      email: 'manager@ecoschool.com',
      password: 'manager123'
    });

    if (response.data.success) {
      console.log('✅ Manager user created successfully!');
      console.log('📧 Email: manager@ecoschool.com');
      console.log('🔑 Password: manager123');
      console.log('👤 Role: manager');
      return true;
    } else {
      console.error('❌ Failed to create manager user:', response.data.message);
      return false;
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
      console.log('✅ Manager user already exists');
      console.log('📧 Email: manager@ecoschool.com');
      console.log('🔑 Password: manager123');
      return true;
    } else {
      console.error('❌ Error creating manager user:', error.response?.data?.message || error.message);
      return false;
    }
  }
}

// Test login with the manager user
async function testLogin() {
  try {
    console.log('\n🔐 Testing login...');
    
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'manager@ecoschool.com',
      password: 'manager123'
    });

    if (response.data.success) {
      console.log('✅ Login successful!');
      console.log('🎫 Token:', response.data.token.substring(0, 50) + '...');
      return response.data.token;
    } else {
      console.error('❌ Login failed:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data?.message || error.message);
    return null;
  }
}

async function run() {
  console.log('🚀 Setting up manager user for testing...');
  
  const created = await createManagerUser();
  if (created) {
    const token = await testLogin();
    if (token) {
      console.log('\n✅ Setup complete! You can now use these credentials:');
      console.log('📧 Email: manager@ecoschool.com');
      console.log('🔑 Password: manager123');
      console.log('\n💡 Update your test script with these credentials.');
    }
  }
}

run(); 