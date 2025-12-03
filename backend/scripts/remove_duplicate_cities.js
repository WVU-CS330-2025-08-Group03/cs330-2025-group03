import pool from '../config/database.js';

/**
 * This script removes duplicate cities from the database.
 * A duplicate is defined as a city with the same city_name and state_code.
 * The script keeps the entry with the lowest ID and deletes the others.
 */
async function removeDuplicates() {
  const connection = await pool.getConnection();
  let initialCount = 0;

  try {
    console.log('\n' + '='.repeat(60));
    console.log('  DATABASE CLEANUP: REMOVING DUPLICATE CITIES');
    console.log('='.repeat(60) + '\n');

    // Get initial count
    const [initialResult] = await connection.query('SELECT COUNT(*) as total FROM cities');
    initialCount = initialResult[0].total;
    console.log(`Initial city count: ${initialCount}`);
    
    console.log('Finding and removing duplicate cities...');
    
    // This query deletes rows from cities (aliased as c1) that have a matching city_name and state_code
    // in another row (aliased as c2) where c1's id is greater than c2's id.
    // This effectively keeps the first-inserted record for any set of duplicates.
    const [deleteResult] = await connection.query(`
      DELETE c1 FROM cities c1
      INNER JOIN cities c2 
      WHERE c1.id > c2.id 
      AND c1.city_name = c2.city_name 
      AND c1.state_code = c2.state_code
    `);
    
    const removedCount = deleteResult.affectedRows;
    console.log(`\n✓ Removed ${removedCount} duplicate entries.`);

    const finalCount = initialCount - removedCount;
    console.log(`✓ Final unique city count: ${finalCount}\n`);
    
  } catch (error) {
    console.error('❌ Error removing duplicates:', error.message);
  } finally {
    connection.release();
    pool.end();
  }
}

removeDuplicates();