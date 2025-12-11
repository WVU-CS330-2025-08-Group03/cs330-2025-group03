import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import citiesRoutes from './routes/cities.js';
import favoritesRoutes from './routes/favorites.js';
import { authenticateToken } from './middleware/authMiddleware.js';

// Load environment variables
dotenv.config();

const app = express();

// Log environment configuration
console.log(`NODE_ENV= ${process.env.NODE_ENV || 'development'}`);
console.log(`Configured FRONTEND_URL= ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);

// Middleware setup - CORS configuration
// Allow production frontend and localhost for development
const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL, 'https://orange-ground-0a8ff800f.3.azurestaticapps.net']
  : [
      'https://orange-ground-0a8ff800f.3.azurestaticapps.net',
      'http://localhost:5173', 
      'http://localhost:5174', 
      'http://localhost:5175', 
      'http://localhost:5176'
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check endpoint for Azure App Service
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Mount the authentication routes under /auth
app.use('/auth', authRoutes);

// Mount the cities routes under /api/cities
app.use('/api/cities', citiesRoutes);

// Mount the favorites routes under /api/favorites
app.use('/api/favorites', favoritesRoutes);

// Test protected route
app.get('/api/test', authenticateToken, (req, res) => {
    res.json({ 
        message: 'Protected route accessed successfully', 
        user: req.user 
    });
});

// Azure App Service requires using PORT env variable
const PORT = Number(process.env.PORT) || 5175;

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
