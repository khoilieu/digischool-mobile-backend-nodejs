const XLSX = require('xlsx');

// Sample classes (based on what we found in database)
const classes = [
  { className: '10A1', academicYear: '2024-2025' },
  { className: '10A2', academicYear: '2024-2025' },
  { className: '11A1', academicYear: '2024-2025' },
  { className: '11A2', academicYear: '2024-2025' },
  { className: '12A1', academicYear: '2024-2025' },
  { className: '12A2', academicYear: '2024-2025' },
  { className: '12A4', academicYear: '2024-2025' }
];

// Vietnamese student names
const studentNames = [
  'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Minh Cường', 'Phạm Thị Dung',
  'Hoàng Văn Em', 'Đỗ Thị Phương', 'Vũ Minh Giang', 'Bùi Thị Hoa',
  'Nguyễn Văn Hùng', 'Trần Thị Lan', 'Lê Minh Khôi', 'Phạm Thị Linh',
  'Hoàng Văn Minh', 'Đỗ Thị Nga', 'Vũ Minh Quang', 'Bùi Thị Oanh',
  'Nguyễn Văn Phúc', 'Trần Thị Quỳnh', 'Lê Minh Sơn', 'Phạm Thị Thảo',
  'Hoàng Văn Tuấn', 'Đỗ Thị Uyên', 'Vũ Minh Việt', 'Bùi Thị Xuân',
  'Nguyễn Văn Yên', 'Trần Thị Zung', 'Lê Minh Anh', 'Phạm Thị Bảo'
];

function generateStudents() {
  const students = [];
  let studentIndex = 1;

  classes.forEach(classInfo => {
    const gradeLevel = parseInt(classInfo.className.substring(0, 2)); // Extract grade from className (10A1 -> 10)
    
    // Generate 4 students per class
    for (let i = 0; i < 4; i++) {
      const studentName = studentNames[(studentIndex - 1) % studentNames.length];
      
      // Create email from name
      const nameForEmail = studentName
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

      const email = `${nameForEmail}.stu@yopmail.com`;
      
      // Generate student ID (format: STU + year + grade + sequential number)
      const currentYear = new Date().getFullYear();
      const studentId = `STU${currentYear}${gradeLevel}${studentIndex.toString().padStart(3, '0')}`;
      
      // Generate birth date based on grade level
      // Grade 10: ~15-16 years old, Grade 11: ~16-17, Grade 12: ~17-18
      const baseAge = 15 + (gradeLevel - 10); // 15 for grade 10, 16 for grade 11, 17 for grade 12
      const birthYear = currentYear - baseAge - Math.floor(Math.random() * 2); // Add some variation
      const birthMonth = Math.floor(Math.random() * 12) + 1;
      const birthDay = Math.floor(Math.random() * 28) + 1;
      const dateOfBirth = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
      
      // Random gender
      const gender = Math.random() > 0.5 ? 'male' : 'female';
      
      students.push({
        name: studentName,
        email: email,
        studentId: studentId,
        className: classInfo.className,
        academicYear: classInfo.academicYear,
        dateOfBirth: dateOfBirth,
        gender: gender,
        active: true
      });
      
      studentIndex++;
    }
  });

  return students;
}

function createExcel() {
  const students = generateStudents();
  
  console.log(`Generating ${students.length} students...`);
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(students);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  
  // Write file
  const filename = 'students-import.xlsx';
  XLSX.writeFile(wb, filename);
  
  console.log(`✅ Created ${filename} with ${students.length} students`);
  console.log('\nSample students:');
  students.slice(0, 8).forEach((student, index) => {
    console.log(`${index + 1}. ${student.name} (${student.email})`);
    console.log(`   Student ID: ${student.studentId}`);
    console.log(`   Class: ${student.className} (${student.academicYear})`);
    console.log(`   Birth: ${student.dateOfBirth}, Gender: ${student.gender}`);
    console.log('   ---');
  });
  
  // Show distribution by class
  console.log('\nStudents per class:');
  const classCount = {};
  students.forEach(student => {
    classCount[student.className] = (classCount[student.className] || 0) + 1;
  });
  
  Object.entries(classCount).forEach(([className, count]) => {
    console.log(`${className}: ${count} students`);
  });

  console.log('\n📋 Excel structure:');
  console.log('Columns: name, email, studentId, className, academicYear, dateOfBirth, gender, active');
  console.log('✅ Ready for API import!');
}

createExcel(); 