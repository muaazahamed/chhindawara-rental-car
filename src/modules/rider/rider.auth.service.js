const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { db, now } = require("../../db/database");
const { AppError } = require("../../utils/app-error");
const { config } = require("../../config/env");
const { tokenHash } = require("../../middleware/auth");

const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\d{10}$/),
  email: z.string().email(),
  password: z.string().min(6),
  vehicle_type: z.string().min(2),
  car_number: z.string().min(4),
  price_per_km: z.number().positive(),
  profile_photo: z.string().url().optional(),
});

const loginSchema = z.object({
  phone: z.string().regex(/^\d{10}$/).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6),
}).refine((data) => data.phone || data.email, {
  message: "phone or email is required",
  path: ["phone"],
});

function mapRiderForAuth(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    vehicle_type: row.vehicle_type,
    car_number: row.car_number,
    price_per_km: row.selected_price_per_km,
    rating: row.rating,
    wallet_balance: row.wallet_balance,
    profile_photo: row.profile_photo,
    status: row.status,
  };
}

function parseVehicleType(value) {
  const upper = value.toUpperCase();
  const vehicle_type = upper.includes("2W") ? "2W" : "4W";
  const ac_type = upper.includes("NON") ? "Non-AC" : "AC";
  return { vehicle_type, ac_type };
}

function registerRider(payload) {
  const parsed = registerSchema.parse(payload);

  const duplicate = db.prepare("SELECT id FROM riders WHERE phone = ? OR email = ?").get(parsed.phone, parsed.email.toLowerCase());
  if (duplicate) throw new AppError("Phone or email already exists", 409);

  const passwordHash = bcrypt.hashSync(parsed.password, 10);
  const ts = now();
  const vehicleMeta = parseVehicleType(parsed.vehicle_type);

  const result = db.prepare(
    `INSERT INTO riders (
      name, phone, email, password_hash, selected_price_per_km,
      vehicle_type, ac_type, car_number, profile_photo,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'offline', ?, ?)`
  ).run(
    parsed.name,
    parsed.phone,
    parsed.email.toLowerCase(),
    passwordHash,
    parsed.price_per_km,
    vehicleMeta.vehicle_type,
    vehicleMeta.ac_type,
    parsed.car_number,
    parsed.profile_photo || null,
    ts,
    ts
  );

  const rider = db.prepare("SELECT * FROM riders WHERE id = ?").get(result.lastInsertRowid);
  return mapRiderForAuth(rider);
}

function loginRider(payload) {
  const parsed = loginSchema.parse(payload);

  const rider = parsed.phone
    ? db.prepare("SELECT * FROM riders WHERE phone = ?").get(parsed.phone)
    : db.prepare("SELECT * FROM riders WHERE email = ?").get(parsed.email.toLowerCase());

  if (!rider || !rider.password_hash) throw new AppError("Invalid credentials", 401);

  const valid = bcrypt.compareSync(parsed.password, rider.password_hash);
  if (!valid) throw new AppError("Invalid credentials", 401);

  const token = jwt.sign({ riderId: rider.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  db.prepare(
    `INSERT INTO rider_tokens (rider_id, token_hash, is_revoked, created_at)
     VALUES (?, ?, 0, ?)`
  ).run(rider.id, tokenHash(token), now());

  return {
    token,
    rider: mapRiderForAuth(rider),
  };
}

function logoutRider(authContext) {
  db.prepare("UPDATE rider_tokens SET is_revoked = 1, revoked_at = ? WHERE token_hash = ?").run(now(), authContext.tokenHash);
  return { message: "Logged out successfully" };
}

function getRiderProfile(riderId) {
  const rider = db.prepare(
    `SELECT id, name, phone, email, vehicle_type, ac_type, car_number, selected_price_per_km, rating, wallet_balance, profile_photo, status
     FROM riders WHERE id = ?`
  ).get(riderId);

  if (!rider) throw new AppError("Rider not found", 404);

  return {
    id: rider.id,
    name: rider.name,
    phone: rider.phone,
    email: rider.email,
    vehicle_type: rider.vehicle_type,
    ac_type: rider.ac_type,
    car_number: rider.car_number,
    price_per_km: rider.selected_price_per_km,
    rating: rider.rating,
    wallet_balance: rider.wallet_balance,
    profile_photo: rider.profile_photo,
    status: rider.status,
  };
}

module.exports = { registerRider, loginRider, logoutRider, getRiderProfile };