const express = require("express");
const { getSettings, updateSettings, loginAdmin } = require("./admin.service");
const { authenticateAdmin } = require("../../middleware/admin-auth");

const router = express.Router();

router.get("/settings", authenticateAdmin, (_req, res) => {
  res.json(getSettings());
});

router.put("/settings", authenticateAdmin, (req, res, next) => {
  try {
    const updated = updateSettings(req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post("/login", (req, res, next) => {
  try {
    res.json(loginAdmin(req.body));
  } catch (err) {
    next(err);
  }
});

module.exports = { adminRouter: router };
