const express = require("express");
const { requestRide, getRideRequestStatus } = require("../rider/rider.service");

const router = express.Router();

router.post("/request", (req, res, next) => {
  try {
    res.status(201).json(requestRide(req.body));
  } catch (err) {
    next(err);
  }
});

router.get("/:rideId", (req, res, next) => {
  try {
    res.json(getRideRequestStatus(req.params.rideId));
  } catch (err) {
    next(err);
  }
});

module.exports = { ridesRouter: router };
