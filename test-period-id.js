const mongoose = require('mongoose');
const Schedule = require('./src/modules/schedules/models/schedule.model');
const TeacherSchedule = require('./src/modules/schedules/models/teacher-schedule.model');

async function testPeriodId() {
  try {
    console.log('🔧 Testing periodId auto-generation...');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/ecoschool', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Test 1: Tạo Class Schedule và kiểm tra periodId
    console.log('\n📋 Test 1: Class Schedule periodId generation...');
    
    const classId = new mongoose.Types.ObjectId();
    const createdBy = new mongoose.Types.ObjectId();
    const academicYear = '2024-2025';
    
    const classSchedule = Schedule.createTemplate(classId, academicYear, createdBy);
    
    // Save để trigger pre-validate hook
    await classSchedule.save({ validateBeforeSave: false });
    
    // Kiểm tra một vài periods để xem periodId
    const firstWeek = classSchedule.weeks[0];
    const firstDay = firstWeek.days[0]; // Monday
    const firstPeriod = firstDay.periods[0]; // Period 1
    
    console.log('✅ Sample periodIds:');
    console.log(`   Week 1, Day 1 (Monday), Period 1: ${firstPeriod.periodId}`);
    console.log(`   Date: ${firstDay.date.toDateString()}`);
    console.log(`   DayOfWeek: ${firstDay.dayOfWeek}`);
    console.log(`   Period Number: ${firstPeriod.periodNumber}`);
    
    // Kiểm tra thêm một vài periods khác
    firstDay.periods.slice(0, 3).forEach((period, index) => {
      console.log(`   Period ${period.periodNumber}: ${period.periodId}`);
    });

    // Test 2: Tạo Teacher Schedule và kiểm tra periodId
    console.log('\n👨‍🏫 Test 2: Teacher Schedule periodId generation...');
    
    const teacherId = new mongoose.Types.ObjectId();
    const teacherSchedule = TeacherSchedule.createTemplate(teacherId, academicYear, createdBy);
    
    // Thêm một period thủ công để test
    const testPeriod = {
      _id: new mongoose.Types.ObjectId(),
      periodNumber: 1,
      class: classId,
      className: '12A1',
      subject: new mongoose.Types.ObjectId(),
      session: 'morning',
      timeStart: '07:00',
      timeEnd: '07:45',
      periodType: 'regular',
      status: 'scheduled'
    };
    
    teacherSchedule.weeks[0].days[0].periods.push(testPeriod);
    
    // Save để trigger pre-validate hook
    await teacherSchedule.save({ validateBeforeSave: false });
    
    const teacherPeriod = teacherSchedule.weeks[0].days[0].periods[0];
    console.log('✅ Teacher period periodId:', teacherPeriod.periodId);
    
    // Test 3: Kiểm tra format periodId
    console.log('\n🔍 Test 3: Analyzing periodId format...');
    
    const periodIdPattern = /^period(\d{2})_(\d)_(\d{2})(\d{2})(\d{4})$/;
    
    // Test với class schedule
    const classPeriodId = firstPeriod.periodId;
    const classMatch = classPeriodId.match(periodIdPattern);
    
    if (classMatch) {
      console.log('✅ Class Schedule periodId format is correct:');
      console.log(`   Full ID: ${classPeriodId}`);
      console.log(`   Period Number: ${classMatch[1]} (expected: ${String(firstPeriod.periodNumber).padStart(2, '0')})`);
      console.log(`   Day of Week: ${classMatch[2]} (expected: ${firstDay.dayOfWeek})`);
      console.log(`   Day: ${classMatch[3]}`);
      console.log(`   Month: ${classMatch[4]}`);
      console.log(`   Year: ${classMatch[5]}`);
    } else {
      console.log('❌ Class Schedule periodId format is incorrect:', classPeriodId);
    }
    
    // Test với teacher schedule nếu có periodId
    if (teacherPeriod.periodId) {
      const teacherMatch = teacherPeriod.periodId.match(periodIdPattern);
      
      if (teacherMatch) {
        console.log('✅ Teacher Schedule periodId format is correct:');
        console.log(`   Full ID: ${teacherPeriod.periodId}`);
        console.log(`   Period Number: ${teacherMatch[1]}`);
        console.log(`   Day of Week: ${teacherMatch[2]}`);
        console.log(`   Day: ${teacherMatch[3]}`);
        console.log(`   Month: ${teacherMatch[4]}`);
        console.log(`   Year: ${teacherMatch[5]}`);
      } else {
        console.log('❌ Teacher Schedule periodId format is incorrect:', teacherPeriod.periodId);
      }
    }
    
    // Test 4: Kiểm tra uniqueness
    console.log('\n🔄 Test 4: Checking periodId uniqueness...');
    
    const periodIds = new Set();
    let duplicateFound = false;
    
    classSchedule.weeks.slice(0, 2).forEach(week => {
      week.days.forEach(day => {
        day.periods.forEach(period => {
          if (period.periodId) {
            if (periodIds.has(period.periodId)) {
              console.log(`❌ Duplicate periodId found: ${period.periodId}`);
              duplicateFound = true;
            } else {
              periodIds.add(period.periodId);
            }
          }
        });
      });
    });
    
    if (!duplicateFound) {
      console.log(`✅ No duplicates found in ${periodIds.size} periods`);
    }
    
    // Test 5: Kiểm tra schema validation
    console.log('\n📋 Test 5: Schema validation...');
    
    try {
      await classSchedule.validate();
      console.log('✅ Class Schedule validation passed');
    } catch (validationError) {
      console.log('❌ Class Schedule validation failed:', validationError.message);
    }
    
    try {
      await teacherSchedule.validate();
      console.log('✅ Teacher Schedule validation passed');
    } catch (validationError) {
      console.log('❌ Teacher Schedule validation failed:', validationError.message);
    }
    
    console.log('\n🎉 All tests completed!');
    
    // Cleanup
    await Schedule.deleteOne({ _id: classSchedule._id });
    await TeacherSchedule.deleteOne({ _id: teacherSchedule._id });
    console.log('🧹 Test data cleaned up');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

testPeriodId(); 