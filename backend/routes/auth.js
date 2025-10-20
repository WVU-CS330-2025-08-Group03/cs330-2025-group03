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
  
  try {
    // Hash the user's password with a salt round of 10
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert the user into the database using parameterized queries to avoid SQL injection
    const [result] = await pool.promise().execute(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * Logs in a user.
 * Verifies credentials, generates a JWT if valid, and sends it in an HTTP-only cookie.
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
    
    // Check if the user exists and if the password is correct
    if (user && await bcrypt.compare(password, user.password)) {
      // Create a JWT payload containing user details
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      // Set the token in an HTTP-only cookie to protect it from client-side scripts
      res.cookie('token', token, { httpOnly: true, sameSite: 'strict' });
      res.json({ message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: 'Failed to login' });
  }
});
