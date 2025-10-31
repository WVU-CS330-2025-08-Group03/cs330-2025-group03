import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

// Load environment variables
dotenv.config();

const app = express();

// Configure CORS with credentials
console.log('Configured FRONTEND_URL=', process.env.FRONTEND_URL);
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(cookieParser());

// Mount routes
app.use('/auth', authRoutes);

// Start server
const PORT = process.env.BACKEND_PORT || 5175;
app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
});