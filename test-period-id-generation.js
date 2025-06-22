const mongoose = require('mongoose');
const Schedule = require('./src/modules/schedules/models/schedule.model');
const TeacherSchedule = require('./src/modules/schedules/models/teacher-schedule.model');

const checkPeriodIds = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/eco_school', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('📱 Connected to MongoDB');

    // Lấy một schedule mới tạo
    const latestSchedule = await Schedule.findOne({ 
      academicYear: '2024-2025',
      status: 'active'
    }).sort({ createdAt: -1 });

    if (!latestSchedule) {
      console.log('❌ No schedule found');
      return;
    }

    console.log(`\n🎯 Checking periodIds in schedule for class: ${latestSchedule.className}`);
    
    let periodCount = 0;
    let periodIdExamples = [];
    
    // Kiểm tra periodId trong class schedule
    latestSchedule.weeks.forEach((week, weekIndex) => {
      week.days.forEach((day, dayIndex) => {
        day.periods.forEach(period => {
          if (period.periodId) {
            periodCount++;
            if (periodIdExamples.length < 10) {
              periodIdExamples.push({
                weekIndex: weekIndex + 1,
                dayIndex: dayIndex + 1,
                periodNumber: period.periodNumber,
                periodId: period.periodId,
                subject: period.subject,
                periodType: period.periodType
              });
            }
          }
        });
      });
    });

    console.log(`\n📊 Class Schedule Analysis:`);
    console.log(`- Total periods with periodId: ${periodCount}`);
    console.log(`\n🔍 PeriodId Examples:`);
    periodIdExamples.forEach(example => {
      console.log(`  Week ${example.weekIndex}, Day ${example.dayIndex}, Period ${example.periodNumber}: ${example.periodId}`);
    });

    // Kiểm tra teacher schedule
    const latestTeacherSchedule = await TeacherSchedule.findOne({
      academicYear: '2024-2025',
      status: 'active'
    }).sort({ createdAt: -1 });

    if (latestTeacherSchedule) {
      console.log(`\n👨‍🏫 Teacher Schedule Analysis:`);
      let teacherPeriodCount = 0;
      let teacherPeriodExamples = [];

      latestTeacherSchedule.weeks.forEach((week, weekIndex) => {
        week.days.forEach((day, dayIndex) => {
          day.periods.forEach(period => {
            if (period.periodId) {
              teacherPeriodCount++;
              if (teacherPeriodExamples.length < 5) {
                teacherPeriodExamples.push({
                  weekIndex: weekIndex + 1,
                  dayIndex: dayIndex + 1,
                  periodNumber: period.periodNumber,
                  periodId: period.periodId,
                  className: period.className,
                  status: period.status
                });
              }
            }
          });
        });
      });

      console.log(`- Total teacher periods with periodId: ${teacherPeriodCount}`);
      console.log(`\n🔍 Teacher PeriodId Examples:`);
      teacherPeriodExamples.forEach(example => {
        console.log(`  Week ${example.weekIndex}, Day ${example.dayIndex}, Period ${example.periodNumber}: ${example.periodId} (Class: ${example.className})`);
      });
    }

    // Validate periodId format
    const periodIdRegex = /^period\d{2}_\d_\d{8}$/;
    const validFormatCount = periodIdExamples.filter(p => periodIdRegex.test(p.periodId)).length;
    
    console.log(`\n✅ Format Validation:`);
    console.log(`- Valid format count: ${validFormatCount}/${periodIdExamples.length}`);
    console.log(`- Format pattern: period[XX]_[D]_[DDMMYYYY]`);
    
    if (validFormatCount === periodIdExamples.length) {
      console.log('🎉 All periodIds have correct format!');
    } else {
      console.log('⚠️ Some periodIds have incorrect format');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📱 Disconnected from MongoDB');
  }
};

checkPeriodIds(); 