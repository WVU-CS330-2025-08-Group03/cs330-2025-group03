import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rate limiters
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many registration attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Email configuration (using environment variables)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Helper function to send verification email
 */
const sendVerificationEmail = async (email, username, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Email Verification',
    html: `
      <h2>Welcome, ${username}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 1 hour.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send verification email to ${email}:`, error);
    throw error;
  }
};

/**
 * POST /auth/register
 * Registers a new user with email, username, and password
 */
router.post('/register', registerLimiter, async (req, res) => {
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

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
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
    
    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    // Insert the user into the database
    const [result] = await pool.execute(
      'INSERT INTO users (email, username, password_hash, email_verification_token, email_verification_token_expiry) VALUES (?, ?, ?, ?, ?)',
      [email, username, hashedPassword, verificationToken, tokenExpiry]
    );
    
    // Send verification email
    try {
      await sendVerificationEmail(email, username, verificationToken);
      res.status(201).json({ message: 'User registered successfully. Please check your email to verify your account.' });
    } catch (emailError) {
      console.error('Registration successful but email failed:', emailError);
      res.status(201).json({ 
        message: 'User registered but verification email failed to send. Please contact support.',
        warning: 'email_not_sent'
      });
    }
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * POST /auth/login
 * Authenticates user and sets JWT in HTTP-only cookie
 */
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Query the database for the user by username
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    const user = rows[0];
    
    if (user && await bcrypt.compare(password, user.password_hash)) {
      // Check if email is verified
      if (!user.is_email_verified) {
        return res.status(403).json({ 
          error: 'Please verify your email before logging in.',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }

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

/**
 * GET /auth/verify-email
 * Verifies email using the token sent in the email
 */
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required.' });
  }

  try {
    // Find the user with this token
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email_verification_token = ? AND email_verification_token_expiry > NOW()',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    const user = rows[0];

    // Mark email as verified
    await pool.execute(
      'UPDATE users SET is_email_verified = TRUE, email_verification_token = NULL, email_verification_token_expiry = NULL WHERE id = ?',
      [user.id]
    );

    res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error("Error during email verification:", error);
    res.status(500).json({ error: 'Failed to verify email.' });
  }
});

/**
 * POST /auth/resend-verification
 * Resends verification email to the user
 */
router.post('/resend-verification', registerLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    // Find the user by email
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = rows[0];

    // Check if already verified
    if (user.is_email_verified) {
      return res.status(400).json({ error: 'Email is already verified.' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Update the token in database
    await pool.execute(
      'UPDATE users SET email_verification_token = ?, email_verification_token_expiry = ? WHERE id = ?',
      [verificationToken, tokenExpiry, user.id]
    );

    // Send verification email
    try {
      await sendVerificationEmail(email, user.username, verificationToken);
      res.status(200).json({ message: 'Verification email resent successfully.' });
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      res.status(500).json({ error: 'Failed to send verification email.' });
    }
  } catch (error) {
    console.error("Error resending verification:", error);
    res.status(500).json({ error: 'Failed to resend verification email.' });
  }
});

/**
 * POST /auth/change-password
 * Allows authenticated users to change their password
 * Protected route - requires valid JWT
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user.id;

  // Input validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ 
      error: 'Current password, new password, and confirmation are required.' 
    });
  }

  // Validate new password strength
  if (newPassword.length < 6) {
    return res.status(400).json({ 
      error: 'New password must be at least 6 characters long.' 
    });
  }

  // Check if new password matches confirmation
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ 
      error: 'New password and confirmation do not match.' 
    });
  }

  // Prevent using the same password
  if (currentPassword === newPassword) {
    return res.status(400).json({ 
      error: 'New password must be different from current password.' 
    });
  }

  try {
    // Fetch the user's current password hash
    const [rows] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = rows[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error("Error during password change:", error);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

export default router;
