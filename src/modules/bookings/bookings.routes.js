const express = require("express");
const { createBooking, listBookings } = require("./bookings.service");

const router = express.Router();

router.get("/", (_req, res, next) => {
  try {
    res.json(listBookings());
  } catch (err) {
    next(err);
  }
});

router.post("/", (req, res, next) => {
  try {
    res.status(201).json(createBooking(req.body));
  } catch (err) {
    next(err);
  }
});

module.exports = { bookingsRouter: router };