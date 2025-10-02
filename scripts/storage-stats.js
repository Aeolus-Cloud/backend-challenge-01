require('dotenv').config();

const StorageService = require('../src/services/StorageService');

class StorageStatsViewer {
  constructor() {
    this.storageService = new StorageService();
  }

  displayStats() {
    console.log('📊 Storage Statistics');
    console.log('====================');
    
    try {
      const stats = this.storageService.getStorageStats();
      
      if (!stats.enabled) {
        console.log('📁 Storage: ❌ DISABLED');
        console.log(`   Folder: ${stats.folder}`);
        
        if (stats.error) {
          console.log(`   Error: ${stats.error}`);
        } else {
          console.log('   Note: Set SAVE_IMAGES=true in .env to enable storage');
        }
        return;
      }

      console.log('📁 Storage: ✅ ENABLED');
      console.log(`   Folder: ${stats.folder}`);
      console.log(`   Total Files: ${stats.totalFiles}`);
      console.log(`   Total Size: ${this.formatBytes(stats.totalSize)}`);
      
      if (stats.totalFiles > 0) {
        const avgSize = Math.round(stats.totalSize / stats.totalFiles / 1024);
        console.log(`   Average File Size: ${avgSize} KB`);
        
        // Show recent files if any exist
        this.showRecentFiles();
      }
      
      console.log(`\n⏰ Generated at: ${new Date().toISOString()}`);
      
    } catch (error) {
      console.error('❌ Error getting storage stats:', error.message);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  showRecentFiles() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (!fs.existsSync(this.storageService.tmpFolder)) {
        return;
      }

      const files = fs.readdirSync(this.storageService.tmpFolder)
        .filter(f => f.endsWith('.jpg'))
        .map(f => {
          const filepath = path.join(this.storageService.tmpFolder, f);
          const stats = fs.statSync(filepath);
          return {
            name: f,
            size: stats.size,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.modified - a.modified)
        .slice(0, 5);

      if (files.length > 0) {
        console.log('\n📋 Recent Files:');
        files.forEach((file, index) => {
          const timeAgo = this.getTimeAgo(file.modified);
          const sizeKB = Math.round(file.size / 1024);
          console.log(`   ${index + 1}. ${file.name} (${sizeKB} KB, ${timeAgo})`);
        });
      }
    } catch (error) {
      console.log('   Note: Could not list recent files');
    }
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
}

function main() {
  const viewer = new StorageStatsViewer();
  viewer.displayStats();
}

if (require.main === module) {
  main();
}

module.exports = StorageStatsViewer;