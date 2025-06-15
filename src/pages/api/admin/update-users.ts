import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import { User } from '@/models/User';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    // Update Test User
    await User.findOneAndUpdate(
      { email: 'test@example.com' },
      { 
        $set: { 
          username: 'testuser'.toLowerCase(),
        }
      },
      { new: true }
    );

    // Update Israel Israeli
    await User.findOneAndUpdate(
      { email: 'israelilililili@gmail.com' },
      { 
        $set: { 
          username: 'israel_israeli'.toLowerCase(),
        }
      },
      { new: true }
    );

    // Get updated users
    const users = await User.find({}).select('-password');
    
    res.status(200).json({ 
      message: 'Users updated successfully',
      users 
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Error updating users', error: error instanceof Error ? error.message : 'Unknown error' });
  }
} 