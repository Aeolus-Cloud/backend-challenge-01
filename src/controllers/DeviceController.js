class DeviceController {
  constructor(deviceService) {
    this.deviceService = deviceService;
  }

  async addDevice(req, res) {
    try {
      const { deviceId } = req.body;
      
      if (!deviceId) {
        return res.status(400).json({
          error: 'deviceId is required',
          code: 'MISSING_DEVICE_ID'
        });
      }

      if (typeof deviceId !== 'string' || deviceId.trim().length === 0) {
        return res.status(400).json({
          error: 'deviceId must be a non-empty string',
          code: 'INVALID_DEVICE_ID'
        });
      }

      const result = await this.deviceService.addDevice(deviceId.trim());
      res.status(201).json(result);
    } catch (error) {
      if (error.message === 'Device already exists') {
        return res.status(409).json({
          error: error.message,
          code: 'DEVICE_EXISTS'
        });
      }
      
      console.error('Error adding device:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async removeDevice(req, res) {
    try {
      const { deviceId } = req.params;
      
      const result = await this.deviceService.removeDevice(deviceId);
      res.status(200).json(result);
    } catch (error) {
      if (error.message === 'Device not found') {
        return res.status(404).json({
          error: error.message,
          code: 'DEVICE_NOT_FOUND'
        });
      }
      
      console.error('Error removing device:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async getDevices(req, res) {
    try {
      const devices = this.deviceService.getDevices();
      const count = this.deviceService.getDeviceCount();
      
      res.json({
        devices,
        count,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting devices:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async getDeviceStatus(req, res) {
    try {
      const { deviceId } = req.params;
      const devices = this.deviceService.getDevices();
      const isActive = devices.includes(deviceId);
      
      if (!isActive) {
        return res.status(404).json({
          error: 'Device not found',
          code: 'DEVICE_NOT_FOUND'
        });
      }

      res.json({
        deviceId,
        status: 'active',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting device status:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async getKafkaTopicInfo(req, res) {
    try {
      const KafkaAdminService = require('../services/KafkaAdminService');
      const config = require('../config');
      const kafkaAdmin = new KafkaAdminService();
      
      const topicInfo = await kafkaAdmin.getTopicInfo(config.kafka.topic);
      
      res.json({
        topic: config.kafka.topic,
        retentionMs: config.kafka.retentionMs,
        retentionHours: Math.round(config.kafka.retentionMs / 3600000),
        metadata: topicInfo.metadata,
        configs: topicInfo.configs,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting Kafka topic info:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = DeviceController;