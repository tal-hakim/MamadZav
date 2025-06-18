import { NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import { User } from '@/models/User';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';
import nodemailer from 'nodemailer';

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ message: 'Friend ID is required' });
    }

    // Find the friend
    const friend = await User.findById(friendId).select('email name');
    if (!friend) {
      return res.status(404).json({ message: 'Friend not found' });
    }

    // Check if they are actually friends
    const isFriend = req.user.friends.includes(friendId);
    if (!isFriend) {
      return res.status(403).json({ message: 'Not authorized to ping this user' });
    }

    // Send email notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: friend.email,
      subject: `${req.user.name} is checking on you`,
      text: `Hi ${friend.name},\n\n${req.user.name} is checking if you're safe. Please log in to the Safety Check Network and mark yourself as safe.\n\nBest regards,\nSafety Check Network Team`,
      html: `
        <h2>Safety Check Request</h2>
        <p>Hi ${friend.name},</p>
        <p>${req.user.name} is checking if you're safe. Please log in to the Safety Check Network and mark yourself as safe.</p>
        <p>Click here to log in: <a href="${process.env.NEXT_PUBLIC_APP_URL}/login">Safety Check Network</a></p>
        <p>Best regards,<br>Safety Check Network Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Ping sent successfully' });
  } catch (error) {
    console.error('Ping error:', error);
    res.status(500).json({ message: 'Error sending ping' });
  }
}

export default authMiddleware(handler); 