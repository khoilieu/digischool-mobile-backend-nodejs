const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDQ3NTYzMCwiZXhwIjoxNzUwNTYyMDMwfQ.mxMBe8OzD7XjHUBP-Oy8FQipSPcNm0CV61e-isxpLwI';
const scheduleId = '6856735f090b163ea0707518'; // ID từ dữ liệu user cung cấp

// Test 1: Xem chi tiết tiết học
async function testPeriodDetails() {
  try {
    console.log('🔍 TEST 1: XEM CHI TIẾT TIẾT HỌC');
    console.log('═'.repeat(50));
    
    const response = await axios.get(`${API_BASE_URL}/schedules/period-details`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        className: '12A4',
        academicYear: '2024-2025',
        dayOfWeek: 2, // Thứ 2
        periodNumber: 1 // Tiết 1 (lễ chào cờ)
      }
    });

    console.log('✅ Thành công!');
    console.log('📊 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
    
  } catch (error) {
    console.log('❌ Lỗi:', error.response?.data?.message || error.message);
    return null;
  }
}

// Test 2: Đánh giá tiết học
async function testEvaluatePeriod() {
  try {
    console.log('\n🎯 TEST 2: ĐÁNH GIÁ TIẾT HỌC');
    console.log('═'.repeat(50));
    
    // Trước tiên, cần đánh dấu tiết học là completed
    await axios.patch(`${API_BASE_URL}/schedules/${scheduleId}/mark-completed`, {
      dayOfWeek: 2,
      periodNumber: 1,
      completedAt: new Date().toISOString(),
      notes: 'Lễ chào cờ đã được tổ chức thành công'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Đã đánh dấu tiết học hoàn thành');
    
    // Bây giờ đánh giá tiết học
    const evaluationData = {
      dayOfWeek: 2,
      periodNumber: 1,
      evaluation: {
        overallRating: 5,
        criteria: {
          content: 5,
          delivery: 4,
          interaction: 5,
          preparation: 5,
          timeManagement: 4
        },
        feedback: {
          strengths: 'Lễ chào cờ được tổ chức trang trọng, học sinh có ý thức kỷ luật tốt',
          improvements: 'Có thể cải thiện thời gian tổ chức để không bị trễ',
          suggestions: 'Nên có thêm hoạt động tương tác với học sinh',
          generalComment: 'Lễ chào cờ tổ chức tốt, học sinh tham gia tích cực'
        }
      }
    };
    
    const response = await axios.post(`${API_BASE_URL}/schedules/${scheduleId}/evaluate`, 
      evaluationData, 
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Đánh giá thành công!');
    console.log('📊 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
    
  } catch (error) {
    console.log('❌ Lỗi:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('📄 Chi tiết lỗi:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Test 3: Lấy đánh giá tiết học
async function testGetEvaluation() {
  try {
    console.log('\n📋 TEST 3: LẤY ĐÁNH GIÁ TIẾT HỌC');
    console.log('═'.repeat(50));
    
    const response = await axios.get(`${API_BASE_URL}/schedules/${scheduleId}/evaluation`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        dayOfWeek: 2,
        periodNumber: 1
      }
    });

    console.log('✅ Thành công!');
    console.log('📊 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
    
  } catch (error) {
    console.log('❌ Lỗi:', error.response?.data?.message || error.message);
    return null;
  }
}

// Test 4: Xem chi tiết tiết học sau khi đánh giá
async function testPeriodDetailsWithEvaluation() {
  try {
    console.log('\n🔍 TEST 4: XEM CHI TIẾT TIẾT HỌC SAU KHI ĐÁNH GIÁ');
    console.log('═'.repeat(50));
    
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

    console.log('✅ Thành công!');
    console.log('📊 Response (with evaluation):');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
    
  } catch (error) {
    console.log('❌ Lỗi:', error.response?.data?.message || error.message);
    return null;
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 BẮT ĐẦU TEST CÁC API TIẾT HỌC');
  console.log('═'.repeat(60));
  
  // Test 1: Xem chi tiết tiết học ban đầu
  await testPeriodDetails();
  
  // Delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Đánh giá tiết học
  await testEvaluatePeriod();
  
  // Delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Lấy đánh giá
  await testGetEvaluation();
  
  // Delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 4: Xem chi tiết sau đánh giá
  await testPeriodDetailsWithEvaluation();
  
  console.log('\n🎉 HOÀN THÀNH TẤT CẢ TEST!');
  console.log('═'.repeat(60));
  
  // Hiển thị CURL examples
  console.log('\n📖 CURL EXAMPLES:');
  console.log('─'.repeat(30));
  
  console.log('\n1. Xem chi tiết tiết học:');
  console.log(`curl -X GET "${API_BASE_URL}/schedules/period-details?className=12A4&academicYear=2024-2025&dayOfWeek=2&periodNumber=1" \\`);
  console.log(`     -H "Authorization: Bearer ${token}" \\`);
  console.log(`     -H "Content-Type: application/json"`);
  
  console.log('\n2. Đánh giá tiết học:');
  console.log(`curl -X POST "${API_BASE_URL}/schedules/${scheduleId}/evaluate" \\`);
  console.log(`     -H "Authorization: Bearer ${token}" \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{
        "dayOfWeek": 2,
        "periodNumber": 1,
        "evaluation": {
          "overallRating": 5,
          "criteria": {
            "content": 5,
            "delivery": 4,
            "interaction": 5,
            "preparation": 5,
            "timeManagement": 4
          },
          "feedback": {
            "strengths": "Lễ chào cờ tổ chức tốt",
            "improvements": "Cần cải thiện thời gian",
            "suggestions": "Thêm tương tác",
            "generalComment": "Tổng thể tốt"
          }
        }
      }'`);
  
  console.log('\n3. Lấy đánh giá tiết học:');
  console.log(`curl -X GET "${API_BASE_URL}/schedules/${scheduleId}/evaluation?dayOfWeek=2&periodNumber=1" \\`);
  console.log(`     -H "Authorization: Bearer ${token}" \\`);
  console.log(`     -H "Content-Type: application/json"`);
}

// Run tests
if (require.main === module) {
  runAllTests()
    .catch(error => {
      console.error('❌ Test thất bại:', error.message);
      process.exit(1);
    });
}

module.exports = { 
  testPeriodDetails, 
  testEvaluatePeriod, 
  testGetEvaluation, 
  testPeriodDetailsWithEvaluation 
}; 