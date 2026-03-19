# Cab Pricing Backend

## Stack
- Node.js + Express
- SQLite (better-sqlite3)

## Setup
1. `cd backend`
2. `copy .env.example .env`
3. `npm install`
4. `npm run dev`

Server runs on `http://localhost:4000`.

The Express app can also serve the frontend pages from the repo root:
- `/`
- `/booking`
- `/enquiry`
- `/admin`
- `/rider`

## Deploy

This repo is set up to deploy as a single Render web service using [render.yaml](/d:/chhindawa%20car%20rental/render.yaml).

Required environment variables:
- `MONGO_URI`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Recommended:
- `JWT_SECRET`
- `MONGO_DB_NAME`
- `DB_PATH`
- `UPLOADS_DIR`

Notes:
- SQLite data is stored at `DB_PATH`. On Render, `render.yaml` mounts a persistent disk at `/var/data` and uses `/var/data/cabs.db`.
- Uploaded images are stored under `UPLOADS_DIR`. On Render, `render.yaml` points this to `/var/data/uploads` so uploads persist on the mounted disk.
- MongoDB must be a hosted instance such as MongoDB Atlas. A local `127.0.0.1:27017` MongoDB will not exist on Render.

## API
- `GET /health`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`
- `GET /api/riders`
- `GET /api/riders/:riderId`
- `PUT /api/riders/:riderId/pricing`
- `POST /api/fares/estimate`
- `GET /api/bookings`
- `POST /api/bookings`
- `GET /api/rider/:riderId/dashboard`
- `POST /api/rider/register`
- `POST /api/rider/login`
- `POST /api/rider/logout` (protected)
- `GET /api/rider/profile` (protected)
- `POST /api/rider/status`
- `POST /api/rider/location`
- `POST /api/rider/setPrice`
- `POST /api/rides/request`
- `GET /api/rider/:riderId/requests`
- `POST /api/rider/acceptRide`
- `POST /api/rider/rejectRide`
- `POST /api/rider/startRide`
- `POST /api/rider/endRide`
- `GET /api/rider/:riderId/wallet` (or `/api/rider/wallet?riderId=...`)
- `GET /api/rider/:riderId/history` (or `/api/rider/history?riderId=...`)
- `GET /api/rider/wallet` (protected)
- `GET /api/rider/history` (protected)

## Pricing Formula
- `ride_cost = distance_km * rider_selected_price_per_km`
- `commission = ride_cost * (commission_percentage / 100)`
- `total = ride_cost + commission`

Admin updates min/max rider rate and commission dynamically. Rider rate is clamped in range.

## Rider Auth
- Password hashing: `bcryptjs`
- Auth tokens: `JWT`
- Token revocation on logout via `rider_tokens` table
- Protected routes require header:
  - `Authorization: Bearer <token>`
