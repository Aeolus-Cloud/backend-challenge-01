const { createCanvas } = require('canvas');

class ImageGenerator {
  constructor() {
    this.width = 1280;
    this.height = 720;
    this.positions = [
      'top-left',
      'top-middle',
      'top-right',
      'middle-left',
      'middle-center',
      'middle-right',
      'bottom-left',
      'bottom-middle',
      'bottom-right'
    ];
  }

  getRandomPosition() {
    return this.positions[Math.floor(Math.random() * this.positions.length)];
  }

  getCoordinatesForPosition(position, textWidth, textHeight) {
    const margin = 20;
    const coordinates = {
      x: 0,
      y: 0
    };

    // Horizontal positioning
    switch (position.split('-')[1]) {
      case 'left':
        coordinates.x = margin;
        break;
      case 'middle':
      case 'center':
        coordinates.x = (this.width - textWidth) / 2;
        break;
      case 'right':
        coordinates.x = this.width - textWidth - margin;
        break;
    }

    // Vertical positioning
    switch (position.split('-')[0]) {
      case 'top':
        coordinates.y = margin + textHeight;
        break;
      case 'middle':
        coordinates.y = (this.height + textHeight) / 2;
        break;
      case 'bottom':
        coordinates.y = this.height - margin;
        break;
    }

    return coordinates;
  }

  generateRandomColor() {
    const colors = [
      { hex: '#2C3E50', name: 'dark_blue_gray' },
      { hex: '#34495E', name: 'charcoal_blue' },
      { hex: '#5D6D7E', name: 'steel_gray' },
      { hex: '#566573', name: 'slate_gray' },
      { hex: '#1B2631', name: 'midnight_blue' },
      { hex: '#212F3D', name: 'dark_navy' },
      { hex: '#283747', name: 'gunmetal' },
      { hex: '#17202A', name: 'charcoal_black' },
      { hex: '#425468', name: 'storm_gray' },
      { hex: '#4A5568', name: 'cool_gray' }
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  generateBackground(ctx) {
    const primaryColor = this.generateRandomColor();
    const secondaryColor = this.generateRandomColor();
    const accentColor = this.generateRandomColor();
    
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, primaryColor.hex);
    gradient.addColorStop(0.5, secondaryColor.hex);
    gradient.addColorStop(1, accentColor.hex);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Store colors for metadata
    this.backgroundColors = {
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor
    };

    this.addRandomShapes(ctx);
  }

  addRandomShapes(ctx) {
    const shapeCount = Math.floor(Math.random() * 5) + 3;
    this.shapes = [];
    
    for (let i = 0; i < shapeCount; i++) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      
      const color = this.generateRandomColor();
      ctx.fillStyle = color.hex;
      
      const shapeType = Math.floor(Math.random() * 3);
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const size = Math.random() * 100 + 50;
      
      let shapeInfo = {
        color: color,
        x: Math.round(x),
        y: Math.round(y),
        size: Math.round(size)
      };
      
      switch (shapeType) {
        case 0: // Circle
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
          shapeInfo.type = 'circle';
          shapeInfo.radius = Math.round(size);
          break;
        case 1: // Rectangle
          const width = size;
          const height = size * 0.7;
          ctx.fillRect(x, y, width, height);
          shapeInfo.type = 'rectangle';
          shapeInfo.width = Math.round(width);
          shapeInfo.height = Math.round(height);
          break;
        case 2: // Triangle
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + size, y + size);
          ctx.lineTo(x - size, y + size);
          ctx.closePath();
          ctx.fill();
          shapeInfo.type = 'triangle';
          shapeInfo.base = Math.round(size * 2);
          shapeInfo.height = Math.round(size);
          break;
      }
      
      this.shapes.push(shapeInfo);
      ctx.restore();
    }
  }

  generateImage(deviceId) {
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext('2d');

    this.backgroundColors = { primary: null, secondary: null, accent: null };
    this.shapes = [];

    this.generateBackground(ctx);
    const timestamp = new Date().toISOString();
    ctx.font = '20px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`Timestamp: ${timestamp}`, 20, this.height - 60);
    const position = this.getRandomPosition();
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    
    const text = `Device: ${deviceId}`;
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = 48;
    
    const coordinates = this.getCoordinatesForPosition(position, textWidth, textHeight);
    
    // Calculate crop coordinates with padding
    const padding = 15;
    const deviceTextCrop = {
      left: Math.max(0, coordinates.x - padding),
      top: Math.max(0, coordinates.y - textHeight - padding),
      width: Math.min(this.width - (coordinates.x - padding), textWidth + (padding * 2)),
      height: Math.min(this.height - (coordinates.y - textHeight - padding), textHeight + (padding * 2)),
      position: position
    };
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(
      coordinates.x - 10,
      coordinates.y - textHeight - 5,
      textWidth + 20,
      textHeight + 15
    );
    
    // Draw text with stroke and fill
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, coordinates.x, coordinates.y);
    ctx.strokeText(text, coordinates.x, coordinates.y);

    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
    
    return {
      deviceId,
      base64: buffer.toString('base64'),
      position,
      dimensions: { width: this.width, height: this.height },
      format: 'jpeg',
      deviceTextCrop,
      backgroundColors: this.backgroundColors,
      shapes: this.shapes
    };
  }


}

module.exports = ImageGenerator;