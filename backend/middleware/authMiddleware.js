import jwt from 'jsonwebtoken';

/**
 * Middleware to verify JWT tokens from cookies
 * Used to protect routes that require authentication
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
export const authenticateToken = (req, res, next) => {
  // Extract token from cookies
  const token = req.cookies.token;
  
  // No token found
  if (!token) {
    return res.status(403).json({ 
      error: 'Access denied. No token provided.' 
    });
  }

  try {
    // Verify the token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured in environment variables');
      return res.status(500).json({ 
        error: 'Internal server error: JWT configuration missing' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request object
    req.user = decoded;
    
    // Token is valid, proceed to the protected route
    next();
  } catch (error) {
    // Token verification failed
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ 
      error: 'Invalid or expired token' 
    });
  }
};

export default authenticateToken;
