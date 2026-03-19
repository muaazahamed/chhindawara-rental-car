const express = require("express");
const { authenticateRider } = require("../../middleware/auth");
const { registerRider, loginRider, logoutRider, getRiderProfile } = require("./rider.auth.service");
const {
  getDashboard,
  setStatus,
  updateLocation,
  setPrice,
  requestRide,
  listPendingRequests,
  getCurrentRide,
  acceptRide,
  rejectRide,
  startRide,
  endRide,
  getWallet,
  getHistory,
} = require("./rider.service");

const router = express.Router();

router.post("/register", (req, res, next) => {
  try {
    res.status(201).json(registerRider(req.body));
  } catch (err) {
    next(err);
  }
});

router.post("/login", (req, res, next) => {
  try {
    res.json(loginRider(req.body));
  } catch (err) {
    next(err);
  }
});

router.post("/logout", authenticateRider, (req, res, next) => {
  try {
    res.json(logoutRider(req.auth));
  } catch (err) {
    next(err);
  }
});

router.get("/profile", authenticateRider, (req, res, next) => {
  try {
    res.json(getRiderProfile(req.auth.riderId));
  } catch (err) {
    next(err);
  }
});

router.get("/:riderId/dashboard", (req, res, next) => {
  try {
    res.json(getDashboard(Number(req.params.riderId)));
  } catch (err) {
    next(err);
  }
});

router.post("/status", (req, res, next) => {
  try {
    res.json(setStatus({ riderId: Number(req.body.riderId), status: req.body.status }));
  } catch (err) {
    next(err);
  }
});

router.post("/location", (req, res, next) => {
  try {
    res.json(updateLocation(req.body));
  } catch (err) {
    next(err);
  }
});

router.post("/setPrice", (req, res, next) => {
  try {
    res.json(setPrice(req.body));
  } catch (err) {
    next(err);
  }
});

router.post("/acceptRide", (req, res, next) => {
  try {
    res.json(acceptRide(req.body));
  } catch (err) {
    next(err);
  }
});

router.post("/rejectRide", (req, res, next) => {
  try {
    res.json(rejectRide(req.body));
  } catch (err) {
    next(err);
  }
});

router.post("/startRide", (req, res, next) => {
  try {
    res.json(startRide(req.body));
  } catch (err) {
    next(err);
  }
});

router.post("/endRide", (req, res, next) => {
  try {
    res.json(endRide(req.body));
  } catch (err) {
    next(err);
  }
});

router.get("/:riderId/requests", (req, res, next) => {
  try {
    res.json(listPendingRequests(Number(req.params.riderId)));
  } catch (err) {
    next(err);
  }
});

router.get("/:riderId/currentRide", (req, res, next) => {
  try {
    res.json(getCurrentRide(Number(req.params.riderId)));
  } catch (err) {
    next(err);
  }
});

router.get("/:riderId/wallet", (req, res, next) => {
  try {
    res.json(getWallet(Number(req.params.riderId)));
  } catch (err) {
    next(err);
  }
});

router.get("/wallet", authenticateRider, (req, res, next) => {
  try {
    res.json(getWallet(req.auth.riderId));
  } catch (err) {
    next(err);
  }
});

router.get("/:riderId/history", (req, res, next) => {
  try {
    res.json(getHistory(Number(req.params.riderId)));
  } catch (err) {
    next(err);
  }
});

router.get("/history", authenticateRider, (req, res, next) => {
  try {
    res.json(getHistory(req.auth.riderId));
  } catch (err) {
    next(err);
  }
});

router.post("/requestRide", (req, res, next) => {
  try {
    res.status(201).json(requestRide(req.body));
  } catch (err) {
    next(err);
  }
});

module.exports = { riderRouter: router };
