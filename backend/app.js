import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import citiesRoutes from './routes/cities.js';
import { authenticateToken } from './middleware/authMiddleware.js';

// Load environment variables
dotenv.config();

const app = express();

// Log frontend URL configuration
console.log(`Configured FRONTEND_URL= ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);

// Rate limiting middleware
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per IP
  message: 'Too many registration attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware setup
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Mount the authentication routes under /auth
app.use('/auth', authRoutes);

// Mount the cities routes under /api/cities
app.use('/api/cities', citiesRoutes);

// Test protected route
app.get('/api/test', authenticateToken, (req, res) => {
    res.json({ 
        message: 'Protected route accessed successfully', 
        user: req.user 
    });
});

const PORT = process.env.BACKEND_PORT || 5175;

// Handle server startup errors
const server = app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please choose a different port or stop the other process.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});
