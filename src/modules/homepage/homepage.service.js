const { getMongoDb } = require("../../db/mongo");

const collectionName = "homepage_content";

const fallbackContent = {
  title: "Your Premium Ride, Anytime, Anywhere",
  description: "Experience the ultimate comfort and reliability with Chhindawa Cabs. Book a cab or rent a car in seconds with our seamless platform.",
  hero_image:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAsdKdnLJGOJmed14IjqOnUn-ZUfRGEC78oNlCkeGPhSEy_cRYmItqtamhadqwxqwjvtgCNSwy0Hy90Gt6M5s9kRV5pasTNNcLd8hRPHBmEt8WbOdNqADBUAgBV5Z0Y0-U1pD8hd367d4v1mTT-OjI3ueI8dM9vXHjo2EorHvZefmiObjqwKEoejjBgXt-R5ylz4hQYt5pNn0jmI2tY2oLSk5zrvqCTdLEN3flPwDOy21jFo9tH-7bsTkYxjFVqFTXgX7wfD35xCMT9",
};

async function getHomepageContent() {
  const db = getMongoDb();
  const row = await db.collection(collectionName).findOne({ key: "main" });
  if (!row) {
    return fallbackContent;
  }

  return {
    title: row.title || fallbackContent.title,
    description: row.description || fallbackContent.description,
    hero_image: row.hero_image || fallbackContent.hero_image,
  };
}

async function upsertHomepageContent(payload) {
  const db = getMongoDb();
  const existing = await getHomepageContent();

  const updateDoc = {
    title: payload.title ?? existing.title,
    description: payload.description ?? existing.description,
    hero_image: payload.hero_image ?? existing.hero_image,
    updated_at: new Date().toISOString(),
  };

  await db.collection(collectionName).updateOne(
    { key: "main" },
    {
      $set: {
        ...updateDoc,
        key: "main",
      },
      $setOnInsert: {
        created_at: new Date().toISOString(),
      },
    },
    { upsert: true }
  );

  return updateDoc;
}

module.exports = { getHomepageContent, upsertHomepageContent };
