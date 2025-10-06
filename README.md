# Device Event API

Express API that generates fake device events using worker threads and sends them to Kafka.

## Features

- RESTful API for device management
- Worker threads for non-blocking event generation
- Kafka integration for event streaming
- Dynamic image generation (1280x720) with device metadata
- Environment-based configuration

## Prerequisites

- Node.js (v18+)
- Kafka cluster running (default: localhost:9092)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Kafka (using Docker Compose)
```bash
# Start Kafka and Zookeeper
docker compose up -d

# Verify containers are running
docker compose ps
```

### 3. Set up Environment
```bash
cp .env.example .env
# Edit .env if needed (default values work for local development)
```

### 4. Start the API Server
```bash
npm start
```

### 5. Verify Everything is Working
```bash
# Check API health
curl http://localhost:3000/api/health

# Add a test device
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "test-device-001"}'

# Check that events are being generated
curl http://localhost:3000/api/devices
```

## Configuration

### Key Environment Variables
- `PORT`: Server port (default: 3000)
- `KAFKA_BROKERS`: Kafka broker addresses (default: localhost:9092)
- `KAFKA_TOPIC`: Topic name (default: device-events)
- `SAVE_IMAGES`: Save generated images to disk (default: false)
- `IMAGE_TIMEZONE`: Timezone for image timestamps (default: UTC)
- `MIN_EVENT_INTERVAL`: Minimum interval between events in ms (default: 3000)
- `MAX_EVENT_INTERVAL`: Maximum interval between events in ms (default: 10000)

### Kafka UI (Optional)
Access Kafka UI at `http://localhost:8081` (admin/123456) to monitor topics and messages.

## System Architecture

1. **API Server** (`npm start`) - Manages devices and serves REST endpoints
2. **Worker Threads** - Generate events for each device at random intervals
3. **Kafka Producer** - Sends events with images to Kafka topic

## Basic Usage

### Device Management
```bash
# Check system health
curl http://localhost:3000/api/health

# Add a device (starts generating events)
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "camera-001"}'

# List all active devices
curl http://localhost:3000/api/devices

# Check device status
curl http://localhost:3000/api/devices/camera-001/status

# Remove a device (stops generating events)
curl -X DELETE http://localhost:3000/api/devices/camera-001
```

### Event Monitoring
```bash
# Monitor saved images (if SAVE_IMAGES=true)
ls -la tmp/images/

# Check storage statistics
npm run storage:stats
```

## Available Scripts

### Core Operations
```bash
npm start              # Start the API server
npm run dev            # Development mode with auto-reload
```

### Kafka Management
```bash
npm run kafka:clear    # Clear all messages from Kafka topic
npm run kafka:retention 2h  # Set topic retention (2h, 30m, 1d, etc.)
```

### Storage Management
```bash
npm run storage:stats  # Show storage statistics and recent files
npm run storage:cleanup 24  # Clean up files older than 24 hours
npm run storage:cleanup -- --dry-run  # Preview what would be deleted
```

### Testing & Utilities
```bash
npm run test:image     # Test image generation functionality
npm run cameras:add    # Add multiple test cameras
npm run cameras:manage # Interactive camera management
```

## API Testing

### Postman Collection
Import `postman-collection.json` into Postman or Hoppscotch for easy API testing:
- Pre-configured requests for all available endpoints
- Only requires `baseUrl` variable configuration

**Setup:**
1. Import the collection file
2. Set `baseUrl` variable to `http://localhost:3000`
3. Test all endpoints immediately with example data

## API Endpoints

### Device Management
- `GET /api/health` - System health and status
- `POST /api/devices` - Add device (starts event generation)
- `GET /api/devices` - List all active devices
- `GET /api/devices/:id/status` - Get device status
- `DELETE /api/devices/:id` - Remove device (stops events)

### Docker Compose Services
- **API Server**: `http://localhost:3000`
- **Kafka UI**: `http://localhost:8081` (admin/123456)
- **Kafka Broker**: `localhost:9092`

## Troubleshooting

### Common Issues
1. **Kafka not running**: Start with `docker compose up -d`
2. **Port conflicts**: Change `PORT` in `.env` file
3. **No events**: Add devices via `/api/devices` endpoint
4. **Images not saving**: Set `SAVE_IMAGES=true` in `.env`
5. **Storage management**: Use `npm run storage:stats` and `npm run storage:cleanup` scripts