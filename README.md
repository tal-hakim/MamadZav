# Safety Check Network

A social network platform designed to help people stay connected and informed during emergency situations. Users can quickly check in to let their friends and family know they are safe during critical times.

## Features

- User authentication and profile management
- Friend system for connecting with trusted contacts
- Quick check-in system during emergency situations
- Real-time status updates visible to friends
- Email and SMS notifications
- Ping system to reach out to friends who haven't checked in

## Tech Stack

- Frontend: Next.js with React
- Backend: Node.js with Express
- Database: MongoDB
- UI Framework: Chakra UI
- Authentication: JWT
- Notifications: Nodemailer (Email) and Twilio (SMS)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the root directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   EMAIL_SERVICE=your_email_service
   EMAIL_USER=your_email_username
   EMAIL_PASS=your_email_password
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_phone
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Security

- All user data is encrypted
- Secure authentication using JWT
- Password hashing with bcrypt
- Protected API routes
- Rate limiting on sensitive endpoints

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 