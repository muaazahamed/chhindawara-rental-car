const { z } = require("zod");
const jwt = require("jsonwebtoken");
const { db, now } = require("../../db/database");
const { config } = require("../../config/env");
const { AppError } = require("../../utils/app-error");

const settingsSchema = z.object({
  minPricePerKm: z.number().min(1),
  maxPricePerKm: z.number().min(1),
  commissionPercentage: z.number().min(0).max(100),
});

const adminLoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

function getSettings() {
  const row = db.prepare("SELECT * FROM admin_settings WHERE id = 1").get();
  return {
    minPricePerKm: row.min_price_per_km,
    maxPricePerKm: row.max_price_per_km,
    commissionPercentage: row.commission_percentage,
    updatedAt: row.updated_at,
  };
}

function updateSettings(payload) {
  const parsed = settingsSchema.parse(payload);

  if (parsed.minPricePerKm > parsed.maxPricePerKm) {
    throw new AppError("minPricePerKm cannot be greater than maxPricePerKm", 400);
  }

  db.prepare(
    `UPDATE admin_settings
     SET min_price_per_km = ?, max_price_per_km = ?, commission_percentage = ?, updated_at = ?
     WHERE id = 1`
  ).run(parsed.minPricePerKm, parsed.maxPricePerKm, parsed.commissionPercentage, now());

  db.prepare(
    `UPDATE riders
     SET selected_price_per_km = CASE
       WHEN selected_price_per_km < ? THEN ?
       WHEN selected_price_per_km > ? THEN ?
       ELSE selected_price_per_km
     END,
     updated_at = ?`
  ).run(parsed.minPricePerKm, parsed.minPricePerKm, parsed.maxPricePerKm, parsed.maxPricePerKm, now());

  return getSettings();
}

function loginAdmin(payload) {
  const parsed = adminLoginSchema.parse(payload);

  if (parsed.username !== config.adminUsername || parsed.password !== config.adminPassword) {
    throw new AppError("Invalid admin credentials", 401);
  }

  const token = jwt.sign({ role: "admin", username: parsed.username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  return { token };
}

module.exports = { getSettings, updateSettings, loginAdmin };
