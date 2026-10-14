require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mqtt = require("mqtt");
const db = require("./database");
const bcrypt = require("bcrypt");
const { encrypt, decrypt } = require("./encryption");

const app = express();

app.use(cors());
app.use(express.json());

// Decrypt a location saved with AES
function decryptLocation(location) {
  try {
    return decrypt(location);
  } catch (error) {
    // Keep old locations working
    return location;
  }
}

// Get the latest sensor reading for a user
function getLatestSensor(userId) {
  try {
    const reading =
      db
        .prepare(
          `SELECT
            device_id AS deviceId,
            location,
            sensor,
            vibration,
            status,
            timestamp
           FROM vibration_history
           WHERE user_id = ?
           ORDER BY id DESC
           LIMIT 1`
        )
        .get(userId);

    if (reading) {
      return reading;
    }

    const device =
      db
        .prepare(
          `SELECT
            device_id AS deviceId,
            location,
            sensor
           FROM devices
           WHERE user_id = ?
           ORDER BY id ASC
           LIMIT 1`
        )
        .get(userId);

    if (device) {
      return {
        deviceId: device.deviceId,
        location: decryptLocation(
          device.location
        ),
        sensor: device.sensor,
        vibration: 0,
        status: "NORMAL",
        timestamp:
          new Date().toISOString()
      };
    }

    return {
      deviceId: "No Device",
      location: "No monitoring location",
      sensor: "MPU6050",
      vibration: 0,
      status: "NORMAL",
      timestamp:
        new Date().toISOString()
    };
  } catch (error) {
    console.log(
      "Get latest sensor error:",
      error.message
    );

    return {
      deviceId: "No Device",
      location: "No monitoring location",
      sensor: "MPU6050",
      vibration: 0,
      status: "NORMAL",
      timestamp:
        new Date().toISOString()
    };
  }
}

// MQTT SETTINGS
const MQTT_BROKER =
  "mqtt://broker.hivemq.com:1883";

// Wildcard topic — matches quakealert/QA-001, quakealert/QA-002, etc.
// This lets the backend receive data from ALL registered devices.
const MQTT_TOPIC =
  "quakealert/+";

const mqttClient =
  mqtt.connect(MQTT_BROKER);

// DEVICE HEARTBEAT
// How long a device can go without data before it's marked OFFLINE
const OFFLINE_AFTER_MS =
  30 * 1000;

// DEFAULT SENSOR DATA
let sensorData = {
  deviceId: "QA-001",
  location: "School Building",
  sensor: "MPU6050",
  vibration: 2.43,
  status: "WARNING",
  timestamp:
    new Date().toISOString(),
  userId: null
};

// PAYPAL SETTINGS
const PAYPAL_BASE_URL =
  process.env.PAYPAL_BASE_URL ||
  "https://api-m.sandbox.paypal.com";

const PAYPAL_CLIENT_ID =
  process.env.PAYPAL_CLIENT_ID;

const PAYPAL_CLIENT_SECRET =
  process.env.PAYPAL_CLIENT_SECRET;

// GET PAYPAL ACCESS TOKEN
async function getPayPalAccessToken() {
  const credentials =
    Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

  const response =
    await fetch(
      `${PAYPAL_BASE_URL}/v1/oauth2/token`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Basic ${credentials}`,
          "Content-Type":
            "application/x-www-form-urlencoded"
        },
        body:
          "grant_type=client_credentials"
      }
    );

  if (!response.ok) {
    throw new Error(
      "Failed to get PayPal access token."
    );
  }

  const data =
    await response.json();

  return data.access_token;
}

// SAVE VIBRATION HISTORY
function saveVibration(userId) {
  if (!userId) {
    console.log(
      "Vibration history was not saved because no user was identified."
    );

    return;
  }

  try {
    db.prepare(
      `INSERT INTO vibration_history
      (
        user_id,
        device_id,
        location,
        sensor,
        vibration,
        status,
        timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      Number(userId),
      sensorData.deviceId,
      sensorData.location,
      sensorData.sensor,
      sensorData.vibration,
      sensorData.status,
      sensorData.timestamp
    );

    console.log(
      `Vibration history saved for user ${userId} (device ${sensorData.deviceId}).`
    );
  } catch (error) {
    console.log(
      "Save vibration error:",
      error.message
    );
  }
}

