require('dotenv').config();

const axios = require('axios');

const DEFAULT_PORT = process.env.PORT || 3000;
const DEFAULT_SERVER_URL = `http://localhost:${DEFAULT_PORT}`;

const args = process.argv.slice(2);
const command = args[0];
const serverUrl = process.env.SERVER_URL || DEFAULT_SERVER_URL;

function showHelp() {
  console.log('🎥 Camera Management Script');
  console.log('===========================');
  console.log('');
  console.log('Usage: node scripts/manage-cameras.js <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  add <count> [pattern]    Add multiple cameras');
  console.log('  remove <deviceId>        Remove a specific camera');
  console.log('  remove-all              Remove all cameras');
  console.log('  list                    List all active cameras');
  console.log('  status <deviceId>       Get status of a specific camera');
  console.log('  health                  Check server health');
  console.log('  cleanup                 Cleanup stored images');
  console.log('  storage                 Show storage statistics');
  console.log('');
  console.log('Environment Variables:');
  console.log(`  SERVER_URL              Server URL (default: ${DEFAULT_SERVER_URL})`);
  console.log(`  PORT                    Server port from .env (current: ${DEFAULT_PORT})`);
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/manage-cameras.js add 10');
  console.log('  node scripts/manage-cameras.js list');
  console.log('  node scripts/manage-cameras.js remove CAM-001');
  console.log('  node scripts/manage-cameras.js health');
}

