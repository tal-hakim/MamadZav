import { NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import { User } from '@/models/User';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Update user's last check-in time
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { lastCheckIn: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Error updating check-in status' });
  }
}

export default function withAuth(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  return authMiddleware(req, res, () => handler(req, res));
} 