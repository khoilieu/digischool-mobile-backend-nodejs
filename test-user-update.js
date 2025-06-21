const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testUserUpdate() {
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

    // Get a teacher to test
    console.log('\n👨‍🏫 Getting teachers...');
    const usersResponse = await axios.get(`${BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        limit: 5
      }
    });

    if (!usersResponse.data.success) {
      console.error('❌ Could not get users');
      return;
    }

    const users = usersResponse.data.data.users || [];
    const teacher = users.find(u => u.role.includes('teacher'));
    
    if (!teacher) {
      console.error('❌ No teacher found');
      return;
    }

    console.log(`👤 Testing with teacher: ${teacher.name} (ID: ${teacher.id})`);

    // Get a subject to assign
    console.log('\n📚 Getting subjects...');
    const subjectsResponse = await axios.get(`${BASE_URL}/subjects`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        limit: 5
      }
    });

    if (!subjectsResponse.data.success) {
      console.error('❌ Could not get subjects');
      return;
    }

    const subjects = subjectsResponse.data.data.subjects || [];
    if (subjects.length === 0) {
      console.error('❌ No subjects found');
      return;
    }

    const subject = subjects[0];
    console.log(`📖 Using subject: ${subject.subjectName} (ID: ${subject._id})`);

    // Test the update
    console.log('\n🔄 Testing user update...');
    const updateData = {
      subject: subject._id
    };

    console.log('📤 Sending update request:', JSON.stringify(updateData, null, 2));

    try {
      const updateResponse = await axios.put(`${BASE_URL}/users/${teacher.id}`, updateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (updateResponse.data.success) {
        console.log('✅ Update successful!');
        console.log('📊 Response:', JSON.stringify(updateResponse.data, null, 2));
      } else {
        console.log('❌ Update failed:', updateResponse.data.message);
      }

    } catch (updateError) {
      console.log('❌ Update error:', updateError.response?.status);
      console.log('📋 Error details:', JSON.stringify(updateError.response?.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

testUserUpdate(); 