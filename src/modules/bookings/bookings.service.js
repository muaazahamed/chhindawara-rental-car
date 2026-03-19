const { z } = require("zod");
const { db, now } = require("../../db/database");
const { estimateFare } = require("../fares/fares.service");

const bookingSchema = z.object({
  riderId: z.number().int().positive(),
  pickup: z.string().min(2),
  dropoff: z.string().min(2),
  distanceKm: z.number().positive(),
});

function createBooking(payload) {
  const parsed = bookingSchema.parse(payload);
  const fare = estimateFare({ riderId: parsed.riderId, distanceKm: parsed.distanceKm });
  const createdAt = now();

  const result = db.prepare(
    `INSERT INTO bookings (rider_id, pickup, dropoff, distance_km, ride_cost, commission_amount, total_price, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    parsed.riderId,
    parsed.pickup,
    parsed.dropoff,
    parsed.distanceKm,
    fare.rideCost,
    fare.commissionAmount,
    fare.totalPrice,
    "requested",
    createdAt
  );

  return {
    bookingId: result.lastInsertRowid,
    status: "requested",
    pickup: parsed.pickup,
    dropoff: parsed.dropoff,
    ...fare,
    createdAt,
  };
}

function listBookings() {
  const rows = db.prepare(
    `SELECT b.id, b.pickup, b.dropoff, b.distance_km, b.ride_cost, b.commission_amount, b.total_price, b.status, b.created_at,
            r.id as rider_id, r.name as rider_name, r.selected_price_per_km
     FROM bookings b
     JOIN riders r ON r.id = b.rider_id
     ORDER BY b.id DESC`
  ).all();

  return rows.map((row) => ({
    bookingId: row.id,
    pickup: row.pickup,
    dropoff: row.dropoff,
    distanceKm: row.distance_km,
    rideCost: row.ride_cost,
    commissionAmount: row.commission_amount,
    totalPrice: row.total_price,
    status: row.status,
    createdAt: row.created_at,
    rider: {
      id: row.rider_id,
      name: row.rider_name,
      selectedPricePerKm: row.selected_price_per_km,
    },
  }));
}

module.exports = { createBooking, listBookings };