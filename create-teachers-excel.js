const XLSX = require('xlsx');

// Subject data with ObjectIds from database
const subjects = [
  { id: '68556dc8811ba4a1cbce8c46', name: 'Vietnamese Literature', code: 'NV' },
  { id: '68556dc9811ba4a1cbce8c49', name: 'Mathematics', code: 'MATH' },
  { id: '68556dc9811ba4a1cbce8c4c', name: 'English', code: 'TA' },
  { id: '68556dc9811ba4a1cbce8c4f', name: 'Physics', code: 'VL' },
  { id: '68556dc9811ba4a1cbce8c52', name: 'Chemistry', code: 'HH' },
  { id: '68556dca811ba4a1cbce8c55', name: 'Biology', code: 'SH' },
  { id: '68556dca811ba4a1cbce8c58', name: 'History', code: 'LS' },
  { id: '68556dca811ba4a1cbce8c5b', name: 'Geography', code: 'DL' },
  { id: '68556dcb811ba4a1cbce8c5e', name: 'Civic Education', code: 'GDCD' },
  { id: '68556dcb811ba4a1cbce8c61', name: 'Physical Education', code: 'GDTC' },
  { id: '68556dcb811ba4a1cbce8c64', name: 'National Defense Education', code: 'GDQP' },
  { id: '68556dcb811ba4a1cbce8c67', name: 'Computer Science', code: 'TH' }
];

// Vietnamese teacher names for different subjects
const teacherNames = {
  'Vietnamese Literature': ['Nguyễn Văn Nam', 'Trần Thị Lan', 'Lê Minh Hoàng', 'Phạm Thị Mai'],
  'Mathematics': ['Hoàng Văn Tuấn', 'Đỗ Thị Hoa', 'Nguyễn Minh Đức', 'Vũ Thị Linh'],
  'English': ['Smith John', 'Nguyễn Thị Anh', 'Trần Văn Bình', 'Lê Thị Cẩm'],
  'Physics': ['Phạm Văn Khôi', 'Nguyễn Thị Dung', 'Trần Minh Tâm', 'Lý Văn Hùng'],
  'Chemistry': ['Đặng Thị Nga', 'Bùi Văn Sơn', 'Nguyễn Thị Yến', 'Trần Văn Đại'],
  'Biology': ['Võ Thị Hương', 'Nguyễn Văn Phúc', 'Lê Thị Thảo', 'Phan Văn Minh'],
  'History': ['Nguyễn Văn Sử', 'Trần Thị Kim', 'Lê Văn Hiệp', 'Phạm Thị Oanh'],
  'Geography': ['Đỗ Văn Địa', 'Nguyễn Thị Bích', 'Trần Văn Lộc', 'Lê Thị Xuân'],
  'Civic Education': ['Vũ Văn Đức', 'Nguyễn Thị Đạo', 'Trần Văn Nghĩa', 'Phạm Thị Lý'],
  'Physical Education': ['Nguyễn Văn Mạnh', 'Trần Thị Thể', 'Lê Văn Khỏe', 'Phạm Thị Lực'],
  'National Defense Education': ['Đại Tá Nguyễn', 'Thiếu Tá Trần', 'Trung Tá Lê'],
  'Computer Science': ['Nguyễn Văn IT', 'Trần Thị Code', 'Lê Văn Web', 'Phạm Thị App']
};

