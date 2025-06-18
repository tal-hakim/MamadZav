import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { User, IUser } from '@/models/User';
import { Types } from 'mongoose';

if (!process.env.JWT_SECRET) {
  throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthenticatedRequest extends NextApiRequest {
  user?: IUser & { _id: Types.ObjectId };
}

type Handler = (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void | NextApiResponse>;

export const authMiddleware = (handler: Handler) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
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
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        
        // Get user from database using Mongoose
        const user = await User.findById(decoded.id)
          .select('-password')
          .lean() as unknown as IUser & { _id: Types.ObjectId };

        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }

        // Add user to request object
        req.user = user;

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

export function generateToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_SECRET!, { expiresIn: '7d' });
} 