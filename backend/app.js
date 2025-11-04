import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import { authenticateToken } from './middleware/authMiddleware.js';

// Load environment variables
dotenv.config();

const app = express();

// Log frontend URL configuration
console.log(`Configured FRONTEND_URL= ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);

// Middleware setup
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Mount the authentication routes under /auth
app.use('/auth', authRoutes);

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
