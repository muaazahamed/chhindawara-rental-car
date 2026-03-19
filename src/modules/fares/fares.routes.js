const express = require("express");
const { estimateFare } = require("./fares.service");

const router = express.Router();

router.post("/estimate", (req, res, next) => {
  try {
    res.json(estimateFare(req.body));
  } catch (err) {
    next(err);
  }
});

module.exports = { faresRouter: router };