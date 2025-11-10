import pool from '../config/database.js';
import { GoogleGenAI } from '@google/genai';

/**
 * ADD DC AND NYC AREA CITIES
 * Deep coverage of Washington DC and New York City metropolitan areas
 */

async function generateDCandNYCCities() {
  console.log('Generating comprehensive DC and NYC metro area cities using Gemini AI...\n');
  
  const ai = new GoogleGenAI({});

  const prompt = `
Generate a JSON array of exactly 200 US cities with complete realistic data.
Focus ONLY on these two metropolitan areas with DEEP suburb coverage:

1. Washington DC Metro Area (100 cities) - Include ALL of these and more:
   
   DISTRICT OF COLUMBIA:
   - Washington DC
   
   VIRGINIA (Northern Virginia):
   - Arlington, Alexandria, Fairfax, Falls Church, Manassas, Manassas Park
   - Reston, Herndon, Vienna, Tysons, McLean, Great Falls, Oakton
   - Springfield, Annandale, Burke, Lorton, Woodbridge, Dale City, Lake Ridge
   - Centreville, Chantilly, Clifton, Fairfax Station, Newington
   - Leesburg, Ashburn, Sterling, Dulles, Purcellville, Middleburg
   - Fredericksburg, Stafford, Dumfries, Triangle, Quantico
   - Fort Belvoir, Mount Vernon, Franconia, Kingstowne, Huntington
   - Lincolnia, Merrifield, Dunn Loring, West Falls Church
   
   MARYLAND:
   - Bethesda, Chevy Chase, Silver Spring, Takoma Park, Kensington
   - Rockville, Gaithersburg, Germantown, Damascus, Clarksburg
   - College Park, Hyattsville, Riverdale, Beltsville, Greenbelt
   - Laurel, Bowie, Crofton, Odenton, Severn, Glen Burnie
   - Frederick, Urbana, Walkersville, Brunswick, Middletown
   - Columbia, Ellicott City, Catonsville, Towson, Dundalk, Essex
   - Annapolis, Severna Park, Arnold, Pasadena
   - Wheaton, Aspen Hill, Olney, Burtonsville, Calverton
   - Potomac, North Potomac, Gaithersburg, Montgomery Village
   - Fort Washington, Oxon Hill, Temple Hills, Suitland, Camp Springs

2. New York City Metro Area (100 cities) - Include ALL of these and more:
   
   NEW YORK CITY PROPER:
   - Manhattan, Brooklyn, Queens, Bronx, Staten Island
   
   WESTCHESTER COUNTY, NY:
   - Yonkers, New Rochelle, Mount Vernon, White Plains, Port Chester
   - Scarsdale, Mamaroneck, Larchmont, Rye, Harrison, Pelham
   - Ossining, Peekskill, Tarrytown, Sleepy Hollow, Dobbs Ferry
   - Hastings-on-Hudson, Ardsley, Irvington, Croton-on-Hudson
   - Greenburgh, Eastchester, Tuckahoe, Bronxville
   
   LONG ISLAND, NY:
   - Hempstead, Levittown, Hicksville, Plainview, Bethpage
   - Freeport, Rockville Centre, Oceanside, Baldwin, Merrick
   - Massapequa, Wantagh, Seaford, Bellmore, East Meadow
   - Valley Stream, Lynbrook, Malverne, Garden City, Mineola
   - Huntington, Commack, Dix Hills, Melville, Northport
   - Smithtown, Hauppauge, Nesconset, St. James, Kings Park
   - Brookhaven, Centereach, Selden, Port Jefferson, Patchogue
   - Islip, Bay Shore, Brentwood, Central Islip, West Islip
   - Babylon, West Babylon, Lindenhurst, Copiague, Amityville
   
   NEW JERSEY:
   - Newark, Jersey City, Paterson, Elizabeth, Edison, Woodbridge
   - Trenton, Princeton, Ewing, Hamilton, Lawrenceville
   - Hoboken, Weehawken, Union City, West New York, North Bergen
   - Fort Lee, Englewood, Teaneck, Hackensack, Paramus, Fair Lawn
   - Passaic, Clifton, Wayne, Montclair, Bloomfield, Nutley
   - Parsippany, Morristown, Madison, Chatham, Florham Park
   - New Brunswick, Perth Amboy, Carteret, Woodbridge, Metuchen
   - Lakewood, Toms River, Brick, Point Pleasant, Jackson
   
   CONNECTICUT (NYC commuter towns):
   - Stamford, Norwalk, Bridgeport, New Haven, Fairfield
   - Greenwich, Darien, Westport, Wilton, Weston
   - Danbury, Newtown, Bethel, Ridgefield, Redding

For each city, provide this EXACT JSON structure:
{
  "city": "city name",
  "state": "full state name",
  "stateCode": "2-letter code",
  "lat": latitude as decimal number,
  "lng": longitude as decimal number,
  "population": population as integer,
  "crimeRate": crime per 1000 residents (15-75 range),
  "costOfLiving": index where 100=national average (120-200 range for DC/NYC),
  "schoolRating": rating 1-10 (6.0-9.5 range),
  "medianHomePrice": median price in USD (400000-2500000 range),
  "unemploymentRate": percentage (2.5-6.0 range)
}

Use realistic coordinates, populations, and demographics. DC and NYC areas are expensive!
Return ONLY the JSON array. No markdown, no explanation, just pure JSON starting with [ and ending with ].`;

  try {
    console.log('Requesting DC and NYC metro city data from Gemini AI...');
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    let text = response.text;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const cities = JSON.parse(text);
    console.log(`✓ Generated ${cities.length} DC and NYC metro cities\n`);
    
    return cities;
    
  } catch (error) {
    console.error('Error generating cities:', error.message);
    throw error;
  }
}

