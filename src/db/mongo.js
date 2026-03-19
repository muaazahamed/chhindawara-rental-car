const { MongoClient } = require("mongodb");
const { config } = require("../config/env");

let client;
let db;

async function connectMongo() {
  if (db) {
    return db;
  }

  client = new MongoClient(config.mongoUri);
  await client.connect();
  db = client.db(config.mongoDbName);
  return db;
}

function getMongoDb() {
  if (!db) {
    throw new Error("MongoDB is not connected");
  }
  return db;
}

module.exports = { connectMongo, getMongoDb };
