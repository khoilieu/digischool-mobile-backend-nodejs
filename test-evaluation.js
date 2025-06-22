const mongoose = require('mongoose');
const Schedule = require('./src/modules/schedules/models/schedule.model');

async function testTemplate() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecoschool');
    console.log('🔍 Testing template creation...\n');
    
    // Tạo template test
    const template = Schedule.createTemplate(
      new mongoose.Types.ObjectId(), 
      '2024-2025', 
      new mongoose.Types.ObjectId()
    );
    
    console.log('📋 Template created successfully');
    console.log('Total weeks:', template.weeks.length);
    
    // Kiểm tra tuần đầu tiên
    const firstWeek = template.weeks[0];
    console.log('\n🗓️ First week:');
    console.log('Week number:', firstWeek.weekNumber);
    console.log('Days:', firstWeek.days.length);
    
    // Kiểm tra Saturday (days[5])
    const saturday = firstWeek.days[5];
    console.log('\n📅 Saturday details:');
    console.log('Day name:', saturday.dayName);
    console.log('Day of week:', saturday.dayOfWeek);
    console.log('Total periods:', saturday.periods.length);
    
    console.log('\n📝 Saturday periods:');
    saturday.periods.forEach(period => {
      console.log(`Period ${period.periodNumber}: type=${period.periodType}, subject=${period.subject}, teacher=${period.teacher}`);
    });
    
    // Kiểm tra periods 2,3,4,5 cụ thể
    const problematicPeriods = saturday.periods.filter(p => [2,3,4,5].includes(p.periodNumber));
    console.log('\n⚠️ Problematic periods (2,3,4,5):');
    problematicPeriods.forEach(period => {
      console.log(`Period ${period.periodNumber}:`, {
        type: period.periodType,
        subject: period.subject,
        teacher: period.teacher,
        session: period.session,
        timeStart: period.timeStart,
        timeEnd: period.timeEnd
      });
    });
    
    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.disconnect();
  }
}

testTemplate(); 