function generateTeachers() {
  const teachers = [];
  let teacherIndex = 1;

  subjects.forEach(subject => {
    const subjectTeachers = teacherNames[subject.name];
    const numTeachers = subject.name === 'National Defense Education' ? 3 : 4; // GDQP chỉ có 3 giáo viên
    
    for (let i = 0; i < numTeachers; i++) {
      const teacherName = subjectTeachers[i];
      const nameForEmail = teacherName
        .toLowerCase()
        .replace(/đ/g, 'd')
        .replace(/ă/g, 'a')
        .replace(/â/g, 'a')
        .replace(/á/g, 'a')
        .replace(/à/g, 'a')
        .replace(/ả/g, 'a')
        .replace(/ã/g, 'a')
        .replace(/ạ/g, 'a')
        .replace(/ấ/g, 'a')
        .replace(/ầ/g, 'a')
        .replace(/ẩ/g, 'a')
        .replace(/ẫ/g, 'a')
        .replace(/ậ/g, 'a')
        .replace(/ắ/g, 'a')
        .replace(/ằ/g, 'a')
        .replace(/ẳ/g, 'a')
        .replace(/ẵ/g, 'a')
        .replace(/ặ/g, 'a')
        .replace(/é/g, 'e')
        .replace(/è/g, 'e')
        .replace(/ẻ/g, 'e')
        .replace(/ẽ/g, 'e')
        .replace(/ẹ/g, 'e')
        .replace(/ê/g, 'e')
        .replace(/ế/g, 'e')
        .replace(/ề/g, 'e')
        .replace(/ể/g, 'e')
        .replace(/ễ/g, 'e')
        .replace(/ệ/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ì/g, 'i')
        .replace(/ỉ/g, 'i')
        .replace(/ĩ/g, 'i')
        .replace(/ị/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ò/g, 'o')
        .replace(/ỏ/g, 'o')
        .replace(/õ/g, 'o')
        .replace(/ọ/g, 'o')
        .replace(/ô/g, 'o')
        .replace(/ố/g, 'o')
        .replace(/ồ/g, 'o')
        .replace(/ổ/g, 'o')
        .replace(/ỗ/g, 'o')
        .replace(/ộ/g, 'o')
        .replace(/ơ/g, 'o')
        .replace(/ớ/g, 'o')
        .replace(/ờ/g, 'o')
        .replace(/ở/g, 'o')
        .replace(/ỡ/g, 'o')
        .replace(/ợ/g, 'o')
        .replace(/ú/g, 'u')
        .replace(/ù/g, 'u')
        .replace(/ủ/g, 'u')
        .replace(/ũ/g, 'u')
        .replace(/ụ/g, 'u')
        .replace(/ư/g, 'u')
        .replace(/ứ/g, 'u')
        .replace(/ừ/g, 'u')
        .replace(/ử/g, 'u')
        .replace(/ữ/g, 'u')
        .replace(/ự/g, 'u')
        .replace(/ý/g, 'y')
        .replace(/ỳ/g, 'y')
        .replace(/ỷ/g, 'y')
        .replace(/ỹ/g, 'y')
        .replace(/ỵ/g, 'y')
        .replace(/\s+/g, '')
        .replace(/[^a-z]/g, '');

      const email = `${nameForEmail}.teacher@yopmail.com`;
      
      // Generate birth date (age 25-55)
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - (25 + Math.floor(Math.random() * 30));
      const birthMonth = Math.floor(Math.random() * 12) + 1;
      const birthDay = Math.floor(Math.random() * 28) + 1;
      const dateOfBirth = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
      
      // Random gender
      const gender = Math.random() > 0.5 ? 'male' : 'female';
      
      teachers.push({
        name: teacherName,
        email: email,
        dateOfBirth: dateOfBirth,
        gender: gender,
        subjects: subject.id, // ObjectId của môn học
        active: true,
        role: 'teacher'
      });
      
      teacherIndex++;
    }
  });

  return teachers;
}

function createExcel() {
  const teachers = generateTeachers();
  
  console.log(`Generating ${teachers.length} teachers...`);
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(teachers);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Teachers');
  
  // Write file
  const filename = 'teachers-import.xlsx';
  XLSX.writeFile(wb, filename);
  
  console.log(`✅ Created ${filename} with ${teachers.length} teachers`);
  console.log('\nSample teachers:');
  teachers.slice(0, 5).forEach((teacher, index) => {
    console.log(`${index + 1}. ${teacher.name} (${teacher.email}) - Subject ID: ${teacher.subjects}`);
  });
  
  // Show distribution by subject
  console.log('\nTeachers per subject:');
  const subjectCount = {};
  teachers.forEach(teacher => {
    const subject = subjects.find(s => s.id === teacher.subjects);
    if (subject) {
      subjectCount[subject.name] = (subjectCount[subject.name] || 0) + 1;
    }
  });
  
  Object.entries(subjectCount).forEach(([subject, count]) => {
    console.log(`${subject}: ${count} teachers`);
  });
}

createExcel(); 