async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${serverUrl}/api${endpoint}`,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 'NETWORK_ERROR'
    };
  }
}

async function addCameras(count, pattern = 'sequential') {
  console.log(`📷 Adding ${count} cameras...`);
  console.log('─'.repeat(40));

  const patterns = {
    sequential: (i) => `CAM-${String(i).padStart(3, '0')}`,
    zone: (i) => `ZONE-${Math.ceil(i/4)}-CAM-${String((i-1)%4+1).padStart(2, '0')}`,
    floor: (i) => `FLOOR-${Math.ceil(i/8)}-CAM-${String(i).padStart(3, '0')}`
  };

  const patternFunc = patterns[pattern] || patterns.sequential;
  const promises = [];

  for (let i = 1; i <= count; i++) {
    const deviceId = patternFunc(i);
    promises.push(makeRequest('POST', '/devices', { deviceId }));
  }

  const results = await Promise.all(promises);
  
  let successCount = 0;
  let errorCount = 0;

  results.forEach((result, index) => {
    const deviceId = patternFunc(index + 1);
    if (result.success) {
      console.log(`✅ ${deviceId} - Added successfully`);
      successCount++;
    } else {
      console.log(`❌ ${deviceId} - Failed: ${result.error.error || result.error}`);
      errorCount++;
    }
  });

  console.log(`\n📊 Summary: ${successCount} added, ${errorCount} failed`);
}

async function removeCameraByid(deviceId) {
  console.log(`🗑️  Removing camera: ${deviceId}`);
  
  const result = await makeRequest('DELETE', `/devices/${deviceId}`);
  
  if (result.success) {
    console.log(`✅ ${deviceId} removed successfully`);
  } else {
    console.log(`❌ Failed to remove ${deviceId}: ${result.error.error || result.error}`);
  }
}

async function removeAllCameras() {
  console.log('🗑️  Removing all cameras...');
  
  // First, get list of all devices
  const listResult = await makeRequest('GET', '/devices');
  
  if (!listResult.success) {
    console.log('❌ Failed to get device list:', listResult.error);
    return;
  }

  const devices = listResult.data.devices || [];
  if (devices.length === 0) {
    console.log('📭 No cameras to remove');
    return;
  }

  console.log(`📊 Found ${devices.length} cameras to remove`);
  
  const promises = devices.map(device => 
    makeRequest('DELETE', `/devices/${device.deviceId}`)
  );

  const results = await Promise.all(promises);
  
  let successCount = 0;
  let errorCount = 0;

  results.forEach((result, index) => {
    const deviceId = devices[index].deviceId;
    if (result.success) {
      console.log(`✅ ${deviceId} - Removed`);
      successCount++;
    } else {
      console.log(`❌ ${deviceId} - Failed: ${result.error.error || result.error}`);
      errorCount++;
    }
  });

  console.log(`\n📊 Summary: ${successCount} removed, ${errorCount} failed`);
}

async function listCameras() {
  console.log('📋 Listing all cameras...');
  
  const result = await makeRequest('GET', '/devices');
  
  if (!result.success) {
    console.log('❌ Failed to get device list:', result.error);
    return;
  }

  const devices = result.data.devices || [];
  
  if (devices.length === 0) {
    console.log('📭 No cameras found');
    return;
  }

  console.log(`📊 Found ${devices.length} cameras:`);
  console.log('─'.repeat(50));

  devices.forEach((device, index) => {
    const status = device.active ? '🟢 Active' : '🔴 Inactive';
    const uptime = device.uptime ? `${Math.round(device.uptime)}s` : 'N/A';
    console.log(`${index + 1}. 📷 ${device.deviceId} - ${status} (${uptime})`);
  });
}

async function getCameraStatus(deviceId) {
  console.log(`📊 Getting status for camera: ${deviceId}`);
  
  const result = await makeRequest('GET', `/devices/${deviceId}/status`);
  
  if (!result.success) {
    console.log(`❌ Failed to get status: ${result.error.error || result.error}`);
    return;
  }

  const status = result.data;
  console.log('─'.repeat(40));
  console.log(`📷 Device ID: ${status.deviceId}`);
  console.log(`🔄 Status: ${status.active ? '🟢 Active' : '🔴 Inactive'}`);
  console.log(`⏱️  Uptime: ${Math.round(status.uptime || 0)}s`);
  console.log(`📊 Events Sent: ${status.eventsSent || 0}`);
  console.log(`⚡ Last Event: ${status.lastEventTime || 'Never'}`);
}

async function checkHealth() {
  console.log('🏥 Checking server health...');
  
  const result = await makeRequest('GET', '/health');
  
  if (!result.success) {
    console.log('❌ Server health check failed:', result.error);
    return;
  }

  const health = result.data;
  console.log('─'.repeat(40));
  console.log(`🟢 Status: ${health.status}`);
  console.log(`⏱️  Uptime: ${Math.round(health.uptime)}s`);
  console.log(`📷 Active Devices: ${health.activeDevices}`);
  console.log(`🕐 Timestamp: ${health.timestamp}`);
}

async function cleanupImages() {
  console.log('🧹 Cleaning up stored images...');
  
  const result = await makeRequest('POST', '/storage/cleanup');
  
  if (!result.success) {
    console.log('❌ Cleanup failed:', result.error);
    return;
  }

  const cleanup = result.data;
  console.log('─'.repeat(40));
  console.log(`🗑️  Files Deleted: ${cleanup.filesDeleted}`);
  console.log(`💾 Space Freed: ${cleanup.spaceFreed}`);
  console.log(`📁 Directories Cleaned: ${cleanup.directoriesCleaned}`);
}

async function getStorageStats() {
  console.log('💾 Getting storage statistics...');
  
  const result = await makeRequest('GET', '/storage/stats');
  
  if (!result.success) {
    console.log('❌ Failed to get storage stats:', result.error);
    return;
  }

  const stats = result.data;
  console.log('─'.repeat(40));
  console.log(`📁 Total Files: ${stats.totalFiles}`);
  console.log(`💾 Total Size: ${stats.totalSize}`);
  console.log(`📊 Images Per Device: ${stats.imagesPerDevice || 'N/A'}`);
  console.log(`🕐 Last Updated: ${stats.lastUpdated}`);
}

async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  console.log(`🎥 Camera Management - Server: ${serverUrl}`);
  console.log('');

  switch (command) {
    case 'add':
      const count = parseInt(args[1]) || 5;
      const pattern = args[2] || 'sequential';
      await addCameras(count, pattern);
      break;

    case 'remove':
      if (!args[1]) {
        console.log('❌ Device ID required. Usage: remove <deviceId>');
        return;
      }
      await removeCameraByid(args[1]);
      break;

    case 'remove-all':
      await removeAllCameras();
      break;

    case 'list':
      await listCameras();
      break;

    case 'status':
      if (!args[1]) {
        console.log('❌ Device ID required. Usage: status <deviceId>');
        return;
      }
      await getCameraStatus(args[1]);
      break;

    case 'health':
      await checkHealth();
      break;

    case 'cleanup':
      await cleanupImages();
      break;

    case 'storage':
      await getStorageStats();
      break;

    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log('Use "help" to see available commands');
  }
}

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

main().catch((error) => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});