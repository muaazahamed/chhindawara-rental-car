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
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/admin", adminRouter);
app.use("/api", homepageRouter);
app.use("/api", vehiclesRouter);
app.use("/api", enquiriesRouter);
app.use("/api/riders", ridersRouter);
app.use("/api/fares", faresRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/rides", ridesRouter);
app.use("/api/rider", riderRouter);

app.use(express.static(projectRoot));
app.get("/", (_req, res) => res.sendFile(path.join(projectRoot, "index.html")));
app.get("/booking", (_req, res) => res.sendFile(path.join(projectRoot, "booking.html")));
app.get("/enquiry", (_req, res) => res.sendFile(path.join(projectRoot, "enquiry.html")));
app.get("/admin", (_req, res) => res.sendFile(path.join(projectRoot, "admin.html")));
app.get("/rider", (_req, res) => res.sendFile(path.join(projectRoot, "rider.html")));

app.use(errorHandler);

module.exports = { app };
