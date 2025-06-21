// Script để activate schedule có sẵn
const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDM0MTIzNywiZXhwIjoxNzUwNDI3NjM3fQ.K6BlMUk-zfcxqnZ8hN6aZ8zfg7ZmvfuXuruG6KA-D0o';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/schedules${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function activateSchedule() {
  try {
    // Lấy schedule ID của lớp 12A4
    console.log('🔍 Finding schedule for class 12A4...');
    const available = await makeRequest('/available?academicYear=2024-2025&className=12A4');
    
    if (available.data.success && available.data.data.schedules.length > 0) {
      const schedule = available.data.data.schedules[0];
      console.log(`📋 Found schedule: ${schedule.id} (status: ${schedule.status})`);
      
      // Activate schedule
      console.log('🚀 Activating schedule...');
      const activate = await makeRequest(`/${schedule.id}/status`, 'PATCH', { status: 'active' });
      console.log('Response:', JSON.stringify(activate.data, null, 2));
      
      if (activate.data.success) {
        console.log('✅ Schedule activated successfully!');
        
        // Test với date range
        console.log('\n🧪 Testing with date range...');
        const test = await makeRequest('/class?className=12A4&academicYear=2024-2025&startOfWeek=2024-12-16&endOfWeek=2024-12-22');
        console.log('Response:', JSON.stringify(test.data, null, 2));
      }
    } else {
      console.log('❌ No schedule found for class 12A4');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

activateSchedule(); 