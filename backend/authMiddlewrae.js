const jwt = require('jsonwebtoken');

/**
 * Middleware to protect routes by verifying JWT in cookies.
 */
const authMiddleware = (req, res, next) => {
  // Retrieve the token from cookies
  const token = req.cookies.token;
  if (!token) return res.status(403).json({ error: 'Access denied' });

  try {
    // Verify the token using the secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach the decoded token (user info) to the request
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
