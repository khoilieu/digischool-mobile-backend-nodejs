const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function deleteExistingSchedules() {
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

    // Get all schedules for 2024-2025
    console.log('🔍 Getting existing schedules...');
    const schedulesResponse = await axios.get(`${BASE_URL}/schedules`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        academicYear: '2024-2025',
        limit: 100
      }
    });

    if (schedulesResponse.data.success) {
      const schedules = schedulesResponse.data.data.schedules || [];
      console.log(`📋 Found ${schedules.length} schedules to delete`);

      // Delete each schedule
      for (const schedule of schedules) {
        try {
          console.log(`🗑️ Deleting schedule for ${schedule.className || 'Unknown Class'}...`);
          
          await axios.delete(`${BASE_URL}/schedules/${schedule._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log(`✅ Deleted schedule ${schedule._id}`);
        } catch (deleteError) {
          console.error(`❌ Failed to delete schedule ${schedule._id}:`, deleteError.response?.data?.message || deleteError.message);
        }
      }

      console.log('\n✅ Cleanup completed!');
    } else {
      console.log('📋 No schedules found or error getting schedules');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

deleteExistingSchedules(); 