const { z } = require("zod");
const { db, now } = require("../../db/database");
const { AppError } = require("../../utils/app-error");
const { haversineKm } = require("../../utils/geo");
const { getSettings } = require("../admin/admin.service");

const riderIdSchema = z.number().int().positive();

const statusSchema = z.object({
  riderId: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  status: z.enum(["online", "offline"]),
});

const locationSchema = z.object({
  riderId: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const setPriceSchema = z.object({
  riderId: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  selectedPricePerKm: z.number().positive(),
});

const requestRideSchema = z.object({
  customerName: z.string().min(2),
  pickup: z.string().min(2),
  dropoff: z.string().min(2),
  pickupLatitude: z.number().min(-90).max(90),
  pickupLongitude: z.number().min(-180).max(180),
  dropLatitude: z.number().min(-90).max(90).optional(),
  dropLongitude: z.number().min(-180).max(180).optional(),
  distanceKm: z.number().positive(),
});

const rideActionSchema = z.object({
  riderId: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  rideId: z.union([z.string(), z.number()]).transform((v) => Number(v)),
});
const rideIdSchema = z.union([z.string(), z.number()]).transform((v) => Number(v));

function hasActiveRide(riderId) {
  const row = db.prepare(
    `SELECT COUNT(*) as c FROM ride_requests
     WHERE rider_id = ? AND status IN ('accepted', 'started')`
  ).get(riderId);
  return Number(row?.c || 0) > 0;
}

function mapRiderRow(row) {
  return {
    id: row.id,
    name: row.name,
    profilePhoto: row.profile_photo,
    profession: row.profession,
    rating: row.rating,
    selectedPricePerKm: row.selected_price_per_km,
    vehicleType: row.vehicle_type,
    acType: row.ac_type,
    waitingTimeMin: row.waiting_time_min,
    carModel: row.car_model,
    carNumber: row.car_number,
    status: row.status,
    latitude: row.latitude,
    longitude: row.longitude,
    walletBalance: row.wallet_balance,
    todayEarnings: row.today_earnings,
    totalEarnings: row.total_earnings,
    commissionDeducted: row.commission_deducted,
  };
}

function getRiderById(riderId) {
  const parsedId = riderIdSchema.parse(riderId);
  const row = db.prepare("SELECT * FROM riders WHERE id = ?").get(parsedId);
  if (!row) throw new AppError("Rider not found", 404);
  return mapRiderRow(row);
}

function getDashboard(riderId) {
  const rider = getRiderById(riderId);
  const busy = hasActiveRide(rider.id);
  const settings = getSettings();
  return {
    rider: {
      ...rider,
      availabilityStatus: rider.status !== "online" ? "offline" : (busy ? "busy" : "available"),
    },
    wallet: {
      walletBalance: rider.walletBalance,
      todayEarnings: rider.todayEarnings,
      totalEarnings: rider.totalEarnings,
      commissionDeducted: rider.commissionDeducted,
    },
    vehicle: {
      vehicleType: rider.vehicleType,
      carModel: rider.carModel,
      carNumber: rider.carNumber,
      acType: rider.acType,
    },
    settings: {
      minPricePerKm: settings.minPricePerKm,
      maxPricePerKm: settings.maxPricePerKm,
    },
  };
}

function setStatus(payload) {
  const parsed = statusSchema.parse(payload);
  if (parsed.status === "offline" && hasActiveRide(parsed.riderId)) {
    throw new AppError("Cannot go offline while ride is in progress", 400);
  }
  const result = db.prepare("UPDATE riders SET status = ?, updated_at = ? WHERE id = ?").run(parsed.status, now(), parsed.riderId);
  if (result.changes === 0) throw new AppError("Rider not found", 404);
  return getRiderById(parsed.riderId);
}

function updateLocation(payload) {
  const parsed = locationSchema.parse(payload);
  const ts = now();
  const result = db.prepare("UPDATE riders SET latitude = ?, longitude = ?, updated_at = ? WHERE id = ?").run(parsed.latitude, parsed.longitude, ts, parsed.riderId);
  if (result.changes === 0) throw new AppError("Rider not found", 404);
  return { riderId: parsed.riderId, latitude: parsed.latitude, longitude: parsed.longitude, updatedAt: ts };
}

function setPrice(payload) {
  const parsed = setPriceSchema.parse(payload);
  const settings = getSettings();

  if (parsed.selectedPricePerKm < settings.minPricePerKm || parsed.selectedPricePerKm > settings.maxPricePerKm) {
    throw new AppError(`selectedPricePerKm must be between ${settings.minPricePerKm} and ${settings.maxPricePerKm}`, 400);
  }

  const result = db.prepare("UPDATE riders SET selected_price_per_km = ?, updated_at = ? WHERE id = ?").run(parsed.selectedPricePerKm, now(), parsed.riderId);
  if (result.changes === 0) throw new AppError("Rider not found", 404);
  return getRiderById(parsed.riderId);
}

function requestRide(payload) {
  const parsed = requestRideSchema.parse(payload);
  const settings = getSettings();

  const onlineRiders = db.prepare(
    `SELECT r.* FROM riders r
     WHERE r.status = 'online'
       AND r.latitude IS NOT NULL
       AND r.longitude IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM ride_requests rr
         WHERE rr.rider_id = r.id
           AND rr.status IN ('accepted', 'started')
       )`
  ).all();
  if (!onlineRiders.length) {
    throw new AppError("No available riders online", 404);
  }

  const nearest = onlineRiders
    .map((r) => ({
      rider: r,
      distanceFromPickup: haversineKm(parsed.pickupLatitude, parsed.pickupLongitude, r.latitude, r.longitude),
    }))
    .sort((a, b) => a.distanceFromPickup - b.distanceFromPickup)[0];

  const riderPricePerKm = Number(nearest.rider.selected_price_per_km);
  const rideCost = parsed.distanceKm * riderPricePerKm;
  const commissionAmount = rideCost * (settings.commissionPercentage / 100);
  const estimatedFare = rideCost + commissionAmount;
  const driverEarning = rideCost - commissionAmount;

  const ts = now();
  const result = db.prepare(
    `INSERT INTO ride_requests (
      customer_name, pickup, dropoff, pickup_latitude, pickup_longitude, drop_latitude, drop_longitude,
      distance_km, estimated_fare, rider_id, rider_price_per_km, commission_percentage, commission_amount,
      driver_earning, status, requested_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    parsed.customerName,
    parsed.pickup,
    parsed.dropoff,
    parsed.pickupLatitude,
    parsed.pickupLongitude,
    parsed.dropLatitude ?? null,
    parsed.dropLongitude ?? null,
    parsed.distanceKm,
    Number(estimatedFare.toFixed(2)),
    nearest.rider.id,
    riderPricePerKm,
    settings.commissionPercentage,
    Number(commissionAmount.toFixed(2)),
    Number(driverEarning.toFixed(2)),
    "requested",
    ts
  );

  return {
    rideId: result.lastInsertRowid,
    riderId: nearest.rider.id,
    riderName: nearest.rider.name,
    distanceFromPickupKm: Number(nearest.distanceFromPickup.toFixed(2)),
    estimatedFare: Number(estimatedFare.toFixed(2)),
    status: "requested",
  };
}

function listPendingRequests(riderId) {
  const parsedId = riderIdSchema.parse(riderId);
  return db.prepare(
    `SELECT * FROM ride_requests
     WHERE rider_id = ? AND status = 'requested'
     ORDER BY id DESC`
  ).all(parsedId).map((r) => ({
    rideId: r.id,
    customerName: r.customer_name,
    pickup: r.pickup,
    dropoff: r.dropoff,
    distanceKm: r.distance_km,
    estimatedFare: r.estimated_fare,
    requestedAt: r.requested_at,
    status: r.status,
  }));
}

function getCurrentRide(riderId) {
  const parsedId = riderIdSchema.parse(riderId);
  const row = db.prepare(
    `SELECT * FROM ride_requests
     WHERE rider_id = ? AND status IN ('accepted', 'started')
     ORDER BY id DESC LIMIT 1`
  ).get(parsedId);

  if (!row) return null;

  return {
    rideId: row.id,
    customerName: row.customer_name,
    pickup: row.pickup,
    dropoff: row.dropoff,
    distanceKm: row.distance_km,
    estimatedFare: row.estimated_fare,
    driverEarning: row.driver_earning,
    commissionAmount: row.commission_amount,
    status: row.status,
    requestedAt: row.requested_at,
    acceptedAt: row.accepted_at,
    startedAt: row.started_at,
  };
}

function acceptRide(payload) {
  const parsed = rideActionSchema.parse(payload);
  const rider = db.prepare("SELECT status FROM riders WHERE id = ?").get(parsed.riderId);
  if (!rider) throw new AppError("Rider not found", 404);
  if (rider.status !== "online") throw new AppError("Rider must be online to accept rides", 400);
  if (hasActiveRide(parsed.riderId)) throw new AppError("Rider is busy with another ride", 400);

  const ts = now();
  const result = db.prepare(
    `UPDATE ride_requests
     SET status = 'accepted', accepted_at = ?
     WHERE id = ? AND rider_id = ? AND status = 'requested'`
  ).run(ts, parsed.rideId, parsed.riderId);

  if (result.changes === 0) throw new AppError("Ride request not found or already processed", 404);
  return getCurrentRide(parsed.riderId);
}

function rejectRide(payload) {
  const parsed = rideActionSchema.parse(payload);
  const ts = now();
  const result = db.prepare(
    `UPDATE ride_requests
     SET status = 'rejected', rejected_at = ?
     WHERE id = ? AND rider_id = ? AND status = 'requested'`
  ).run(ts, parsed.rideId, parsed.riderId);

  if (result.changes === 0) throw new AppError("Ride request not found or already processed", 404);
  return { rideId: parsed.rideId, status: "rejected" };
}

function startRide(payload) {
  const parsed = rideActionSchema.parse(payload);
  const ts = now();
  const result = db.prepare(
    `UPDATE ride_requests
     SET status = 'started', started_at = ?
     WHERE id = ? AND rider_id = ? AND status = 'accepted'`
  ).run(ts, parsed.rideId, parsed.riderId);

  if (result.changes === 0) throw new AppError("Ride not ready to start", 400);
  return getCurrentRide(parsed.riderId);
}

function endRide(payload) {
  const parsed = rideActionSchema.parse(payload);
  const ride = db.prepare("SELECT * FROM ride_requests WHERE id = ? AND rider_id = ? AND status = 'started'").get(parsed.rideId, parsed.riderId);
  if (!ride) throw new AppError("Ride not in progress", 400);

  const ts = now();
  db.prepare(
    `UPDATE ride_requests
     SET status = 'completed', completed_at = ?
     WHERE id = ?`
  ).run(ts, parsed.rideId);

  db.prepare(
    `UPDATE riders
     SET wallet_balance = wallet_balance + ?,
         today_earnings = today_earnings + ?,
         total_earnings = total_earnings + ?,
         commission_deducted = commission_deducted + ?,
         updated_at = ?
     WHERE id = ?`
  ).run(
    ride.driver_earning,
    ride.driver_earning,
    ride.driver_earning,
    ride.commission_amount,
    ts,
    parsed.riderId
  );

  return {
    rideId: parsed.rideId,
    status: "completed",
    driverEarning: ride.driver_earning,
    commissionAmount: ride.commission_amount,
  };
}

function getWallet(riderId) {
  const rider = getRiderById(riderId);
  return {
    riderId: rider.id,
    walletBalance: rider.walletBalance,
    todayEarnings: rider.todayEarnings,
    totalEarnings: rider.totalEarnings,
    commissionDeducted: rider.commissionDeducted,
  };
}

function getHistory(riderId) {
  const parsedId = riderIdSchema.parse(riderId);
  return db.prepare(
    `SELECT * FROM ride_requests
     WHERE rider_id = ?
     ORDER BY id DESC`
  ).all(parsedId).map((row) => ({
    rideId: row.id,
    date: row.requested_at,
    pickup: row.pickup,
    dropoff: row.dropoff,
    distanceKm: row.distance_km,
    fare: row.estimated_fare,
    commission: row.commission_amount,
    status: row.status,
  }));
}

function getRideRequestStatus(rideId) {
  const parsedId = rideIdSchema.parse(rideId);
  const row = db.prepare(
    `SELECT id, rider_id, customer_name, pickup, dropoff, distance_km, estimated_fare, status, requested_at, accepted_at, started_at, completed_at, rejected_at
     FROM ride_requests
     WHERE id = ?`
  ).get(parsedId);

  if (!row) throw new AppError("Ride request not found", 404);

  return {
    rideId: row.id,
    riderId: row.rider_id,
    customerName: row.customer_name,
    pickup: row.pickup,
    dropoff: row.dropoff,
    distanceKm: row.distance_km,
    estimatedFare: row.estimated_fare,
    status: row.status,
    requestedAt: row.requested_at,
    acceptedAt: row.accepted_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    rejectedAt: row.rejected_at,
  };
}

module.exports = {
  getDashboard,
  setStatus,
  updateLocation,
  setPrice,
  requestRide,
  listPendingRequests,
  getCurrentRide,
  acceptRide,
  rejectRide,
  startRide,
  endRide,
  getWallet,
  getHistory,
  getRideRequestStatus,
};
