const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function assignTeacherSubjects() {
  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'manager@ecoschool.com',
      password: 'manager123'
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed');
      return;
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');

    // Get subjects first
    console.log('\n📚 Getting subjects...');
    const subjectsResponse = await axios.get(`${BASE_URL}/subjects`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        limit: 50
      }
    });

    if (!subjectsResponse.data.success) {
      console.error('❌ Could not get subjects');
      return;
    }

    const subjects = subjectsResponse.data.data.subjects || [];
    console.log(`📖 Found ${subjects.length} subjects`);

    // Get teachers
    console.log('\n👨‍🏫 Getting teachers...');
    const usersResponse = await axios.get(`${BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        limit: 50
      }
    });

    if (!usersResponse.data.success) {
      console.error('❌ Could not get users');
      return;
    }

    const users = usersResponse.data.data.users || [];
    const teachers = users.filter(u => u.role.includes('teacher') || u.role.includes('homeroom_teacher'));
    console.log(`👥 Found ${teachers.length} teachers`);

    // Create subject-teacher mapping
    const subjectTeacherMapping = [
      { subjectName: 'Mathematics', teacherNames: ['Phạm Thị Lý', 'Trần Văn Nghĩa', 'Nguyễn Thị Đạo', 'Vũ Văn Đức'] },
      { subjectName: 'Vietnamese Literature', teacherNames: ['Lê Thị Xuân', 'Trần Văn Lộc', 'Nguyễn Thị Bích'] },
      { subjectName: 'English', teacherNames: ['Đỗ Văn Địa', 'Phạm Thị Oanh', 'Lê Văn Hiệp'] },
      { subjectName: 'Physics', teacherNames: ['Trần Thị Kim', 'Nguyễn Văn Sử'] },
      { subjectName: 'Chemistry', teacherNames: ['Phan Văn Minh', 'Lê Thị Thảo'] },
      { subjectName: 'Biology', teacherNames: ['Nguyễn Văn Phúc', 'Võ Thị Hương'] },
      { subjectName: 'History', teacherNames: ['Trần Văn Đại', 'Nguyễn Thị Yến'] },
      { subjectName: 'Geography', teacherNames: ['Bùi Văn Sơn', 'Đặng Thị Nga'] },
      { subjectName: 'Physical Education', teacherNames: ['Phạm Thị Lực', 'Lê Văn Khỏe', 'Trần Thị Thể', 'Nguyễn Văn Mạnh'] },
      { subjectName: 'Civic Education', teacherNames: ['Lý Văn Hùng'] },
      { subjectName: 'National Defense Education', teacherNames: ['Trung Tá Lê', 'Thiếu Tá Trần', 'Đại Tá Nguyễn'] },
      { subjectName: 'Computer Science', teacherNames: ['Phạm Thị App', 'Lê Văn Web', 'Trần Thị Code', 'Nguyễn Văn IT'] }
    ];

    console.log('\n🔗 Assigning subjects to teachers...');
    let assignmentCount = 0;

    // Process each mapping
    for (const mapping of subjectTeacherMapping) {
      const subject = subjects.find(s => s.subjectName === mapping.subjectName);
      if (!subject) {
        console.log(`⚠️ Subject '${mapping.subjectName}' not found`);
        continue;
      }

      console.log(`\n📚 Assigning ${mapping.subjectName} (${subject._id}):`);

      for (const teacherName of mapping.teacherNames) {
        const teacher = teachers.find(t => t.name === teacherName);
        if (!teacher) {
          console.log(`   ⚠️ Teacher '${teacherName}' not found`);
          continue;
        }

        try {
          // Update teacher with subject
          const updateResponse = await axios.put(`${BASE_URL}/users/${teacher._id}`, {
            subject: subject._id
          }, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (updateResponse.data.success) {
            console.log(`   ✅ ${teacherName} -> ${mapping.subjectName}`);
            assignmentCount++;
          } else {
            console.log(`   ❌ Failed to assign ${teacherName}: ${updateResponse.data.message}`);
          }

        } catch (error) {
          console.log(`   ❌ Error assigning ${teacherName}: ${error.response?.data?.message || error.message}`);
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n✅ Assignment completed! ${assignmentCount} teachers assigned subjects`);

    // Verify assignments
    console.log('\n🔍 Verifying assignments...');
    const verifyResponse = await axios.get(`${BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        limit: 50
      }
    });

    if (verifyResponse.data.success) {
      const updatedUsers = verifyResponse.data.data.users || [];
      const updatedTeachers = updatedUsers.filter(u => u.role.includes('teacher') || u.role.includes('homeroom_teacher'));
      const teachersWithSubjects = updatedTeachers.filter(t => t.subject);

      console.log(`📊 Verification results:`);
      console.log(`   Total teachers: ${updatedTeachers.length}`);
      console.log(`   Teachers with subjects: ${teachersWithSubjects.length}`);
      console.log(`   Teachers without subjects: ${updatedTeachers.length - teachersWithSubjects.length}`);

      if (teachersWithSubjects.length > 0) {
        console.log(`\n✅ Sample assignments:`);
        teachersWithSubjects.slice(0, 5).forEach(teacher => {
          const subjectInfo = teacher.subject ? 
            (typeof teacher.subject === 'object' ? teacher.subject.subjectName : teacher.subject) :
            'Unknown';
          console.log(`   ${teacher.name} -> ${subjectInfo}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

assignTeacherSubjects(); 