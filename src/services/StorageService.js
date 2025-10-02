const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const config = require('../config');

class StorageService {
  constructor() {
    this.saveImages = config.storage.saveImages;
    this.tmpFolder = config.storage.tmpFolder;
    this.timezone = config.storage.timezone;
    
    if (this.saveImages) {
      this.ensureTmpFolderExists();
    }
  }

  ensureTmpFolderExists() {
    try {
      if (!fs.existsSync(this.tmpFolder)) {
        fs.mkdirSync(this.tmpFolder, { recursive: true });
        console.log(`📁 Created tmp folder: ${this.tmpFolder}`);
      }
    } catch (error) {
      console.error('❌ Error creating tmp folder:', error.message);
      this.saveImages = false;
    }
  }

  generateFilename(deviceId, position, timestamp) {
    const sanitizedDeviceId = deviceId.replace(/[^a-zA-Z0-9-_]/g, '_');
    const sanitizedPosition = position.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    const timestampStr = moment(timestamp)
      .tz(this.timezone)
      .format('YYYY-MM-DD_HH-mm-ss');
    
    const filename = `${timestampStr}_${sanitizedDeviceId}_${sanitizedPosition}`;
    
    return `${filename}.jpg`;
  }

  async saveImage(imageBuffer, deviceId, position, timestamp) {
    if (!this.saveImages) {
      return null;
    }

    try {
      const filename = this.generateFilename(deviceId, position, timestamp);
      const filepath = path.join(this.tmpFolder, filename);
      
      await fs.promises.writeFile(filepath, imageBuffer);
      
      const stats = await fs.promises.stat(filepath);
      console.log(`💾 Image saved: ${filename} (${Math.round(stats.size / 1024)} KB)`);
      
      return {
        filename,
        filepath,
        size: stats.size
      };
    } catch (error) {
      console.error('❌ Error saving image:', error.message);
      return null;
    }
  }

  async saveImageFromBase64(base64Data, deviceId, position, timestamp) {
    if (!this.saveImages) {
      return null;
    }

    try {
      const buffer = Buffer.from(base64Data, 'base64');
      return await this.saveImage(buffer, deviceId, position, timestamp);
    } catch (error) {
      console.error('❌ Error saving image from base64:', error.message);
      return null;
    }
  }

  getStorageStats() {
    if (!this.saveImages || !fs.existsSync(this.tmpFolder)) {
      return {
        enabled: false,
        folder: this.tmpFolder,
        totalFiles: 0,
        totalSize: 0
      };
    }

    try {
      const files = fs.readdirSync(this.tmpFolder).filter(f => f.endsWith('.jpg'));
      let totalSize = 0;
      
      files.forEach(file => {
        const filepath = path.join(this.tmpFolder, file);
        const stats = fs.statSync(filepath);
        totalSize += stats.size;
      });

      return {
        enabled: true,
        folder: this.tmpFolder,
        totalFiles: files.length,
        totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
      };
    } catch (error) {
      console.error('❌ Error getting storage stats:', error.message);
      return {
        enabled: false,
        folder: this.tmpFolder,
        totalFiles: 0,
        totalSize: 0,
        error: error.message
      };
    }
  }

  async cleanupOldImages(maxAgeHours = 24) {
    if (!this.saveImages || !fs.existsSync(this.tmpFolder)) {
      return { deleted: 0, errors: 0 };
    }

    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const now = Date.now();
    let deleted = 0;
    let errors = 0;

    try {
      const files = fs.readdirSync(this.tmpFolder).filter(f => f.endsWith('.jpg'));
      
      for (const file of files) {
        try {
          const filepath = path.join(this.tmpFolder, file);
          const stats = fs.statSync(filepath);
          
          if (now - stats.mtime.getTime() > maxAgeMs) {
            fs.unlinkSync(filepath);
            deleted++;
          }
        } catch (error) {
          console.error(`❌ Error deleting file ${file}:`, error.message);
          errors++;
        }
      }

      if (deleted > 0) {
        console.log(`🧹 Cleaned up ${deleted} old images (older than ${maxAgeHours}h)`);
      }

      return { deleted, errors };
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
      return { deleted: 0, errors: 1 };
    }
  }
}

module.exports = StorageService;