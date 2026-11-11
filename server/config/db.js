import { mkdir } from 'fs/promises';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isLoopbackMongo = (uri) => {
  if (!uri) return true;

  try {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(uri).hostname);
  } catch {
    return false;
  }
};

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI?.trim();
  const useDevelopmentDatabase = process.env.NODE_ENV !== 'production' && isLoopbackMongo(mongoUri);

  if (mongoUri) {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 2_000,
      });
      console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (error) {
      if (!useDevelopmentDatabase) {
        throw new Error(`MongoDB connection failed: ${error.message}`, { cause: error });
      }
      console.warn('Local MongoDB is unavailable; using the persistent development database.');
    }
  }

  if (!useDevelopmentDatabase) {
    throw new Error('MONGO_URI is missing. Set the Atlas connection string in server/.env.');
  }

  const databasePath = path.resolve(__dirname, '../data/mongodb');
  await mkdir(databasePath, { recursive: true });
  const localMongo = await MongoMemoryServer.create({
    binary: { version: '7.0.14' },
    instance: {
      dbPath: databasePath,
      dbName: 'quizmaster',
      storageEngine: 'wiredTiger',
    },
  });

  try {
    const conn = await mongoose.connect(localMongo.getUri('quizmaster'));
    console.log(`Persistent development MongoDB connected at ${databasePath}`);
    return conn;
  } catch (error) {
    await localMongo.stop();
    throw new Error(`Development MongoDB connection failed: ${error.message}`, { cause: error });
  }
};

export default connectDB;
