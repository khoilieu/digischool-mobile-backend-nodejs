const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDQ3NTYzMCwiZXhwIjoxNzUwNTYyMDMwfQ.mxMBe8OzD7XjHUBP-Oy8FQipSPcNm0CV61e-isxpLwI';

async function testInitializeAPI() {
  try {
    console.log('🚀 Testing Initialize API...\n');

    // Test 1: Initialize schedules for grade 12
    console.log('📋 Test 1: Initialize schedules for grade 12');
    const response1 = await axios.post(`${BASE_URL}/schedules/initialize`, {
      academicYear: "2024-2025",
      gradeLevel: 12,
      semester: 1
    }, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Response:', response1.data);
    
    // Test 2: Initialize schedules for all grades (without gradeLevel)
    console.log('\n📋 Test 2: Initialize schedules for all grades');
    const response2 = await axios.post(`${BASE_URL}/schedules/initialize`, {
      academicYear: "2024-2025",
      semester: 1
    }, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Response:', response2.data);

    // Test 3: Check available schedules
    console.log('\n📋 Test 3: Check available schedules');
    const response3 = await axios.get(`${BASE_URL}/schedules/available`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      },
      params: {
        academicYear: "2024-2025"
      }
    });

    console.log('✅ Available schedules:', response3.data);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testInitializeAPI(); 