async function addCitiesToDatabase(cities) {
  const connection = await pool.getConnection();
  
  try {
    const [countBefore] = await connection.query('SELECT COUNT(*) as total FROM cities');
    console.log(`Current cities in database: ${countBefore[0].total}\n`);

    console.log('Adding DC and NYC metro cities to database...\n');
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
          parseFloat(city.costOfLiving) || 150,
          parseFloat(city.schoolRating) || 7.5,
          parseInt(city.medianHomePrice) || 750000,
          parseFloat(city.unemploymentRate) || 3.5,
        ];
        
        await connection.query(sql, params);
        addedCount++;
        
        if (addedCount % 25 === 0) {
          console.log(`  ✓ Added ${addedCount} new cities...`);
        }
      } catch (err) {
        console.error(`  ❌ Error inserting ${city.city}: ${err.message}`);
      }
    }
    
    const [countAfter] = await connection.query('SELECT COUNT(*) as total FROM cities');
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✓ Successfully added ${addedCount} new cities!`);
    console.log(`⊘ Skipped ${skippedCount} duplicates`);
    console.log(`📊 Total cities now in database: ${countAfter[0].total}`);
    console.log('='.repeat(60));
    
    // Show detailed metro area counts
    console.log(`\n🏛️  Washington DC Metro Area:`);
    const [dc] = await connection.query('SELECT COUNT(*) as count FROM cities WHERE state_code = "DC"');
    const [va] = await connection.query('SELECT COUNT(*) as count FROM cities WHERE state_code = "VA"');
    const [md] = await connection.query('SELECT COUNT(*) as count FROM cities WHERE state_code = "MD"');
    console.log(`  DC: ${dc[0].count} cities`);
    console.log(`  Virginia: ${va[0].count} cities`);
    console.log(`  Maryland: ${md[0].count} cities`);
    console.log(`  Total DC Metro: ${dc[0].count + va[0].count + md[0].count} cities`);
    
    console.log(`\n🗽 New York City Metro Area:`);
    const [ny] = await connection.query('SELECT COUNT(*) as count FROM cities WHERE state_code = "NY"');
    const [nj] = await connection.query('SELECT COUNT(*) as count FROM cities WHERE state_code = "NJ"');
    const [ct] = await connection.query('SELECT COUNT(*) as count FROM cities WHERE state_code = "CT"');
    console.log(`  New York: ${ny[0].count} cities`);
    console.log(`  New Jersey: ${nj[0].count} cities`);
    console.log(`  Connecticut: ${ct[0].count} cities`);
    console.log(`  Total NYC Metro: ${ny[0].count + nj[0].count + ct[0].count} cities`);
    
  } catch (error) {
    console.error('\n❌ Database error:', error.message);
  } finally {
    connection.release();
  }
}

async function run() {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(60));
  console.log('  ADD DC & NYC METRO AREA CITIES');
  console.log('  Deep Metropolitan Coverage');
  console.log('='.repeat(60) + '\n');

  try {
    const cities = await generateDCandNYCCities();
    
    if (!cities || cities.length === 0) {
      console.log('❌ No cities generated. Exiting.');
      return;
    }

    await addCitiesToDatabase(cities);
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n⏱️  Total time: ${elapsed} seconds`);
    console.log('\n✨ DC and NYC metro areas expanded successfully!\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    pool.end();
    console.log('✓ Database connection closed.\n');
  }
}

run();
