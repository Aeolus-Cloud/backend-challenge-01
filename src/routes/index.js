const express = require('express');
const DeviceController = require('../controllers/DeviceController');
const DeviceService = require('../services/DeviceService');

const router = express.Router();
const deviceService = new DeviceService();
const deviceController = new DeviceController(deviceService);

router.post('/devices', (req, res) => deviceController.addDevice(req, res));
router.delete('/devices/:deviceId', (req, res) => deviceController.removeDevice(req, res));
router.get('/devices', (req, res) => deviceController.getDevices(req, res));
router.get('/devices/:deviceId/status', (req, res) => deviceController.getDeviceStatus(req, res));

router.get('/kafka/topic-info', (req, res) => deviceController.getKafkaTopicInfo(req, res));

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeDevices: deviceService.getDeviceCount()
  });
});

module.exports = { router, deviceService };