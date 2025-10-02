const { Worker } = require('worker_threads');
const path = require('path');

class DeviceService {
  constructor() {
    this.devices = new Set();
    this.worker = null;
    this.initWorker();
  }

  initWorker() {
    this.worker = new Worker(path.join(__dirname, '../workers/device-worker.js'));
    
    this.worker.on('message', (message) => {
      this.handleWorkerMessage(message);
    });

    this.worker.on('error', (error) => {
      console.error('Worker thread error:', error);
    });

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      }
    });
  }

  handleWorkerMessage(message) {
    switch (message.type) {
      case 'event-sent':
        console.log(`Event sent for device ${message.deviceId} at ${message.timestamp}`);
        break;
      case 'device-removed':
        console.log(`Device ${message.deviceId} removed: ${message.success}`);
        break;
      case 'error':
        console.error(`Worker error for device ${message.deviceId}:`, message.error);
        break;
      default:
        console.log('Unknown worker message:', message);
    }
  }

  async addDevice(deviceId) {
    if (this.devices.has(deviceId)) {
      throw new Error('Device already exists');
    }

    this.worker.postMessage({
      type: 'add-device',
      deviceId
    });

    this.devices.add(deviceId);
    return { message: 'Device added and event loop started', deviceId };
  }

  async removeDevice(deviceId) {
    if (!this.devices.has(deviceId)) {
      throw new Error('Device not found');
    }

    this.worker.postMessage({
      type: 'remove-device',
      deviceId
    });

    this.devices.delete(deviceId);
    return { message: 'Device removed from event loop', deviceId };
  }

  getDevices() {
    return Array.from(this.devices);
  }

  getDeviceCount() {
    return this.devices.size;
  }

  async shutdown() {
    if (this.worker) {
      await this.worker.terminate();
    }
  }
}

module.exports = DeviceService;