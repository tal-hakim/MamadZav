import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import { User, IUser } from '@/models/User';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';
import { Types } from 'mongoose';

interface UserSearchResult {
  _id: Types.ObjectId;
  name: string;
  username: string;
  email: string;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    await dbConnect();
    
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const currentUser = req.user;

    // Create a case-insensitive search regex
    const searchRegex = new RegExp(q, 'i');

    // Find users matching the search query
    const users = await User.find({
      $and: [
        // Don't include the current user in results
        { _id: { $ne: currentUser._id } },
        // Don't include users who are already friends
        { _id: { $nin: currentUser.friends || [] } },
        // Search in both name and username
        {
          $or: [
            { name: { $regex: searchRegex } },
            { username: { $regex: searchRegex } }
          ]
        }
      ]
    })
    .select<UserSearchResult>('name username email _id') // Include _id in the results
    .limit(10)
    .lean();

    // Transform the results
    const transformedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      email: user.email
    }));

    return res.status(200).json({ users: transformedUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Export the handler wrapped with auth middleware
export default function withAuth(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  return authMiddleware(req, res, () => handler(req, res));
} 