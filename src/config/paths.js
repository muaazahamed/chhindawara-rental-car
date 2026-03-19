const path = require("path");
const dotenv = require("dotenv");

const backendRoot = path.resolve(__dirname, "..", "..");
const projectRoot = path.resolve(backendRoot, "..");
dotenv.config({ path: path.join(backendRoot, ".env") });
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(backendRoot, "uploads");
const vehiclesUploadsDir = path.join(uploadsDir, "vehicles");

module.exports = {
  backendRoot,
  projectRoot,
  uploadsDir,
  vehiclesUploadsDir,
};
