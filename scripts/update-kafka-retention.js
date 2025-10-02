require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const KafkaAdminService = require('../src/services/KafkaAdminService');
const config = require('../src/config');

class KafkaRetentionUpdater {
  constructor() {
    this.kafkaAdmin = new KafkaAdminService();
  }

  static timeToMs(timeString) {
    const unit = timeString.slice(-1).toLowerCase();
    const value = parseInt(timeString.slice(0, -1));
    
    if (isNaN(value)) {
      throw new Error('Invalid time format. Use format like "2h", "30m", "3600s"');
    }
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error('Invalid time unit. Use s (seconds), m (minutes), h (hours), or d (days)');
    }
  }

  async updateRetention(retentionValue) {
    try {
      console.log('⚙️  Starting Kafka topic retention update...');
      console.log(`📡 Brokers: ${config.kafka.brokers.join(', ')}`);
      console.log(`🎯 Topic: ${config.kafka.topic}`);

      let retentionMs;
      
      // Check if it's a time string (ends with s, m, h, d) or raw milliseconds
      if (typeof retentionValue === 'string' && /[smhd]$/.test(retentionValue)) {
        retentionMs = KafkaRetentionUpdater.timeToMs(retentionValue);
        console.log(`🕐 Converting "${retentionValue}" to ${retentionMs}ms`);
      } else {
        retentionMs = parseInt(retentionValue);
        if (isNaN(retentionMs)) {
          throw new Error('Invalid retention value. Use format like "2h", "30m" or raw milliseconds');
        }
      }

      console.log(`🔄 Updating retention to: ${retentionMs}ms (${Math.round(retentionMs / 1000 / 60)} minutes)`);
      
      await this.kafkaAdmin.updateTopicRetention(config.kafka.topic, retentionMs);
      
      console.log('✅ Topic retention updated successfully!');
      console.log(`📊 New retention: ${retentionMs}ms`);
      console.log(`⏱️  Equivalent to: ${Math.round(retentionMs / 1000 / 60)} minutes`);

    } catch (error) {
      console.error('❌ Error updating topic retention:', error.message);
      throw error;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🚀 Kafka Topic Retention Updater');
    console.log('================================');
    console.log('');
    console.log('Usage: node scripts/update-kafka-retention.js <retention>');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/update-kafka-retention.js 2h      # 2 hours');
    console.log('  node scripts/update-kafka-retention.js 30m     # 30 minutes');
    console.log('  node scripts/update-kafka-retention.js 3600000 # 1 hour in milliseconds');
    console.log('  node scripts/update-kafka-retention.js 1d      # 1 day');
    console.log('');
    console.log('Current topic:', config.kafka.topic);
    console.log('Current brokers:', config.kafka.brokers.join(', '));
    process.exit(1);
  }

  const retentionValue = args[0];
  const updater = new KafkaRetentionUpdater();
  
  try {
    await updater.updateRetention(retentionValue);
    process.exit(0);
  } catch (error) {
    console.error('💥 Failed to update Kafka retention:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = KafkaRetentionUpdater;