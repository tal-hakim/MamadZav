import { NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Return user data (excluding password)
    const userData = {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      username: req.user.username,
      friends: req.user.friends,
      lastCheckIn: req.user.lastCheckIn,
    };

    res.status(200).json({ user: userData });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ message: 'Error validating token' });
  }
}

export default authMiddleware(handler); 