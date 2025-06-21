const TimetableSchedulerService = require('./src/modules/schedules/services/timetable-scheduler.service');

// Mock data for testing
const mockClassId = '6855825a0672fea58658281d';
const mockAcademicYear = '2024-2025';

const mockSubjects = [
  { _id: '68556dc8811ba4a1cbce8c43', subjectName: 'Mathematics', weeklyHours: 4 },
  { _id: '68556dc8811ba4a1cbce8c46', subjectName: 'Vietnamese Literature', weeklyHours: 3 },
  { _id: '68556dc9811ba4a1cbce8c4c', subjectName: 'English', weeklyHours: 3 }
];

const mockTeachers = [
  { 
    _id: '68556dc8811ba4a1cbce8c01', 
    name: 'Nguyễn Văn A',
    subject: { _id: '68556dc8811ba4a1cbce8c43', subjectName: 'Mathematics' }
  },
  { 
    _id: '68556dc8811ba4a1cbce8c02', 
    name: 'Trần Thị B',
    subject: { _id: '68556dc8811ba4a1cbce8c46', subjectName: 'Vietnamese Literature' }
  },
  { 
    _id: '68556dc8811ba4a1cbce8c03', 
    name: 'Lê Văn C',
    subject: { _id: '68556dc9811ba4a1cbce8c4c', subjectName: 'English' }
  }
];

async function testTimetableScheduler() {
  try {
    console.log('🧪 Testing TimetableSchedulerService directly...');
    
    const scheduler = new TimetableSchedulerService();
    
    console.log('📊 Mock data:');
    console.log(`   Class ID: ${mockClassId}`);
    console.log(`   Academic Year: ${mockAcademicYear}`);
    console.log(`   Subjects: ${mockSubjects.length}`);
    console.log(`   Teachers: ${mockTeachers.length}`);
    
    // Test input validation
    console.log('\n🔍 Testing input validation...');
    const isValid = scheduler.validateInputs(mockSubjects, mockTeachers);
    console.log(`   Validation result: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (!isValid) {
      console.log('❌ Validation failed, stopping test');
      return;
    }
    
    // Test teacher-subject mapping
    console.log('\n🔗 Testing teacher-subject mapping...');
    const teacherSubjectMap = scheduler.createTeacherSubjectMap(mockTeachers);
    console.log(`   Map size: ${teacherSubjectMap.size}`);
    
    teacherSubjectMap.forEach((teachers, subjectId) => {
      console.log(`   Subject ${subjectId}: ${teachers.length} teachers`);
      teachers.forEach(teacher => {
        console.log(`     - ${teacher.name}`);
      });
    });
    
    // Test periods creation
    console.log('\n📅 Testing periods creation...');
    const periodsToSchedule = scheduler.createPeriodsToSchedule(mockSubjects, teacherSubjectMap);
    console.log(`   Total periods to schedule: ${periodsToSchedule.length}`);
    
    periodsToSchedule.forEach((period, index) => {
      console.log(`   Period ${index + 1}: ${period.subject.name} (${period.teachers.length} teachers)`);
    });
    
    // Test schedule initialization
    console.log('\n📋 Testing schedule initialization...');
    const emptySchedule = scheduler.initializeEmptySchedule(mockClassId, mockAcademicYear, mockTeachers[0]._id);
    console.log(`   Schedule created for class: ${emptySchedule.class}`);
    console.log(`   Academic year: ${emptySchedule.academicYear}`);
    console.log(`   Days in schedule: ${emptySchedule.schedule.length}`);
    
    // Test fixed periods
    console.log('\n🚩 Testing fixed periods...');
    scheduler.addFixedPeriods(emptySchedule, mockTeachers[0]._id);
    
    let fixedPeriodsCount = 0;
    emptySchedule.schedule.forEach((day, dayIndex) => {
      const fixedPeriods = day.periods.filter(p => p.fixed);
      if (fixedPeriods.length > 0) {
        console.log(`   Day ${dayIndex + 1} (${day.dayName}): ${fixedPeriods.length} fixed periods`);
        fixedPeriods.forEach(period => {
          console.log(`     - Period ${period.periodNumber}: ${period.specialType}`);
        });
        fixedPeriodsCount += fixedPeriods.length;
      }
    });
    console.log(`   Total fixed periods: ${fixedPeriodsCount}`);
    
    // Test full schedule generation
    console.log('\n🚀 Testing full schedule generation...');
    try {
      const fullSchedule = await scheduler.generateOptimalSchedule(
        mockClassId, 
        mockAcademicYear, 
        mockSubjects, 
        mockTeachers
      );
      
      console.log('✅ Schedule generation successful!');
      console.log(`   Schedule class: ${fullSchedule.class}`);
      console.log(`   Schedule status: ${fullSchedule.status}`);
      
      // Count scheduled periods
      let totalScheduledPeriods = 0;
      fullSchedule.schedule.forEach((day, dayIndex) => {
        const dayPeriods = day.periods.length;
        console.log(`   ${day.dayName}: ${dayPeriods} periods`);
        totalScheduledPeriods += dayPeriods;
      });
      
      console.log(`   Total scheduled periods: ${totalScheduledPeriods}`);
      
    } catch (scheduleError) {
      console.error(`❌ Schedule generation failed: ${scheduleError.message}`);
      console.error(`   Stack: ${scheduleError.stack}`);
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  }
}

testTimetableScheduler(); 