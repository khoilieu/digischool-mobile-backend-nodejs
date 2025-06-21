const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDQ3NTYzMCwiZXhwIjoxNzUwNTYyMDMwfQ.mxMBe8OzD7XjHUBP-Oy8FQipSPcNm0CV61e-isxpLwI';

async function recreateScheduleWithCorrectTeachers() {
  try {
    console.log('🔄 TẠO LẠI THỜI KHÓA BIỂU VỚI LOGIC PHÂN CÔNG GIÁO VIÊN ĐÚNG\n');

    console.log('1. Kiểm tra thông tin lớp...');
    
    // Kiểm tra lớp 12A3
    const classCheck = await axios.get(`${BASE_URL}/schedules/check-class`, {
      params: {
        className: '12A3',
        academicYear: '2024-2025'
      },
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    });

    if (!classCheck.data.data.exists) {
      throw new Error('Lớp 12A3 không tồn tại');
    }

    const classInfo = classCheck.data.data.class;
    console.log(`   Lớp: ${classInfo.className}`);
    console.log(`   Chủ nhiệm: ${classInfo.homeroomTeacher?.name || 'Chưa có'}`);

    console.log('\n2. Tạo thời khóa biểu mới...');
    
    // Tạo thời khóa biểu mới cho lớp 12A3
    const createResponse = await axios.post(`${BASE_URL}/schedules/initialize-class`, {
      classId: classInfo.id,
      academicYear: '2024-2025',
      semester: 1
    }, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Tạo thời khóa biểu thành công!');
    console.log(`   Schedule ID: ${createResponse.data.data.scheduleId}`);
    console.log(`   Tổng số tiết: ${createResponse.data.data.totalPeriods}`);

    console.log('\n3. Kiểm tra kết quả...');
    
    // Lấy thời khóa biểu mới tạo
    const newSchedule = await axios.get(`${BASE_URL}/schedules/class`, {
      params: {
        className: '12A3',
        academicYear: '2024-2025',
        startOfWeek: '2024-12-19',
        endOfWeek: '2024-12-25'
      },
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    });

    // Phân tích phân công giáo viên
    const subjectTeacherMap = {};
    const teacherSubjectCount = {};
    
    newSchedule.data.data.schedule.dailySchedule.forEach(day => {
      day.periods.forEach(period => {
        if (period.subject && period.teacher) {
          const subjectName = period.subject.name;
          const teacherName = period.teacher.name;
          
          // Đếm số môn mỗi giáo viên dạy
          if (!teacherSubjectCount[teacherName]) {
            teacherSubjectCount[teacherName] = new Set();
          }
          teacherSubjectCount[teacherName].add(subjectName);
          
          // Kiểm tra xem một môn có nhiều giáo viên dạy không
          if (!subjectTeacherMap[subjectName]) {
            subjectTeacherMap[subjectName] = new Set();
          }
          subjectTeacherMap[subjectName].add(teacherName);
        }
      });
    });

    console.log('\n📊 PHÂN TÍCH PHÂN CÔNG GIÁO VIÊN MỚI:');
    console.log('\nMôn học và giáo viên dạy:');
    Object.entries(subjectTeacherMap).forEach(([subject, teachers]) => {
      const teacherList = Array.from(teachers);
      const status = teacherList.length > 1 ? '❌ SAI - Nhiều giáo viên' : '✅ ĐÚNG';
      console.log(`   ${subject}: ${teacherList.join(', ')} ${status}`);
    });

    console.log('\nSố môn mỗi giáo viên dạy:');
    Object.entries(teacherSubjectCount).forEach(([teacher, subjects]) => {
      const subjectList = Array.from(subjects);
      console.log(`   ${teacher}: ${subjectList.length} môn (${subjectList.join(', ')})`);
    });

    console.log('\n🎉 HOÀN THÀNH!');

  } catch (error) {
    console.error('❌ Lỗi:', error.response?.data || error.message);
    console.error('Stack trace:', error.stack);
  }
}

recreateScheduleWithCorrectTeachers(); 