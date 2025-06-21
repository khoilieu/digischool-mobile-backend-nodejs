const XLSX = require('xlsx');

function createSubjectsExcel() {
  // Dữ liệu môn học với key tiếng Anh
  const subjects = [
    {
      'No': 1,
      'Subject Name': 'Vietnamese Literature',
      'Subject Code': 'NV',
      'Department': 'literature',
      'Category': 'core',
      'Weekly Hours': 3,
      'Grade Levels': '10,11,12',
      'Credits': 3,
      'Estimated Annual Hours': 105,
      'Description': 'Vietnamese language and literature subject'
    },
    {
      'No': 2,
      'Subject Name': 'Mathematics',
      'Subject Code': 'MATH',
      'Department': 'mathematics',
      'Category': 'core',
      'Weekly Hours': 4,
      'Grade Levels': '10,11,12',
      'Credits': 4,
      'Estimated Annual Hours': 140,
      'Description': 'Basic and advanced mathematics subject'
    },
    {
      'No': 3,
      'Subject Name': 'English',
      'Subject Code': 'TA',
      'Department': 'english',
      'Category': 'core',
      'Weekly Hours': 3,
      'Grade Levels': '10,11,12',
      'Credits': 3,
      'Estimated Annual Hours': 105,
      'Description': 'English foreign language subject'
    },
    {
      'No': 4,
      'Subject Name': 'Physics',
      'Subject Code': 'VL',
      'Department': 'physics',
      'Category': 'core',
      'Weekly Hours': 2,
      'Grade Levels': '10,11,12',
      'Credits': 2,
      'Estimated Annual Hours': 70,
      'Description': 'Physics phenomena subject'
    },
    {
      'No': 5,
      'Subject Name': 'Chemistry',
      'Subject Code': 'HH',
      'Department': 'chemistry',
      'Category': 'core',
      'Weekly Hours': 2,
      'Grade Levels': '10,11,12',
      'Credits': 2,
      'Estimated Annual Hours': 70,
      'Description': 'Basic chemistry subject'
    },
    {
      'No': 6,
      'Subject Name': 'Biology',
      'Subject Code': 'SH',
      'Department': 'biology',
      'Category': 'elective',
      'Weekly Hours': 2,
      'Grade Levels': '10,11,12',
      'Credits': 2,
      'Estimated Annual Hours': 70,
      'Description': 'Biology and environment subject'
    },
    {
      'No': 7,
      'Subject Name': 'History',
      'Subject Code': 'LS',
      'Department': 'history',
      'Category': 'elective',
      'Weekly Hours': 2,
      'Grade Levels': '10,11,12',
      'Credits': 2,
      'Estimated Annual Hours': 70,
      'Description': 'Vietnamese and world history subject'
    },
    {
      'No': 8,
      'Subject Name': 'Geography',
      'Subject Code': 'DL',
      'Department': 'geography',
      'Category': 'elective',
      'Weekly Hours': 2,
      'Grade Levels': '10,11,12',
      'Credits': 2,
      'Estimated Annual Hours': 70,
      'Description': 'Natural and economic geography subject'
    },
    {
      'No': 9,
      'Subject Name': 'Civic Education',
      'Subject Code': 'GDCD',
      'Department': 'civic_education',
      'Category': 'core',
      'Weekly Hours': 1,
      'Grade Levels': '10,11,12',
      'Credits': 1,
      'Estimated Annual Hours': 35,
      'Description': 'Ethics and law education subject'
    },
    {
      'No': 10,
      'Subject Name': 'Physical Education',
      'Subject Code': 'GDTC',
      'Department': 'physical_education',
      'Category': 'core',
      'Weekly Hours': 2,
      'Grade Levels': '10,11,12',
      'Credits': 2,
      'Estimated Annual Hours': 70,
      'Description': 'Physical training subject'
    },
    {
      'No': 11,
      'Subject Name': 'National Defense Education',
      'Subject Code': 'GDQP',
      'Department': 'other',
      'Category': 'core',
      'Weekly Hours': 1,
      'Grade Levels': '10,11,12',
      'Credits': 1,
      'Estimated Annual Hours': 35,
      'Description': 'National defense and security education subject'
    },
    {
      'No': 12,
      'Subject Name': 'Computer Science',
      'Subject Code': 'TH',
      'Department': 'informatics',
      'Category': 'elective',
      'Weekly Hours': 1,
      'Grade Levels': '10,11,12',
      'Credits': 1,
      'Estimated Annual Hours': 35,
      'Description': 'Applied computer science subject'
    }
  ];

  // Tạo workbook
  const wb = XLSX.utils.book_new();
  
  // Tạo worksheet từ dữ liệu
  const ws = XLSX.utils.json_to_sheet(subjects);
  
  // Thiết lập độ rộng cột
  const colWidths = [
    { wch: 5 },   // No
    { wch: 25 },  // Subject Name
    { wch: 12 },  // Subject Code
    { wch: 18 },  // Department
    { wch: 12 },  // Category
    { wch: 12 },  // Weekly Hours
    { wch: 12 },  // Grade Levels
    { wch: 8 },   // Credits
    { wch: 20 },  // Estimated Annual Hours
    { wch: 40 }   // Description
  ];
  ws['!cols'] = colWidths;
  
  // Thêm worksheet vào workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Subject List');
  
  // Tạo sheet thứ 2 với format để import (key tiếng Anh)
  const importData = subjects.map(subject => ({
    subjectName: subject['Subject Name'],
    subjectCode: subject['Subject Code'],
    department: subject['Department'],
    category: subject['Category'],
    weeklyHours: subject['Weekly Hours'],
    gradeLevels: subject['Grade Levels'],
    credits: subject['Credits'],
    description: subject['Description']
  }));
  
  const wsImport = XLSX.utils.json_to_sheet(importData);
  wsImport['!cols'] = [
    { wch: 25 },  // subjectName
    { wch: 12 },  // subjectCode
    { wch: 18 },  // department
    { wch: 12 },  // category
    { wch: 12 },  // weeklyHours
    { wch: 12 },  // gradeLevels
    { wch: 8 },   // credits
    { wch: 40 }   // description
  ];
  
  XLSX.utils.book_append_sheet(wb, wsImport, 'Import Format');
  
  // Tạo sheet thứ 3 với thông tin về Subject model
  const modelInfo = [
    { Field: 'subjectName', Type: 'String', Required: 'Yes', Description: 'Subject name (unique)' },
    { Field: 'subjectCode', Type: 'String', Required: 'Yes', Description: 'Subject code (2-6 characters, unique)' },
    { Field: 'department', Type: 'Enum', Required: 'No', Description: 'mathematics, literature, english, science, physics, chemistry, biology, history, geography, civic_education, physical_education, arts, music, technology, informatics, foreign_language, other' },
    { Field: 'category', Type: 'Enum', Required: 'Yes', Description: 'core, elective, extra_curricular, vocational, special' },
    { Field: 'weeklyHours', Type: 'Number', Required: 'Yes', Description: 'Weekly hours (multiples of 0.5)' },
    { Field: 'gradeLevels', Type: 'Array[Number]', Required: 'Yes', Description: 'List of grade levels (1-12)' },
    { Field: 'credits', Type: 'Number', Required: 'No', Description: 'Number of credits (0-10)' },
    { Field: 'description', Type: 'String', Required: 'No', Description: 'Subject description (max 500 characters)' }
  ];
  
  const wsModel = XLSX.utils.json_to_sheet(modelInfo);
  wsModel['!cols'] = [
    { wch: 15 },  // Field
    { wch: 18 },  // Type
    { wch: 10 },  // Required
    { wch: 60 }   // Description
  ];
  
  XLSX.utils.book_append_sheet(wb, wsModel, 'Model Schema');
  
  // Lưu file
  XLSX.writeFile(wb, 'subjects-import-en.xlsx');
  
  console.log('✅ Created subjects-import-en.xlsx successfully!');
  console.log('📊 File contains:');
  console.log('  - Sheet 1: "Subject List" - Detailed view with all information');
  console.log('  - Sheet 2: "Import Format" - Ready for API import (English keys)');
  console.log('  - Sheet 3: "Model Schema" - Subject model field descriptions');
  console.log(`📚 Total subjects: ${subjects.length}`);
  
  // Hiển thị tổng số tiết
  const totalWeeklyHours = subjects.reduce((sum, subject) => sum + subject['Weekly Hours'], 0);
  console.log(`⏰ Total weekly hours: ${totalWeeklyHours} hours/week`);
  
  // Thống kê theo loại môn
  const coreSubjects = subjects.filter(s => s['Category'] === 'core');
  const electiveSubjects = subjects.filter(s => s['Category'] === 'elective');
  
  console.log('\n📈 Subject Statistics:');
  console.log(`  - Core subjects: ${coreSubjects.length} (${coreSubjects.reduce((sum, s) => sum + s['Weekly Hours'], 0)} hours/week)`);
  console.log(`  - Elective subjects: ${electiveSubjects.length} (${electiveSubjects.reduce((sum, s) => sum + s['Weekly Hours'], 0)} hours/week)`);
  
  // Thống kê theo khoa/bộ môn
  const departments = {};
  subjects.forEach(subject => {
    const dept = subject['Department'];
    if (!departments[dept]) {
      departments[dept] = { count: 0, hours: 0 };
    }
    departments[dept].count++;
    departments[dept].hours += subject['Weekly Hours'];
  });
  
  console.log('\n🏫 Department Statistics:');
  Object.entries(departments).forEach(([dept, stats]) => {
    console.log(`  - ${dept}: ${stats.count} subjects (${stats.hours} hours/week)`);
  });
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  try {
    createSubjectsExcel();
  } catch (error) {
    console.error('❌ Error creating Excel file:', error);
    console.log('💡 Make sure to install xlsx package: npm install xlsx');
  }
}

module.exports = createSubjectsExcel; 