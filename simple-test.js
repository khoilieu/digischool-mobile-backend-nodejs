const axios = require('axios');

async function testAPI() {
  try {
    console.log('🚀 Testing initialize API...');
    
    const response = await axios.post('http://localhost:3000/api/schedules/initialize', {
      academicYear: "2024-2025",
      gradeLevel: 12,
      semester: 1
    }, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDQ3NTYzMCwiZXhwIjoxNzUwNTYyMDMwfQ.mxMBe8OzD7XjHUBP-Oy8FQipSPcNm0CV61e-isxpLwI',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('✅ Response data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Show results details
    if (response.data.data?.results) {
      console.log('\n📋 Results details:');
      response.data.data.results.forEach(result => {
        console.log(`- ${result.class}: ${result.status} - ${result.message || 'No message'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status);
    console.error('❌ Error message:', error.response?.data?.message || error.message);
    
    if (error.response?.data) {
      console.log('\n📄 Full error response:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAPI(); 