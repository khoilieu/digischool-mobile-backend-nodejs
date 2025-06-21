const mongoose = require('mongoose');
const fs = require('fs');
const Subject = require('./src/modules/subjects/models/subject.model');

async function importSubjects() {
  try {
    // Kết nối database
    await mongoose.connect('mongodb://localhost:27017/ecoschool', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('🔗 Connected to MongoDB');
    
    // Đọc file CSV
    const csvData = fs.readFileSync('./subjects-import.csv', 'utf8');
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    
    console.log('📊 Headers:', headers);
    
    // Xóa các môn học cũ (nếu muốn)
    const deleteOld = false; // Đặt true nếu muốn xóa môn học cũ
    if (deleteOld) {
      await Subject.deleteMany({});
      console.log('🗑️ Deleted old subjects');
    }
    
    const subjects = [];
    
    // Parse CSV data
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV với quote handling
      const values = parseCSVLine(line);
      
      // Parse gradeLevels từ string "10,11,12" thành array [10,11,12]
      const gradeLevelsStr = values[5].replace(/"/g, ''); // Remove quotes
      const gradeLevels = gradeLevelsStr.split(',').map(g => parseInt(g.trim()));
      
      const subject = {
        subjectName: values[0],
        subjectCode: values[1],
        department: values[2],
        category: values[3],
        weeklyHours: parseFloat(values[4]),
        gradeLevels: gradeLevels,
        credits: parseInt(values[6]),
        description: values[7],
        isActive: true
      };
      
      subjects.push(subject);
    }
    
    console.log(`📚 Found ${subjects.length} subjects to import:`);
    subjects.forEach((subject, index) => {
      console.log(`${index + 1}. ${subject.subjectName} (${subject.subjectCode}) - ${subject.weeklyHours} tiết/tuần - Lớp ${subject.gradeLevels.join(',')}`);
    });
    
    // Import vào database
    const results = [];
    for (const subjectData of subjects) {
      try {
        // Kiểm tra xem môn học đã tồn tại chưa
        const existing = await Subject.findOne({
          $or: [
            { subjectCode: subjectData.subjectCode },
            { subjectName: subjectData.subjectName }
          ]
        });
        
        if (existing) {
          console.log(`⚠️ Subject ${subjectData.subjectName} already exists, updating...`);
          Object.assign(existing, subjectData);
          await existing.save();
          results.push({ action: 'updated', subject: existing });
        } else {
          const newSubject = new Subject(subjectData);
          await newSubject.save();
          console.log(`✅ Created subject: ${newSubject.subjectName}`);
          results.push({ action: 'created', subject: newSubject });
        }
      } catch (error) {
        console.error(`❌ Error with subject ${subjectData.subjectName}:`, error.message);
        results.push({ action: 'error', subject: subjectData, error: error.message });
      }
    }
    
    console.log('\n📈 Import Summary:');
    const created = results.filter(r => r.action === 'created').length;
    const updated = results.filter(r => r.action === 'updated').length;
    const errors = results.filter(r => r.action === 'error').length;
    
    console.log(`✅ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    
    if (errors > 0) {
      console.log('\n❌ Error details:');
      results.filter(r => r.action === 'error').forEach(result => {
        console.log(`  - ${result.subject.subjectName}: ${result.error}`);
      });
    }
    
    // Hiển thị danh sách môn học trong database
    const allSubjects = await Subject.find({ isActive: true }).sort({ subjectCode: 1 });
    console.log('\n📚 All subjects in database:');
    allSubjects.forEach((subject, index) => {
      console.log(`${index + 1}. ${subject.subjectName} (${subject.subjectCode}) - ${subject.weeklyHours} tiết/tuần - ${subject.category} - Lớp ${subject.gradeLevels.join(',')}`);
    });
    
    // Thống kê
    const totalWeeklyHours = allSubjects.reduce((sum, subject) => sum + subject.weeklyHours, 0);
    console.log(`\n⏰ Total weekly hours: ${totalWeeklyHours} tiết/tuần`);
    
    const coreSubjects = allSubjects.filter(s => s.category === 'core');
    const electiveSubjects = allSubjects.filter(s => s.category === 'elective');
    
    console.log('\n📊 Statistics:');
    console.log(`  - Core subjects: ${coreSubjects.length} (${coreSubjects.reduce((sum, s) => sum + s.weeklyHours, 0)} tiết/tuần)`);
    console.log(`  - Elective subjects: ${electiveSubjects.length} (${electiveSubjects.reduce((sum, s) => sum + s.weeklyHours, 0)} tiết/tuần)`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Helper function to parse CSV line with quote handling
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

importSubjects(); 