// MQTT CONNECT
mqttClient.on(
  "connect",
  () => {
    console.log(
      "Connected to MQTT broker."
    );

    mqttClient.subscribe(
      MQTT_TOPIC,
      (error) => {
        if (error) {
          console.log(
            "MQTT subscribe error:",
            error.message
          );
        } else {
          console.log(
            `Subscribed to ${MQTT_TOPIC} (all devices)`
          );
        }
      }
    );
  }
);

// MQTT MESSAGE
mqttClient.on(
  "message",
  (topic, message) => {
    try {
      const data =
        JSON.parse(
          message.toString()
        );

      if (
        typeof data.vibration ===
        "number"
      ) {
        // Extract device ID from the topic
        // "quakealert/QA-002" → "QA-002"
        const topicParts =
          topic.split("/");

        const deviceId =
          topicParts[1] ||
          data.deviceId ||
          "QA-001";

        console.log(
          `MQTT message received from device: ${deviceId}`
        );

        let status = "NORMAL";

        if (
          data.vibration >= 5
        ) {
          status = "CRITICAL";
        } else if (
          data.vibration >= 2
        ) {
          status = "WARNING";
        }

        // Find which account owns the device
        const device =
          db
            .prepare(
              `SELECT
                user_id,
                location,
                sensor
               FROM devices
               WHERE device_id = ?
               LIMIT 1`
            )
            .get(deviceId);

        let userId = null;
        let location =
          data.location ||
          "Unknown Location";
        let sensor =
          data.sensor ||
          "MPU6050";

        if (device) {
          userId =
            device.user_id;

          location =
            decryptLocation(
              device.location
            );

          sensor =
            device.sensor;

          // Mark the device as ONLINE since it just sent data
          db.prepare(
            `UPDATE devices
             SET status = 'ONLINE'
             WHERE device_id = ?`
          ).run(deviceId);
        } else if (
          data.userId
        ) {
          userId =
            Number(data.userId);
        }

        // If no user owns this device, skip saving
        if (!userId) {
          console.log(
            `No user found for device ${deviceId}. Skipping save.`
          );

          return;
        }

        sensorData = {
          deviceId,
          location,
          sensor,
          vibration:
            data.vibration,
          status,
          timestamp:
            new Date().toISOString(),
          userId
        };

        saveVibration(
          userId
        );

        console.log(
          "MQTT sensor data saved:",
          sensorData
        );
      }
    } catch (error) {
      console.log(
        "MQTT message error:",
        error.message
      );
    }
  }
);

// MQTT ERROR
mqttClient.on(
  "error",
  (error) => {
    console.log(
      "MQTT error:",
      error.message
    );
  }
);

// REGISTER
app.post(
  "/api/register",
  async (req, res) => {
    const {
      name,
      email,
      password
    } = req.body;

    if (
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, and password are required."
      });
    }

    try {
      const existingUser =
        db
          .prepare(
            "SELECT id FROM users WHERE email = ?"
          )
          .get(email);

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message:
            "Email is already registered."
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const result =
        db
          .prepare(
            `INSERT INTO users
            (
              name,
              email,
              password,
              plan
            )
            VALUES (?, ?, ?, 'FREE')`
          )
          .run(
            name.trim(),
            email.trim(),
            hashedPassword
          );

      res.json({
        success: true,
        message:
          "Registration successful.",
        userId:
          result.lastInsertRowid
      });
    } catch (error) {
      console.log(
        "Registration error:",
        error.message
      );

      res.status(500).json({
        success: false,
        message:
          "Registration failed."
      });
    }
  }
);

// LOGIN
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required."
    });
  }

  try {
    const user = db.prepare(
      "SELECT id, name, email, password, plan FROM users WHERE email = ?"
    ).get(email.trim());

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    return res.json({
      success: true,
      message: "Login successful.",
      userId: user.id,
      name: user.name || "",
      email: user.email,
      plan: user.plan
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed."
    });
  }
});

