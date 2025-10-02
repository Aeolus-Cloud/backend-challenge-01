require('dotenv').config();

const express = require('express');
const config = require('./config');
const { router, deviceService } = require('./routes');

const app = express();
const { port, host } = config.server;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api', router);

app.get('/', (req, res) => {
  res.json({
    name: 'Device Event API',
    version: '1.0.0',
    description: 'Express API that generates fake device events using worker threads',
    endpoints: {
      health: '/api/health',
      devices: {
        list: 'GET /api/devices',
        add: 'POST /api/devices',
        remove: 'DELETE /api/devices/:deviceId',
        status: 'GET /api/devices/:deviceId/status'
      }
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND'
  });
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await deviceService.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await deviceService.shutdown();
  process.exit(0);
});

const server = app.listen(port, host, () => {
  console.log(`🚀 Server running on http://${config.server.host}:${config.server.port}`);
  console.log(`📊 Kafka brokers: ${config.kafka.brokers.join(', ')}`);
  console.log(`📡 Kafka topic: ${config.kafka.topic}`);
  console.log(`⏱️  Event interval: ${config.device.minInterval}ms - ${config.device.maxInterval}ms`);
});

module.exports = { app, server };