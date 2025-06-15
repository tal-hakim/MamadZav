import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import { User } from '@/models/User';
import { generateToken } from '@/middleware/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const { email, password, name, username } = req.body;

    // Validate input
    if (!email || !password || !name || !username) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists (email or username)
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() }
      ]
    });
    
    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Create new user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      name,
      username: username.toLowerCase(),
      friends: [],
      lastCheckIn: null,
    });

    // Generate token
    const token = generateToken(user._id);

    // Return user data (excluding password) and token
    const userData = {
      id: user._id,
      email: user.email,
      name: user.name,
      username: user.username,
      friends: user.friends,
      lastCheckIn: user.lastCheckIn,
    };

    res.status(201).json({ user: userData, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
} 