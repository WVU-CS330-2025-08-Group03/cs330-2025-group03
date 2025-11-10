import pool from '../config/database.js';

/**
 * Clean up duplicates and add missing Austin area cities
 */

async function removeDuplicates() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Removing duplicate cities...\n');
    
    // Keep only one copy of each city
    await connection.query(`
      DELETE c1 FROM cities c1
      INNER JOIN cities c2 
      WHERE c1.id > c2.id 
      AND c1.city_name = c2.city_name 
      AND c1.state_code = c2.state_code
    `);
    
    const [result] = await connection.query('SELECT COUNT(*) as total FROM cities');
    console.log(`✓ Duplicates removed. ${result[0].total} unique cities remaining.\n`);
    
  } catch (error) {
    console.error('Error removing duplicates:', error.message);
  } finally {
    connection.release();
  }
}

async function addMissingAustinCities() {
  const connection = await pool.getConnection();
  
  const austinAreaCities = [
    { city: 'Kyle', state: 'Texas', stateCode: 'TX', lat: 29.9891, lng: -97.8772, pop: 45697, crime: 22.5, col: 102, school: 7.8, price: 385000, unemp: 3.2 },
    { city: 'Buda', state: 'Texas', stateCode: 'TX', lat: 30.0852, lng: -97.8403, pop: 17884, crime: 18.3, col: 103, school: 8.1, price: 420000, unemp: 2.9 },
    { city: 'Cedar Park', state: 'Texas', stateCode: 'TX', lat: 30.5052, lng: -97.8203, pop: 77595, crime: 19.7, col: 106, school: 8.3, price: 450000, unemp: 2.8 },
    { city: 'Georgetown', state: 'Texas', stateCode: 'TX', lat: 30.6327, lng: -97.6770, pop: 75420, crime: 21.4, col: 104, school: 7.9, price: 425000, unemp: 3.1 },
    { city: 'Pflugerville', state: 'Texas', stateCode: 'TX', lat: 30.4394, lng: -97.6200, pop: 65191, crime: 23.8, col: 105, school: 7.7, price: 395000, unemp: 3.3 },
    { city: 'Leander', state: 'Texas', stateCode: 'TX', lat: 30.5788, lng: -97.8531, pop: 67124, crime: 20.2, col: 104, school: 8.0, price: 430000, unemp: 2.9 },
    { city: 'Dripping Springs', state: 'Texas', stateCode: 'TX', lat: 30.1902, lng: -98.0870, pop: 4650, crime: 15.1, col: 108, school: 8.5, price: 525000, unemp: 2.5 },
    { city: 'Lakeway', state: 'Texas', stateCode: 'TX', lat: 30.3644, lng: -97.9864, pop: 18135, crime: 16.8, col: 125, school: 8.7, price: 625000, unemp: 2.3 },
  ];
  
  try {
    console.log('Adding missing Austin area cities...\n');
    let addedCount = 0;
    
    for (const city of austinAreaCities) {
      // Check if already exists
      const [existing] = await connection.query(
        'SELECT id FROM cities WHERE city_name = ? AND state_code = ?',
        [city.city, city.stateCode]
      );
      
      if (existing.length === 0) {
        await connection.query(`
          INSERT INTO cities (
            city_name, state, state_code, latitude, longitude, population,
            crime_rate, cost_of_living_index, school_rating, 
            median_home_price, unemployment_rate
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          city.city, city.state, city.stateCode, city.lat, city.lng, city.pop,
          city.crime, city.col, city.school, city.price, city.unemp
        ]);
        console.log(`  ✓ Added ${city.city}, ${city.stateCode}`);
        addedCount++;
      } else {
        console.log(`  - ${city.city} already exists`);
      }
    }
    
    console.log(`\n✓ Added ${addedCount} new cities\n`);
    
  } catch (error) {
    console.error('Error adding cities:', error.message);
  } finally {
    connection.release();
  }
}

async function showSummary() {
  const connection = await pool.getConnection();
  
  try {
    const [total] = await connection.query('SELECT COUNT(*) as total FROM cities');
    const [texas] = await connection.query('SELECT city_name FROM cities WHERE state_code = "TX" ORDER BY city_name');
    
    console.log('='.repeat(60));
    console.log(`✓ Total cities in database: ${total[0].total}`);
    console.log(`\n🤠 Texas cities (${texas.length}):`);
    console.log(texas.map(c => c.city_name).join(', '));
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
  }
}

async function run() {
  console.log('\n' + '='.repeat(60));
  console.log('  DATABASE CLEANUP & AUSTIN CITIES');
  console.log('='.repeat(60) + '\n');

  try {
    await removeDuplicates();
    await addMissingAustinCities();
    await showSummary();
    
    console.log('\n✨ Database is ready! Test your city search now!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

run();
