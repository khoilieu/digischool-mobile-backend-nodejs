const XLSX = require('xlsx');

function debugExcelFile() {
  try {
    // Đọc file Excel
    const workbook = XLSX.readFile('./subjects-import-en.xlsx');
    
    console.log('📊 Available sheets:', workbook.SheetNames);
    
    // Đọc sheet "Import Format"
    const worksheet = workbook.Sheets['Import Format'];
    
    // Chuyển đổi thành JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('\n📋 Raw data from Excel:');
    data.forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
      
      // Kiểm tra row 10 cụ thể
      if (index === 10) { // Row 11 trong Excel (index 10)
        console.log(`\n🔍 Detailed check for Row ${index + 1}:`);
        console.log('  - Length:', row.length);
        console.log('  - subjectName (col 0):', `"${row[0]}"`, typeof row[0]);
        console.log('  - subjectCode (col 1):', `"${row[1]}"`, typeof row[1]);
        console.log('  - department (col 2):', `"${row[2]}"`, typeof row[2]);
        console.log('  - category (col 3):', `"${row[3]}"`, typeof row[3]);
        console.log('  - weeklyHours (col 4):', `"${row[4]}"`, typeof row[4]);
        console.log('  - gradeLevels (col 5):', `"${row[5]}"`, typeof row[5]);
        console.log('  - credits (col 6):', `"${row[6]}"`, typeof row[6]);
        console.log('  - description (col 7):', `"${row[7]}"`, typeof row[7]);
      }
    });
    
    console.log('\n📋 JSON format:');
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    jsonData.forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
      
      // Kiểm tra row có vấn đề
      if (index === 9) { // Row 10 trong data (index 9)
        console.log(`\n🔍 Detailed check for data Row ${index + 1}:`);
        console.log('  - subjectName:', `"${row.subjectName}"`, typeof row.subjectName);
        console.log('  - subjectCode:', `"${row.subjectCode}"`, typeof row.subjectCode);
        console.log('  - gradeLevels:', `"${row.gradeLevels}"`, typeof row.gradeLevels);
        console.log('  - Has subjectName?', !!row.subjectName);
        console.log('  - Has subjectCode?', !!row.subjectCode);
        console.log('  - Has gradeLevels?', !!row.gradeLevels);
      }
    });
    
  } catch (error) {
    console.error('❌ Error reading Excel file:', error);
  }
}

debugExcelFile(); 