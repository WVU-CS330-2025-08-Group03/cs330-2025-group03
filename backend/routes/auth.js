const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database'); // Note: Using ../config since auth.js is in the routes folder
const router = express.Router();

/**
 * Registers a new user.
 * Hashes the password using bcrypt and stores the user in the database.
 */
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    username.trim().length < 3 ||
    password.length < 6
  ) {
    return res.status(400).json({ error: 'Username must be at least 3 characters and password at least 6 characters long.' });
  }

  try {
    // Check if the username already exists
    const [existingUsers] = await pool.promise().execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash the user's password with a salt round of 10
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert the user into the database using parameterized queries to avoid SQL injection
    const [result] = await pool.promise().execute(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * Logs in a user.
 * Checks credentials and returns a JWT token in an HTTP-only cookie.
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Query the database for the user by username
    const [rows] = await pool.promise().execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    const user = rows[0];
    
    if (user && await bcrypt.compare(password, user.password)) {
      // Ensure JWT_SECRET is defined
      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET environment variable is not defined.");
        return res.status(500).json({ error: 'Internal server error: JWT secret not configured' });
      }
      // Create a JWT payload containing user details
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      // Set the token in an HTTP-only cookie to protect it from client-side scripts
      res.cookie('token', token, { httpOnly: true, sameSite: 'strict' });
      return res.status(200).json({ message: 'Login successful' });
    } else {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

module.exports = router;
