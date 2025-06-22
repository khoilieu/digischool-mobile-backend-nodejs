const axios = require('axios');

async function checkCurlIssues() {
  try {
    console.log('🔍 Checking potential CURL issues...\n');
    
    // 1. Check server status
    console.log('1️⃣ Checking server status...');
    try {
      const healthCheck = await axios.get('http://localhost:3000/');
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server is not running - Please run: npm start');
      return;
    }
    
    // 2. Check login and token
    console.log('\n2️⃣ Checking login and token...');
    try {
      const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'manager@ecoschool.com',
        password: 'manager123'
      });
      
      const token = loginResponse.data.data.token;
      console.log('✅ Login successful');
      console.log('📝 Token preview:', token.substring(0, 20) + '...');
      
      // 3. Check classes data
      console.log('\n3️⃣ Checking classes data for grade 12...');
      try {
        const classesResponse = await axios.get('http://localhost:3000/api/schedules/classes-by-grade?academicYear=2024-2025&gradeLevel=12', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const classes = classesResponse.data.data.classes;
        console.log(`✅ Found ${classes.length} classes for grade 12:`);
        classes.forEach(cls => {
          console.log(`   - ${cls.className} (${cls.homeroomTeacher?.name || 'No homeroom teacher'})`);
        });
        
      } catch (classError) {
        console.log('❌ Error checking classes:', classError.response?.data?.message);
      }
      
      // 4. Check existing schedules
      console.log('\n4️⃣ Checking existing schedules...');
      try {
        const schedulesResponse = await axios.get('http://localhost:3000/api/schedules/available?academicYear=2024-2025', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const schedules = schedulesResponse.data.data.schedules;
        console.log(`📋 Found ${schedules.length} existing schedules:`);
        schedules.forEach(schedule => {
          console.log(`   - ${schedule.className} (${schedule.status})`);
        });
        
        if (schedules.length > 0) {
          console.log('\n⚠️  WARNING: Schedules already exist!');
          console.log('   The API will skip creating new schedules for existing classes.');
          console.log('   To recreate, delete existing schedules first.');
        }
        
      } catch (scheduleError) {
        console.log('❌ Error checking schedules:', scheduleError.response?.data?.message);
      }
      
      // 5. Test the initialize API
      console.log('\n5️⃣ Testing initialize API...');
      try {
        const initResponse = await axios.post('http://localhost:3000/api/schedules/initialize', {
          academicYear: '2024-2025',
          gradeLevel: 12,
          semester: 1
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Initialize API works!');
        console.log('📊 Summary:', initResponse.data.data.summary);
        
      } catch (initError) {
        console.log('❌ Initialize API failed:', initError.response?.data?.message);
        if (initError.response?.data?.errors) {
          console.log('   Validation errors:', initError.response.data.errors);
        }
      }
      
    } catch (loginError) {
      console.log('❌ Login failed:', loginError.response?.data?.message);
      console.log('   Please check your credentials or create a manager account');
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

// Helper function to show proper curl command
function showCurlCommand() {
  console.log('\n📋 Proper CURL command:');
  console.log('1. First, login to get token:');
  console.log(`curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "manager@ecoschool.com", "password": "manager123"}'`);
  
  console.log('\n2. Then use the token to initialize schedules:');
  console.log(`curl -X POST http://localhost:3000/api/schedules/initialize \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "academicYear": "2024-2025",
    "gradeLevel": 12,
    "semester": 1
  }'`);
}

// Run the check
checkCurlIssues().then(() => {
  showCurlCommand();
}).catch(console.error); 