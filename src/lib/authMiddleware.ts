import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface User {
  _id: ObjectId;
  name: string;
  email: string;
  username: string;
  friends?: ObjectId[];
  friendRequests?: Array<{
    from: ObjectId;
    createdAt: Date;
  }>;
}

// Extend NextApiRequest to include the user property
declare module 'next' {
  interface NextApiRequest {
    user?: User;
  }
}

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void;

export const authMiddleware = (handler: Handler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Get the token from the Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'Invalid token format' });
      }

      try {
        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        
        // Get user from database
        const { db } = await connectToDatabase();
        const user = await db.collection('users').findOne(
          { _id: new ObjectId(decoded.userId) },
          { projection: { password: 0 } }
        );

        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }

        // Add user to request object
        req.user = user as User;

        // Call the actual handler
        return handler(req, res);
      } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
          return res.status(401).json({ message: 'Invalid token' });
        }
        throw error;
      }
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
}; 