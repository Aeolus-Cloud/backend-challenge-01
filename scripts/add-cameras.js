require('dotenv').config();

const axios = require('axios');

const DEFAULT_PORT = process.env.PORT || 3000;
const DEFAULT_SERVER_URL = `http://localhost:${DEFAULT_PORT}`;
const DEFAULT_CAMERA_COUNT = 5;

const args = process.argv.slice(2);
const cameraCount = parseInt(args[0]) || DEFAULT_CAMERA_COUNT;
const serverUrl = args[1] || DEFAULT_SERVER_URL;

console.log('🎥 Camera Addition Script');
console.log('========================');
console.log(`📊 Adding ${cameraCount} cameras to ${serverUrl}`);
console.log('');

async function addCamera(deviceId) {
  try {
    const response = await axios.post(`${serverUrl}/api/devices`, {
      deviceId: deviceId
    }, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      deviceId,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      deviceId,
      error: error.response?.data || error.message,
      status: error.response?.status || 'NETWORK_ERROR'
    };
  }
}

async function checkServerHealth() {
  try {
    const response = await axios.get(`${serverUrl}/api/health`, { timeout: 3000 });
    console.log('✅ Server is healthy');
    console.log(`   • Status: ${response.data.status}`);
    console.log(`   • Uptime: ${Math.round(response.data.uptime)}s`);
    console.log(`   • Active Devices: ${response.data.activeDevices}`);
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Server health check failed:', error.message);
    console.error(`   • Make sure the server is running on ${serverUrl}`);
    return false;
  }
}

function generateDeviceId(index) {
  const prefixes = ['CAM', 'CAMERA', 'DEVICE', 'SENSOR', 'NODE'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const paddedIndex = String(index).padStart(3, '0');
  return `${prefix}-${paddedIndex}`;
}

async function addMultipleCameras() {
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    process.exit(1);
  }

  console.log(`📷 Adding ${cameraCount} cameras...`);
  console.log('─'.repeat(50));

  const results = [];
  const promises = [];

  // Create all camera addition promises
  for (let i = 1; i <= cameraCount; i++) {
    const deviceId = generateDeviceId(i);
    promises.push(addCamera(deviceId));
  }

  // Execute all requests concurrently
  try {
    const responses = await Promise.all(promises);
    
    let successCount = 0;
    let errorCount = 0;

    responses.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ ${result.deviceId} - Added successfully`);
        successCount++;
      } else {
        console.log(`❌ ${result.deviceId} - Failed: ${result.error.error || result.error}`);
        errorCount++;
      }
      results.push(result);
    });

    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Successfully added: ${successCount} cameras`);
    console.log(`   • Failed: ${errorCount} cameras`);
    console.log(`   • Total attempted: ${cameraCount} cameras`);

    console.log('');
    console.log('🔍 Final server status:');
    await checkServerHealth();

  } catch (error) {
    console.error('❌ Batch operation failed:', error.message);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

addMultipleCameras().catch((error) => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});