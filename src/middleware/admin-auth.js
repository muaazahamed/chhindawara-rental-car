const jwt = require("jsonwebtoken");
const { config } = require("../config/env");

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ message: "Missing or invalid authorization header" });
  }

  const token = parts[1];
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (payload.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    req.admin = {
      username: payload.username,
    };

    return next();
  } catch (_err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = { authenticateAdmin };
