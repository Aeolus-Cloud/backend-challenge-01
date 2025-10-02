require('dotenv').config();

const StorageService = require('../src/services/StorageService');

class StorageCleanup {
  constructor() {
    this.storageService = new StorageService();
  }

  async cleanup(maxAgeHours = 24, dryRun = false) {
    console.log('🧹 Storage Cleanup Utility');
    console.log('==========================');
    
    try {
      const stats = this.storageService.getStorageStats();
      
      if (!stats.enabled) {
        console.log('📁 Storage: ❌ DISABLED');
        console.log('   Nothing to clean up');
        return { deleted: 0, errors: 0 };
      }

      console.log('📁 Storage: ✅ ENABLED');
      console.log(`   Folder: ${stats.folder}`);
      console.log(`   Current Files: ${stats.totalFiles}`);
      console.log(`   Max Age: ${maxAgeHours} hours`);
      
      if (dryRun) {
        console.log('🔍 DRY RUN MODE - No files will be deleted');
      }

      if (stats.totalFiles === 0) {
        console.log('\n✅ No files to clean up');
        return { deleted: 0, errors: 0 };
      }

      console.log(`\n🔄 ${dryRun ? 'Analyzing' : 'Cleaning up'} files older than ${maxAgeHours}h...`);
      
      let result;
      if (dryRun) {
        result = await this.analyzeCleanup(maxAgeHours);
      } else {
        result = await this.storageService.cleanupOldImages(maxAgeHours);
      }

      console.log('\n📊 Results:');
      console.log(`   Files ${dryRun ? 'to be deleted' : 'deleted'}: ${result.deleted}`);
      console.log(`   Errors: ${result.errors}`);
      
      if (result.deleted > 0) {
        const newStats = this.storageService.getStorageStats();
        console.log(`   Remaining files: ${newStats.totalFiles}`);
        console.log(`   Space ${dryRun ? 'to be freed' : 'freed'}: ${this.formatBytes(result.spaceSaved || 0)}`);
      }

      if (dryRun && result.deleted > 0) {
        console.log('\n💡 Run without --dry-run to actually delete files');
      }

      return result;

    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
      return { deleted: 0, errors: 1 };
    }
  }

  async analyzeCleanup(maxAgeHours) {
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(this.storageService.tmpFolder)) {
      return { deleted: 0, errors: 0, spaceSaved: 0 };
    }

    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const now = Date.now();
    let toDelete = 0;
    let spaceSaved = 0;
    let errors = 0;

    try {
      const files = fs.readdirSync(this.storageService.tmpFolder)
        .filter(f => f.endsWith('.jpg'));
      
      for (const file of files) {
        try {
          const filepath = path.join(this.storageService.tmpFolder, file);
          const stats = fs.statSync(filepath);
          
          if (now - stats.mtime.getTime() > maxAgeMs) {
            toDelete++;
            spaceSaved += stats.size;
            console.log(`   📄 ${file} (${Math.round(stats.size / 1024)} KB, ${this.getTimeAgo(stats.mtime)})`);
          }
        } catch (error) {
          errors++;
        }
      }

      return { deleted: toDelete, errors, spaceSaved };
    } catch (error) {
      return { deleted: 0, errors: 1, spaceSaved: 0 };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

async function main() {
  const args = process.argv.slice(2);
  
  let maxAgeHours = 24;
  let dryRun = false;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run' || arg === '-n') {
      dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('🧹 Storage Cleanup Utility');
      console.log('==========================');
      console.log('');
      console.log('Usage: node scripts/storage-cleanup.js [options] [maxAgeHours]');
      console.log('');
      console.log('Options:');
      console.log('  --dry-run, -n    Show what would be deleted without actually deleting');
      console.log('  --help, -h       Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts/storage-cleanup.js 24        # Delete files older than 24 hours');
      console.log('  node scripts/storage-cleanup.js 1         # Delete files older than 1 hour');
      console.log('  node scripts/storage-cleanup.js --dry-run # Preview what would be deleted');
      console.log('  node scripts/storage-cleanup.js -n 6      # Preview deletion of files older than 6h');
      process.exit(0);
    } else if (!isNaN(parseFloat(arg))) {
      maxAgeHours = parseFloat(arg);
    }
  }

  const cleanup = new StorageCleanup();
  
  try {
    await cleanup.cleanup(maxAgeHours, dryRun);
    process.exit(0);
  } catch (error) {
    console.error('💥 Cleanup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = StorageCleanup;