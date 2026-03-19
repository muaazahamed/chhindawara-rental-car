const path = require("path");
const dotenv = require("dotenv");
const { backendRoot } = require("./paths");

dotenv.config({ path: path.join(backendRoot, ".env") });

const config = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  dbPath: process.env.DB_PATH || "./data/cabs.db",
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017",
  mongoDbName: process.env.MONGO_DB_NAME || "chhindawa_cabs",
  jwtSecret: process.env.JWT_SECRET || "change_this_secret_in_production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
};

module.exports = { config };
