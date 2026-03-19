const { getMongoDb } = require("../../db/mongo");
const { AppError } = require("../../utils/app-error");

const collectionName = "ride_enquiries";

function randomCode(length = 5) {
  return Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, length).padEnd(length, "X");
}

function generateEnquiryId() {
  return `ENQ-${Date.now()}-${randomCode(4)}`;
}

function generateRideId() {
  return `RIDE-${Date.now()}-${randomCode(4)}`;
}

function generateUserId() {
  return `USR-${Date.now()}-${randomCode(4)}`;
}

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function mapEnquiry(doc) {
  const fallbackUserId = `USR-${String(doc.phone || "0000").slice(-4)}-${String(doc.enquiry_id || "ENQ").slice(-4)}`;
  return {
    enquiry_id: doc.enquiry_id,
    user_id: doc.user_id || fallbackUserId,
    ride_id: doc.ride_id || null,
    otp: doc.otp || doc.start_otp || null,
    name: doc.name,
    phone: doc.phone,
    pickup_location: doc.pickup_location,
    drop_location: doc.drop_location,
    ride_date: doc.ride_date,
    ride_time: doc.ride_time,
    vehicle_type: doc.vehicle_type,
    message: doc.message || "",
    status: doc.status,
    created_at: doc.created_at,
    approved_at: doc.approved_at || null,
    rejected_at: doc.rejected_at || null,
    booked_at: doc.booked_at || null,
    start_requested_at: doc.start_requested_at || null,
    start_otp_sent_at: doc.start_otp_sent_at || null,
    start_otp_send_count: Number(doc.start_otp_send_count || 0),
    ride_started_at: doc.ride_started_at || null,
    ride_completed_at: doc.ride_completed_at || null,
    start_otp: doc.start_otp || null,
  };
}

async function createEnquiry(payload) {
  const db = getMongoDb();
  const enquiry = {
    enquiry_id: generateEnquiryId(),
    user_id: generateUserId(),
    ride_id: null,
    otp: null,
    name: payload.name,
    phone: payload.phone,
    pickup_location: payload.pickup_location,
    drop_location: payload.drop_location,
    ride_date: payload.ride_date,
    ride_time: payload.ride_time,
    vehicle_type: payload.vehicle_type,
    message: payload.message || "",
    status: "pending",
    created_at: new Date().toISOString(),
  };

  await db.collection(collectionName).insertOne(enquiry);
  return mapEnquiry(enquiry);
}

async function getEnquiryById(enquiryId, phone) {
  const db = getMongoDb();
  const query = { enquiry_id: enquiryId };
  if (phone) {
    query.phone = phone;
  }
  const row = await db.collection(collectionName).findOne(query);
  if (!row) {
    throw new AppError("Enquiry not found", 404);
  }
  return mapEnquiry(row);
}

async function listEnquiries() {
  const db = getMongoDb();
  const rows = await db.collection(collectionName).find({}).sort({ created_at: -1 }).toArray();
  return rows.map(mapEnquiry);
}

async function approveEnquiry(enquiryId) {
  const db = getMongoDb();
  const existing = await db.collection(collectionName).findOne({ enquiry_id: enquiryId });
  if (!existing) {
    throw new AppError("Enquiry not found", 404);
  }
  if (existing.status === "booked") {
    throw new AppError("Ride already booked", 400);
  }
  if (existing.status === "rejected") {
    throw new AppError("Rejected enquiry cannot be approved", 400);
  }

  const rideId = existing.ride_id || generateRideId();
  await db.collection(collectionName).updateOne(
    { enquiry_id: enquiryId },
    {
      $set: {
        status: "approved",
        ride_id: rideId,
        approved_at: new Date().toISOString(),
      },
    }
  );

  return getEnquiryById(enquiryId);
}

async function rejectEnquiry(enquiryId) {
  const db = getMongoDb();
  const existing = await db.collection(collectionName).findOne({ enquiry_id: enquiryId });
  if (!existing) {
    throw new AppError("Enquiry not found", 404);
  }
  if (existing.status === "booked") {
    throw new AppError("Booked ride cannot be rejected", 400);
  }

  await db.collection(collectionName).updateOne(
    { enquiry_id: enquiryId },
    {
      $set: {
        status: "rejected",
        rejected_at: new Date().toISOString(),
      },
    }
  );

  return getEnquiryById(enquiryId);
}

