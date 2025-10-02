const ImageGenerator = require('../src/services/ImageGenerator');
const fs = require('fs');
const path = require('path');

console.log('🎨 Testing Image Generation...');
console.log('==============================');

const imageGenerator = new ImageGenerator();
const deviceId = 'TEST-DEVICE-001';
console.log(`\n📷 Generating test image for device: ${deviceId}`);

try {
  const imageData = imageGenerator.generateImage(deviceId);
  
  console.log(`✅ Image generated successfully!`);
console.log('📊 Image details:');
console.log(`   - Device ID: ${imageData.deviceId}`);
console.log(`   - Position: ${imageData.position}`);
console.log(`   - Dimensions: ${imageData.dimensions.width}x${imageData.dimensions.height}`);
console.log(`   - Format: ${imageData.format}`);
console.log(`   - Base64 size: ${imageData.base64.length} characters`);
console.log(`   - Estimated file size: ~${Math.round(Buffer.byteLength(imageData.base64, 'base64') / 1024)} KB`);

console.log('\n📝 Metadata:');
console.log(`   - Device text crop: left=${imageData.deviceTextCrop.left}, top=${imageData.deviceTextCrop.top}, width=${imageData.deviceTextCrop.width}, height=${imageData.deviceTextCrop.height}`);
console.log(`   - Background colors: primary=${imageData.backgroundColors.primary.name} (${imageData.backgroundColors.primary.hex}), secondary=${imageData.backgroundColors.secondary.name} (${imageData.backgroundColors.secondary.hex}), accent=${imageData.backgroundColors.accent.name} (${imageData.backgroundColors.accent.hex})`);
console.log(`   - Shapes: ${imageData.shapes.length} random shapes with colors: ${imageData.shapes.map(s => s.color.name).join(', ')}`);

  const buffer = Buffer.from(imageData.base64, 'base64');
  const filename = `test-image-${Date.now()}.jpg`;
  fs.writeFileSync(filename, buffer);
  console.log(`💾 Sample image saved as: ${filename}`);

  console.log(`\n🎯 Testing different camera positions:`);
  
  for (let i = 0; i < 3; i++) {
    const testImage = imageGenerator.generateImage(`DEVICE-${i}`);
    console.log(`   - Device ${i}: Device position ${testImage.position}`);
  }

  console.log(`\n✅ Image generation test completed successfully!`);
  
} catch (error) {
  console.error('❌ Error generating image:', error.message);
  process.exit(1);
}