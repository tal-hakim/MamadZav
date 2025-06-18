import { NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { AuthenticatedRequest, withAuth } from '@/lib/authMiddleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  console.log('=== Friend Request Test Endpoint ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('User from token:', JSON.stringify(req.user, null, 2));

  try {
    await dbConnect();
    console.log('MongoDB connected successfully');

    if (!req.user?.userId) {
      console.error('No user ID found in request');
      return res.status(401).json({ message: 'No user ID found' });
    }

    // Get current user with friend requests
    const currentUser = await User.findById(req.user.userId)
      .populate({
        path: 'friendRequests.from',
        select: 'username email name'
      })
      .populate('friends', 'username email name lastCheckIn');

    if (!currentUser) {
      console.error('User not found in database');
      return res.status(404).json({ message: 'User not found' });
    }

    // Log detailed user information
    console.log('=== Current User Data ===');
    console.log('User ID:', currentUser._id);
    console.log('Username:', currentUser.username);
    console.log('Friend Requests:', JSON.stringify(currentUser.friendRequests, null, 2));
    console.log('Friends:', JSON.stringify(currentUser.friends, null, 2));

    // If this is a test accept request
    if (req.method === 'PUT') {
      const { requestId } = req.body;
      console.log('=== Testing Friend Request Accept ===');
      console.log('Request ID to accept:', requestId);

      // Verify request exists
      const requestExists = currentUser.friendRequests.some(
        (request: any) => request.from._id.toString() === requestId
      );

      if (!requestExists) {
        console.error('Friend request not found');
        return res.status(404).json({
          message: 'Friend request not found',
          existingRequests: currentUser.friendRequests.map((r: any) => ({
            id: r.from._id.toString(),
            username: r.from.username
          }))
        });
      }

      // Get requester information
      const requester = await User.findById(requestId);
      console.log('Requester found:', requester ? 'Yes' : 'No');
      if (requester) {
        console.log('Requester username:', requester.username);
      }

      return res.status(200).json({
        message: 'Test successful',
        currentUser: {
          id: currentUser._id,
          username: currentUser.username,
          friendRequests: currentUser.friendRequests,
          friends: currentUser.friends
        },
        requester: requester ? {
          id: requester._id,
          username: requester.username
        } : null
      });
    }

    // Default response with user data
    return res.status(200).json({
      message: 'Test endpoint successful',
      userData: {
        id: currentUser._id,
        username: currentUser.username,
        friendRequests: currentUser.friendRequests,
        friends: currentUser.friends
      }
    });

  } catch (error) {
    console.error('=== Test Endpoint Error ===');
    console.error('Error details:', error);
    return res.status(500).json({
      message: 'Test endpoint error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

export default withAuth(handler); 