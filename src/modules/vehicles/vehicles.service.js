const { ObjectId } = require("mongodb");
const { getMongoDb } = require("../../db/mongo");
const { AppError } = require("../../utils/app-error");

const collectionName = "vehicles";

const defaultVehicles = [
  {
    name: "Economy Class",
    description: "Perfect for quick daily commutes and solo travelers.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA72MF4D3p4KdBeTNLqnno-Ijq_BYfPp0xn-hiahXWdfuQ1q50MiwrahxcM1J8usEymEc-6fPBI8rKS9Wa8cIhJFF-je1BKIxiqys3aSSXf9wyB9-hWh0NGkVwuJn2_NimsktdcTBdrZW83RknmeGTzAB4MSeifK8uBc4p0keW43SM38zNyLXPWWXdRkdPXAZfltLp_XjSQ2oEbtWqr969wORZZK_hG2bO9AmzzSvHpYIeHdiTcT_NmIfraLM0DtdQt59CCXErs2pQ-",
    seats: 4,
    bags: 2,
    price: 12,
  },
  {
    name: "Business Sedan",
    description: "Arrive in style and comfort for your professional meetings.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuADkrSjH10_-v7crwzmwIdcfSobWlTcuuTpAxjFcNhnfHTZsveHKhwk_tHZVQeSaGukvPl92X02phiN_BJHkb7drkf6SKvkXlvxrM6HtJv4vZaqZcVEKILvJgneBqccpmzKSxzSNPRug44sZgNe7ps7fPK1XHQawmzTSQNjrkITPWmAgvt_jG5JMMnDgpLA-uA0G7Q0wlzX_XULzddce0w-hp0cEX5gZBKdk0pU8bRYoXV_VcdKsoaMYqKtFY_dgG0tzmsHANhlotGo",
    seats: 4,
    bags: 3,
    price: 25,
  },
  {
    name: "Luxury SUV",
    description: "Premium space and power for the whole family adventures.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAqJfqQ3jkzl1xgB4rLjwdSfEmqYoIlcR8yevA0lunfzQsdHrT_erxTjRzysVW3PuP6Scud6MRjHLHvB0-BMJK9VOrqWlkco76cw-Xrvj7ajJf1TNW5o66HaQybcYRxiAMcfMqfrBYjl7zGpd1kbSDdGAs8k1OmKvzWcERz46WN6L1nYlbGDcq65rIIYwT5m45MR1oKJ8uBMMSdkVwr6vrucYeRDmiO16XgJtZwuBs99VSImrLl2wayBjtu5OZFvLH23HLZdqmsV4d-",
    seats: 7,
    bags: 5,
    price: 45,
  },
];

function mapVehicle(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    description: doc.description,
    image: doc.image,
    seats: Number(doc.seats),
    bags: Number(doc.bags),
    price: Number(doc.price),
  };
}

async function ensureDefaultVehicles() {
  const db = getMongoDb();
  const count = await db.collection(collectionName).countDocuments();
  if (count === 0) {
    await db.collection(collectionName).insertMany(
      defaultVehicles.map((v) => ({
        ...v,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
    );
  }
}

async function listVehicles() {
  await ensureDefaultVehicles();
  const db = getMongoDb();
  const rows = await db.collection(collectionName).find({}).sort({ created_at: 1 }).toArray();
  return rows.map(mapVehicle);
}

async function createVehicle(payload) {
  const db = getMongoDb();
  const now = new Date().toISOString();
  const result = await db.collection(collectionName).insertOne({
    ...payload,
    created_at: now,
    updated_at: now,
  });
  const created = await db.collection(collectionName).findOne({ _id: result.insertedId });
  return mapVehicle(created);
}

async function updateVehicle(id, payload) {
  if (!ObjectId.isValid(id)) {
    throw new AppError("Invalid vehicle id", 400);
  }

  const db = getMongoDb();
  const objectId = new ObjectId(id);
  const result = await db.collection(collectionName).updateOne(
    { _id: objectId },
    { $set: { ...payload, updated_at: new Date().toISOString() } }
  );

  if (!result.matchedCount) {
    throw new AppError("Vehicle not found", 404);
  }

  const updated = await db.collection(collectionName).findOne({ _id: objectId });
  if (!updated) {
    throw new AppError("Vehicle not found", 404);
  }

  return mapVehicle(updated);
}

async function deleteVehicle(id) {
  if (!ObjectId.isValid(id)) {
    throw new AppError("Invalid vehicle id", 400);
  }

  const db = getMongoDb();
  const result = await db.collection(collectionName).deleteOne({ _id: new ObjectId(id) });
  if (!result.deletedCount) {
    throw new AppError("Vehicle not found", 404);
  }

  return { success: true };
}

module.exports = { listVehicles, createVehicle, updateVehicle, deleteVehicle };
