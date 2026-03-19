const express = require("express");
const { z } = require("zod");
const { authenticateAdmin } = require("../../middleware/admin-auth");
const {
  createEnquiry,
  getEnquiryById,
  listEnquiries,
  approveEnquiry,
  rejectEnquiry,
  payAdvance,
  requestRideStart,
  sendStartOtp,
  verifyStartOtp,
  endRide,
} = require("./enquiries.service");

const router = express.Router();

const enquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(20),
  pickup_location: z.string().trim().min(1).max(200),
  drop_location: z.string().trim().min(1).max(200),
  ride_date: z.string().trim().min(1).max(30),
  ride_time: z.string().trim().min(1).max(30),
  vehicle_type: z.string().trim().min(1).max(120),
  message: z.string().trim().max(1000).optional(),
});

const paySchema = z.object({
  phone: z.string().trim().min(7).max(20),
});

const verifyOtpSchema = z.object({
  otp: z.string().trim().min(4).max(6),
});

router.post("/enquiries", async (req, res, next) => {
  try {
    const payload = enquirySchema.parse(req.body);
    res.status(201).json(await createEnquiry(payload));
  } catch (err) {
    next(err);
  }
});

router.get("/enquiries/:enquiryId", async (req, res, next) => {
  try {
    res.json(await getEnquiryById(req.params.enquiryId, req.query.phone));
  } catch (err) {
    next(err);
  }
});

router.post("/enquiries/:enquiryId/pay-advance", async (req, res, next) => {
  try {
    const payload = paySchema.parse(req.body);
    res.json(await payAdvance(req.params.enquiryId, payload.phone));
  } catch (err) {
    next(err);
  }
});

router.post("/enquiries/:enquiryId/request-start", async (req, res, next) => {
  try {
    const payload = paySchema.parse(req.body);
    res.json(await requestRideStart(req.params.enquiryId, payload.phone));
  } catch (err) {
    next(err);
  }
});

router.get("/admin/enquiries", authenticateAdmin, async (_req, res, next) => {
  try {
    res.json(await listEnquiries());
  } catch (err) {
    next(err);
  }
});

router.post("/admin/enquiries/:enquiryId/approve", authenticateAdmin, async (req, res, next) => {
  try {
    res.json(await approveEnquiry(req.params.enquiryId));
  } catch (err) {
    next(err);
  }
});

router.post("/admin/enquiries/:enquiryId/reject", authenticateAdmin, async (req, res, next) => {
  try {
    res.json(await rejectEnquiry(req.params.enquiryId));
  } catch (err) {
    next(err);
  }
});

router.post("/admin/enquiries/:enquiryId/send-start-otp", authenticateAdmin, async (req, res, next) => {
  try {
    res.json(await sendStartOtp(req.params.enquiryId));
  } catch (err) {
    next(err);
  }
});

router.post("/admin/enquiries/:enquiryId/verify-start-otp", authenticateAdmin, async (req, res, next) => {
  try {
    const payload = verifyOtpSchema.parse(req.body);
    res.json(await verifyStartOtp(req.params.enquiryId, payload.otp));
  } catch (err) {
    next(err);
  }
});

router.post("/admin/enquiries/:enquiryId/end-ride", authenticateAdmin, async (req, res, next) => {
  try {
    res.json(await endRide(req.params.enquiryId));
  } catch (err) {
    next(err);
  }
});

module.exports = { enquiriesRouter: router };
