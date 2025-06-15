import mongoose from 'mongoose';

type CachedMongoose = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongoose: CachedMongoose | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect() {
  if (cached.conn) {
    // Check if the connection is still valid
    if (mongoose.connection.readyState === 1) {
      console.log('Using cached database connection');
      return cached.conn;
    } else {
      console.log('Cached connection is no longer valid, creating new connection...');
      cached.conn = null;
      cached.promise = null;
    }
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // Increased timeout to 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10,
      minPoolSize: 1,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
    };

    try {
      console.log('Creating new database connection...');
      const mongooseInstance = mongoose;
      cached.promise = mongoose.connect(MONGODB_URI!, opts).then(() => {
        console.log('MongoDB connected successfully');

        // Handle connection events
        mongoose.connection.on('error', (err) => {
          console.error('MongoDB connection error:', err);
          if (mongoose.connection.readyState !== 1) {
            cached.conn = null;
            cached.promise = null;
          }
        });

        mongoose.connection.on('disconnected', () => {
          console.warn('MongoDB disconnected');
          if (mongoose.connection.readyState !== 1) {
            cached.conn = null;
            cached.promise = null;
          }
        });

        mongoose.connection.on('connected', () => {
          console.log('MongoDB connected');
        });

        mongoose.connection.on('reconnected', () => {
          console.log('MongoDB reconnected');
          cached.conn = mongooseInstance;
        });

        // Enable debug mode for Mongoose operations in development
        if (process.env.NODE_ENV !== 'production') {
          mongoose.set('debug', true);
        }

        return mongooseInstance;
      });
    } catch (error) {
      console.error('Error creating MongoDB connection:', error);
      cached.promise = null;
      throw error;
    }
  } else {
    console.log('Using existing connection promise');
  }

  try {
    console.log('Waiting for connection to be established...');
    const maxRetries = 3;
    let retries = 0;
    let lastError;

    while (retries < maxRetries) {
      try {
        cached.conn = await cached.promise;
        console.log('Connection established successfully');
        return cached.conn;
      } catch (error) {
        lastError = error;
        retries++;
        console.error(`Failed to establish connection (attempt ${retries}/${maxRetries}):`, error);
        
        if (retries < maxRetries) {
          console.log(`Retrying in ${retries * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retries * 2000));
          cached.promise = null;
        }
      }
    }

    console.error('Max retries reached, could not establish connection');
    throw lastError;
  } catch (error) {
    console.error('Error establishing MongoDB connection:', error);
    cached.promise = null;
    throw error;
  }
}

export default dbConnect; 