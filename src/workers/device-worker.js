const { parentPort } = require('worker_threads');
const { Kafka } = require('kafkajs');
const config = require('../config');
const ImageGenerator = require('../services/ImageGenerator');
const StorageService = require('../services/StorageService');
const KafkaAdminService = require('../services/KafkaAdminService');

const kafka = new Kafka({
  clientId: `${config.kafka.clientId}-worker`,
  brokers: config.kafka.brokers
});

const producer = kafka.producer(config.kafka.producerConfig);
const kafkaAdmin = new KafkaAdminService();
const devices = new Map(); // deviceId -> intervalId
const imageGenerator = new ImageGenerator();
const storageService = new StorageService();

let isConnected = false;

function getRandomInterval() {
  const { minInterval, maxInterval } = config.device;
  return Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
}

async function generateEventPayload(deviceId) {
  const timestamp = new Date().toISOString();
  const imageData = imageGenerator.generateImage(deviceId);
  
  let savedImageInfo = null;
  if (config.storage.saveImages) {
    savedImageInfo = await storageService.saveImageFromBase64(
      imageData.base64,
      deviceId,
      imageData.position,
      timestamp
    );
  }
  
  return {
    deviceId,
    timestamp,
    value: Math.round((Math.random() * 100) * 100) / 100, // Random sensor value (2 decimal places)
    eventType: 'camera_capture',
    image: {
      base64: imageData.base64,
      position: imageData.position,
      dimensions: imageData.dimensions,
      format: imageData.format,
      size: Buffer.byteLength(imageData.base64, 'base64'),
      saved: savedImageInfo ? {
        filename: savedImageInfo.filename,
        filepath: savedImageInfo.filepath,
        diskSize: savedImageInfo.size
      } : null
    },
    device_text_crop: imageData.deviceTextCrop,
    background_colors: imageData.backgroundColors,
    metadata: {
      location: `zone_${Math.floor(Math.random() * 5) + 1}`,
      battery: Math.floor(Math.random() * 100) + 1,
      temperature: Math.round((Math.random() * 50 + 10) * 10) / 10, // 10-60°C
      humidity: Math.round((Math.random() * 80 + 20) * 10) / 10, // 20-100%
      cameraStatus: 'active',
      recordingMode: Math.random() > 0.5 ? 'continuous' : 'motion_detected'
    }
  };
}

async function emitFakeEvent(deviceId) {
  try {
    if (!isConnected) {
      await kafkaAdmin.ensureTopicExists(config.kafka.topic, config.kafka.retentionMs);
      
      await producer.connect();
      isConnected = true;
      console.log(`Kafka producer connected - topic retention: ${config.kafka.retentionMs}ms`);
    }

    const payload = await generateEventPayload(deviceId);

    await producer.send({
      topic: config.kafka.topic,
      messages: [{
        key: deviceId,
        value: JSON.stringify(payload),
        timestamp: Date.now().toString()
      }]
    });

    parentPort.postMessage({
      type: 'event-sent',
      deviceId,
      timestamp: payload.timestamp
    });

  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      error: error.message,
      deviceId
    });
  }
}

async function startDeviceLoop(deviceId) {
  if (devices.has(deviceId)) {
    return; // Device already running
  }

  async function loop() {
    try {
      await emitFakeEvent(deviceId);
      const nextInterval = getRandomInterval();
      const timeoutId = setTimeout(loop, nextInterval);
      devices.set(deviceId, timeoutId);
    } catch (error) {
      parentPort.postMessage({
        type: 'error',
        error: error.message,
        deviceId
      });
    }
  }

  await loop();
}

function stopDeviceLoop(deviceId) {
  const timeoutId = devices.get(deviceId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    devices.delete(deviceId);
    return true;
  }
  return false;
}

parentPort.on('message', async (message) => {
  try {
    switch (message.type) {
      case 'add-device':
        await startDeviceLoop(message.deviceId);
        break;
      
      case 'remove-device':
        const removed = stopDeviceLoop(message.deviceId);
        parentPort.postMessage({
          type: 'device-removed',
          deviceId: message.deviceId,
          success: removed
        });
        break;
      
      default:
        parentPort.postMessage({
          type: 'error',
          error: `Unknown message type: ${message.type}`
        });
    }
  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      error: error.message
    });
  }
});

// Graceful shutdown
async function shutdown() {
  console.log('Worker shutting down...');
  for (const [deviceId, loop] of deviceLoops.entries()) {
    clearTimeout(timeoutId);
  }
  devices.clear();
  
  if (isConnected) {
    await producer.disconnect();
    console.log('Kafka producer disconnected');
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);