// SYSTEM STATUS
app.get(
  "/api/status",
  (req, res) => {
    const userId =
      Number(
        req.query.userId
      );

    if (
      Number.isNaN(userId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "User ID is required."
      });
    }

    const sensor =
      getLatestSensor(
        userId
      );

    res.json({
      status: "Connected",
      device:
        sensor.deviceId,
      location:
        sensor.location,
      sensor:
        sensor.sensor,
      vibration:
        sensor.vibration,
      vibrationStatus:
        sensor.status,
      timestamp:
        sensor.timestamp
    });
  }
);

// CURRENT SENSOR DATA
app.get(
  "/api/sensor",
  (req, res) => {
    const userId =
      Number(
        req.query.userId
      );

    if (
      Number.isNaN(userId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "User ID is required."
      });
    }

    const sensor =
      getLatestSensor(
        userId
      );

    res.json(
      sensor
    );
  }
);

// VIBRATION HISTORY
app.get(
  "/api/history",
  (req, res) => {
    const userId =
      Number(
        req.query.userId
      );

    if (
      Number.isNaN(userId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "User ID is required."
      });
    }

    try {
      const history =
        db
          .prepare(
            `SELECT
              id,
              device_id AS deviceId,
              location,
              sensor,
              vibration,
              status,
              timestamp
             FROM vibration_history
             WHERE user_id = ?
             ORDER BY id DESC`
          )
          .all(userId);

      res.json(
        history
      );
    } catch (error) {
      console.log(
        "History error:",
        error.message
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to load vibration history."
      });
    }
  }
);

// MANUAL SENSOR TEST
app.post(
  "/api/sensor",
  (req, res) => {
    const {
      vibration,
      userId
    } = req.body;

    const numericVibration =
      Number(vibration);

    const numericUserId =
      Number(userId);

    if (
      Number.isNaN(
        numericVibration
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Vibration must be a number."
      });
    }

    if (
      Number.isNaN(
        numericUserId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "User ID is required."
      });
    }

    const device =
      db
        .prepare(
          `SELECT
            device_id,
            location,
            sensor
           FROM devices
           WHERE user_id = ?
           ORDER BY id ASC
           LIMIT 1`
        )
        .get(
          numericUserId
        );

    if (!device) {
      return res.status(400).json({
        success: false,
        message:
          "Please add a device before sending sensor data."
      });
    }

    const deviceId =
      device.device_id;

    // Mark the device as ONLINE since it just sent data
    db.prepare(
      `UPDATE devices
       SET status = 'ONLINE'
       WHERE device_id = ?`
    ).run(deviceId);

    const location =
      decryptLocation(
        device.location
      );

    const sensor =
      device.sensor;

    let status = "NORMAL";

    if (
      numericVibration >= 5
    ) {
      status = "CRITICAL";
    } else if (
      numericVibration >= 2
    ) {
      status = "WARNING";
    }

    sensorData = {
      deviceId,
      location,
      sensor,
      vibration:
        numericVibration,
      status,
      timestamp:
        new Date().toISOString(),
      userId:
        numericUserId
    };

    saveVibration(
      numericUserId
    );

    res.json({
      success: true,
      sensor:
        sensorData
    });
  }
);

