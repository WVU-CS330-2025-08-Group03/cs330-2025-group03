import pool from '../config/database.js';
import { GoogleGenAI } from '@google/genai';

/**
 * GEMINI-ONLY VERSION
 * Uses 100% Gemini AI to generate complete city database
 * No external APIs needed!
 */

async function generateCitiesWithGemini() {
  console.log('Generating complete city database using Gemini AI...\n');

  // The client gets the API key from the environment variable GEMINI_API_KEY
  const ai = new GoogleGenAI({});

  const prompt = `
Generate a JSON array of 500 US cities with complete realistic data. Include:
- ALL major metropolitan areas (NYC, LA, Chicago, Houston, Phoenix, Philadelphia, San Antonio, San Diego, Dallas, Austin, etc.)
- ALL state capitals
- Major suburbs and satellite cities around each major metro
- Mid-sized cities (50k-500k population) across ALL 50 states
- Include diverse geographic distribution: Northeast, Southeast, Midwest, Southwest, West Coast, Mountain states
- Texas cities: Austin area (Round Rock, Cedar Park, Georgetown, Pflugerville, Kyle, Buda, San Marcos, Leander), Houston area, Dallas area, San Antonio area
- California cities: LA area, San Francisco Bay Area, San Diego area, Sacramento area
- Florida cities: Miami area, Orlando area, Tampa area, Jacksonville area
- And similar coverage for all major metros nationwide

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
  "medianHomePrice": median price in USD (200000-1200000 range),
  "unemploymentRate": percentage (2.5-6.5 range)
}

Use realistic coordinates, populations, and demographics based on actual city data.
Return ONLY the JSON array. No markdown formatting, no code blocks, no explanation. Just pure JSON starting with [ and ending with ].`;

  try {
    console.log('Requesting city data from Gemini AI...');
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    let text = response.text;
    
    // Clean the response
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    console.log('Parsing city data...');
    const cities = JSON.parse(text);
    
    console.log(`✓ Generated ${cities.length} cities with complete data\n`);
    return cities;
    
  } catch (error) {
    console.error('Error generating cities:', error.message);
    throw error;
  }
}

async function populateDatabase(cities) {
  const connection = await pool.getConnection();
  
  try {
    console.log('Clearing existing cities from database...');
    await connection.query('DELETE FROM cities');
    console.log('✓ Database cleared\n');

    console.log('Inserting cities into database...\n');
    let insertedCount = 0;

    for (const city of cities) {
      try {
        if (!city.city || !city.state || !city.lat || !city.lng) {
          console.log(`⚠ Skipping incomplete city data`);
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
          console.log(`  ✓ Inserted ${insertedCount} cities...`);
        }
      } catch (err) {
        console.error(`  ❌ Error inserting ${city.city}: ${err.message}`);
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✓ Successfully inserted ${insertedCount} cities!`);
    console.log('='.repeat(60));
    
    // Show Texas cities
    const [sample] = await connection.query(
      'SELECT city_name, state_code FROM cities WHERE state_code = "TX" ORDER BY city_name'
    );
    console.log(`\n🤠 Texas cities (${sample.length}):`);
    console.log(sample.map(c => c.city_name).join(', '));
    
  } catch (error) {
    console.error('\n❌ Database error:', error.message);
  } finally {
    connection.release();
  }
}

async function run() {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(60));
  console.log('  GEMINI AI CITY DATABASE GENERATOR');
  console.log('  100% AI-Generated City Data');
  console.log('='.repeat(60) + '\n');

  try {
    // Generate all city data with Gemini
    const cities = await generateCitiesWithGemini();
    
    if (!cities || cities.length === 0) {
      console.log('❌ No cities generated. Exiting.');
      return;
    }

    // Populate database
    await populateDatabase(cities);
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n⏱️  Total time: ${elapsed} seconds`);
    console.log('\n✨ Your city search is now ready with comprehensive data!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    pool.end();
    console.log('✓ Database connection closed.\n');
  }
}

run();
