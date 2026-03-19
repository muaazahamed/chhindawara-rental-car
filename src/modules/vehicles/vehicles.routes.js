const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { z } = require("zod");
const { AppError } = require("../../utils/app-error");
const { authenticateAdmin } = require("../../middleware/admin-auth");
const { listVehicles, createVehicle, updateVehicle, deleteVehicle } = require("./vehicles.service");
const { vehiclesUploadsDir } = require("../../config/paths");

const router = express.Router();

fs.mkdirSync(vehiclesUploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, vehiclesUploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `vehicle-${Date.now()}${ext || ".jpg"}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(String(file.mimetype).toLowerCase())) {
      return cb(new AppError("Only JPG, PNG, or WEBP images are allowed", 400));
    }
    return cb(null, true);
  },
});

const vehicleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
  seats: z.coerce.number().int().min(1).max(30),
  bags: z.coerce.number().int().min(0).max(30),
  price: z.coerce.number().min(0),
});

const vehicleUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(1).max(1000).optional(),
  seats: z.coerce.number().int().min(1).max(30).optional(),
  bags: z.coerce.number().int().min(0).max(30).optional(),
  price: z.coerce.number().min(0).optional(),
});

router.get("/vehicles", async (_req, res, next) => {
  try {
    res.json(await listVehicles());
  } catch (err) {
    next(err);
  }
});

router.post("/admin/vehicles", authenticateAdmin, upload.single("image"), async (req, res, next) => {
  try {
    const parsed = vehicleSchema.parse(req.body);
    const payload = {
      ...parsed,
      image: req.file ? `/uploads/vehicles/${req.file.filename}` : "",
    };

    if (!payload.image) {
      throw new AppError("Vehicle image is required", 400);
    }

    res.status(201).json(await createVehicle(payload));
  } catch (err) {
    next(err);
  }
});

router.put("/admin/vehicles/:id", authenticateAdmin, upload.single("image"), async (req, res, next) => {
  try {
    const parsed = vehicleUpdateSchema.parse(req.body);
    const payload = { ...parsed };
    if (req.file) {
      payload.image = `/uploads/vehicles/${req.file.filename}`;
    }
    if (Object.keys(payload).length === 0) {
      throw new AppError("Provide at least one field to update", 400);
    }

    res.json(await updateVehicle(req.params.id, payload));
  } catch (err) {
    next(err);
  }
});

router.delete("/admin/vehicles/:id", authenticateAdmin, async (req, res, next) => {
  try {
    res.json(await deleteVehicle(req.params.id));
  } catch (err) {
    next(err);
  }
});

module.exports = { vehiclesRouter: router };