// GET USER DEVICES
app.get(
  "/api/devices/:userId",
  (req, res) => {
    const userId =
      Number(
        req.params.userId
      );

    if (
      Number.isNaN(userId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID."
      });
    }

    try {
      const devices =
        db
          .prepare(
            `SELECT
              id,
              device_id AS deviceId,
              location,
              status,
              sensor,
              connection,
              created_at AS createdAt
            FROM devices
            WHERE user_id = ?
            ORDER BY id ASC`
          )
          .all(userId);

      // If a device hasn't sent data in the last 30 seconds,
      // treat it as OFFLINE (heartbeat timeout)
      const now = Date.now();

      const liveDevices =
        devices.map((device) => {
          const latest =
            db
              .prepare(
                `SELECT timestamp
                 FROM vibration_history
                 WHERE device_id = ?
                 ORDER BY id DESC
                 LIMIT 1`
              )
              .get(device.deviceId);

          let liveStatus = "OFFLINE";

          if (latest) {
            const lastMs =
              new Date(
                latest.timestamp
              ).getTime();

            if (
              now - lastMs <
              OFFLINE_AFTER_MS
            ) {
              liveStatus = "ONLINE";
            }
          }

          return {
            ...device,
            location:
              decryptLocation(
                device.location
              ),
            status: liveStatus
          };
        });

      res.json({
        success: true,
        devices:
          liveDevices
      });
    } catch (error) {
      console.log(
        "Get devices error:",
        error.message
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to load devices."
      });
    }
  }
);

// ADD DEVICE
app.post(
  "/api/devices",
  (req, res) => {
    const {
      userId,
      location
    } = req.body;

    const numericUserId =
      Number(userId);

    const cleanLocation =
      location
        ? location.trim()
        : "";

    if (
      !numericUserId ||
      !cleanLocation
    ) {
      return res.status(400).json({
        success: false,
        message:
          "User ID and monitoring location are required."
      });
    }

    try {
      const user =
        db
          .prepare(
            `SELECT
              id,
              plan
            FROM users
            WHERE id = ?`
          )
          .get(
            numericUserId
          );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User account not found."
        });
      }

      const deviceCount =
        db
          .prepare(
            `SELECT COUNT(*) AS count
             FROM devices
             WHERE user_id = ?`
          )
          .get(
            numericUserId
          );

      const maxDevices =
        user.plan ===
        "PRO"
          ? 3
          : 1;

      if (
        deviceCount.count >=
        maxDevices
      ) {
        return res.status(400).json({
          success: false,
          message:
            user.plan === "FREE"
              ? "Your Free Plan allows only 1 device. Upgrade to the PRO Plan to connect up to 3 devices."
              : "You have reached your device limit."
        });
      }

      const existingDevices =
        db
          .prepare(
            `SELECT device_id
             FROM devices
             WHERE user_id = ?`
          )
          .all(
            numericUserId
          );

      // Find the highest existing device number so we never reuse IDs
      let highestNumber = 0;

      existingDevices.forEach((device) => {
        const match = device.device_id.match(
          /QA-(\d+)/
        );

        if (match) {
          const number = Number(match[1]);

          if (number > highestNumber) {
            highestNumber = number;
          }
        }
      });

      const deviceNumber = highestNumber + 1;

      const deviceId =
        `QA-${String(deviceNumber).padStart(3, "0")}`;

      // Encrypt the monitoring location before saving it
      const encryptedLocation =
        encrypt(
          cleanLocation
        );

      const result =
        db
          .prepare(
            `INSERT INTO devices
            (
              user_id,
              device_id,
              location,
              status,
              sensor,
              connection,
              created_at
            )
            VALUES (?, ?, ?, 'OFFLINE', 'MPU6050', 'MQTT', ?)`
          )
          .run(
            numericUserId,
            deviceId,
            encryptedLocation,
            new Date().toISOString()
          );

      const newDevice =
        db
          .prepare(
            `SELECT
              id,
              device_id AS deviceId,
              location,
              status,
              sensor,
              connection,
              created_at AS createdAt
            FROM devices
            WHERE id = ?`
          )
          .get(
            result.lastInsertRowid
          );

      // Decrypt the location before sending it to the website
      newDevice.location =
        decryptLocation(
          newDevice.location
        );

      res.json({
        success: true,
        message:
          "Monitoring device added successfully.",
        device:
          newDevice
      });
    } catch (error) {
      console.log(
        "Add device error:",
        error.message
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to add device."
      });
    }
  }
);

