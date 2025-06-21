const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function debugGradeLevel() {
  try {
    // Login
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

    // Get classes
    console.log('\n📚 Getting classes...');
    const classesResponse = await axios.get(`${BASE_URL}/classes`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { limit: 5 }
    });

    if (!classesResponse.data.success) {
      console.error('❌ Could not get classes');
      return;
    }

    const classes = classesResponse.data.data.classes || [];
    console.log(`Found ${classes.length} classes:`);
    
    classes.forEach(cls => {
      console.log(`  - ${cls.className} (ID: ${cls._id})`);
      
      // Test grade extraction
      const match = cls.className.match(/^(\d+)/);
      const gradeLevel = match ? parseInt(match[1]) : 12;
      console.log(`    Grade level extracted: ${gradeLevel}`);
    });

    // Get subjects
    console.log('\n📖 Getting subjects...');
    const subjectsResponse = await axios.get(`${BASE_URL}/subjects`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { limit: 20 }
    });

    if (!subjectsResponse.data.success) {
      console.error('❌ Could not get subjects');
      return;
    }

    const subjects = subjectsResponse.data.data.subjects || [];
    console.log(`Found ${subjects.length} subjects:`);
    
    subjects.forEach(subject => {
      console.log(`  - ${subject.subjectName} (Grade levels: ${subject.gradeLevels})`);
    });

    // Test with first class
    if (classes.length > 0) {
      const testClass = classes[0];
      const gradeLevel = testClass.className.match(/^(\d+)/) ? parseInt(testClass.className.match(/^(\d+)/)[1]) : 12;
      
      console.log(`\n🎯 Testing with class: ${testClass.className}`);
      console.log(`Extracted grade level: ${gradeLevel}`);
      
      // Find subjects for this grade
      const gradeSubjects = subjects.filter(s => s.gradeLevels && s.gradeLevels.includes(gradeLevel));
      console.log(`Subjects for grade ${gradeLevel}: ${gradeSubjects.length}`);
      
      gradeSubjects.forEach(subject => {
        console.log(`  ✅ ${subject.subjectName} - Grade levels: [${subject.gradeLevels.join(', ')}]`);
      });

      // Get teachers
      console.log('\n👨‍🏫 Getting teachers...');
      const usersResponse = await axios.get(`${BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { limit: 50 }
      });

      if (usersResponse.data.success) {
        const users = usersResponse.data.data.users || [];
        const teachers = users.filter(u => u.role.includes('teacher') || u.role.includes('homeroom_teacher'));
        console.log(`Found ${teachers.length} teachers`);

        // Check teacher-subject mapping
        const teachersWithSubjects = teachers.filter(t => t.subject);
        console.log(`Teachers with subjects: ${teachersWithSubjects.length}`);
        
        teachersWithSubjects.slice(0, 10).forEach(teacher => {
          console.log(`  - ${teacher.name}: Subject ID ${teacher.subject}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
}

debugGradeLevel(); 