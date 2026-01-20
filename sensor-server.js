// Node.js server to read Arduino sensor data and broadcast to web app via WebSocket
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(__dirname));

// Serial port configuration
const SERIAL_PORT = 'COM3'; // Change to your Arduino port (COM3, /dev/ttyUSB0, etc.)
const BAUD_RATE = 9600;
const THRESHOLD = 190; // Match Arduino threshold

let port;
let itemsDetectedBuffer = []; // Track recent detections
let lastDetectionTime = 0;
const DETECTION_COOLDOWN = 500; // ms between detections to avoid duplicates

function initSerial() {
  try {
    port = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });
    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    parser.on('data', (line) => {
      // Parse "Light level: XXX" from Arduino
      const match = line.match(/Light level:\s*(\d+)/);
      if (match) {
        const lightLevel = parseInt(match[1], 10);
        processLightLevel(lightLevel);
      }
    });

    port.on('error', (err) => {
      console.error('Serial error:', err.message);
      // Retry connection after 3 seconds
      setTimeout(initSerial, 3000);
    });

    port.on('close', () => {
      console.log('Serial port closed. Reconnecting...');
      setTimeout(initSerial, 3000);
    });

    console.log(`Serial port ${SERIAL_PORT} initialized at ${BAUD_RATE} baud`);
  } catch (err) {
    console.error('Failed to open serial port:', err.message);
    console.log(`Make sure Arduino is connected to ${SERIAL_PORT}`);
    setTimeout(initSerial, 5000);
  }
}

let lastLightLevel = null;
let isDark = false;
let scanningEnabled = false; // Control sensor detection

function processLightLevel(lightLevel) {
  lastLightLevel = lightLevel;
  
  if (!scanningEnabled) return; // Ignore if scanning disabled
  
  // Detect transition from light to dark (item entering bin)
  const nowDark = lightLevel < THRESHOLD;

  if (nowDark && !isDark) {
    // Light level just dropped below threshold - item detected!
    const now = Date.now();
    if (now - lastDetectionTime > DETECTION_COOLDOWN) {
      lastDetectionTime = now;
      broadcastItemDetected(1); // 1 item detected
      console.log(`✓ Item detected (light level: ${lightLevel})`);
    }
  }

  isDark = nowDark;
}

function broadcastItemDetected(count) {
  // Send item count to all connected web clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: 'item_detected',
          count: count,
          timestamp: Date.now(),
        })
      );
    }
  });
}

function broadcastScanStatus(enabled) {
  // Notify all clients of scanning state change
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: 'scan_status',
          enabled: enabled,
        })
      );
    }
  });
}

wss.on('connection', (ws) => {
  console.log('Web client connected');

  // Send current sensor status to new client
  if (lastLightLevel !== null) {
    ws.send(
      JSON.stringify({
        type: 'sensor_status',
        lightLevel: lastLightLevel,
        connected: !!port,
      })
    );
  }

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'get_status') {
        ws.send(
          JSON.stringify({
            type: 'sensor_status',
            lightLevel: lastLightLevel,
            connected: !!port,
            scanningEnabled: scanningEnabled,
          })
        );
      } else if (data.type === 'start_scan') {
        scanningEnabled = true;
        console.log('📡 Scanning STARTED');
        broadcastScanStatus(true);
      } else if (data.type === 'stop_scan') {
        scanningEnabled = false;
        isDark = false; // Reset state
        console.log('⏹ Scanning STOPPED');
        broadcastScanStatus(false);
      }
    } catch (e) {
      console.error('WebSocket message error:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('Web client disconnected');
  });
});

// Initialize serial connection
initSerial();

const PORT = process.env.PORT || 5500;
server.listen(PORT, () => {
  console.log(`\n🌐 Server running at http://localhost:${PORT}`);
  console.log(`📡 Listening for sensor data on ${SERIAL_PORT}...\n`);
});
