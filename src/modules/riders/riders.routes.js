const express = require("express");
const { listRiders, getRiderById, updateRiderPrice } = require("./riders.service");

const router = express.Router();

router.get("/", (_req, res) => {
  res.json(listRiders());
});

router.get("/:riderId", (req, res, next) => {
  try {
    res.json(getRiderById(Number(req.params.riderId)));
  } catch (err) {
    next(err);
  }
});

router.put("/:riderId/pricing", (req, res, next) => {
  try {
    const updated = updateRiderPrice(Number(req.params.riderId), req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = { ridersRouter: router };