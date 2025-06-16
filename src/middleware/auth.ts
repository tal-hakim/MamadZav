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

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => Promise<void>
) {
  try {
    console.log('\n=== START: Auth Middleware ===');
    console.log('Method:', req.method);
    console.log('Path:', req.url);
    
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token received, verifying...');
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET!) as { id: string };
      console.log('Token verified, user ID:', decoded.id);
    } catch (error) {
      console.error('Token verification error:', error);
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      console.log('User not found for ID:', decoded.id);
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('User found:', user._id);
    req.user = user;

    console.log('=== END: Auth Middleware ===\n');
    
    // Call the handler and catch any errors
    try {
      await next();
    } catch (error) {
      console.error('Error in route handler:', error);
      return res.status(500).json({ 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      message: 'Authentication failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export function generateToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_SECRET!, { expiresIn: '7d' });
} 