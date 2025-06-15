import mongoose from 'mongoose';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

// Define User schema
const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  name: String,
  password: String,
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: Date
  }],
  lastCheckIn: Date
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function updateLiloUsername() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');

    const liloId = '684ebc174ef1c1e06472b747';
    
    const updatedUser = await User.findByIdAndUpdate(
      liloId,
      { 
        $set: { 
          username: 'lilo_stitch',
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      console.error('Could not find lilo\'s user record');
      process.exit(1);
    }

    console.log('Successfully updated lilo\'s username:', updatedUser);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateLiloUsername(); 