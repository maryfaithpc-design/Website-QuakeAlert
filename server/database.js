const Database = require("better-sqlite3");

const db = new Database("quakealert.db");

// USERS TABLE

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'FREE'
  )
`).run();

const userColumns = db.prepare("PRAGMA table_info(users)").all();

if (!userColumns.some((column) => column.name === "name")) {
  db.prepare(
    "ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''"
  ).run();
}

// SUBSCRIPTIONS TABLE

db.prepare(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    paypal_subscription_id TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`).run();

// DEVICES TABLE

db.prepare(`
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    device_id TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OFFLINE',
    sensor TEXT NOT NULL DEFAULT 'MPU6050',
    connection TEXT NOT NULL DEFAULT 'MQTT',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`).run();

// VIBRATION HISTORY TABLE
db.prepare(`
  CREATE TABLE IF NOT EXISTS vibration_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    device_id TEXT NOT NULL,
    location TEXT NOT NULL,
    sensor TEXT NOT NULL,
    vibration REAL NOT NULL,
    status TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`).run();

console.log("QuakeAlert database is ready.");

module.exports = db;