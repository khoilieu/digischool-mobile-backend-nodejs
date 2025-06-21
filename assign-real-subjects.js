const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function assignRealSubjects() {
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

    // Get real subjects from database
    console.log('\n📚 Getting real subjects from database...');
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
    console.log(`📖 Found ${subjects.length} real subjects:`);
    
    // Display subjects with their real IDs
    subjects.forEach(subject => {
      console.log(`   ${subject.subjectName} (${subject.subjectCode}) - ID: ${subject._id}`);
    });

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

    // Create mapping with REAL subject IDs
    const subjectTeacherMapping = [
      { 
        subjectName: 'Mathematics', 
        teacherNames: ['Phạm Thị Lý', 'Trần Văn Nghĩa', 'Nguyễn Thị Đạo', 'Vũ Văn Đức'],
        realSubjectId: subjects.find(s => s.subjectName === 'Mathematics')?._id
      },
      { 
        subjectName: 'Vietnamese Literature', 
        teacherNames: ['Lê Thị Xuân', 'Trần Văn Lộc', 'Nguyễn Thị Bích'],
        realSubjectId: subjects.find(s => s.subjectName === 'Vietnamese Literature')?._id
      },
      { 
        subjectName: 'English', 
        teacherNames: ['Đỗ Văn Địa', 'Phạm Thị Oanh', 'Lê Văn Hiệp'],
        realSubjectId: subjects.find(s => s.subjectName === 'English')?._id
      },
      { 
        subjectName: 'Physics', 
        teacherNames: ['Trần Thị Kim', 'Nguyễn Văn Sử'],
        realSubjectId: subjects.find(s => s.subjectName === 'Physics')?._id
      },
      { 
        subjectName: 'Chemistry', 
        teacherNames: ['Phan Văn Minh', 'Lê Thị Thảo'],
        realSubjectId: subjects.find(s => s.subjectName === 'Chemistry')?._id
      },
      { 
        subjectName: 'Biology', 
        teacherNames: ['Nguyễn Văn Phúc', 'Võ Thị Hương'],
        realSubjectId: subjects.find(s => s.subjectName === 'Biology')?._id
      },
      { 
        subjectName: 'History', 
        teacherNames: ['Trần Văn Đại', 'Nguyễn Thị Yến'],
        realSubjectId: subjects.find(s => s.subjectName === 'History')?._id
      },
      { 
        subjectName: 'Geography', 
        teacherNames: ['Bùi Văn Sơn', 'Đặng Thị Nga'],
        realSubjectId: subjects.find(s => s.subjectName === 'Geography')?._id
      },
      { 
        subjectName: 'Physical Education', 
        teacherNames: ['Phạm Thị Lực', 'Lê Văn Khỏe', 'Trần Thị Thể', 'Nguyễn Văn Mạnh'],
        realSubjectId: subjects.find(s => s.subjectName === 'Physical Education')?._id
      },
      { 
        subjectName: 'Civic Education', 
        teacherNames: ['Lý Văn Hùng'],
        realSubjectId: subjects.find(s => s.subjectName === 'Civic Education')?._id
      },
      { 
        subjectName: 'National Defense Education', 
        teacherNames: ['Trung Tá Lê', 'Thiếu Tá Trần', 'Đại Tá Nguyễn'],
        realSubjectId: subjects.find(s => s.subjectName === 'National Defense Education')?._id
      },
      { 
        subjectName: 'Computer Science', 
        teacherNames: ['Phạm Thị App', 'Lê Văn Web', 'Trần Thị Code', 'Nguyễn Văn IT'],
        realSubjectId: subjects.find(s => s.subjectName === 'Computer Science')?._id
      }
    ];

    console.log('\n🔗 Assigning REAL subject IDs to teachers...');
    let assignmentCount = 0;

    // Process each mapping with REAL subject IDs
    for (const mapping of subjectTeacherMapping) {
      if (!mapping.realSubjectId) {
        console.log(`⚠️ Subject '${mapping.subjectName}' not found in database`);
        continue;
      }

      console.log(`\n📚 Assigning ${mapping.subjectName} (REAL ID: ${mapping.realSubjectId}):`);

      for (const teacherName of mapping.teacherNames) {
        const teacher = teachers.find(t => t.name === teacherName);
        if (!teacher) {
          console.log(`   ⚠️ Teacher '${teacherName}' not found`);
          continue;
        }

        try {
          // Update teacher with REAL subject ID
          const updateResponse = await axios.put(`${BASE_URL}/users/${teacher.id}`, {
            subject: mapping.realSubjectId  // Use REAL subject ID from database
          }, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (updateResponse.data.success) {
            console.log(`   ✅ ${teacherName} -> ${mapping.subjectName} (${mapping.realSubjectId})`);
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

    console.log(`\n✅ Assignment completed! ${assignmentCount} teachers assigned with REAL subject IDs`);

    // Verify assignments
    console.log('\n🔍 Verifying assignments with REAL subject data...');
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
        console.log(`\n✅ Sample assignments with REAL subject IDs:`);
        teachersWithSubjects.slice(0, 8).forEach(teacher => {
          console.log(`   ${teacher.name} -> Subject ID: ${teacher.subject}`);
        });
      }
    }

    console.log('\n🎯 Ready to test schedule creation with REAL subject IDs!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

assignRealSubjects(); 