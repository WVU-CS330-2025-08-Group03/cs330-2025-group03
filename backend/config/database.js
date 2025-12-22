import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import fs from 'fs';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the `backend` directory
dotenv.config({ path: resolve(__dirname, '../.env') });

// Define the SSL certificate path
const sslCertPath = join(__dirname, 'DigiCertGlobalRootG2.crt.pem');

// Verify SSL certificate exists
try {
  console.log(`Loading CA cert from: ${sslCertPath}`);
  fs.accessSync(sslCertPath, fs.constants.R_OK);
  console.log('Connecting to Azure MySQL...');
} catch (error) {
  console.error('Failed to load SSL certificate:', error.message);
  process.exit(1);
}

// Create the connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  ssl: {
    ca: fs.readFileSync(sslCertPath),
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 50, // Increased from 10 for better concurrency
  queueLimit: 0,
  connectTimeout: 20000, // 20 seconds
  acquireTimeout: 20000, // 20 seconds
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test the connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL');
    connection.release();
  } catch (error) {
    console.error('Failed to connect to MySQL:', error.message);
    console.error('Server will continue but database operations will fail.');
    console.error('Please add your IP address to Azure MySQL firewall rules.');
    // Don't exit - allow server to start even if DB connection fails
  }
};

// Run the connection test (non-blocking)
testConnection();

export default pool;
