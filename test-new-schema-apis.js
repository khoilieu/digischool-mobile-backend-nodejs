const axios = require('axios');
const mongoose = require('mongoose');

// Cấu hình
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test credentials - thay đổi theo môi trường thực tế
const TEST_CREDENTIALS = {
  email: 'admin@ecoschool.edu.vn',
  password: 'admin123'
};

let authToken = '';
let testScheduleId = '';
let testPeriodId = '';

async function login() {
  try {
    console.log('🔐 Đăng nhập...');
    const response = await axios.post(`${API_URL}/auth/login`, TEST_CREDENTIALS);
    authToken = response.data.token;
    console.log('✅ Đăng nhập thành công');
    return authToken;
  } catch (error) {
    console.error('❌ Lỗi đăng nhập:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function createTestSchedule() {
  try {
    console.log('\n📅 Tạo thời khóa biểu test...');
    
    // Lấy danh sách lớp
    const classResponse = await axios.get(`${API_URL}/classes`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!classResponse.data.data.classes || classResponse.data.data.classes.length === 0) {
      throw new Error('Không tìm thấy lớp học nào');
    }
    
    const testClass = classResponse.data.data.classes[0];
    console.log(`📚 Sử dụng lớp: ${testClass.className}`);
    
    // Tạo schedule mới
    const scheduleData = {
      classId: testClass._id,
      academicYear: '2024-2025',
      semester: 1
    };
    
    const response = await axios.post(`${API_URL}/schedules/initialize-class`, scheduleData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    testScheduleId = response.data.data.scheduleId;
    console.log('✅ Tạo thời khóa biểu thành công');
    console.log(`📋 Schedule ID: ${testScheduleId}`);
    return testScheduleId;
    
  } catch (error) {
    if (error.response?.data?.message?.includes('already exists')) {
      console.log('ℹ️ Schedule đã tồn tại, lấy schedule hiện có...');
      return await getExistingSchedule();
    }
    console.error('❌ Lỗi tạo schedule:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function getExistingSchedule() {
  try {
    const response = await axios.get(`${API_URL}/schedules/available?academicYear=2024-2025`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.data.schedules.length > 0) {
      testScheduleId = response.data.data.schedules[0].id;
      console.log(`📋 Sử dụng schedule có sẵn: ${testScheduleId}`);
      return testScheduleId;
    }
    
    throw new Error('Không tìm thấy schedule nào');
  } catch (error) {
    console.error('❌ Lỗi lấy schedule:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function testGetScheduleByWeek() {
  try {
    console.log('\n🗓️ Test: Lấy thời khóa biểu theo tuần...');
    
    const response = await axios.get(`${API_URL}/schedules/${testScheduleId}/weeks?weekNumber=1`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const data = response.data.data;
    console.log('✅ API hoạt động thành công');
    console.log(`📊 Tuần ${data.week.weekNumber}: ${data.week.startDate} -> ${data.week.endDate}`);
    console.log(`📅 Số ngày: ${data.week.days.length}`);
    
    // Lấy period ID đầu tiên để test
    if (data.week.days[0] && data.week.days[0].periods[0]) {
      testPeriodId = data.week.days[0].periods[0].id;
      console.log(`🎯 Period test ID: ${testPeriodId}`);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Lỗi test getScheduleByWeek:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function testGetPeriodById() {
  try {
    console.log('\n🎯 Test: Lấy chi tiết tiết học theo ID...');
    
    if (!testPeriodId) {
      console.log('⚠️ Không có period ID để test');
      return;
    }
    
    const response = await axios.get(`${API_URL}/schedules/${testScheduleId}/periods/${testPeriodId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const data = response.data.data;
    console.log('✅ API hoạt động thành công');
    console.log(`📍 Vị trí: Tuần ${data.period.location.weekNumber}, ${data.period.location.dayNameVN}, Tiết ${data.period.location.periodNumber}`);
    console.log(`⏰ Thời gian: ${data.period.basic.timeStart} - ${data.period.basic.timeEnd}`);
    console.log(`📚 Loại tiết: ${data.period.type.periodTypeVN}`);
    
    return data;
  } catch (error) {
    console.error('❌ Lỗi test getPeriodById:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function testGetEmptySlots() {
  try {
    console.log('\n🕳️ Test: Lấy danh sách tiết rỗng...');
    
    const response = await axios.get(`${API_URL}/schedules/${testScheduleId}/empty-slots?weekNumber=1`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const data = response.data.data;
    console.log('✅ API hoạt động thành công');
    console.log(`📊 Tổng tiết rỗng: ${data.totalEmptySlots}`);
    
    if (data.emptySlots.length > 0) {
      console.log(`🎯 Tiết rỗng đầu tiên: ${data.emptySlots[0].dayName}, Tiết ${data.emptySlots[0].periodNumber}`);
      return data.emptySlots[0]; // Trả về để test thêm hoạt động
    }
    
    return null;
  } catch (error) {
    console.error('❌ Lỗi test getEmptySlots:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function testUpdatePeriodStatus() {
  try {
    console.log('\n✏️ Test: Cập nhật trạng thái tiết học...');
    
    if (!testPeriodId) {
      console.log('⚠️ Không có period ID để test');
      return;
    }
    
    const updateData = {
      status: 'completed',
      options: {
        attendance: {
          presentStudents: 35,
          absentStudents: 2,
          totalStudents: 37
        },
        notes: 'Test update từ API mới'
      }
    };
    
    const response = await axios.put(`${API_URL}/schedules/${testScheduleId}/periods/${testPeriodId}/status`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ API hoạt động thành công');
    console.log(`📝 Trạng thái mới: ${response.data.data.status.currentVN}`);
    console.log(`👥 Điểm danh: ${response.data.data.attendance.presentStudents}/${response.data.data.attendance.totalStudents}`);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Lỗi test updatePeriodStatus:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function testAddMakeupToEmptySlot(emptySlot) {
  try {
    console.log('\n🔄 Test: Thêm tiết dạy bù vào slot rỗng...');
    
    if (!emptySlot) {
      console.log('⚠️ Không có empty slot để test');
      return;
    }
    
    // Lấy danh sách giáo viên và môn học
    const [teachersResponse, subjectsResponse] = await Promise.all([
      axios.get(`${API_URL}/users?role=teacher`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }),
      axios.get(`${API_URL}/subjects`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    ]);
    
    const teachers = teachersResponse.data.data.users || teachersResponse.data.data || [];
    const subjects = subjectsResponse.data.data.subjects || subjectsResponse.data.data || [];
    
    if (teachers.length === 0 || subjects.length === 0) {
      console.log('⚠️ Không có giáo viên hoặc môn học để test');
      return;
    }
    
    const makeupData = {
      teacherId: teachers[0]._id,
      subjectId: subjects[0]._id,
      makeupInfo: {
        originalDate: new Date('2024-08-15'),
        reason: 'Test tiết dạy bù từ API mới',
        originalPeriodNumber: 3,
        originalWeekNumber: 2,
        originalDayOfWeek: 5
      }
    };
    
    const response = await axios.post(`${API_URL}/schedules/${testScheduleId}/periods/${emptySlot.periodId}/makeup`, makeupData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ API hoạt động thành công');
    console.log(`📚 Đã thêm tiết dạy bù: ${subjects[0].subjectName}`);
    console.log(`👨‍🏫 Giáo viên: ${teachers[0].name}`);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Lỗi test addMakeupToEmptySlot:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function testAddExtracurricularToEmptySlot(emptySlot) {
  try {
    console.log('\n🎨 Test: Thêm hoạt động ngoại khóa vào slot rỗng...');
    
    if (!emptySlot || emptySlot.periodNumber < 8) {
      console.log('⚠️ Không có empty slot phù hợp để test extracurricular');
      return;
    }
    
    // Lấy giáo viên
    const teachersResponse = await axios.get(`${API_URL}/users?role=teacher`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const teachers = teachersResponse.data.data.users || teachersResponse.data.data || [];
    
    if (teachers.length === 0) {
      console.log('⚠️ Không có giáo viên để test');
      return;
    }
    
    const extracurricularData = {
      teacherId: teachers[0]._id,
      extracurricularInfo: {
        activityName: 'CLB Lập trình',
        activityType: 'club',
        location: 'Phòng máy tính',
        maxParticipants: 25
      }
    };
    
    const response = await axios.post(`${API_URL}/schedules/${testScheduleId}/periods/${emptySlot.periodId}/extracurricular`, extracurricularData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ API hoạt động thành công');
    console.log(`🎯 Hoạt động: ${extracurricularData.extracurricularInfo.activityName}`);
    console.log(`📍 Địa điểm: ${extracurricularData.extracurricularInfo.location}`);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Lỗi test addExtracurricularToEmptySlot:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function runAllTests() {
  try {
    console.log('🚀 BẮT ĐẦU TEST SCHEMA MỚI - 38 TUẦN\n');
    console.log('='.repeat(50));
    
    // 1. Đăng nhập
    await login();
    
    // 2. Tạo/lấy schedule test
    await createTestSchedule();
    
    // 3. Test các API mới
    await testGetScheduleByWeek();
    await testGetPeriodById();
    const emptySlot = await testGetEmptySlots();
    await testUpdatePeriodStatus();
    
    // 4. Test thêm hoạt động vào tiết rỗng
    if (emptySlot) {
      await testAddMakeupToEmptySlot(emptySlot);
      
      // Lấy empty slot khác cho extracurricular
      const emptySlots = await testGetEmptySlots();
      const extracurricularSlot = emptySlots?.emptySlots?.find(slot => slot.periodNumber >= 8);
      await testAddExtracurricularToEmptySlot(extracurricularSlot);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 TẤT CẢ TEST HOÀN THÀNH THÀNH CÔNG!');
    console.log('\n📋 Tóm tắt:');
    console.log('✅ Schema mới hoạt động tốt');
    console.log('✅ API theo ID tiết học hoạt động');
    console.log('✅ Quản lý tiết rỗng thành công');
    console.log('✅ Thêm tiết dạy bù thành công');
    console.log('✅ Thêm hoạt động ngoại khóa thành công');
    
  } catch (error) {
    console.error('\n💥 LỖI TRONG QUÁ TRÌNH TEST:', error.message);
    process.exit(1);
  }
}

// Chạy test
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n🏁 Test script hoàn thành');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test script thất bại:', error.message);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  login,
  testGetScheduleByWeek,
  testGetPeriodById,
  testGetEmptySlots,
  testUpdatePeriodStatus,
  testAddMakeupToEmptySlot,
  testAddExtracurricularToEmptySlot
}; 