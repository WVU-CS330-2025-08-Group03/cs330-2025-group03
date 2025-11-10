import pool from '../config/database.js';

async function checkCities() {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as total FROM cities');
    console.log(`\n📊 Total cities in database: ${rows[0].total}`);
    
    if (rows[0].total > 0) {
      const [sample] = await pool.query('SELECT city_name, state_code, population, crime_rate, cost_of_living_index, school_rating, median_home_price FROM cities ORDER BY id DESC LIMIT 5');
      console.log('\n🏙️  Latest 5 cities added:');
      sample.forEach((city, i) => {
        console.log(`\n${i + 1}. ${city.city_name}, ${city.state_code}`);
        console.log(`   Population: ${city.population.toLocaleString()}`);
        console.log(`   Crime Rate: ${city.crime_rate}`);
        console.log(`   Cost of Living: ${city.cost_of_living_index}`);
        console.log(`   School Rating: ${city.school_rating}`);
        console.log(`   Median Home Price: $${city.median_home_price?.toLocaleString()}`);
      });
      
      // Check for Austin area cities
      const [texas] = await pool.query('SELECT city_name FROM cities WHERE state_code = "TX" ORDER BY city_name');
      console.log(`\n🤠 Texas cities in database (${texas.length}):`);
      console.log(texas.map(c => c.city_name).join(', '));
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

checkCities();
