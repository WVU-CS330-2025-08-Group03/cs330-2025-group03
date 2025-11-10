import pool from '../config/database.js';
import { GoogleGenAI } from '@google/genai';

/**
 * COMPREHENSIVE US CITIES GENERATOR
 * Makes multiple Gemini requests to build a large city database
 */

async function generateCitiesBatch(ai, batchNumber, focus) {
  const prompt = `
Generate a JSON array of exactly 100 US cities with complete realistic data.
Focus on: ${focus}

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

Use realistic coordinates, populations, and demographics.
Return ONLY the JSON array. No markdown, no explanation, just pure JSON starting with [ and ending with ].`;

  try {
    console.log(`\nBatch ${batchNumber}: ${focus}`);
    console.log('Requesting...');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    let text = response.text;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const cities = JSON.parse(text);
    console.log(`✓ Generated ${cities.length} cities`);
    
    return cities;
    
  } catch (error) {
    console.error(`❌ Batch ${batchNumber} failed: ${error.message}`);
    return [];
  }
}

async function generateAllCities() {
  console.log('Generating comprehensive US city database using Gemini AI...\n');
  
  const ai = new GoogleGenAI({});
  const allCities = [];
  
  const batches = [
    'Major metros: NYC, LA, Chicago, Houston, Phoenix, Philadelphia, San Antonio, San Diego, Dallas, San Jose, Austin, Jacksonville, Fort Worth, Columbus, Charlotte and their suburbs',
    'Texas cities: All cities around Austin, Houston, Dallas, San Antonio, Fort Worth, El Paso, Arlington, Corpus Christi, Plano, Laredo areas',
    'California cities: SF Bay Area, LA metro, San Diego area, Sacramento, Fresno, Long Beach, Oakland, Bakersfield, Anaheim, Riverside and suburbs',
    'Florida & Southeast: Miami, Orlando, Tampa, Atlanta, Nashville, Memphis, Louisville, Birmingham, New Orleans and their metro areas',
    'Northeast: Boston, Philadelphia, NYC suburbs, Pittsburgh, Baltimore, DC metro, Providence, Hartford, Buffalo, Rochester areas',
    'Midwest: Chicago suburbs, Detroit metro, Milwaukee, Minneapolis, St. Louis, Kansas City, Cleveland, Cincinnati, Indianapolis areas',
    'Pacific Northwest & Mountain: Seattle, Portland, Denver, Salt Lake City, Boise, Spokane, Tacoma, Aurora, Mesa and their suburbs',
    'Southwest & Desert: Phoenix metro, Las Vegas, Albuquerque, Tucson, El Paso, Reno, Colorado Springs, Scottsdale areas',
    'Mid-sized cities nationwide: Cities with population 50k-200k across all states, good geographic distribution',
    'State capitals and regional hubs: All US state capitals and important regional centers not yet covered',
  ];
  
  for (let i = 0; i < batches.length; i++) {
    const cities = await generateCitiesBatch(ai, i + 1, batches[i]);
    allCities.push(...cities);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n✓ Total cities generated: ${allCities.length}`);
  return allCities;
}

async function populateDatabase(cities) {
  const connection = await pool.getConnection();
  
  try {
    console.log('\nClearing existing cities from database...');
    await connection.query('DELETE FROM cities');
    console.log('✓ Database cleared\n');

    console.log('Inserting cities into database...\n');
    let insertedCount = 0;
    const seen = new Set();

    for (const city of cities) {
      try {
        if (!city.city || !city.state || !city.lat || !city.lng) {
          continue;
        }

        // Avoid duplicates
        const key = `${city.city}-${city.stateCode}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

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
        
        if (insertedCount % 50 === 0) {
          console.log(`  ✓ Inserted ${insertedCount} cities...`);
        }
      } catch (err) {
        console.error(`  ❌ Error inserting ${city.city}: ${err.message}`);
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✓ Successfully inserted ${insertedCount} unique cities!`);
    console.log('='.repeat(60));
    
    // Show summary by state
    const [states] = await connection.query(
      'SELECT state_code, COUNT(*) as count FROM cities GROUP BY state_code ORDER BY count DESC LIMIT 15'
    );
    console.log(`\n🗺️  Top 15 States by City Count:`);
    states.forEach(s => console.log(`  ${s.state_code}: ${s.count} cities`));
    
    // Show Texas cities
    const [texas] = await connection.query(
      'SELECT city_name FROM cities WHERE state_code = "TX" ORDER BY city_name'
    );
    console.log(`\n🤠 Texas cities (${texas.length}):`);
    console.log(texas.map(c => c.city_name).join(', '));
    
  } catch (error) {
    console.error('\n❌ Database error:', error.message);
  } finally {
    connection.release();
  }
}

async function run() {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(60));
  console.log('  COMPREHENSIVE US CITIES DATABASE GENERATOR');
  console.log('  Multi-Batch Gemini AI Approach');
  console.log('='.repeat(60) + '\n');

  try {
    const cities = await generateAllCities();
    
    if (!cities || cities.length === 0) {
      console.log('❌ No cities generated. Exiting.');
      return;
    }

    await populateDatabase(cities);
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n⏱️  Total time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
    console.log('\n✨ Comprehensive US city database ready!\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    pool.end();
    console.log('✓ Database connection closed.\n');
  }
}

run();
