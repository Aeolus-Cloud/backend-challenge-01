module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  kafka: {
    clientId: 'device-event-producer',
    brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
    topic: process.env.KAFKA_TOPIC || 'device-events',
    // Data retention settings
    retentionMs: parseInt(process.env.KAFKA_RETENTION_MS) || 3600000, // Default 1 hour
    retentionBytes: parseInt(process.env.KAFKA_RETENTION_BYTES) || -1, // No size limit by default
    // Configuration for handling larger image payloads
    producerConfig: {
      maxRequestSize: 10485760, // 10MB
      requestTimeout: 30000,
      retry: {
        retries: 3
      }
    }
  },
  device: {
    minInterval: parseInt(process.env.MIN_EVENT_INTERVAL) || 3000, // 3 seconds
    maxInterval: parseInt(process.env.MAX_EVENT_INTERVAL) || 10000, // 10 seconds
  },
  storage: {
    saveImages: process.env.SAVE_IMAGES === 'true',
    tmpFolder: process.env.TMP_FOLDER || './tmp/images',
    timezone: process.env.IMAGE_TIMEZONE || 'UTC'
  }
};