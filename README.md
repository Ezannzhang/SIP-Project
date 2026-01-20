whe# E‑Waste Drop — demo static web app with Sensor Integration

This is a small static demo that shows a QR-bin flow with **real-time Arduino sensor integration**: when items are detected entering the bin, points are automatically awarded to the logged-in user.

## What was added
- `index.html` — main UI
- `styles.css` — styling
- `app.js` — client-side auth, storage, rewards logic + WebSocket sensor listener
- `sensor-server.js` — Node.js server that reads Arduino serial data and broadcasts to web clients
- `package.json` — dependencies for sensor integration

## How to setup

### 1. Install Node.js dependencies
Open PowerShell in this folder and run:
```powershell
npm install
```

### 2. Connect your Arduino
- Upload the sensor code to your Arduino (LDR light sensor)
- Connect Arduino via USB to your PC
- Note the COM port (e.g., COM3, COM4)

### 3. Configure the serial port
Edit `sensor-server.js` and change this line to your Arduino's COM port:
```javascript
const SERIAL_PORT = 'COM3'; // Change to your port
```

To find your Arduino COM port:
- Open Device Manager (Windows)
- Look for "Arduino" or "Ports (COM & LPT)"
- Note the COM number

### 4. Start the server
```powershell
npm start
```

The server will:
- Listen on http://localhost:5500
- Connect to your Arduino on the specified COM port
- Broadcast sensor events to web clients via WebSocket

Open http://localhost:5500 in your browser and log in. When items enter the bin (blocking light below threshold), points will be automatically awarded!

## How it works

1. **Arduino sends data** → LDR reads light levels and sends via Serial
2. **Node server reads** → Detects when light drops below threshold (item detected)
3. **WebSocket broadcast** → Sends item detection event to all connected web clients
4. **Web app updates** → Automatically awards points to logged-in user
5. **Dashboard refreshes** → Leaderboard and vouchers update in real-time

## Configuration

### Arduino threshold
Edit your Arduino code to adjust `threshold` based on your bin's lighting:
```cpp
int threshold = 500;  // Adjust after testing
```

### Detection cooldown
In `sensor-server.js`, adjust the cooldown to prevent duplicate detections:
```javascript
const DETECTION_COOLDOWN = 500; // milliseconds between detections
```

### Points per item
In `app.js`, change the reward amount:
```javascript
const pointsPerItem = 10; // points per detected item
```

## Notes for production
- This demo stores users in localStorage (not secure)
- Serial connection requires node-serialport (may need build tools on some systems)
- For HTTPS, use: `$env:HTTPS = 'true'; npm start`
- Add proper error handling and authentication for real deployments
- Consider adding image/weight verification for dropped items

## Troubleshooting

**"Failed to open serial port":**
- Check COM port is correct in `sensor-server.js`
- Ensure Arduino is connected and drivers installed
- Try a different USB port

**"Sensor connected but no detections":**
- Verify Arduino code is uploaded correctly
- Check threshold value matches your lighting conditions
- Open Arduino Serial Monitor to see raw light levels

**WebSocket connection fails:**
- Ensure `npm start` is running
- Check firewall allows port 5500
- Browser console will show connection errors
