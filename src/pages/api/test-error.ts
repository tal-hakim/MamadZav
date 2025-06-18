import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Log request details
    console.log('Request headers:', req.headers);
    console.log('Request method:', req.method);
    console.log('Request body:', req.body);
    console.log('Request query:', req.query);

    // Return success
    res.status(200).json({ 
      message: 'Test endpoint working',
      headers: req.headers,
      method: req.method,
      body: req.body,
      query: req.query
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      message: 'Test endpoint error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 