import { NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import { User, IUser } from '@/models/User';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';
import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { logger } from '@/lib/logger';

interface FriendRequest {
  from: {
    _id: Types.ObjectId;
    name: string;
    username: string;
    email: string;
  };
  createdAt: Date;
}

interface Friend {
  _id: Types.ObjectId;
  name: string;
  username: string;
  email: string;
  lastCheckIn?: Date;
}

interface PopulatedUser extends Omit<IUser, 'friends' | 'friendRequests'> {
  _id: Types.ObjectId;
  friends: Friend[];
  friendRequests: FriendRequest[];
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  console.log('Friends API called with method:', req.method);

  if (!['GET', 'POST', 'DELETE', 'PUT', 'PATCH'].includes(req.method || '')) {
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
            username: request.from.username || '',
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
        logger.info('=== START: Friend Request Acceptance ===');
        logger.debug('Request body:', req.body);
        logger.debug('Username from request:', username);
        logger.debug('Current user:', { id: user._id, username: user.username });

        if (!username) {
          logger.error('No username provided in request');
          return res.status(400).json({ message: 'Username is required' });
        }

        // First get the fully populated user document to access friend request details
        logger.debug('Fetching current user with populated data...');
        const currentUser = await User.findById(user._id)
          .populate({
            path: 'friendRequests.from',
            select: 'name email username'
          })
          .exec();

        if (!currentUser) {
          logger.error('Could not find current user with populated data');
          return res.status(500).json({ message: 'Error loading user data' });
        }

        // Find the friend by username first
        const friend = await User.findOne({ username: username.toLowerCase() });
        if (!friend) {
          logger.error('Friend not found with username:', username);
          return res.status(404).json({ message: 'User not found' });
        }

        // Check if friend request exists by ID
        logger.debug('Looking for friend request...');
        const pendingRequest = currentUser.friendRequests.find(
          (request: FriendRequest) => request.from._id.toString() === friend._id.toString()
        );

        if (!pendingRequest) {
          logger.error('No friend request found for user:', {
            friendId: friend._id,
            username: friend.username,
            availableRequests: currentUser.friendRequests.map((r: FriendRequest) => ({
              id: r.from._id,
              username: r.from.username
            }))
          });
          return res.status(400).json({ 
            message: 'No friend request found from this user',
            debug: {
              requestedUsername: username,
              availableRequests: currentUser.friendRequests.map((r: FriendRequest) => r.from.username)
            }
          });
        }

        logger.debug('Found pending request:', {
          from: {
            id: pendingRequest.from._id,
            username: friend.username
          }
        });

        // Update both users
        logger.info('Updating both users...');
        try {
          const [updatedUser] = await Promise.all([
            User.findByIdAndUpdate(
              currentUser._id,
              {
                $push: { friends: friend._id },
                $pull: { friendRequests: { from: friend._id } }
              },
              { new: true }
            ).exec(),
            User.findByIdAndUpdate(
              friend._id,
              { $push: { friends: currentUser._id } },
              { new: true }
            ).exec()
          ]);

          logger.info('Updates successful');
          logger.debug('Updated user friends:', updatedUser?.friends);

          return res.status(200).json({ 
            message: 'Friend request accepted successfully',
            friend: {
              id: friend._id,
              name: friend.name,
              username: friend.username,
              email: friend.email
            }
          });
        } catch (updateError) {
          logger.error('Error during user updates:', updateError);
          throw updateError;
        }
      } catch (error) {
        logger.error('Error accepting friend request:', error);
        return res.status(500).json({ 
          message: 'Error accepting friend request',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // DELETE: Reject/remove a friend request or remove a friend
    if (req.method === 'DELETE') {
      try {
        logger.info('=== START: Friend Removal/Rejection ===');
        logger.debug('Request body:', req.body);
        
        const { username, userId } = req.body;
        
        if (!username && !userId) {
          logger.error('No username or userId provided');
          return res.status(400).json({ message: 'Username or userId is required' });
        }

        // First get the fully populated user document
        logger.debug('Fetching current user with populated data...');
        const currentUser = await User.findById(user._id)
          .populate({
            path: 'friendRequests.from',
            select: 'name email username'
          })
          .populate('friends')
          .exec();

        if (!currentUser) {
          logger.error('Could not find current user with populated data');
          return res.status(500).json({ message: 'Error loading user data' });
        }

        // Check if this is a friend removal
        const friendToRemove = currentUser.friends.find(
          (friend: Friend) => friend._id.toString() === userId || friend.username === username
        );

        if (friendToRemove) {
          logger.info('Removing friend:', friendToRemove);
          
          // Remove friend from both users' friend lists
          await Promise.all([
            User.findByIdAndUpdate(
              currentUser._id,
              { $pull: { friends: friendToRemove._id } },
              { new: true }
            ),
            User.findByIdAndUpdate(
              friendToRemove._id,
              { $pull: { friends: currentUser._id } },
              { new: true }
            )
          ]);

          logger.info('Friend removed successfully');
          return res.status(200).json({ message: 'Friend removed successfully' });
        }

        // If not a friend removal, check for friend request rejection
        let requestToRemove: FriendRequest | undefined;
        if (userId) {
          // Find by ID
          requestToRemove = currentUser.friendRequests.find(
            (request: FriendRequest) => request.from._id.toString() === userId
          );
        } else {
          // Find by username
          requestToRemove = currentUser.friendRequests.find(
            (request: FriendRequest) => request.from.username?.toLowerCase() === username.toLowerCase()
          );
        }

        if (!requestToRemove) {
          logger.error('No friend request found to reject:', { username, userId });
          return res.status(400).json({ message: 'No friend request found from this user' });
        }

        logger.debug('Found request to remove:', {
          from: {
            id: requestToRemove.from._id,
            name: requestToRemove.from.name,
            email: requestToRemove.from.email
          }
        });

        // Remove the request
        await User.findByIdAndUpdate(
          currentUser._id,
          {
            $pull: { friendRequests: { from: requestToRemove.from._id } }
          },
          { new: true }
        );

        logger.info('Friend request rejected successfully');
        return res.status(200).json({ message: 'Friend request rejected' });
      } catch (error) {
        logger.error('Error in friend removal/rejection:', error);
        return res.status(500).json({ message: 'Error processing friend removal/rejection' });
      }
    }

    // PATCH: Update user (temporary endpoint for fixing lilo's username)
    if (req.method === 'PATCH') {
      try {
        logger.info('=== START: User Update ===');
        
        // Only allow updating lilo's record
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
          logger.error('Could not find lilo\'s user record');
          return res.status(404).json({ message: 'User not found' });
        }

        logger.info('Successfully updated lilo\'s username');
        return res.status(200).json({ 
          message: 'Username updated successfully',
          user: {
            id: updatedUser._id,
            name: updatedUser.name,
            username: updatedUser.username,
            email: updatedUser.email
          }
        });
      } catch (error) {
        logger.error('Error updating user:', error);
        return res.status(500).json({ message: 'Error updating user' });
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