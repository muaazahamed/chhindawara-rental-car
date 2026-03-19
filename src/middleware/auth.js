const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { db } = require("../db/database");
const { config } = require("../config/env");

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function authenticateRider(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ message: "Missing or invalid authorization header" });
  }

  const token = parts[1];
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const tokenRow = db.prepare("SELECT * FROM rider_tokens WHERE token_hash = ? AND is_revoked = 0").get(tokenHash(token));

    if (!tokenRow) {
      return res.status(401).json({ message: "Token is invalid or logged out" });
    }

    req.auth = {
      riderId: payload.riderId,
      token,
      tokenHash: tokenHash(token),
    };

    return next();
  } catch (_err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = { authenticateRider, tokenHash };