const { z } = require("zod");
const { db, now } = require("../../db/database");
const { AppError } = require("../../utils/app-error");
const { getSettings } = require("../admin/admin.service");

const riderPriceSchema = z.object({
  selectedPricePerKm: z.number().positive(),
});

function listRiders() {
  return db.prepare(
    `SELECT r.id, r.name, r.selected_price_per_km, r.profession, r.rating, r.vehicle_type, r.ac_type, r.waiting_time_min, r.status,
            EXISTS(
              SELECT 1 FROM ride_requests rr
              WHERE rr.rider_id = r.id AND rr.status IN ('accepted', 'started')
            ) AS is_busy
     FROM riders r
     ORDER BY r.id`
  ).all().map((r) => ({
    id: r.id,
    name: r.name,
    selectedPricePerKm: r.selected_price_per_km,
    profession: r.profession,
    rating: r.rating,
    vehicleType: r.vehicle_type,
    acType: r.ac_type,
    waitingTimeMin: r.waiting_time_min,
    status: r.status,
    availabilityStatus: r.status !== "online" ? "offline" : (Number(r.is_busy) ? "busy" : "available"),
  }));
}

function getRiderById(riderId) {
  const rider = db.prepare("SELECT id, name, selected_price_per_km, profession, rating, vehicle_type, ac_type, waiting_time_min FROM riders WHERE id = ?").get(riderId);
  if (!rider) throw new AppError("Rider not found", 404);
  return {
    id: rider.id,
    name: rider.name,
    selectedPricePerKm: rider.selected_price_per_km,
    profession: rider.profession,
    rating: rider.rating,
    vehicleType: rider.vehicle_type,
    acType: rider.ac_type,
    waitingTimeMin: rider.waiting_time_min,
  };
}

function updateRiderPrice(riderId, payload) {
  const parsed = riderPriceSchema.parse(payload);
  const settings = getSettings();

  if (parsed.selectedPricePerKm < settings.minPricePerKm || parsed.selectedPricePerKm > settings.maxPricePerKm) {
    throw new AppError(`selectedPricePerKm must be between ${settings.minPricePerKm} and ${settings.maxPricePerKm}`, 400);
  }

  const result = db.prepare("UPDATE riders SET selected_price_per_km = ?, updated_at = ? WHERE id = ?").run(parsed.selectedPricePerKm, now(), riderId);

  if (result.changes === 0) throw new AppError("Rider not found", 404);
  return getRiderById(riderId);
}

module.exports = { listRiders, getRiderById, updateRiderPrice };
