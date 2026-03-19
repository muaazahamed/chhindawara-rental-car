const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { config } = require("../config/env");
const { backendRoot } = require("../config/paths");

const resolvedPath = path.isAbsolute(config.dbPath)
  ? config.dbPath
  : path.resolve(backendRoot, config.dbPath);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    min_price_per_km REAL NOT NULL,
    max_price_per_km REAL NOT NULL,
    commission_percentage REAL NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS riders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    password_hash TEXT,
    selected_price_per_km REAL NOT NULL,
    profession TEXT NOT NULL DEFAULT 'Professional Rider',
    rating REAL NOT NULL DEFAULT 4.5,
    vehicle_type TEXT NOT NULL DEFAULT '4W',
    ac_type TEXT NOT NULL DEFAULT 'AC',
    waiting_time_min INTEGER NOT NULL DEFAULT 5,
    profile_photo TEXT,
    car_model TEXT DEFAULT 'Sedan',
    car_number TEXT DEFAULT 'MP-28-0000',
    status TEXT NOT NULL DEFAULT 'offline',
    latitude REAL,
    longitude REAL,
    wallet_balance REAL NOT NULL DEFAULT 0,
    today_earnings REAL NOT NULL DEFAULT 0,
    total_earnings REAL NOT NULL DEFAULT 0,
    commission_deducted REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rider_id INTEGER NOT NULL,
    pickup TEXT NOT NULL,
    dropoff TEXT NOT NULL,
    distance_km REAL NOT NULL,
    ride_cost REAL NOT NULL,
    commission_amount REAL NOT NULL,
    total_price REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (rider_id) REFERENCES riders(id)
  );

  CREATE TABLE IF NOT EXISTS ride_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    pickup TEXT NOT NULL,
    dropoff TEXT NOT NULL,
    pickup_latitude REAL NOT NULL,
    pickup_longitude REAL NOT NULL,
    drop_latitude REAL,
    drop_longitude REAL,
    distance_km REAL NOT NULL,
    estimated_fare REAL NOT NULL,
    rider_id INTEGER,
    rider_price_per_km REAL,
    commission_percentage REAL,
    commission_amount REAL,
    driver_earning REAL,
    status TEXT NOT NULL,
    requested_at TEXT NOT NULL,
    accepted_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    rejected_at TEXT,
    FOREIGN KEY (rider_id) REFERENCES riders(id)
  );

  CREATE TABLE IF NOT EXISTS rider_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rider_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    revoked_at TEXT,
    FOREIGN KEY (rider_id) REFERENCES riders(id)
  );
`);

const now = () => new Date().toISOString();

function ensureColumn(tableName, columnName, sqlTypeWithDefault) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((col) => col.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlTypeWithDefault}`);
  }
}

ensureColumn("riders", "profession", "TEXT NOT NULL DEFAULT 'Professional Rider'");
ensureColumn("riders", "phone", "TEXT");
ensureColumn("riders", "email", "TEXT");
ensureColumn("riders", "password_hash", "TEXT");
ensureColumn("riders", "rating", "REAL NOT NULL DEFAULT 4.5");
ensureColumn("riders", "vehicle_type", "TEXT NOT NULL DEFAULT '4W'");
ensureColumn("riders", "ac_type", "TEXT NOT NULL DEFAULT 'AC'");
ensureColumn("riders", "waiting_time_min", "INTEGER NOT NULL DEFAULT 5");
ensureColumn("riders", "profile_photo", "TEXT");
ensureColumn("riders", "car_model", "TEXT DEFAULT 'Sedan'");
ensureColumn("riders", "car_number", "TEXT DEFAULT 'MP-28-0000'");
ensureColumn("riders", "status", "TEXT NOT NULL DEFAULT 'offline'");
ensureColumn("riders", "latitude", "REAL");
ensureColumn("riders", "longitude", "REAL");
ensureColumn("riders", "wallet_balance", "REAL NOT NULL DEFAULT 0");
ensureColumn("riders", "today_earnings", "REAL NOT NULL DEFAULT 0");
ensureColumn("riders", "total_earnings", "REAL NOT NULL DEFAULT 0");
ensureColumn("riders", "commission_deducted", "REAL NOT NULL DEFAULT 0");

db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_riders_phone_unique ON riders(phone) WHERE phone IS NOT NULL");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_riders_email_unique ON riders(email) WHERE email IS NOT NULL");
db.exec("CREATE INDEX IF NOT EXISTS idx_rider_tokens_rider_id ON rider_tokens(rider_id)");

