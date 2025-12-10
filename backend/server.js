import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

// Load environment variables
dotenv.config();

const app = express();

// Configure CORS with credentials
console.log('NODE_ENV=', process.env.NODE_ENV || 'development');
console.log('Configured FRONTEND_URL=', process.env.FRONTEND_URL);

const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Mount routes
app.use('/auth', authRoutes);

// Start server - Azure App Service requires using PORT env variable
const PORT = Number(process.env.PORT) || 5175;
app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
});