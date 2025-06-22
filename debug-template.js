const mongoose = require('mongoose');
const Schedule = require('./src/modules/schedules/models/schedule.model');

async function debugTemplate() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecoschool');
    console.log('🔍 Testing createTemplate method directly...\n');
    
    // Test createTemplate
    const template = Schedule.createTemplate(
      new mongoose.Types.ObjectId(),
      '2024-2025',
      new mongoose.Types.ObjectId()
    );
    
    console.log('📋 Template created successfully!');
    console.log(`Total weeks: ${template.weeks.length}`);
    
    // Check first week structure
    const firstWeek = template.weeks[0];
    console.log(`\n📅 First week (${firstWeek.weekNumber}):`);
    console.log(`Start date: ${firstWeek.startDate}`);
    console.log(`End date: ${firstWeek.endDate}`);
    console.log(`Days: ${firstWeek.days.length}`);
    
    // Check Saturday (day 5, index 5)
    const saturday = firstWeek.days[5]; // Saturday
    console.log(`\n🗓️ Saturday (${saturday.dayName}):`);
    console.log(`Day of week: ${saturday.dayOfWeek}`);
    console.log(`Total periods: ${saturday.periods.length}`);
    
    // Check each period on Saturday
    saturday.periods.forEach(period => {
      console.log(`Period ${period.periodNumber}: ${period.periodType} | Subject: ${period.subject} | Teacher: ${period.teacher}`);
    });
    
    // Try to save the template
    console.log('\n💾 Attempting to save template...');
    const savedTemplate = await template.save();
    console.log('✅ Template saved successfully!');
    console.log(`Saved ID: ${savedTemplate._id}`);
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

debugTemplate(); 