const settingsExists = db.prepare("SELECT id FROM admin_settings WHERE id = 1").get();
if (!settingsExists) {
  db.prepare(
    `INSERT INTO admin_settings (id, min_price_per_km, max_price_per_km, commission_percentage, updated_at)
     VALUES (1, 5, 10, 20, ?)`
  ).run(now());
}

const riderCount = db.prepare("SELECT COUNT(*) as c FROM riders").get();
if (!riderCount || riderCount.c === 0) {
  const insert = db.prepare(
    `INSERT INTO riders (name, selected_price_per_km, profession, rating, vehicle_type, ac_type, waiting_time_min, profile_photo, car_model, car_number, status, latitude, longitude, wallet_balance, today_earnings, total_earnings, commission_deducted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const ts = now();
  insert.run(
    "Ravi Sharma", 7, "Professional Driver", 4.9, "4W", "AC", 3,
    "https://ui-avatars.com/api/?name=Ravi+Sharma&background=FFD700&color=16130a&bold=true",
    "Dzire", "MP-28-AB-1001", "offline", 22.0574, 78.9382,
    2840, 520, 18450, 2900, ts, ts
  );
  insert.run(
    "Aman Khan", 6, "City Rider", 4.7, "2W", "Non-AC", 5,
    "https://ui-avatars.com/api/?name=Aman+Khan&background=FFD700&color=16130a&bold=true",
    "Activa", "MP-28-CD-2202", "offline", 22.0650, 78.9420,
    1930, 410, 12980, 2100, ts, ts
  );
  insert.run(
    "Suresh Patil", 8, "Premium Driver", 4.8, "4W", "AC", 4,
    "https://ui-avatars.com/api/?name=Suresh+Patil&background=FFD700&color=16130a&bold=true",
    "Ertiga", "MP-28-EF-3303", "offline", 22.0488, 78.9300,
    3210, 680, 21240, 3450, ts, ts
  );
} else {
  db.prepare(
    `UPDATE riders
     SET profession = COALESCE(NULLIF(profession, ''), 'Professional Driver'),
         rating = COALESCE(rating, 4.5),
         vehicle_type = COALESCE(NULLIF(vehicle_type, ''), '4W'),
         ac_type = COALESCE(NULLIF(ac_type, ''), 'AC'),
         waiting_time_min = COALESCE(waiting_time_min, 5),
         car_model = COALESCE(NULLIF(car_model, ''), 'Sedan'),
         car_number = COALESCE(NULLIF(car_number, ''), 'MP-28-0000'),
         status = CASE WHEN status IN ('online', 'offline') THEN status ELSE 'offline' END,
         wallet_balance = COALESCE(wallet_balance, 0),
         today_earnings = COALESCE(today_earnings, 0),
         total_earnings = COALESCE(total_earnings, 0),
         commission_deducted = COALESCE(commission_deducted, 0)`
  ).run();

  db.prepare(
    `UPDATE riders
     SET profession = 'Professional Driver',
         rating = 4.9,
         vehicle_type = '4W',
         ac_type = 'AC',
         waiting_time_min = 3,
         profile_photo = COALESCE(profile_photo, 'https://ui-avatars.com/api/?name=Ravi+Sharma&background=FFD700&color=16130a&bold=true'),
         car_model = 'Dzire',
         car_number = 'MP-28-AB-1001',
         latitude = COALESCE(latitude, 22.0574),
         longitude = COALESCE(longitude, 78.9382)
     WHERE id = 1`
  ).run();

  db.prepare(
    `UPDATE riders
     SET profession = 'City Rider',
         rating = 4.7,
         vehicle_type = '2W',
         ac_type = 'Non-AC',
         waiting_time_min = 5,
         profile_photo = COALESCE(profile_photo, 'https://ui-avatars.com/api/?name=Aman+Khan&background=FFD700&color=16130a&bold=true'),
         car_model = 'Activa',
         car_number = 'MP-28-CD-2202',
         latitude = COALESCE(latitude, 22.0650),
         longitude = COALESCE(longitude, 78.9420)
     WHERE id = 2`
  ).run();

  db.prepare(
    `UPDATE riders
     SET profession = 'Premium Driver',
         rating = 4.8,
         vehicle_type = '4W',
         ac_type = 'AC',
         waiting_time_min = 4,
         profile_photo = COALESCE(profile_photo, 'https://ui-avatars.com/api/?name=Suresh+Patil&background=FFD700&color=16130a&bold=true'),
         car_model = 'Ertiga',
         car_number = 'MP-28-EF-3303',
         latitude = COALESCE(latitude, 22.0488),
         longitude = COALESCE(longitude, 78.9300)
     WHERE id = 3`
  ).run();
}

module.exports = { db, now };
