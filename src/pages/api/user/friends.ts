import { NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import { User, IUser } from '@/models/User';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

interface PopulatedUser extends Omit<IUser, 'friends' | 'friendRequests'> {
  _id: Types.ObjectId;
  friends: Array<{
    _id: Types.ObjectId;
    name: string;
    username: string;
    email: string;
    lastCheckIn: Date | null;
  }>;
  friendRequests: Array<{
    from: {
      _id: Types.ObjectId;
      name: string;
      username: string;
      email: string;
    };
    createdAt: Date;
  }>;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  console.log('Friends API called with method:', req.method);

  if (!['GET', 'POST', 'DELETE', 'PUT'].includes(req.method || '')) {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Connect to database
    try {
      console.log('Attempting to connect to MongoDB...');
      await dbConnect();
      console.log('Successfully connected to MongoDB');
    } catch (error) {
      console.error('Database connection error:', error);
      return res.status(500).json({ 
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    if (!req.user) {
      console.log('No user found in request');
      return res.status(401).json({ message: 'Not authenticated' });
    }

    console.log('User found in request:', req.user._id);
    const user = req.user as IUser & { _id: Types.ObjectId };

    // GET: Fetch friends list and friend requests
    if (req.method === 'GET') {
      try {
        // First try to find the user without population to ensure they exist
        console.log('Looking up user:', user._id);
        const userExists = await User.findById(user._id);
        if (!userExists) {
          console.error('User not found in database:', user._id);
          return res.status(404).json({ message: 'User not found' });
        }
        console.log('Found user in database');

        // Then populate the data
        console.log('Populating user data...');
        const userWithData = await User.findById(user._id)
          .populate({
            path: 'friends',
            select: 'name email username lastCheckIn'
          })
          .populate({
            path: 'friendRequests.from',
            select: 'name email username'
          })
          .select('friends friendRequests')
          .lean() as PopulatedUser | null;

        if (!userWithData) {
          console.error('Failed to populate user data:', user._id);
          return res.status(500).json({ message: 'Failed to fetch user data' });
        }
        console.log('Successfully populated user data');

        // Safely map friends with error handling
        console.log('Raw friends data:', userWithData.friends);
        const friends = (userWithData.friends || [])
          .filter(friend => friend && friend._id)
          .map(friend => ({
            id: friend._id.toString(),
            name: friend.name,
            username: friend.username,
            email: friend.email,
            lastCheckIn: friend.lastCheckIn,
          }));
        console.log('Processed friends:', friends.length);

        // Safely map friend requests with error handling
        console.log('Raw friend requests data:', userWithData.friendRequests);
        const friendRequests = (userWithData.friendRequests || [])
          .filter(request => request && request.from && request.from._id)
          .map(request => ({
            id: request.from._id.toString(),
            name: request.from.name,
            username: request.from.username,
            email: request.from.email,
            createdAt: request.createdAt,
          }));
        console.log('Processed friend requests:', friendRequests.length);

        return res.status(200).json({ friends, friendRequests });
      } catch (error) {
        console.error('Error fetching friends and requests:', error);
        return res.status(500).json({ 
          message: 'Error fetching friends and requests',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // POST: Send a friend request
    if (req.method === 'POST') {
      try {
        // Check if friend exists
        const friend = await User.findOne({ username: username.toLowerCase() });
        if (!friend) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Can't add yourself
        if (friend._id.toString() === user._id.toString()) {
          return res.status(400).json({ message: 'Cannot add yourself as a friend' });
        }

        // Check if already friends
        const areFriends = user.friends.some(
          (friendId: Types.ObjectId) => friendId.toString() === friend._id.toString()
        );
        if (areFriends) {
          return res.status(400).json({ message: 'Already friends' });
        }

        // Check if friend request already sent
        const existingRequest = friend.friendRequests.find(
          (request: any) => request.from.toString() === user._id.toString()
        );
        if (existingRequest) {
          return res.status(400).json({ message: 'Friend request already sent' });
        }

        // Check if they sent you a request
        const theirRequest = user.friendRequests.find(
          (request: any) => request.from.toString() === friend._id.toString()
        );
        if (theirRequest) {
          return res.status(400).json({ 
            message: 'This user has already sent you a friend request. Check your friend requests to accept it.'
          });
        }

        // Add friend request
        await User.findByIdAndUpdate(friend._id, {
          $push: { 
            friendRequests: {
              from: user._id,
              createdAt: new Date()
            }
          },
        }, { new: true });

        return res.status(200).json({ 
          message: 'Friend request sent successfully'
        });
      } catch (error) {
        console.error('Error sending friend request:', error);
        return res.status(500).json({ message: 'Error sending friend request' });
      }
    }

    // PUT: Accept a friend request
    if (req.method === 'PUT') {
      try {
        console.log('\n=== START: Friend Request Acceptance ===');
        console.log('Raw request body:', JSON.stringify(req.body));
        console.log('Username from request:', username);
        console.log('Current user ID:', user._id);
        
        // First get the fully populated user document
        console.log('\nFetching current user with populated data...');
        const currentUser = await User.findById(user._id)
          .populate({
            path: 'friendRequests.from',
            select: 'name email username'
          })
          .lean()
          .exec() as unknown as {
            _id: Types.ObjectId;
            friendRequests: Array<{
              _id: Types.ObjectId;
              from: {
                _id: Types.ObjectId;
                name: string;
                username: string;
                email: string;
              };
              createdAt: Date;
            }>;
          };
          
        if (!currentUser) {
          console.error('Could not find current user with populated data');
          return res.status(500).json({ message: 'Error loading user data' });
        }

        // Log the full user object for debugging
        console.log('\nCurrent user data:', JSON.stringify({
          _id: currentUser._id,
          friendRequests: currentUser.friendRequests,
        }, null, 2));

        console.log('\nLooking for friend with username:', username);
        const friend = await User.findOne({ username: username.toLowerCase() });
        if (!friend) {
          console.log('Friend not found with username:', username);
          return res.status(404).json({ message: 'User not found' });
        }
        console.log('Found friend:', {
          id: friend._id,
          username: friend.username
        });
        
        // Check if there's a pending request by comparing usernames
        console.log('\nChecking for pending request...');
        console.log('Number of friend requests:', currentUser.friendRequests?.length || 0);
        
        const pendingRequest = currentUser.friendRequests?.find((request) => {
          const matches = request.from.username.toLowerCase() === username.toLowerCase();
          console.log('Checking request:', {
            fromUsername: request.from.username,
            targetUsername: username,
            matches
          });
          return matches;
        });

        if (!pendingRequest) {
          console.log('\nNo pending request found. All current requests:', 
            JSON.stringify(currentUser.friendRequests?.map((r) => ({
              fromUsername: r.from.username,
              fromId: r.from._id
            })), null, 2)
          );
          return res.status(400).json({ message: 'No friend request found from this user' });
        }

        console.log('\nFound pending request:', {
          from: {
            id: pendingRequest.from._id,
            username: pendingRequest.from.username
          }
        });

        // Remove the request and add to friends for both users
        console.log('\nUpdating both users...');
        console.log('Update query:', JSON.stringify({
          $pull: { 'friendRequests': { 'from': friend._id } },
          $addToSet: { friends: friend._id }
        }, null, 2));
        
        const [updatedUser, updatedFriend] = await Promise.all([
          User.findByIdAndUpdate(
            currentUser._id,
            {
              $pull: { 'friendRequests': { 'from': friend._id } },
              $addToSet: { friends: friend._id },
            },
            { 
              new: true,
              runValidators: true
            }
          ).populate('friends', 'name email username lastCheckIn'),
          
          User.findByIdAndUpdate(
            friend._id,
            {
              $addToSet: { friends: currentUser._id },
            },
            { 
              new: true,
              runValidators: true
            }
          )
        ]);

        if (!updatedUser || !updatedFriend) {
          console.error('\nFailed to update documents:', {
            updatedUser: !!updatedUser,
            updatedFriend: !!updatedFriend
          });
          throw new Error('Failed to update user or friend');
        }

        console.log('\nSuccessfully updated both users');
        console.log('Updated user friends:', updatedUser.friends);
        console.log('=== END: Friend Request Acceptance ===\n');

        return res.status(200).json({ 
          message: 'Friend request accepted',
          friend: {
            id: friend._id,
            name: friend.name,
            username: friend.username,
            email: friend.email,
            lastCheckIn: friend.lastCheckIn,
          }
        });
      } catch (error) {
        console.error('Error accepting friend request:', error);
        return res.status(500).json({ message: 'Error accepting friend request' });
      }
    }

    // DELETE: Reject a friend request or remove a friend
    if (req.method === 'DELETE') {
      try {
        const friend = await User.findOne({ username: username.toLowerCase() });
        if (!friend) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Check if it's a friend request rejection
        const requestIndex = user.friendRequests.findIndex(
          (request: any) => request.from.toString() === friend._id.toString()
        );

        if (requestIndex !== -1) {
          // Reject friend request
          await User.findByIdAndUpdate(
            user._id,
            {
              $pull: { friendRequests: { from: friend._id } },
            },
            { new: true }
          );

          return res.status(200).json({ message: 'Friend request rejected' });
        }

        // If not a request, remove from friends list
        const [updatedUser, updatedFriend] = await Promise.all([
          User.findByIdAndUpdate(
            user._id,
            {
              $pull: { friends: friend._id },
            },
            { new: true }
          ),
          User.findByIdAndUpdate(
            friend._id,
            {
              $pull: { friends: user._id },
            },
            { new: true }
          )
        ]);

        if (!updatedUser || !updatedFriend) {
          throw new Error('Failed to update user or friend');
        }

        return res.status(200).json({ message: 'Friend removed successfully' });
      } catch (error) {
        console.error('Error handling friend request/removal:', error);
        return res.status(500).json({ message: 'Error processing friend operation' });
      }
    }
  } catch (error) {
    console.error('Friends operation error:', error);
    return res.status(500).json({ message: 'Error processing friends operation' });
  }
}

export default function withAuth(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  return authMiddleware(req, res, () => handler(req, res));
} 