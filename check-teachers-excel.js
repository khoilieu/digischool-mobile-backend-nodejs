const XLSX = require('xlsx');

function checkTeachersExcel() {
  try {
    const workbook = XLSX.readFile('teachers-import.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ Found ${data.length} teachers in Excel file`);
    console.log('\nFirst 10 teachers:');
    console.log('==================');
    
    data.slice(0, 10).forEach((teacher, index) => {
      console.log(`${index + 1}. Name: ${teacher.name}`);
      console.log(`   Email: ${teacher.email}`);
      console.log(`   Birth: ${teacher.dateOfBirth}`);
      console.log(`   Gender: ${teacher.gender}`);
      console.log(`   Subject ID: ${teacher.subjects}`);
      console.log(`   Active: ${teacher.active}`);
      console.log(`   Role: ${teacher.role}`);
      console.log('   ---');
    });
    
    // Count teachers per subject
    const subjectCounts = {};
    data.forEach(teacher => {
      const subjectId = teacher.subjects;
      subjectCounts[subjectId] = (subjectCounts[subjectId] || 0) + 1;
    });
    
    console.log('\nTeachers per Subject ID:');
    console.log('========================');
    Object.entries(subjectCounts).forEach(([subjectId, count]) => {
      console.log(`${subjectId}: ${count} teachers`);
    });
    
    // Check for unique emails
    const emails = data.map(t => t.email);
    const uniqueEmails = [...new Set(emails)];
    console.log(`\n📧 Total emails: ${emails.length}, Unique emails: ${uniqueEmails.length}`);
    
    if (emails.length !== uniqueEmails.length) {
      console.log('⚠️  Warning: Some emails are duplicated!');
    } else {
      console.log('✅ All emails are unique');
    }
    
  } catch (error) {
    console.error('Error reading Excel file:', error.message);
  }
}

checkTeachersExcel(); 