// REMOVE DEVICE
app.delete(
  "/api/devices/:deviceId",
  (req, res) => {
    const deviceId =
      Number(
        req.params.deviceId
      );

    const userId =
      Number(
        req.body.userId
      );

    if (
      Number.isNaN(deviceId) ||
      Number.isNaN(userId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid device or user ID."
      });
    }

    try {
      const device =
        db
          .prepare(
            `SELECT id
             FROM devices
             WHERE id = ?
             AND user_id = ?`
          )
          .get(
            deviceId,
            userId
          );

      if (!device) {
        return res.status(404).json({
          success: false,
          message:
            "Device not found."
        });
      }

      db.prepare(
        `DELETE FROM devices
         WHERE id = ?
         AND user_id = ?`
      ).run(
        deviceId,
        userId
      );

      res.json({
        success: true,
        message:
          "Device removed successfully."
      });
    } catch (error) {
      console.log(
        "Remove device error:",
        error.message
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to remove device."
      });
    }
  }
);

// PAYPAL ACTIVATE SUBSCRIPTION
app.post(
  "/api/paypal/activate",
  async (req, res) => {
    const {
      subscriptionId,
      userId
    } = req.body;

    if (
      !subscriptionId ||
      !userId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Subscription ID and user ID are required."
      });
    }

    try {
      const accessToken =
        await getPayPalAccessToken();

      const response =
        await fetch(
          `${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`,
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`
            }
          }
        );

      const subscription =
        await response.json();

      if (
        subscription.status !==
        "ACTIVE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "PayPal subscription is not active."
        });
      }

      const existing =
        db
          .prepare(
            `SELECT id
             FROM subscriptions
             WHERE paypal_subscription_id = ?`
          )
          .get(
            subscriptionId
          );

      if (!existing) {
        db.prepare(
          `INSERT INTO subscriptions
          (
            user_id,
            paypal_subscription_id,
            plan,
            status,
            created_at
          )
          VALUES (?, ?, 'PRO', 'ACTIVE', ?)`
        ).run(
          Number(userId),
          subscriptionId,
          new Date().toISOString()
        );
      }

      db.prepare(
        `UPDATE users
         SET plan = 'PRO'
         WHERE id = ?`
      ).run(
        Number(userId)
      );

      res.json({
        success: true,
        message:
          "PRO Plan activated successfully."
      });
    } catch (error) {
      console.log(
        "PayPal activation error:",
        error.message
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to activate PayPal subscription."
      });
    }
  }
);

// TEST PAYPAL CONNECTION
app.get(
  "/api/paypal/test",
  async (req, res) => {
    try {
      const accessToken =
        await getPayPalAccessToken();

      res.json({
        success: true,
        message:
          "PayPal connection is working.",
        tokenReceived:
          Boolean(accessToken)
      });
    } catch (error) {
      console.log(
        "PayPal test error:",
        error.message
      );

      res.status(500).json({
        success: false,
        message:
          "PayPal connection failed."
      });
    }
  }
);

// PAYPAL PRODUCT
app.get(
  "/api/paypal/product",
  async (req, res) => {
    try {
      const accessToken =
        await getPayPalAccessToken();

      const productId =
        "PROD-1JB1603702904822Y";

      const response =
        await fetch(
          `${PAYPAL_BASE_URL}/v1/catalogs/products/${productId}`,
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`
            }
          }
        );

      const product =
        await response.json();

      res.json(
        product
      );
    } catch (error) {
      console.log(
        "PayPal product error:",
        error.message
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to get PayPal product."
      });
    }
  }
);

// PAYPAL PLAN
app.get(
  "/api/paypal/plan",
  async (req, res) => {
    try {
      const accessToken =
        await getPayPalAccessToken();

      const planId =
        "P-96S3081159522614MNK2UD4Y";

      const response =
        await fetch(
          `${PAYPAL_BASE_URL}/v1/billing/plans/${planId}`,
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`
            }
          }
        );

      const plan =
        await response.json();

      res.json(
        plan
      );
    } catch (error) {
      console.log(
        "PayPal plan error:",
        error.message
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to get PayPal plan."
      });
    }
  }
);

// START SERVER
const PORT =
  process.env.PORT || 5000;

app.listen(
  PORT,
  () => {
    console.log(
      `QuakeAlert server running on port ${PORT}`
    );
  }
);