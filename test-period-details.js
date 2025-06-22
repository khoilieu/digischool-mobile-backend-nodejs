const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const MANAGER_CREDENTIALS = {
  email: 'manager@school.edu.vn',
  password: 'Manager123'
};

let authToken = '';

// Function to login
async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, MANAGER_CREDENTIALS);
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Đăng nhập thành công!');
      return true;
    }
    
    console.log('❌ Đăng nhập thất bại:', response.data.message);
    return false;
  } catch (error) {
    console.error('❌ Lỗi đăng nhập:', error.response?.data?.message || error.message);
    return false;
  }
}

// Function to get period details
async function getPeriodDetails(className, academicYear, dayOfWeek, periodNumber) {
  try {
    const params = {
      className,
      academicYear,
      dayOfWeek,
      periodNumber
    };

    const response = await axios.get(`${API_BASE_URL}/schedules/period-details`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      params
    });

    if (response.data.success) {
      const data = response.data.data;
      
      console.log('\n📋 CHI TIẾT TIẾT HỌC');
      console.log('═'.repeat(60));
      
      if (data.exists) {
        const period = data.period;
        
        console.log('📅 THÔNG TIN CỞ BẢN:');
        console.log(`   Lớp: ${data.class.name} (${data.class.academicYear})`);
        console.log(`   Ngày: ${period.basic.dayNameVN}`);
        console.log(`   Tiết: ${period.basic.periodNumber} (${period.basic.sessionVN})`);
        console.log(`   Thời gian: ${period.basic.timeStart} - ${period.basic.timeEnd}`);
        
        console.log('\n📚 THÔNG TIN MÔN HỌC:');
        if (period.academic.subject) {
          console.log(`   Môn học: ${period.academic.subject.name}`);
          console.log(`   Giáo viên: ${period.academic.teacher?.name || 'Chưa có'}`);
        } else {
          console.log('   Không có môn học cụ thể');
        }
        
        console.log('\n📊 TRẠNG THÁI:');
        console.log(`   Trạng thái: ${period.status.currentVN}`);
        console.log(`   Loại tiết: ${period.type.periodTypeVN}`);
        
        console.log('\n👥 ĐIỂM DANH:');
        console.log(`   Tỷ lệ có mặt: ${period.attendance.attendanceRate}`);
        
      } else {
        console.log('❌ TIẾT HỌC KHÔNG TỒN TẠI');
        console.log(`   Lớp: ${data.class.name}`);
        console.log(`   Ngày ${data.dayOfWeek} - Tiết ${data.periodNumber}`);
      }
      
      return true;
    }
    
    console.log('❌ Lỗi:', response.data.message);
    return false;
    
  } catch (error) {
    console.error('❌ Lỗi khi gọi API:', error.response?.data?.message || error.message);
    return false;
  }
}

// Main test function
async function testPeriodDetailsAPI() {
  console.log('🔬 TEST API CHI TIẾT TIẾT HỌC');
  console.log('═'.repeat(60));
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Không thể đăng nhập. Dừng test.');
    return;
  }
  
  // Test cases
  const testCases = [
    {
      desc: 'Tiết lễ chào cờ',
      className: '12A4',
      academicYear: '2024-2025',
      dayOfWeek: 2,
      periodNumber: 1
    },
    {
      desc: 'Tiết học bình thường',
      className: '12A4',
      academicYear: '2024-2025',
      dayOfWeek: 3,
      periodNumber: 2
    },
    {
      desc: 'Tiết không tồn tại',
      className: '12A4',
      academicYear: '2024-2025',
      dayOfWeek: 2,
      periodNumber: 6
    }
  ];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    console.log(`\n📋 TEST ${i + 1}: ${testCase.desc}`);
    console.log('─'.repeat(40));
    
    await getPeriodDetails(
      testCase.className,
      testCase.academicYear,
      testCase.dayOfWeek,
      testCase.periodNumber
    );
    
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n📖 HƯỚNG DẪN SỬ DỤNG:');
  console.log('API: GET /api/schedules/period-details');
  console.log('Params: className, academicYear, dayOfWeek, periodNumber');
  console.log('Authorization: Bearer token required');
  
  console.log('\n✅ Test hoàn thành!');
}

// Run test
if (require.main === module) {
  testPeriodDetailsAPI()
    .catch(error => {
      console.error('❌ Test thất bại:', error.message);
      process.exit(1);
    });
}

module.exports = { testPeriodDetailsAPI }; 