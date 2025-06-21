const XLSX = require('xlsx');

function createCleanExcel() {
  // Dữ liệu môn học - đảm bảo tất cả fields đều có
  const subjects = [
    {
      subjectName: 'Vietnamese Literature',
      subjectCode: 'NV',
      department: 'literature',
      category: 'core',
      weeklyHours: 3,
      gradeLevels: '10,11,12',
      credits: 3,
      description: 'Vietnamese language and literature subject'
    },
    {
      subjectName: 'Mathematics',
      subjectCode: 'MATH',
      department: 'mathematics',
      category: 'core',
      weeklyHours: 4,
      gradeLevels: '10,11,12',
      credits: 4,
      description: 'Basic and advanced mathematics subject'
    },
    {
      subjectName: 'English',
      subjectCode: 'TA',
      department: 'english',
      category: 'core',
      weeklyHours: 3,
      gradeLevels: '10,11,12',
      credits: 3,
      description: 'English foreign language subject'
    },
    {
      subjectName: 'Physics',
      subjectCode: 'VL',
      department: 'physics',
      category: 'core',
      weeklyHours: 2,
      gradeLevels: '10,11,12',
      credits: 2,
      description: 'Physics phenomena subject'
    },
    {
      subjectName: 'Chemistry',
      subjectCode: 'HH',
      department: 'chemistry',
      category: 'core',
      weeklyHours: 2,
      gradeLevels: '10,11,12',
      credits: 2,
      description: 'Basic chemistry subject'
    },
    {
      subjectName: 'Biology',
      subjectCode: 'SH',
      department: 'biology',
      category: 'elective',
      weeklyHours: 2,
      gradeLevels: '10,11,12',
      credits: 2,
      description: 'Biology and environment subject'
    },
    {
      subjectName: 'History',
      subjectCode: 'LS',
      department: 'history',
      category: 'elective',
      weeklyHours: 2,
      gradeLevels: '10,11,12',
      credits: 2,
      description: 'Vietnamese and world history subject'
    },
    {
      subjectName: 'Geography',
      subjectCode: 'DL',
      department: 'geography',
      category: 'elective',
      weeklyHours: 2,
      gradeLevels: '10,11,12',
      credits: 2,
      description: 'Natural and economic geography subject'
    },
    {
      subjectName: 'Civic Education',
      subjectCode: 'GDCD',
      department: 'civic_education',
      category: 'core',
      weeklyHours: 1,
      gradeLevels: '10,11,12',
      credits: 1,
      description: 'Ethics and law education subject'
    },
    {
      subjectName: 'Physical Education',
      subjectCode: 'GDTC',
      department: 'physical_education',
      category: 'core',
      weeklyHours: 2,
      gradeLevels: '10,11,12',
      credits: 2,
      description: 'Physical training subject'
    },
    {
      subjectName: 'National Defense Education',
      subjectCode: 'GDQP',
      department: 'other',
      category: 'core',
      weeklyHours: 1,
      gradeLevels: '10,11,12',
      credits: 1,
      description: 'National defense and security education subject'
    },
    {
      subjectName: 'Computer Science',
      subjectCode: 'TH',
      department: 'informatics',
      category: 'elective',
      weeklyHours: 1,
      gradeLevels: '10,11,12',
      credits: 1,
      description: 'Applied computer science subject'
    }
  ];

  // Validate dữ liệu trước khi tạo Excel
  console.log('🔍 Validating data...');
  subjects.forEach((subject, index) => {
    const rowNum = index + 2; // +2 vì row 1 là header
    console.log(`Row ${rowNum}: ${subject.subjectName}`);
    
    // Kiểm tra các field bắt buộc
    if (!subject.subjectName || subject.subjectName.trim() === '') {
      console.error(`❌ Row ${rowNum}: Missing subjectName`);
    }
    if (!subject.subjectCode || subject.subjectCode.trim() === '') {
      console.error(`❌ Row ${rowNum}: Missing subjectCode`);
    }
    if (!subject.gradeLevels || subject.gradeLevels.trim() === '') {
      console.error(`❌ Row ${rowNum}: Missing gradeLevels`);
    }
    
    // Kiểm tra độ dài subjectCode
    if (subject.subjectCode && (subject.subjectCode.length < 2 || subject.subjectCode.length > 6)) {
      console.error(`❌ Row ${rowNum}: Invalid subjectCode length: ${subject.subjectCode}`);
    }
  });

  // Tạo workbook
  const wb = XLSX.utils.book_new();
  
  // Tạo worksheet từ dữ liệu
  const ws = XLSX.utils.json_to_sheet(subjects);
  
  // Thiết lập độ rộng cột
  const colWidths = [
    { wch: 25 },  // subjectName
    { wch: 12 },  // subjectCode
    { wch: 18 },  // department
    { wch: 12 },  // category
    { wch: 12 },  // weeklyHours
    { wch: 12 },  // gradeLevels
    { wch: 8 },   // credits
    { wch: 40 }   // description
  ];
  ws['!cols'] = colWidths;
  
  // Thêm worksheet vào workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Import Format');
  
  // Lưu file
  XLSX.writeFile(wb, 'subjects-clean.xlsx');
  
  console.log('✅ Created subjects-clean.xlsx successfully!');
  console.log(`📚 Total subjects: ${subjects.length}`);
  
  // Verify bằng cách đọc lại file
  console.log('\n🔍 Verifying created file...');
  const verifyWb = XLSX.readFile('./subjects-clean.xlsx');
  const verifyWs = verifyWb.Sheets['Import Format'];
  const verifyData = XLSX.utils.sheet_to_json(verifyWs);
  
  verifyData.forEach((row, index) => {
    const rowNum = index + 2;
    if (!row.subjectName || !row.subjectCode || !row.gradeLevels) {
      console.error(`❌ Verification failed for Row ${rowNum}:`, {
        subjectName: row.subjectName,
        subjectCode: row.subjectCode,
        gradeLevels: row.gradeLevels
      });
    } else {
      console.log(`✅ Row ${rowNum}: ${row.subjectName} - OK`);
    }
  });
}

createCleanExcel(); 