async function payAdvance(enquiryId, phone) {
  const db = getMongoDb();
  const existing = await db.collection(collectionName).findOne({ enquiry_id: enquiryId, phone });
  if (!existing) {
    throw new AppError("Enquiry not found", 404);
  }
  if (existing.status !== "approved") {
    throw new AppError("Advance payment is available only for approved rides", 400);
  }

  await db.collection(collectionName).updateOne(
    { enquiry_id: enquiryId, phone },
    {
      $set: {
        status: "booked",
        booked_at: new Date().toISOString(),
      },
    }
  );

  return getEnquiryById(enquiryId, phone);
}

async function requestRideStart(enquiryId, phone) {
  const db = getMongoDb();
  const existing = await db.collection(collectionName).findOne({ enquiry_id: enquiryId, phone });
  if (!existing) {
    throw new AppError("Enquiry not found", 404);
  }
  if (existing.status !== "booked") {
    throw new AppError("Ride can be started only after booking", 400);
  }

  await db.collection(collectionName).updateOne(
    { enquiry_id: enquiryId, phone },
    {
      $set: {
        status: "start_requested",
        start_requested_at: new Date().toISOString(),
      },
    }
  );
  return getEnquiryById(enquiryId, phone);
}

async function sendStartOtp(enquiryId) {
  const db = getMongoDb();
  const existing = await db.collection(collectionName).findOne({ enquiry_id: enquiryId });
  if (!existing) {
    throw new AppError("Enquiry not found", 404);
  }
  if (existing.status !== "start_requested" && existing.status !== "otp_sent") {
    throw new AppError("Start OTP can be sent only after start request", 400);
  }

  const sentCount = Number(existing.start_otp_send_count || 0);
  if (sentCount >= 8) {
    throw new AppError("OTP resend limit reached (8 times)", 400);
  }

  const otp = generateOtp();
  await db.collection(collectionName).updateOne(
    { enquiry_id: enquiryId },
    {
      $set: {
        status: "otp_sent",
        start_otp: otp,
        otp,
        start_otp_sent_at: new Date().toISOString(),
        start_otp_send_count: sentCount + 1,
      },
    }
  );
  return getEnquiryById(enquiryId);
}

async function verifyStartOtp(enquiryId, otp) {
  const db = getMongoDb();
  const existing = await db.collection(collectionName).findOne({ enquiry_id: enquiryId });
  if (!existing) {
    throw new AppError("Enquiry not found", 404);
  }
  if (existing.status !== "otp_sent") {
    throw new AppError("Start OTP is not active for this ride", 400);
  }
  if (String(existing.start_otp || "") !== String(otp || "").trim()) {
    throw new AppError("Invalid OTP", 400);
  }

  await db.collection(collectionName).updateOne(
    { enquiry_id: enquiryId },
    {
      $set: {
        status: "in_ride",
        ride_started_at: new Date().toISOString(),
      },
      $unset: {
        start_otp: "",
        otp: "",
      },
    }
  );
  return getEnquiryById(enquiryId);
}

async function endRide(enquiryId) {
  const db = getMongoDb();
  const existing = await db.collection(collectionName).findOne({ enquiry_id: enquiryId });
  if (!existing) {
    throw new AppError("Enquiry not found", 404);
  }
  if (existing.status !== "in_ride") {
    throw new AppError("Ride is not in progress", 400);
  }

  await db.collection(collectionName).updateOne(
    { enquiry_id: enquiryId },
    {
      $set: {
        status: "completed",
        ride_completed_at: new Date().toISOString(),
      },
    }
  );
  return getEnquiryById(enquiryId);
}

module.exports = {
  createEnquiry,
  getEnquiryById,
  listEnquiries,
  approveEnquiry,
  rejectEnquiry,
  payAdvance,
  requestRideStart,
  sendStartOtp,
  verifyStartOtp,
  endRide,
};
