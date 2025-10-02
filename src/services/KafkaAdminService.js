const { Kafka } = require('kafkajs');
const config = require('../config');

class KafkaAdminService {
  constructor() {
    this.kafka = new Kafka({
      clientId: `${config.kafka.clientId}-admin`,
      brokers: config.kafka.brokers
    });
    this.admin = this.kafka.admin();
    
    this.RESOURCE_TYPES = {
      TOPIC: 2,
      BROKER: 4,
      BROKER_LOGGER: 8
    };
  }

  async ensureTopicExists(topicName, retentionMs = 3600000) {
    try {
      await this.admin.connect();
      console.log('🔧 Kafka admin connected');

      const existingTopics = await this.admin.listTopics();
      
      if (!existingTopics.includes(topicName)) {
        console.log(`📝 Creating topic: ${topicName} with ${retentionMs}ms retention`);
        
        await this.admin.createTopics({
          topics: [{
            topic: topicName,
            numPartitions: 3,
            replicationFactor: 1,
            configEntries: [
              {
                name: 'retention.ms',
                value: retentionMs.toString()
              },
              {
                name: 'cleanup.policy',
                value: 'delete'
              },
              {
                name: 'segment.ms',
                value: '300000' // 5 minutes
              },
              {
                name: 'delete.retention.ms',
                value: '60000' // 1 minute
              }
            ]
          }]
        });
        
        console.log(`✅ Topic ${topicName} created with ${Math.round(retentionMs/3600000)}h retention`);
      } else {
        console.log(`📋 Topic ${topicName} already exists with configured retention`);
        // Skip updating retention on every connection to avoid errors
      }
      
    } catch (error) {
      console.error('❌ Error managing Kafka topic:', error);
      throw error;
    } finally {
      await this.admin.disconnect();
      console.log('🔧 Kafka admin disconnected');
    }
  }

  async updateTopicRetention(topicName, retentionMs) {
    try {
      console.log(`🔄 Updating retention for topic: ${topicName}`);
      
      // Try alterConfigs method
      await this.admin.alterConfigs({
        validateOnly: false,
        resources: [{
          type: this.RESOURCE_TYPES.TOPIC,
          name: topicName,
          configEntries: [
            {
              name: 'retention.ms',
              value: retentionMs.toString()
            }
          ]
        }]
      });
      
      console.log(`✅ Updated ${topicName} retention to ${Math.round(retentionMs/3600000)}h`);
    } catch (error) {
      console.warn('⚠️  Could not update topic retention via API:', error.message);
      console.log('💡 To manually update retention, use:');
      console.log(`   kafka-configs.sh --bootstrap-server ${config.kafka.brokers[0]} --entity-type topics --entity-name ${topicName} --alter --add-config retention.ms=${retentionMs}`);
    }
  }

  async getTopicInfo(topicName) {
    try {
      await this.admin.connect();
      
      const metadata = await this.admin.fetchTopicMetadata({
        topics: [topicName]
      });
      
      const configs = await this.admin.describeConfigs({
        resources: [{
          type: this.RESOURCE_TYPES.TOPIC,
          name: topicName
        }]
      });
      
      return {
        metadata: metadata.topics[0],
        configs: configs.resources[0]
      };
      
    } catch (error) {
      console.error('❌ Error getting topic info:', error);
      throw error;
    } finally {
      await this.admin.disconnect();
    }
  }

  // Utility method to convert time strings to milliseconds
  static timeToMs(timeString) {
    const timeUnits = {
      's': 1000,
      'm': 60000,
      'h': 3600000,
      'd': 86400000
    };
    
    const match = timeString.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid time format. Use format like: 1h, 30m, 60s, 1d');
    }
    
    const [, value, unit] = match;
    return parseInt(value) * timeUnits[unit];
  }
}

module.exports = KafkaAdminService;