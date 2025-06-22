const axios = require('axios');

const testInitializeAPI = async () => {
  try {
    console.log('🚀 Testing Initialize API...');
    
    const response = await axios.post('http://localhost:3000/api/schedules/initialize', {
      academicYear: '2024-2025',
      gradeLevel: 12,
      semester: 1
    }, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDQ3NTYzMCwiZXhwIjoxNzUwNTYyMDMwfQ.mxMBe8OzD7XjHUBP-Oy8FQipSPcNm0CV61e-isxpLwI',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API Response:');
    console.log(JSON.stringify(response.data, null, 2));

    // Test periodId generation
    if (response.data.results && response.data.results.length > 0) {
      const firstResult = response.data.results[0];
      console.log('\n📊 Summary:');
      console.log(`- Total classes: ${response.data.totalClasses}`);
      console.log(`- Created: ${response.data.summary.created}`);
      console.log(`- Skipped: ${response.data.summary.skipped}`);
      console.log(`- Teacher schedules: ${response.data.summary.teacherSchedules}`);
    }

  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
  }
};

testInitializeAPI(); 