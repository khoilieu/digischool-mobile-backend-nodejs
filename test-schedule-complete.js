// Script test hoàn chỉnh cho Schedule APIs với date range
// Chạy: node test-schedule-complete.js

const http = require('http');

const baseURL = 'localhost:3000';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDM0MTIzNywiZXhwIjoxNzUwNDI3NjM3fQ.K6BlMUk-zfcxqnZ8hN6aZ8zfg7ZmvfuXuruG6KA-D0o';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: baseURL.split(':')[0],
      port: parseInt(baseURL.split(':')[1]),
      path: `/api/schedules${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

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

async function runTests() {
  console.log('🚀 Complete Schedule API Testing');
  console.log('==================================\n');

  try {
    // Test 1: Kiểm tra lớp có tồn tại không
    console.log('📋 Step 1: Check if class 12A4 exists in 2024-2025');
    const classCheck = await makeRequest('/check-class?className=12A4&academicYear=2024-2025');
    console.log(`Status: ${classCheck.status}`);
    console.log('Response:', JSON.stringify(classCheck.data, null, 2));
    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Xem schedules có sẵn
    console.log('📋 Step 2: View available schedules for 2024-2025');
    const available = await makeRequest('/available?academicYear=2024-2025');
    console.log(`Status: ${available.status}`);
    console.log('Response:', JSON.stringify(available.data, null, 2));
    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Khởi tạo schedule nếu chưa có
    console.log('📋 Step 3: Initialize schedules for grade 12 in 2024-2025');
    const initData = {
      academicYear: "2024-2025",
      gradeLevel: 12,
      semester: 1
    };
    const init = await makeRequest('/initialize', 'POST', initData);
    console.log(`Status: ${init.status}`);
    console.log('Response:', JSON.stringify(init.data, null, 2));
    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Xem schedule với weekNumber (cách cũ)
    console.log('📋 Step 4: Get class schedule with weekNumber (old way)');
    const scheduleOld = await makeRequest('/class?className=12A4&academicYear=2024-2025&weekNumber=1');
    console.log(`Status: ${scheduleOld.status}`);
    console.log('Response:', JSON.stringify(scheduleOld.data, null, 2));
    console.log('\n' + '='.repeat(50) + '\n');

    // Test 5: Xem schedule với date range (cách mới)
    console.log('📋 Step 5: Get class schedule with date range (new way)');
    const startOfWeek = '2024-12-16'; // Monday
    const endOfWeek = '2024-12-22';   // Sunday
    const scheduleNew = await makeRequest(`/class?className=12A4&academicYear=2024-2025&startOfWeek=${startOfWeek}&endOfWeek=${endOfWeek}`);
    console.log(`Status: ${scheduleNew.status}`);
    console.log('Response:', JSON.stringify(scheduleNew.data, null, 2));
    console.log('\n' + '='.repeat(50) + '\n');

    // Test 6: Test validation errors
    console.log('📋 Step 6: Test validation (should show error)');
    const validation = await makeRequest('/class?className=12A4&academicYear=2024-2025'); // Missing both weekNumber and date range
    console.log(`Status: ${validation.status}`);
    console.log('Response:', JSON.stringify(validation.data, null, 2));
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('✅ All tests completed!');
    console.log('\n📖 How to use the new APIs:');
    console.log('1. Check if class exists: GET /api/schedules/check-class?className=12A4&academicYear=2024-2025');
    console.log('2. View available schedules: GET /api/schedules/available?academicYear=2024-2025');
    console.log('3. Initialize schedules: POST /api/schedules/initialize');
    console.log('4. Get schedule by week: GET /api/schedules/class?className=12A4&academicYear=2024-2025&weekNumber=1');
    console.log('5. Get schedule by date range: GET /api/schedules/class?className=12A4&academicYear=2024-2025&startOfWeek=2024-12-16&endOfWeek=2024-12-22');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
runTests(); 