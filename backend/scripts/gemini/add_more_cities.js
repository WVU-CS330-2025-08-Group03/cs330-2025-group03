import pool from '../config/database.js';
import { GoogleGenAI } from '@google/genai';

/**
 * ADD MORE CITIES - Simple single-request approach
 * Adds additional cities to existing database (doesn't delete existing ones)
 */

async function generateMoreCities() {
  console.log('Generating additional cities using Gemini AI...\n');
  
  const ai = new GoogleGenAI({});

  const prompt = `
Generate a JSON array of 300 US cities that are NOT already common major cities.
Focus on:
- Mid-sized cities (30k-200k population) across ALL 50 states
- Suburban cities around major metros
- College towns and regional centers
- Cities in underrepresented states (Wyoming, Montana, Dakotas, Vermont, Maine, etc.)
- Additional Texas cities not yet covered
- Additional California, Florida, and other populous state cities
- Ensure good geographic distribution across all regions

For each city, provide this EXACT JSON structure:
{
  "city": "city name",
  "state": "full state name",
  "stateCode": "2-letter code",
  "lat": latitude as decimal number,
  "lng": longitude as decimal number,
  "population": population as integer,
  "crimeRate": crime per 1000 residents (15-65 range),
  "costOfLiving": index where 100=national average (85-180 range),
  "schoolRating": rating 1-10 (6.0-9.5 range),
  "medianHomePrice": median price in USD (150000-900000 range),
  "unemploymentRate": percentage (2.5-6.5 range)
}

Use realistic coordinates and demographics.
Return ONLY the JSON array. No markdown, no explanation, just pure JSON starting with [ and ending with ].`;

  try {
    console.log('Requesting city data from Gemini AI...');
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    let text = response.text;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    console.log('Parsing city data...');
    const cities = JSON.parse(text);
    
    console.log(`✓ Generated ${cities.length} new cities\n`);
    return cities;
    
  } catch (error) {
    console.error('Error generating cities:', error.message);
    throw error;
  }
}

async function addCitiesToDatabase(cities) {
  const connection = await pool.getConnection();
  
  try {
    // Check current count
    const [before] = await connection.query('SELECT COUNT(*) as total FROM cities');
    console.log(`Current database: ${before[0].total} cities\n`);
    
    console.log('Adding new cities to database...\n');
    let insertedCount = 0;
    let skippedCount = 0;

    for (const city of cities) {
      try {
        if (!city.city || !city.state || !city.lat || !city.lng) {
          continue;
        }

        // Check if city already exists
        const [existing] = await connection.query(
          'SELECT id FROM cities WHERE city_name = ? AND state_code = ?',
          [city.city, city.stateCode]
        );
        
        if (existing.length > 0) {
          skippedCount++;
          continue;
        }

        const sql = `
          INSERT INTO cities (
            city_name, state, state_code, latitude, longitude, population,
            crime_rate, cost_of_living_index, school_rating, 
            median_home_price, unemployment_rate
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
          city.city,
          city.state,
          city.stateCode,
          parseFloat(city.lat),
          parseFloat(city.lng),
          parseInt(city.population) || 0,
          parseFloat(city.crimeRate) || 30.0,
          parseFloat(city.costOfLiving) || 100,
          parseFloat(city.schoolRating) || 7.0,
          parseInt(city.medianHomePrice) || 350000,
          parseFloat(city.unemploymentRate) || 3.5,
        ];
        
        await connection.query(sql, params);
        insertedCount++;
        
        if (insertedCount % 25 === 0) {
          console.log(`  ✓ Added ${insertedCount} new cities...`);
        }
      } catch (err) {
        console.error(`  ❌ Error inserting ${city.city}: ${err.message}`);
      }
    }
    
    // Check final count
    const [after] = await connection.query('SELECT COUNT(*) as total FROM cities');
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✓ Added ${insertedCount} new cities (${skippedCount} duplicates skipped)`);
    console.log(`✓ Total cities in database: ${after[0].total}`);
    console.log('='.repeat(60));
    
    // Show distribution
    const [states] = await connection.query(
      'SELECT state_code, COUNT(*) as count FROM cities GROUP BY state_code ORDER BY count DESC LIMIT 20'
    );
    console.log(`\n🗺️  Top 20 States by City Count:`);
    states.forEach(s => console.log(`  ${s.state_code}: ${s.count} cities`));
    
  } catch (error) {
    console.error('\n❌ Database error:', error.message);
  } finally {
    connection.release();
  }
}

async function run() {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(60));
  console.log('  ADD MORE US CITIES');
  console.log('  Expanding your city database');
  console.log('='.repeat(60) + '\n');

  try {
    const cities = await generateMoreCities();
    
    if (!cities || cities.length === 0) {
      console.log('❌ No cities generated. Exiting.');
      return;
    }

    await addCitiesToDatabase(cities);
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n⏱️  Total time: ${elapsed} seconds`);
    console.log('\n✨ Database expanded successfully!\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    pool.end();
    console.log('✓ Database connection closed.\n');
  }
}

run();
