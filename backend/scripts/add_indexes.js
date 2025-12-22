import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addIndexes() {
  console.log('Adding database indexes for performance optimization...\n');
  
  const connection = await pool.getConnection();
  
  try {
    const sqlFile = path.join(__dirname, 'add_indexes.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.trim().substring(0, 80)}...`);
        await connection.query(statement);
        console.log('✓ Success\n');
      }
    }
    
    console.log('All indexes added successfully!');
    
  } catch (error) {
    console.error('Error adding indexes:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
}

addIndexes();
