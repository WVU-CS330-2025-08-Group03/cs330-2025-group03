import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /auth/register
 * Registers a new user with email, username, and password
 */
router.post('/register', async (req, res) => {
  const { email, username, password } = req.body;

  // Input validation
  if (
    !email ||
    !username ||
    !password ||
    typeof email !== 'string' ||
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    username.trim().length < 3 ||
    password.length < 6
  ) {
    return res.status(400).json({ 
      error: 'Email, username (min 3 chars), and password (min 6 chars) are required.' 
    });
  }

  try {
    // Check if the username or email already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash the user's password with a salt round of 10
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert the user into the database
    const [result] = await pool.execute(
      'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
      [email, username, hashedPassword]
    );
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * POST /auth/login
 * Authenticates user and sets JWT in HTTP-only cookie
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Query the database for the user by username
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    const user = rows[0];
    
    if (user && await bcrypt.compare(password, user.password_hash)) {
      // Ensure JWT_SECRET is defined
      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET environment variable is not defined.");
        return res.status(500).json({ error: 'Internal server error: JWT secret not configured' });
      }
      
      // Create a JWT payload containing user details
      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      // Set the token in an HTTP-only cookie
      res.cookie('token', token, { 
        httpOnly: true, 
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
      });
      
      return res.status(200).json({ message: 'Login successful' });
    } else {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

/**
 * GET /auth/test
 * Verifies authentication status using JWT from cookie
 * Protected route - requires valid JWT
 */
router.get('/test', authenticateToken, (req, res) => {
  res.json({ 
    ok: true, 
    user: req.user 
  });
});

/**
 * POST /auth/logout
 * Clears the authentication cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', { 
    httpOnly: true, 
    sameSite: 'strict' 
  });
  res.json({ message: 'Logout successful' });
});

export default router;
