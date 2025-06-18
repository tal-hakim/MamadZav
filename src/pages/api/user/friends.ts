import { NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { authMiddleware, AuthenticatedRequest, withAuth } from '@/lib/authMiddleware';
import { Types } from 'mongoose';

interface FriendRequest {
  _id: Types.ObjectId;
  from: Types.ObjectId;
  createdAt: Date;
}

interface Friend {
  _id: Types.ObjectId;
  username: string;
  email: string;
  name: string;
  lastCheckIn: Date | null;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  console.log('Friends API called with method:', req.method);

  if (!['GET', 'POST', 'DELETE', 'PUT'].includes(req.method || '')) {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Connect to database
    console.log('Attempting to connect to MongoDB...');
    await dbConnect();
    console.log('Successfully connected to MongoDB');

    if (!req.user) {
      console.error('No user found in request');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.userId;

    switch (req.method) {
      case 'GET':
        console.log('Getting friend requests for user:', userId);
        const user = await User.findById(userId)
          .populate({
            path: 'friendRequests.from',
            select: 'username email name'
          })
          .populate('friends', 'username email name lastCheckIn')
          .exec();
        
        if (!user) {
          console.error('User not found:', userId);
          return res.status(404).json({ message: 'User not found' });
        }

        // Transform friend requests to ensure all required fields
        const friendRequests = (user.friendRequests || []).map((request: any) => {
          if (!request || !request.from) return null;
          return {
            id: request.from._id.toString(),
            username: request.from.username,
            email: request.from.email,
            name: request.from.name,
            createdAt: request.createdAt.toISOString()
          };
        }).filter(Boolean);

        // Transform friends to ensure all required fields
        const friends = (user.friends || []).map((friend: Friend) => {
          if (!friend) return null;
          return {
            id: friend._id.toString(),
            username: friend.username,
            email: friend.email,
            name: friend.name,
            lastCheckIn: friend.lastCheckIn ? new Date(friend.lastCheckIn).toISOString() : null
          };
        }).filter(Boolean);

        console.log('Found user with friend requests:', friendRequests.length);
        return res.status(200).json({
          friendRequests,
          friends
        });

      case 'POST':
        const { friendId } = req.body;
        console.log('Sending friend request from', userId, 'to', friendId);

        if (!friendId) {
          console.error('No friendId provided in request body');
          return res.status(400).json({ message: 'Friend ID is required' });
        }

        const friend = await User.findById(friendId);
        if (!friend) {
          console.error('Friend not found:', friendId);
          return res.status(404).json({ message: 'Friend not found' });
        }

        friend.friendRequests = friend.friendRequests || [];
        const requestExists = friend.friendRequests.some(
          (request: FriendRequest) => request.from.equals(userId)
        );

        if (requestExists) {
          console.log('Friend request already sent');
          return res.status(400).json({ message: 'Friend request already sent' });
        }

        friend.friendRequests.push({
          from: userId,
          createdAt: new Date()
        });
        await friend.save();
        console.log('Friend request sent successfully');
        return res.status(200).json({ message: 'Friend request sent' });

      case 'PUT':
        const { requestId } = req.body;
        console.log('[Production Debug] === Friend Request Accept Operation ===');
        console.log('[Production Debug] Request body:', JSON.stringify(req.body, null, 2));
        console.log('[Production Debug] User ID:', userId);
        console.log('[Production Debug] Request ID:', requestId);

        if (!requestId) {
          console.error('[Production Debug] No requestId provided in request body');
          return res.status(400).json({ 
            message: 'Request ID is required',
            debug: { 
              body: req.body,
              userId: userId
            }
          });
        }

        console.log('[Production Debug] Fetching user documents...');
        const [currentUser, requester] = await Promise.all([
          User.findById(userId),
          User.findById(requestId)
        ]);

        console.log('[Production Debug] Current user found:', !!currentUser);
        console.log('[Production Debug] Requester found:', !!requester);
        
        if (currentUser) {
          console.log('[Production Debug] Current user data:', {
            id: currentUser._id,
            friendRequests: currentUser.friendRequests?.length || 0,
            friends: currentUser.friends?.length || 0
          });
        }

        if (requester) {
          console.log('[Production Debug] Requester data:', {
            id: requester._id,
            friends: requester.friends?.length || 0
          });
        }

        if (!currentUser) {
          console.error('[Production Debug] Current user not found:', userId);
          return res.status(404).json({ 
            message: 'User not found',
            debug: { userId, requestId }
          });
        }

        if (!requester) {
          console.error('[Production Debug] Requester not found:', requestId);
          return res.status(404).json({ 
            message: 'Requester not found',
            debug: { userId, requestId }
          });
        }

        // Start a session for the transaction
        console.log('[Production Debug] Starting MongoDB session...');
        const session = await User.startSession();
        session.startTransaction();

        try {
          // Initialize arrays if undefined
          currentUser.friendRequests = currentUser.friendRequests || [];
          currentUser.friends = currentUser.friends || [];
          requester.friends = requester.friends || [];

          console.log('[Production Debug] Current state:', {
            currentUserFriendRequests: currentUser.friendRequests.length,
            currentUserFriends: currentUser.friends.length,
            requesterFriends: requester.friends.length
          });

          // Check if friend request exists
          const requestExists = currentUser.friendRequests.some(
            (request: FriendRequest) => request.from.equals(requestId)
          );
          console.log('[Production Debug] Friend request exists:', requestExists);

          if (!requestExists) {
            console.error('[Production Debug] Friend request not found in current user\'s requests');
            console.log('[Production Debug] Available requests:', currentUser.friendRequests.map((r: FriendRequest) => ({
              from: r.from.toString(),
              createdAt: r.createdAt
            })));
            
            await session.abortTransaction();
            return res.status(404).json({ 
              message: 'Friend request not found',
              debug: {
                userId,
                requestId,
                availableRequests: currentUser.friendRequests.map((r: FriendRequest) => ({
                  from: r.from.toString(),
                  createdAt: r.createdAt
                }))
              }
            });
          }

          // Remove friend request
          console.log('[Production Debug] Removing friend request...');
          currentUser.friendRequests = currentUser.friendRequests.filter(
            (request: FriendRequest) => !request.from.equals(requestId)
          );

          // Add to friends list for both users if not already friends
          const isAlreadyFriend = currentUser.friends.some(
            (id: Types.ObjectId) => id.equals(requestId)
          );
          const isRequesterFriend = requester.friends.some(
            (id: Types.ObjectId) => id.equals(userId)
          );

          console.log('[Production Debug] Friendship status:', {
            isAlreadyFriend,
            isRequesterFriend
          });

          if (!isAlreadyFriend) {
            console.log('[Production Debug] Adding requester to current user\'s friends');
            currentUser.friends.push(requestId);
          }
          if (!isRequesterFriend) {
            console.log('[Production Debug] Adding current user to requester\'s friends');
            requester.friends.push(userId);
          }

          console.log('[Production Debug] Saving changes...');
          await Promise.all([
            currentUser.save({ session }),
            requester.save({ session })
          ]);

          console.log('[Production Debug] Committing transaction...');
          await session.commitTransaction();
          console.log('[Production Debug] Friend request accepted successfully');
          
          return res.status(200).json({ 
            message: 'Friend request accepted',
            debug: {
              currentUserFriends: currentUser.friends.length,
              requesterFriends: requester.friends.length,
              requestRemoved: true
            }
          });
        } catch (error) {
          console.error('[Production Debug] Error in friend request acceptance:', error);
          await session.abortTransaction();
          throw error;
        } finally {
          console.log('[Production Debug] Ending session...');
          session.endSession();
        }

      case 'DELETE':
        const { targetId } = req.body;
        console.log('Removing friend/request:', targetId, 'for user', userId);

        if (!targetId) {
          console.error('No targetId provided in request body');
          return res.status(400).json({ message: 'Target ID is required' });
        }

        const userToUpdate = await User.findById(userId);
        if (!userToUpdate) {
          console.error('User not found:', userId);
          return res.status(404).json({ message: 'User not found' });
        }

        // Initialize arrays if undefined
        userToUpdate.friendRequests = userToUpdate.friendRequests || [];
        userToUpdate.friends = userToUpdate.friends || [];

        // Remove from friend requests and friends
        userToUpdate.friendRequests = userToUpdate.friendRequests.filter(
          (request: FriendRequest) => !request.from.equals(targetId)
        );
        userToUpdate.friends = userToUpdate.friends.filter(
          (id: Types.ObjectId) => !id.equals(targetId)
        );

        await userToUpdate.save();
        console.log('Friend/request removed successfully');
        return res.status(200).json({ message: 'Friend/request removed' });

      default:
        console.error('Method not allowed:', req.method);
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in friends API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withAuth(handler); 