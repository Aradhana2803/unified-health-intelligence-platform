import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;

export const mongo = {
  client() {
    if (!client) throw new Error('Mongo not initialized');
    return client;
  },
  async init() {
    const url = process.env.MONGO_URL ?? 'mongodb://localhost:27017/uhip';
    client = new MongoClient(url);
    await client.connect();
    // Create basic indexes
    const db = client.db();
    await db.collection('media').createIndex({ patientUhid: 1, createdAt: -1 });
  },
  async ping() {
    try {
      if (!client) return false;
      await client.db().command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }
};
