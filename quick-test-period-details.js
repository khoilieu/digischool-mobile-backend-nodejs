const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDQ3NTYzMCwiZXhwIjoxNzUwNTYyMDMwfQ.mxMBe8OzD7XjHUBP-Oy8FQipSPcNm0CV61e-isxpLwI';

async function testPeriodDetails() {
  try {
    console.log('🔬 Testing Period Details API...');
    
    const response = await axios.get(`${API_BASE_URL}/schedules/period-details`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        className: '12A4',
        academicYear: '2024-2025',
        dayOfWeek: 2,
        periodNumber: 1
      }
    });

    console.log('✅ API Success!');
    console.log('📊 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ API Error:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message || error.message);
    console.log('Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

testPeriodDetails(); 