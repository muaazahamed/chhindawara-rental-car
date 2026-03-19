const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { projectRoot, uploadsDir } = require("./config/paths");

require("./db/database");
const { adminRouter } = require("./modules/admin/admin.routes");
const { ridersRouter } = require("./modules/riders/riders.routes");
const { faresRouter } = require("./modules/fares/fares.routes");
const { bookingsRouter } = require("./modules/bookings/bookings.routes");
const { ridesRouter } = require("./modules/bookings/rides.routes");
const { riderRouter } = require("./modules/rider/rider.routes");
const { homepageRouter } = require("./modules/homepage/homepage.routes");
const { vehiclesRouter } = require("./modules/vehicles/vehicles.routes");
const { enquiriesRouter } = require("./modules/enquiries/enquiries.routes");
const { errorHandler } = require("./middleware/error-handler");

const app = express();

app.get("/", (_req, res) => {
  res.send("Backend is running 🚀");
});

app.use(errorHandler);

module.exports = { app };
