#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');

// 🔑 Thay đổi AUTH_TOKEN của bạn ở đây
const AUTH_TOKEN = '312VgPv0sjaREsLlwocXberAzPu_4AHHxNDeRJ4Eb5Y9e1GNq';

console.log('🚀 Starting ngrok tunnel for backend...');

// Kiểm tra server
function checkServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:8080', (res) => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });
}

async function startNgrok() {
  // Kiểm tra server
  console.log('🔍 Checking if backend server is running...');
  if (!(await checkServer())) {
    console.log('❌ Backend server is not running on port 8080');
    console.log('💡 Please start the server first with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Backend server is running on port 8080');
  
  // Kiểm tra AUTH_TOKEN
  if (!AUTH_TOKEN || AUTH_TOKEN === 'YOUR_NGROK_AUTH_TOKEN_HERE') {
    console.log('❌ Please update AUTH_TOKEN in this file');
    process.exit(1);
  }
  
  console.log('🔑 Setting up ngrok authtoken...');
  
  // Set authtoken và chạy ngrok
  const setToken = spawn('ngrok', ['config', 'add-authtoken', AUTH_TOKEN], { stdio: 'inherit' });
  
  setToken.on('close', (code) => {
    if (code === 0) {
      console.log('✅ ngrok authtoken configured successfully');
      console.log('🔗 Starting ngrok tunnel...');
      
      const ngrok = spawn('ngrok', ['http', '8080'], { stdio: 'inherit' });
      
      ngrok.on('error', (error) => {
        console.error('❌ Failed to start ngrok:', error.message);
        process.exit(1);
      });
      
      process.on('SIGINT', () => {
        console.log('\n🛑 Stopping ngrok tunnel...');
        ngrok.kill('SIGINT');
        process.exit(0);
      });
    } else {
      console.log('❌ Failed to configure ngrok authtoken');
      process.exit(1);
    }
  });
}

startNgrok().catch(console.error);
