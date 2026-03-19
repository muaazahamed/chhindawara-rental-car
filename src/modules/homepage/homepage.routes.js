const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { z } = require("zod");
const { AppError } = require("../../utils/app-error");
const { authenticateAdmin } = require("../../middleware/admin-auth");
const { getHomepageContent, upsertHomepageContent } = require("./homepage.service");
const { uploadsDir } = require("../../config/paths");

const router = express.Router();

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const extByMime = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/avif": ".avif",
    };
    const fallbackExt = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const ext = extByMime[file.mimetype] || fallbackExt;
    cb(null, `hero-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new AppError("Only image files are allowed", 400));
    }
    return cb(null, true);
  },
});

const contentSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().trim().min(1).max(1000).optional(),
});

router.get("/homepage", async (_req, res, next) => {
  try {
    res.json(await getHomepageContent());
  } catch (err) {
    next(err);
  }
});

router.put("/admin/homepage", authenticateAdmin, upload.single("hero_image"), async (req, res, next) => {
  try {
    const parsed = contentSchema.parse({
      title: req.body?.title,
      description: req.body?.description,
    });

    if (!parsed.title && !parsed.description && !req.file) {
      throw new AppError("Provide at least one field to update", 400);
    }

    const payload = { ...parsed };
    if (req.file) {
      payload.hero_image = `/uploads/${req.file.filename}`;
    }

    res.json(await upsertHomepageContent(payload));
  } catch (err) {
    next(err);
  }
});

module.exports = { homepageRouter: router };
