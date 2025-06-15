import { NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import { User } from '@/models/User';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';

// List of admin usernames that are allowed to access this endpoint
const ADMIN_USERNAMES = ['admin', 'testuser']; // Add your admin usernames here

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

    // Check if the user is an admin
    if (!ADMIN_USERNAMES.includes(req.user.username)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get all users
    const users = await User.find()
      .select('email username name friends friendRequests lastCheckIn createdAt updatedAt')
      .lean();

    return res.status(200).json({
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        username: user.username,
        name: user.name,
        friends: user.friends?.length || 0,
        friendRequests: user.friendRequests?.length || 0,
        lastCheckIn: user.lastCheckIn,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
    });
  } catch (error) {
    console.error('Admin users operation error:', error);
    return res.status(500).json({ message: 'Error fetching users' });
  }
}

export default function withAuth(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  return authMiddleware(req, res, () => handler(req, res));
} 