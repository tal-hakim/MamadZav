import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    res.status(200).json({ message: 'Database connected successfully!' });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ message: 'Failed to connect to database', error: error instanceof Error ? error.message : 'Unknown error' });
  }
} 