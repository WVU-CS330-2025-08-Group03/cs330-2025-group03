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
      
      // Set the token in an HTTP-only cookie.
      // For cross-site frontend (frontend on a different origin), browsers
      // require `sameSite: 'none'` and `secure: true` so the cookie is sent.
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
      };

      res.cookie('token', token, cookieOptions);
      
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
 * GET /auth/me
 * Gets current user info including profile image
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, email, profile_image FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (rows.length > 0) {
      res.json({ user: rows[0] });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

/**
 * PUT /auth/update-profile
 * Updates user profile information
 */
router.put('/update-profile', authenticateToken, async (req, res) => {
  const { username, email, profile_image } = req.body;
  const userId = req.user.id;

  if (!username || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  try {
    // Check if username is taken by another user
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Update user profile
    await pool.execute(
      'UPDATE users SET username = ?, email = ?, profile_image = ? WHERE id = ?',
      [username, email || null, profile_image || null, userId]
    );

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: { id: userId, username, email, profile_image }
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * PUT /auth/change-password
 * Change user password
 */
router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    // Get user's current password hash
    const [users] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({ 
      success: true, 
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /auth/logout
 * Clears the authentication cookie
 */
router.post('/logout', (req, res) => {
  // Clear the cookie using the same cookie attributes used when setting it.
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  };

  res.clearCookie('token', clearOptions);
  res.json({ message: 'Logout successful' });
});

export default router;
