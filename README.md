# RentoQuick - P2P Rental Marketplace

A modern peer-to-peer rental marketplace platform built with the MERN stack, allowing users to rent items from each other seamlessly and securely.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Production](#production)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Roadmap](#roadmap)
- [Known Issues](#known-issues)
- [Contributing](#contributing)
- [License](#license)

## Overview

RentoQuick is India's fastest P2P rental marketplace that enables users to rent anything from anyone, anywhere. Whether you need camera equipment, bikes, power tools, or other items, RentoQuick makes it easy to find, book, and manage rentals securely and affordably.

### Key Value Propositions

- Rent items without buying them
- Earn passive income by renting out your items
- Secure transactions with verified users
- Real-time messaging and notifications
- Transparent pricing and no hidden costs
- Easy booking management and tracking

## Features

### Completed Features

- User registration with email verification (OTP-based)
- User login with email/password authentication
- Google OAuth integration for seamless sign-up
- Password reset functionality via email
- Complete profile management (edit info, change password)
- Referral system with unique code generation and sharing
- Multi-step listing creation form (Basic Info, Pricing, Location, Details)
- Image upload functionality for listings
- Featured listings display on homepage
- Category-based browsing
- Full-text search functionality
- Protected routes with authentication checks
- Form validation with error handling and toast notifications
- WhatsApp integration for referral code sharing

### Upcoming Features

See [FEATURES_TODO.md](./FEATURES_TODO.md) for a detailed roadmap of planned features organized by priority.

## Tech Stack

### Frontend

- React 19.2.0
- React Router 7.13.1 for routing
- Tailwind CSS 3.4.19 for styling
- Vite 8.0.16 as build tool
- Zod 4.4.3 for form validation
- Axios 1.13.6 for HTTP requests
- Socket.io Client 4.8.3 for real-time features
- Lucide React for icons
- React Hot Toast 2.6.0 for notifications
- Google OAuth for authentication

### Backend

- Node.js with Express 4.18.3
- MongoDB with Mongoose 9.6.3 ODM
- JWT for authentication
- Bcryptjs for password hashing
- Cloudinary for image hosting
- Razorpay for payment processing
- Socket.io for real-time messaging
- Nodemailer for email services
- Express Rate Limit for API protection
- Helmet for security headers
- Multer for file uploads
- Zod for data validation

## Project Structure

```
RentoQuick/
├── frontend/                 # React.js frontend application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Page components
│   │   ├── context/         # React context for state management
│   │   ├── api/             # API client functions
│   │   ├── hooks/           # Custom React hooks
│   │   ├── styles/          # CSS and Tailwind styles
│   │   └── main.jsx         # Entry point
│   └── package.json
├── backend/                  # Node.js Express backend
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Utility functions
│   │   ├── db/              # Database connection
│   │   └── server.js        # Express server entry point
│   └── package.json
├── package.json             # Root package.json
└── README.md                # This file
```

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or Atlas)
- Git

### Clone the Repository

```bash
git clone https://github.com/shlok-0007/RentoQuick.git
cd RentoQuick
```

### Install Dependencies

```bash
npm run install:all
```

This command will install dependencies for both frontend and backend.

## Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
NODE_ENV=development

MONGO_URI=mongodb://localhost:27017/rentoquick
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

GOOGLE_CLIENT_ID=your_google_client_id

FRONTEND_URL=http://localhost:5173
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## Development

### Start Development Servers

#### Terminal 1 - Backend

```bash
npm run dev:backend
```

Backend will run on http://localhost:5000

#### Terminal 2 - Frontend

```bash
npm run dev:frontend
```

Frontend will run on http://localhost:5173

### Seed Database

To populate the database with sample data:

```bash
npm run seed
```

This will create sample users, listings, and bookings for testing.

### Available Commands

- `npm run dev:backend` - Start backend in development mode with hot reload
- `npm run dev:frontend` - Start frontend dev server
- `npm run build` - Build the entire project
- `npm run build:frontend` - Build frontend for production
- `npm start` - Start backend server in production mode
- `npm run seed` - Populate database with sample data

## Production

### Build for Production

```bash
npm run build
```

This will:
1. Install all dependencies
2. Build the React frontend
3. Create optimized production bundles

### Deploy Backend

```bash
npm start
```

Make sure to:
- Set `NODE_ENV=production` in `.env`
- Use production MongoDB URI (MongoDB Atlas)
- Configure all third-party services (Cloudinary, Razorpay, SMTP)
- Set proper CORS origins
- Enable HTTPS in production

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/verify-email` - Verify email with OTP
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### User Endpoints

- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password

### Listing Endpoints

- `POST /api/listings` - Create new listing
- `GET /api/listings` - Get all listings with filters
- `GET /api/listings/:id` - Get listing details
- `PUT /api/listings/:id` - Update listing
- `DELETE /api/listings/:id` - Delete listing

### Search & Filter

- `GET /api/listings?category=Photography` - Filter by category
- `GET /api/listings?location.city=Mumbai` - Filter by city
- `GET /api/listings?pricePerDay[gte]=100&pricePerDay[lte]=1000` - Price range filter
- `GET /api/listings?search=camera` - Full-text search

## Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  avatar: String (image URL),
  bio: String,
  location: {
    city: String,
    state: String,
    country: String
  },
  role: String (user, admin),
  isVerified: Boolean,
  rating: {
    average: Number,
    count: Number
  },
  wishlist: [ObjectId],
  referralCode: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Listings Collection

```javascript
{
  _id: ObjectId,
  title: String,
  slug: String (unique),
  description: String,
  category: String,
  owner: ObjectId (reference to User),
  images: [{
    url: String,
    alt: String
  }],
  pricePerDay: Number,
  pricePerWeek: Number,
  pricePerMonth: Number,
  securityDeposit: Number,
  location: {
    city: String,
    state: String,
    country: String
  },
  condition: String (Like New, Good, Fair),
  availability: {
    isAvailable: Boolean,
    minRentalDays: Number,
    maxRentalDays: Number,
    unavailableDates: [Date]
  },
  features: [String],
  tags: [String],
  rating: {
    average: Number,
    count: Number
  },
  views: Number,
  totalRentals: Number,
  isActive: Boolean,
  isFeatured: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Bookings Collection

```javascript
{
  _id: ObjectId,
  listing: ObjectId,
  renter: ObjectId,
  owner: ObjectId,
  startDate: Date,
  endDate: Date,
  totalDays: Number,
  pricing: {
    pricePerDay: Number,
    subtotal: Number,
    tax: Number,
    discount: Number,
    total: Number
  },
  status: String (pending, confirmed, completed, cancelled),
  paymentStatus: String (unpaid, paid, refunded),
  paymentMethod: String (online, offline),
  transactionId: String,
  deliveryMethod: String (pickup, delivery),
  deliveryAddress: Object,
  notes: {
    renter: String,
    owner: String
  },
  cancellation: {
    reason: String,
    refundAmount: Number,
    cancelledAt: Date
  },
  review: {
    rating: Number,
    comment: String,
    reviewedAt: Date
  },
  timeline: [{
    status: String,
    timestamp: Date,
    note: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## Roadmap

### High Priority Features

- Complete Booking System (create, accept/reject, status management)
- Real-time Messaging System
- User Reviews and Ratings
- Wishlist functionality

### Medium Priority Features

- Advanced Search and Filters
- Listing Management (edit, delete)
- User Verification System
- Analytics Dashboard

### Low Priority Features

- Dispute Resolution Center
- Admin Features
- Multi-language Support
- Mobile App (React Native)

See [FEATURES_TODO.md](./FEATURES_TODO.md) for detailed breakdown.

## Known Issues

1. MongoDB Atlas IP whitelisting needs to be configured in production
2. Email service (SMTP) configuration required for production
3. Cloudinary configuration needed for production image uploads
4. Razorpay API keys must be configured for payment processing
5. Google OAuth credentials setup required
6. WebSocket configuration needed for real-time features

## Performance Considerations

- Images should be optimized and served from CDN
- Implement lazy loading for listing images
- Add caching strategy for frequently accessed data
- Consider pagination for large datasets
- Use rate limiting on API endpoints

## Security

- All passwords are hashed using bcryptjs
- JWT tokens are used for authentication
- CORS is configured to allow only trusted origins
- Helmet.js provides security headers
- Rate limiting protects against brute force attacks
- Input validation using Zod
- SQL injection prevention (MongoDB injection prevention)

## Contributing

1. Fork the repository
2. Create a feature branch (git checkout -b feature/AmazingFeature)
3. Commit your changes (git commit -m 'Add some AmazingFeature')
4. Push to the branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

## Support

For issues and questions:
- Open a GitHub issue
- Contact the development team
- Check existing documentation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

RentoQuick Development Team

---

Last Updated: June 2026

For the latest updates and information, visit the GitHub Repository
