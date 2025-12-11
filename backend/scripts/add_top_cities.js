import pool from '../config/database.js';

const topCities = [
  { name: 'New York', state: 'New York', code: 'NY', lat: 40.7128, lon: -74.0060, pop: 8336817, crime: 35.2, col: 172, school: 7.5, price: 795000, unemp: 4.5 },
  { name: 'Los Angeles', state: 'California', code: 'CA', lat: 34.0522, lon: -118.2437, pop: 3979576, crime: 41.8, col: 158, school: 7.2, price: 875000, unemp: 4.8 },
  { name: 'Chicago', state: 'Illinois', code: 'IL', lat: 41.8781, lon: -87.6298, pop: 2693976, crime: 45.5, col: 116, school: 6.9, price: 340000, unemp: 5.2 },
  { name: 'Houston', state: 'Texas', code: 'TX', lat: 29.7604, lon: -95.3698, pop: 2320268, crime: 42.3, col: 99, school: 7.1, price: 295000, unemp: 4.1 },
  { name: 'Phoenix', state: 'Arizona', code: 'AZ', lat: 33.4484, lon: -112.0740, pop: 1680992, crime: 38.7, col: 106, school: 7.3, price: 425000, unemp: 3.9 },
  { name: 'Philadelphia', state: 'Pennsylvania', code: 'PA', lat: 39.9526, lon: -75.1652, pop: 1584064, crime: 43.1, col: 112, school: 6.8, price: 285000, unemp: 5.1 },
  { name: 'San Antonio', state: 'Texas', code: 'TX', lat: 29.4241, lon: -98.4936, pop: 1547253, crime: 39.4, col: 95, school: 7.2, price: 265000, unemp: 3.8 },
  { name: 'San Diego', state: 'California', code: 'CA', lat: 32.7157, lon: -117.1611, pop: 1423851, crime: 32.6, col: 152, school: 7.8, price: 825000, unemp: 4.2 },
  { name: 'Dallas', state: 'Texas', code: 'TX', lat: 32.7767, lon: -96.7970, pop: 1343573, crime: 40.2, col: 101, school: 7.4, price: 325000, unemp: 3.7 },
  { name: 'San Jose', state: 'California', code: 'CA', lat: 37.3382, lon: -121.8863, pop: 1021795, crime: 28.3, col: 174, school: 8.2, price: 1150000, unemp: 3.5 },
  { name: 'Austin', state: 'Texas', code: 'TX', lat: 30.2672, lon: -97.7431, pop: 978908, crime: 34.5, col: 119, school: 7.9, price: 550000, unemp: 3.2 },
  { name: 'Jacksonville', state: 'Florida', code: 'FL', lat: 30.3322, lon: -81.6557, pop: 949611, crime: 37.8, col: 98, school: 7.1, price: 310000, unemp: 3.9 },
  { name: 'Fort Worth', state: 'Texas', code: 'TX', lat: 32.7555, lon: -97.3308, pop: 935508, crime: 38.9, col: 97, school: 7.3, price: 295000, unemp: 3.6 },
  { name: 'Columbus', state: 'Ohio', code: 'OH', lat: 39.9612, lon: -82.9988, pop: 905748, crime: 36.2, col: 100, school: 7.5, price: 265000, unemp: 4.0 },
  { name: 'Charlotte', state: 'North Carolina', code: 'NC', lat: 35.2271, lon: -80.8431, pop: 885708, crime: 35.7, col: 103, school: 7.6, price: 345000, unemp: 3.8 },
  { name: 'San Francisco', state: 'California', code: 'CA', lat: 37.7749, lon: -122.4194, pop: 873965, crime: 44.2, col: 185, school: 7.4, price: 1350000, unemp: 4.5 },
  { name: 'Indianapolis', state: 'Indiana', code: 'IN', lat: 39.7684, lon: -86.1581, pop: 876384, crime: 39.5, col: 93, school: 7.2, price: 235000, unemp: 3.9 },
  { name: 'Seattle', state: 'Washington', code: 'WA', lat: 47.6062, lon: -122.3321, pop: 753675, crime: 52.3, col: 172, school: 7.9, price: 825000, unemp: 4.3 },
  { name: 'Denver', state: 'Colorado', code: 'CO', lat: 39.7392, lon: -104.9903, pop: 715522, crime: 46.8, col: 124, school: 7.7, price: 575000, unemp: 3.7 },
  { name: 'Boston', state: 'Massachusetts', code: 'MA', lat: 42.3601, lon: -71.0589, pop: 692600, crime: 32.1, col: 162, school: 8.1, price: 725000, unemp: 4.1 },
  { name: 'Portland', state: 'Oregon', code: 'OR', lat: 45.5152, lon: -122.6784, pop: 652503, crime: 49.5, col: 134, school: 7.6, price: 565000, unemp: 4.2 },
  { name: 'Nashville', state: 'Tennessee', code: 'TN', lat: 36.1627, lon: -86.7816, pop: 689447, crime: 42.7, col: 105, school: 7.4, price: 395000, unemp: 3.5 },
  { name: 'Minneapolis', state: 'Minnesota', code: 'MN', lat: 44.9778, lon: -93.2650, pop: 429954, crime: 47.2, col: 118, school: 7.8, price: 365000, unemp: 3.8 },
  { name: 'Atlanta', state: 'Georgia', code: 'GA', lat: 33.7490, lon: -84.3880, pop: 498715, crime: 50.3, col: 108, school: 6.9, price: 385000, unemp: 4.3 },
  { name: 'Miami', state: 'Florida', code: 'FL', lat: 25.7617, lon: -80.1918, pop: 467963, crime: 48.1, col: 123, school: 6.7, price: 495000, unemp: 4.6 },
  { name: 'Raleigh', state: 'North Carolina', code: 'NC', lat: 35.7796, lon: -78.6382, pop: 474069, crime: 29.5, col: 104, school: 8.0, price: 395000, unemp: 3.4 },
  { name: 'Tampa', state: 'Florida', code: 'FL', lat: 27.9506, lon: -82.4572, pop: 399700, crime: 38.4, col: 104, school: 7.1, price: 335000, unemp: 3.9 },
  { name: 'Omaha', state: 'Nebraska', code: 'NE', lat: 41.2565, lon: -95.9345, pop: 486051, crime: 33.8, col: 96, school: 7.6, price: 265000, unemp: 3.3 },
  { name: 'Arlington', state: 'Texas', code: 'TX', lat: 32.7357, lon: -97.1081, pop: 398121, crime: 36.2, col: 99, school: 7.3, price: 285000, unemp: 3.7 },
  { name: 'Virginia Beach', state: 'Virginia', code: 'VA', lat: 36.8529, lon: -75.9780, pop: 450435, crime: 26.4, col: 107, school: 7.7, price: 325000, unemp: 3.6 },
];

async function addCities() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Adding top US cities...\n');
    let added = 0;
    
    for (const city of topCities) {
      const [existing] = await connection.query(
        'SELECT id FROM cities WHERE city_name = ? AND state_code = ?',
        [city.name, city.code]
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
          city.name, city.state, city.code, city.lat, city.lon, city.pop,
          city.crime, city.col, city.school, city.price, city.unemp
        ]);
        console.log(`✓ Added ${city.name}, ${city.code}`);
        added++;
      }
    }
    
    console.log(`\nDone! Added ${added} cities.`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
}

addCities();
