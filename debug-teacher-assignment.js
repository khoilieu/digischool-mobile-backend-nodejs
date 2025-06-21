const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDQ3NTYzMCwiZXhwIjoxNzUwNTYyMDMwfQ.mxMBe8OzD7XjHUBP-Oy8FQipSPcNm0CV61e-isxpLwI';

async function debugTeacherAssignment() {
  try {
    console.log('=== KIỂM TRA PHÂN CÔNG GIÁO VIÊN ===\n');

    // 1. Lấy thời khóa biểu lớp 12A3
    console.log('1. Kiểm tra thời khóa biểu lớp 12A3...');
    const scheduleResponse = await axios.get(`${BASE_URL}/schedules/class`, {
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

    const schedule = scheduleResponse.data.data.schedule;
    console.log(`Lớp: ${scheduleResponse.data.data.class.name}`);
    console.log(`Giáo viên chủ nhiệm: ${scheduleResponse.data.data.class.homeroomTeacher?.name || 'Chưa có'}`);
    
    // Phân tích môn học và giáo viên
    const subjectTeacherMap = {};
    const teacherSubjectCount = {};
    
    schedule.dailySchedule.forEach(day => {
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

    console.log('\n=== PHÂN TÍCH PHÂN CÔNG ===');
    console.log('\n2. Môn học và giáo viên dạy:');
    Object.entries(subjectTeacherMap).forEach(([subject, teachers]) => {
      const teacherList = Array.from(teachers);
      const status = teacherList.length > 1 ? '❌ SAI - Nhiều giáo viên' : '✅ ĐÚNG';
      console.log(`   ${subject}: ${teacherList.join(', ')} ${status}`);
    });

    console.log('\n3. Số môn mỗi giáo viên dạy:');
    Object.entries(teacherSubjectCount).forEach(([teacher, subjects]) => {
      const subjectList = Array.from(subjects);
      console.log(`   ${teacher}: ${subjectList.length} môn (${subjectList.join(', ')})`);
    });

    // 4. Kiểm tra thông tin lớp và giáo viên chủ nhiệm
    console.log('\n4. Kiểm tra thông tin lớp...');
    const classResponse = await axios.get(`${BASE_URL}/classes`, {
      params: {
        className: '12A3',
        academicYear: '2024-2025'
      },
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    });

    if (classResponse.data.data.classes.length > 0) {
      const classInfo = classResponse.data.data.classes[0];
      console.log(`Lớp: ${classInfo.className}`);
      console.log(`Chủ nhiệm: ${classInfo.homeroomTeacher?.name || 'Chưa có'}`);
      console.log(`Môn chuyên môn chủ nhiệm: ${classInfo.homeroomTeacher?.subjects?.map(s => s.subjectName).join(', ') || 'Chưa có'}`);
    }

    // 5. Lấy danh sách giáo viên và môn dạy
    console.log('\n5. Danh sách tất cả giáo viên và môn dạy...');
    const teachersResponse = await axios.get(`${BASE_URL}/users/teachers`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    });

    console.log('\nDanh sách giáo viên:');
    teachersResponse.data.data.teachers.forEach(teacher => {
      const subjects = teacher.subjects?.map(s => s.subjectName).join(', ') || 'Chưa có môn';
      const isHomeroom = teacher.homeroomClass ? `(Chủ nhiệm ${teacher.homeroomClass})` : '';
      console.log(`   ${teacher.name}: ${subjects} ${isHomeroom}`);
    });

  } catch (error) {
    console.error('Lỗi:', error.response?.data || error.message);
  }
}

debugTeacherAssignment(); 