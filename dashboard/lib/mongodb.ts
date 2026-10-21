import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB || "pokemon_extractor";

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim().startsWith("mongodb"));
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!isMongoConfigured()) {
    throw new Error("MONGODB_URI is not set in environment variables.");
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}

// Ensure indexes on collections
export async function initIndexes(): Promise<void> {
  try {
    if (!isMongoConfigured()) return;
    const db = await getDb();
    
    // Accounts collection indexes
    await db.collection("accounts").createIndex({ email: 1 }, { unique: true });
    await db.collection("accounts").createIndex({ level: 1 });
    await db.collection("accounts").createIndex({ pokeCoins: -1 });
    await db.collection("accounts").createIndex({ isFirstTimeBuyer: 1 });
    await db.collection("accounts").createIndex({ extractedAt: -1 });

    // Users collection indexes
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("users").createIndex({ isApproved: 1 });
  } catch (err) {
    console.error("Failed to initialize MongoDB indexes:", err);
  }
}
