require('dotenv').config();

const { Kafka } = require('kafkajs');
const config = require('../src/config');

class KafkaTopicCleaner {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'topic-cleaner',
      brokers: config.kafka.brokers
    });
    this.admin = this.kafka.admin();
  }

  async clearTopic() {
    try {
      console.log('🧹 Starting Kafka topic cleanup...');
      console.log(`📡 Brokers: ${config.kafka.brokers.join(', ')}`);
      console.log(`🎯 Topic: ${config.kafka.topic}`);

      await this.admin.connect();
      console.log('✅ Connected to Kafka admin');

      const topics = await this.admin.listTopics();
      
      if (topics.includes(config.kafka.topic)) {
        console.log(`🗑️  Deleting topic: ${config.kafka.topic}`);
        await this.admin.deleteTopics({
          topics: [config.kafka.topic],
          timeout: 30000
        });
        console.log('✅ Topic deleted successfully');

        // Wait a moment for deletion to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`ℹ️  Topic ${config.kafka.topic} does not exist`);
      }

      console.log(`🔄 Recreating topic: ${config.kafka.topic}`);
      await this.admin.createTopics({
        topics: [{
          topic: config.kafka.topic,
          numPartitions: 1,
          replicationFactor: 1,
          configEntries: [
            {
              name: 'retention.ms',
              value: config.kafka.retentionMs.toString()
            },
            {
              name: 'retention.bytes',
              value: config.kafka.retentionBytes.toString()
            },
            {
              name: 'max.message.bytes',
              value: '10485760' // 10MB to match producer config
            }
          ]
        }],
        timeout: 30000
      });

      console.log('✅ Topic recreated successfully');
      console.log('🎉 Kafka topic cleanup completed!');

    } catch (error) {
      console.error('❌ Error during topic cleanup:', error.message);
      
      if (error.message.includes('TOPIC_ALREADY_EXISTS')) {
        console.log('ℹ️  Topic already exists, cleanup may have been partial');
      } else if (error.message.includes('UnknownTopicOrPartition')) {
        console.log('ℹ️  Topic was already deleted or does not exist');
      }
      
      throw error;
    } finally {
      await this.admin.disconnect();
      console.log('🔌 Disconnected from Kafka admin');
    }
  }
}

async function main() {
  const cleaner = new KafkaTopicCleaner();
  
  try {
    await cleaner.clearTopic();
    process.exit(0);
  } catch (error) {
    console.error('💥 Failed to clear Kafka topic:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = KafkaTopicCleaner;