const express = require('express');
const cookieParser = require('cookie-parser'); // Needed to parse cookies from requests
require('dotenv').config();

const app = express();

// Middleware for parsing JSON bodies and cookies
app.use(express.json());
app.use(cookieParser());

// Mount the authentication routes under /auth
const authRoutes = require('./routes/auth'); // Adjust the path if necessary
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
