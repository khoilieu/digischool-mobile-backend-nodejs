const http = require('http');

const data = JSON.stringify({
  academicYear: '2024-2025',
  gradeLevel: 12,
  semester: 1
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/schedules/initialize',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDQ3NTYzMCwiZXhwIjoxNzUwNTYyMDMwfQ.mxMBe8OzD7XjHUBP-Oy8FQipSPcNm0CV61e-isxpLwI'
  }
};

console.log('🚀 Testing schedule initialization API...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      console.log('✅ Response received:');
      console.log(JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('🎉 API call successful!');
        console.log(`Total classes processed: ${response.data?.totalClasses || 'unknown'}`);
        console.log(`Successfully created: ${response.data?.results?.filter(r => r.status === 'created').length || 0}`);
      } else {
        console.log('❌ API call failed:', response.message);
      }
    } catch (error) {
      console.log('❌ Error parsing response:', error.message);
      console.log('Raw response:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(data);
req.end(); 