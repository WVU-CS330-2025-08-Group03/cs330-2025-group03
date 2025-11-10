import pool from '../config/database.js';
import { GoogleGenAI } from '@google/genai';

/**
 * ADD METRO AREA CITIES
 * Specifically for DC, NYC, and LA metropolitan areas
 */

async function generateMetroCities() {
  console.log('Generating DC, NYC, and LA metro area cities using Gemini AI...\n');
  
  const ai = new GoogleGenAI({});

  const prompt = `
Generate a JSON array of exactly 150 US cities with complete realistic data.
Focus ONLY on these three metropolitan areas and their suburbs:

1. Washington DC Metro Area (50 cities):
   - DC proper
   - Northern Virginia: Arlington, Alexandria, Fairfax, Reston, Tysons, McLean, Vienna, Falls Church, Annandale, Springfield, Woodbridge, Manassas, Leesburg, Ashburn, Sterling, Herndon, Centreville, Burke, Lorton, Dale City, Lake Ridge, Linton Hall, Gainesville
   - Maryland: Bethesda, Silver Spring, Rockville, Gaithersburg, Frederick, College Park, Bowie, Hyattsville, Laurel, Greenbelt, Takoma Park, Wheaton, Germantown, Potomac, Olney, Columbia, Ellicott City, Towson, Annapolis

2. New York City Metro Area (50 cities):
   - NYC boroughs: Manhattan, Brooklyn, Queens, Bronx, Staten Island
   - Long Island: Hempstead, Levittown, Hicksville, Freeport, Valley Stream, Brentwood, Huntington, Smithtown, Brookhaven, Islip, Babylon, Massapequa, Commack, West Babylon
   - Westchester: Yonkers, New Rochelle, Mount Vernon, White Plains, Port Chester, Scarsdale, Rye
   - New Jersey: Newark, Jersey City, Paterson, Elizabeth, Edison, Woodbridge, Lakewood, Toms River, Trenton, Princeton, Hoboken, Parsippany, Wayne, Union City, West New York
   - Connecticut: Bridgeport, New Haven, Stamford, Norwalk, Danbury, Waterbury

3. Los Angeles Metro Area (50 cities):
   - LA proper
   - LA County: Long Beach, Glendale, Santa Clarita, Pasadena, Torrance, Pomona, Lancaster, Palmdale, Burbank, Inglewood, Downey, Norwalk, West Covina, Whittier, Hawthorne, Alhambra, Lakewood, Carson, Compton, El Monte, Redondo Beach, Arcadia, Santa Monica, Beverly Hills, Culver City, Manhattan Beach, Redlands
   - Orange County: Anaheim, Santa Ana, Irvine, Huntington Beach, Garden Grove, Orange, Fullerton, Costa Mesa, Mission Viejo, Westminster, Newport Beach, Buena Park, Lake Forest, Tustin, Yorba Linda, Laguna Niguel
   - Inland Empire: Riverside, San Bernardino, Ontario, Corona, Rancho Cucamonga, Moreno Valley, Fontana, Chino, Upland

For each city, provide this EXACT JSON structure:
{
  "city": "city name",
  "state": "full state name",
  "stateCode": "2-letter code",
  "lat": latitude as decimal number,
  "lng": longitude as decimal number,
  "population": population as integer,
  "crimeRate": crime per 1000 residents (15-65 range),
  "costOfLiving": index where 100=national average (110-200 range for these expensive metros),
  "schoolRating": rating 1-10 (6.0-9.5 range),
  "medianHomePrice": median price in USD (300000-2000000 range for these areas),
  "unemploymentRate": percentage (2.5-6.5 range)
}

Use realistic coordinates, populations, and demographics for these expensive metropolitan areas.
Return ONLY the JSON array. No markdown, no explanation, just pure JSON starting with [ and ending with ].`;

  try {
    console.log('Requesting metro area city data from Gemini AI...');
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    let text = response.text;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const cities = JSON.parse(text);
    console.log(`✓ Generated ${cities.length} metro area cities\n`);
    
    return cities;
    
  } catch (error) {
    console.error('Error generating cities:', error.message);
    throw error;
  }
}

async function addCitiesToDatabase(cities) {
  const connection = await pool.getConnection();
  
  try {
    // Get current count
    const [countBefore] = await connection.query('SELECT COUNT(*) as total FROM cities');
    console.log(`Current cities in database: ${countBefore[0].total}\n`);

    console.log('Adding metro area cities to database...\n');
    let addedCount = 0;
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
          parseFloat(city.crimeRate) || 35.0,
          parseFloat(city.costOfLiving) || 140,
          parseFloat(city.schoolRating) || 7.5,
          parseInt(city.medianHomePrice) || 650000,
          parseFloat(city.unemploymentRate) || 3.5,
        ];
        
        await connection.query(sql, params);
        addedCount++;
        
        if (addedCount % 20 === 0) {
          console.log(`  ✓ Added ${addedCount} new cities...`);
        }
      } catch (err) {
        console.error(`  ❌ Error inserting ${city.city}: ${err.message}`);
      }
    }
    
    const [countAfter] = await connection.query('SELECT COUNT(*) as total FROM cities');
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✓ Successfully added ${addedCount} new metro cities!`);
    console.log(`⊘ Skipped ${skippedCount} duplicates`);
    console.log(`📊 Total cities now in database: ${countAfter[0].total}`);
    console.log('='.repeat(60));
    
    // Show metro area counts
    console.log(`\n🏙️  Metro Area Breakdown:`);
    
    const [dc] = await connection.query(
      'SELECT COUNT(*) as count FROM cities WHERE state_code IN ("DC", "VA", "MD")'
    );
    console.log(`  DC Metro (DC, VA, MD): ${dc[0].count} cities`);
    
    const [ny] = await connection.query(
      'SELECT COUNT(*) as count FROM cities WHERE state_code IN ("NY", "NJ", "CT")'
    );
    console.log(`  NYC Metro (NY, NJ, CT): ${ny[0].count} cities`);
    
    const [la] = await connection.query(
      'SELECT COUNT(*) as count FROM cities WHERE state_code = "CA"'
    );
    console.log(`  LA Metro & California: ${la[0].count} cities`);
    
  } catch (error) {
    console.error('\n❌ Database error:', error.message);
  } finally {
    connection.release();
  }
}

async function run() {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(60));
  console.log('  ADD DC, NYC, & LA METRO AREA CITIES');
  console.log('  Focused Metropolitan Coverage');
  console.log('='.repeat(60) + '\n');

  try {
    const cities = await generateMetroCities();
    
    if (!cities || cities.length === 0) {
      console.log('❌ No cities generated. Exiting.');
      return;
    }

    await addCitiesToDatabase(cities);
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n⏱️  Total time: ${elapsed} seconds`);
    console.log('\n✨ Metro areas added successfully!\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    pool.end();
    console.log('✓ Database connection closed.\n');
  }
}

run();
