const XLSX = require('xlsx');

function verifyTeachersExcel() {
  try {
    const workbook = XLSX.readFile('teachers-import-fixed.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Excel File Verification`);
    console.log(`==========================`);
    console.log(`✅ Found ${data.length} teachers in Excel file`);
    console.log(`📄 Sheet name: ${sheetName}`);
    
    // Check columns
    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`\n📋 Columns found: ${columns.join(', ')}`);
      
      // Check required fields
      const requiredFields = ['name', 'email', 'subjectId'];
      const missingFields = requiredFields.filter(field => !columns.includes(field));
      
      if (missingFields.length === 0) {
        console.log('✅ All required fields present: name, email, subjectId');
      } else {
        console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
      }
    }
    
    console.log('\n👥 First 5 teachers:');
    console.log('===================');
    
    data.slice(0, 5).forEach((teacher, index) => {
      console.log(`${index + 1}. Name: ${teacher.name}`);
      console.log(`   Email: ${teacher.email}`);
      console.log(`   Subject ID: ${teacher.subjectId}`);
      console.log(`   Subject Name: ${teacher.subjectName}`);
      console.log(`   Birth: ${teacher.dateOfBirth}`);
      console.log(`   Gender: ${teacher.gender}`);
      console.log(`   Active: ${teacher.active}`);
      console.log('   ---');
    });
    
    // Count teachers per subject
    const subjectCounts = {};
    data.forEach(teacher => {
      const subjectName = teacher.subjectName;
      subjectCounts[subjectName] = (subjectCounts[subjectName] || 0) + 1;
    });
    
    console.log('\n📚 Teachers per Subject:');
    console.log('========================');
    Object.entries(subjectCounts).forEach(([subjectName, count]) => {
      console.log(`${subjectName}: ${count} teachers`);
    });
    
    // Check for unique emails
    const emails = data.map(t => t.email);
    const uniqueEmails = [...new Set(emails)];
    console.log(`\n📧 Email validation:`);
    console.log(`Total emails: ${emails.length}, Unique emails: ${uniqueEmails.length}`);
    
    if (emails.length !== uniqueEmails.length) {
      console.log('⚠️  Warning: Some emails are duplicated!');
      // Find duplicates
      const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
      console.log('Duplicate emails:', [...new Set(duplicates)]);
    } else {
      console.log('✅ All emails are unique');
    }
    
    // Check for valid ObjectIds
    const invalidIds = data.filter(teacher => !teacher.subjectId || !teacher.subjectId.match(/^[0-9a-fA-F]{24}$/));
    if (invalidIds.length > 0) {
      console.log(`\n❌ Found ${invalidIds.length} invalid Subject IDs`);
    } else {
      console.log(`\n✅ All Subject IDs are valid MongoDB ObjectIds`);
    }
    
    console.log('\n🎯 Summary:');
    console.log('===========');
    console.log(`Total teachers: ${data.length}`);
    console.log(`Total subjects covered: ${Object.keys(subjectCounts).length}`);
    console.log(`File ready for API import: ${missingFields.length === 0 && invalidIds.length === 0 ? '✅ YES' : '❌ NO'}`);
    
  } catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
  }
}

verifyTeachersExcel(); 