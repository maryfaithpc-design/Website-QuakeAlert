# QuakeAlert

**An IoT-based earthquake and structural vibration monitoring system with MQTT and a web-based alert dashboard.**

QuakeAlert reads vibration data from a sensor device, classifies each reading as normal, warning, or critical, and shows the results on a live dashboard. The website prototype is complete; the physical ESP32 + MPU6050 device connects through the same MQTT topic.

## Features

- Real-time vibration monitoring (dashboard refreshes every 3 seconds)
- Vibration status levels: normal (below 2), warning (2 to 5), critical (5 and above)
- Vibration trend and event history
- Device management per account (one device on Free, up to three on Student)
- Alerts and downloadable reports
- Account registration and login
- Subscription plans with PayPal (Sandbox): Free and Student (PHP 99)

## How it works

```
ESP32 + MPU6050  --MQTT-->  Node.js / Express server  -->  SQLite database
                                      |
                                      v
                            React dashboard (Vite)
```

## Security

- Passwords are hashed with bcrypt.
- Device locations are encrypted with AES-256-CBC in the devices table.
- Database queries use prepared statements.
- Secrets (encryption key, PayPal credentials) are read from a `.env` file that is not committed.

## Tech stack

React, Vite, React Router, Node.js, Express, MQTT, SQLite (better-sqlite3), PayPal Subscriptions, ESP32, MPU6050.

## Run it locally

Start the backend (port 5000):

```bash
cd server
npm install
node server.js
```

Create `server/.env` first with these values:

```
ENCRYPTION_KEY=your-long-random-secret
PAYPAL_CLIENT_ID=your-sandbox-client-id
PAYPAL_CLIENT_SECRET=your-sandbox-client-secret
```

Start the website (port 5173):

```bash
npm install
npm run dev
```

Open http://localhost:5173, register an account, and add a device.

## MQTT message format

Publish JSON to the topic `quakealert/QA-001`:

```json
{ "deviceId": "QA-001", "vibration": 2.43 }
```

## Project status

Website prototype: done. Next: connect the physical ESP32 + MPU6050 device, move MQTT to TLS, and add token-based sessions.