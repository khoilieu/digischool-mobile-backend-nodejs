const mongoose = require('mongoose');
require('dotenv').config();

// Import models and services
const Schedule = require('./src/modules/schedules/models/schedule.model');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function testPeriodTypeManagement() {
  try {
    console.log('\n🧪 TESTING PERIOD TYPE MANAGEMENT FEATURES');
    console.log('=' * 60);

    // Find an existing schedule to test with
    const schedule = await Schedule.findOne({ status: 'active' })
      .populate('class', 'className')
      .populate('schedule.periods.subject', 'subjectName')
      .populate('schedule.periods.teacher', 'name');

    if (!schedule) {
      console.log('❌ No active schedule found for testing');
      return;
    }

    console.log(`\n📚 Testing with class: ${schedule.class.className}`);
    console.log(`📅 Academic Year: ${schedule.academicYear}`);

    // Test period type statistics
    console.log('\n🔍 Testing Period Type Statistics');
    const stats = schedule.getPeriodTypeStatistics();
    console.log('Period Type Statistics:', JSON.stringify(stats, null, 2));

    console.log('\n✅ Period Type Management Testing Completed');
    
  } catch (error) {
    console.error('❌ Error testing period type management:', error);
  }
}

async function main() {
  await connectDB();
  await testPeriodTypeManagement();
  await mongoose.disconnect();
  console.log('\n👋 Testing completed');
}

main().catch(console.error); 