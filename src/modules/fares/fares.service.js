const { z } = require("zod");
const { getSettings } = require("../admin/admin.service");
const { getRiderById } = require("../riders/riders.service");

const fareSchema = z.object({
  riderId: z.number().int().positive(),
  distanceKm: z.number().positive(),
});

function estimateFare(payload) {
  const parsed = fareSchema.parse(payload);
  const rider = getRiderById(parsed.riderId);
  const settings = getSettings();

  const rideCost = parsed.distanceKm * rider.selectedPricePerKm;
  const commissionAmount = rideCost * (settings.commissionPercentage / 100);
  const totalPrice = rideCost + commissionAmount;

  return {
    distanceKm: Number(parsed.distanceKm.toFixed(2)),
    riderId: rider.id,
    riderName: rider.name,
    riderPricePerKm: rider.selectedPricePerKm,
    commissionPercentage: settings.commissionPercentage,
    rideCost: Number(rideCost.toFixed(2)),
    commissionAmount: Number(commissionAmount.toFixed(2)),
    totalPrice: Number(totalPrice.toFixed(2)),
  };
}

module.exports = { estimateFare };