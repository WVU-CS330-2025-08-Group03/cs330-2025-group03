import dotenv from 'dotenv';
import pool from '../config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly point to the .env file in the `backend` directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// This script now uses the Gemini API to fetch and populate city data.
// It also ensures that the featured cities from the "Discover" page are present in the database.

const API_KEY = process.env.GEMINI_API_KEY;
const SKIP_API = process.env.SKIP_GEMINI_API === 'true'; // Add this flag
const USE_STATIC_PHILLY_SUBURBS = process.env.USE_STATIC_PHILLY_SUBURBS === 'true';

if (!API_KEY && !SKIP_API) {
  console.error('Missing GEMINI_API_KEY environment variable.');
  process.exit(1);
}

const majorCities = ['Philadelphia'];

const prompt = `You are a data assistant. Produce ONLY a valid JSON object with NO explanation, NO markdown, NO extra text.

Output format (MUST be valid JSON):
{
  "discoverCities": [],
  "suburbs": {
    "Philadelphia": [...]
  }
}

For each suburb include: city_name, state, state_code, latitude, longitude, population, crime_rate, cost_of_living_index, distance_from_major_city, nearest_major_city, school_rating, median_home_price.

Rules:
- Use ONLY double quotes for all strings
- NO single quotes
- NO newlines inside strings
- NO trailing commas
- ALL numbers must be numeric (not strings)
- suburbs["Philadelphia"]: array of 5-8 suburbs near Philadelphia
- Each suburb: nearest_major_city = "Philadelphia", distance_from_major_city = integer miles

Return ONLY valid JSON. START with { and END with }`;

// Helper to detect and filter out invalid names like "Philadelphia_suburb" or "Anytown Suburb"
function isInvalidCityName(cityName) {
  return typeof cityName === 'string' && /suburb/i.test(cityName.trim());
}

async function callLLM() {
  console.log('Sending prompt to LLM...');
  // Set initial wait to 10s
  await new Promise(resolve => setTimeout(resolve, 10000));

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
      });

      const rawText = response.text;
      console.log('Raw response length:', rawText.length);

      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('LLM did not return JSON-like content.');
      }

      const jsonText = rawText.slice(firstBrace, lastBrace + 1);
      return JSON.parse(jsonText);
    } catch (err) {
      attempt++;
      // If rate limited, honor suggested delay or fallback to static suburbs after retries
      if (err.status === 429 && attempt < maxRetries) {
        let waitTime = 10000; // 10s minimum
        const retryMatch = err.message?.match(/retry in ([\d.]+)s/i);
        if (retryMatch) {
          const suggestedWait = Math.ceil(parseFloat(retryMatch[1]) * 1000);
          waitTime = Math.max(waitTime, suggestedWait + 2000); // add 2s buffer
        }
        console.log(`Rate limit hit. Waiting ${waitTime / 1000} seconds before retry... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      console.error('LLM API error:', err);
      // On persistent failure or final attempt, fallback to static suburbs
      if (attempt >= maxRetries) {
        console.warn('Max retries reached or API error. Falling back to static Philadelphia suburbs.');
        return { discoverCities: [], suburbs: { Philadelphia: staticPhillySuburbs } };
      }
      throw new Error('Failed to call LLM: ' + err.message);
    }
  }

  // Should not reach here due to fallback
  return { discoverCities: [], suburbs: { Philadelphia: staticPhillySuburbs } };
}

async function upsertCity(city) {
  const { city_name, state, state_code, latitude, longitude, population, crime_rate, cost_of_living_index, distance_from_major_city, nearest_major_city, school_rating, median_home_price } = city;

  if (!city_name || !state_code) {
    throw new Error('City must have city_name and state_code');
  }

  const query = `
    INSERT INTO cities (city_name, state, state_code, latitude, longitude, population, crime_rate, cost_of_living_index, distance_from_major_city, nearest_major_city, school_rating, median_home_price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      state = VALUES(state),
      latitude = VALUES(latitude),
      longitude = VALUES(longitude),
      population = VALUES(population),
      crime_rate = VALUES(crime_rate),
      cost_of_living_index = VALUES(cost_of_living_index),
      distance_from_major_city = VALUES(distance_from_major_city),
      nearest_major_city = VALUES(nearest_major_city),
      school_rating = VALUES(school_rating),
      median_home_price = VALUES(median_home_price)
  `;

  const values = [city_name, state, state_code, latitude, longitude, population, crime_rate, cost_of_living_index, distance_from_major_city || null, nearest_major_city || null, school_rating, median_home_price];

  const [result] = await pool.query(query, values);

  return {
    action: result.affectedRows > 0 && result.insertId === 0 ? 'updated' : (result.affectedRows > 0 ? 'inserted' : 'no-change'),
    city_name,
    state_code
  };
}

async function removeDuplicateCities() {
  console.log('Checking for and removing duplicate cities...');
  
  try {
    // First, detect the primary key column name
    const [columns] = await pool.query(`SHOW COLUMNS FROM cities WHERE \`Key\` = 'PRI'`);
    const pkColumn = columns[0]?.Field || 'id';
    console.log(`Detected primary key column: ${pkColumn}`);

    // Find duplicates: cities with same city_name and state_code
    const [duplicates] = await pool.query(`
      SELECT city_name, state_code, COUNT(*) as count, GROUP_CONCAT(??) as ids
      FROM cities
      GROUP BY city_name, state_code
      HAVING count > 1
    `, [pkColumn]);

    if (duplicates.length === 0) {
      console.log('No duplicates found.');
      return 0;
    }

    console.log(`Found ${duplicates.length} sets of duplicates:`);
    let removedCount = 0;
    
    for (const dup of duplicates) {
      console.log(`  - ${dup.city_name}, ${dup.state_code}: ${dup.count} entries (IDs: ${dup.ids})`);
      
      const ids = dup.ids.split(',').map(id => parseInt(id));
      // Keep the first ID, remove the rest
      const idsToRemove = ids.slice(1);
      
      if (idsToRemove.length > 0) {
        await pool.query(`DELETE FROM cities WHERE ?? IN (?)`, [pkColumn, idsToRemove]);
        removedCount += idsToRemove.length;
        console.log(`    ✓ Removed ${idsToRemove.length} duplicate(s)`);
      }
    }

    console.log(`\nTotal duplicates removed: ${removedCount}`);
    return removedCount;
  } catch (err) {
    console.error('Error removing duplicates:', err.message);
    return 0;
  }
}

// Static fallback suburbs for Philadelphia (no API)
const staticPhillySuburbs = [
  {
    city_name: "King of Prussia",
    state: "Pennsylvania",
    state_code: "PA",
    latitude: 40.0893,
    longitude: -75.3960,
    population: 22606,
    crime_rate: 18.7,
    cost_of_living_index: 115.4,
    distance_from_major_city: 20,
    nearest_major_city: "Philadelphia",
    school_rating: 7.8,
    median_home_price: 520000
  },
  {
    city_name: "Conshohocken",
    state: "Pennsylvania",
    state_code: "PA",
    latitude: 40.0798,
    longitude: -75.3016,
    population: 9085,
    crime_rate: 15.2,
    cost_of_living_index: 118.1,
    distance_from_major_city: 15,
    nearest_major_city: "Philadelphia",
    school_rating: 7.5,
    median_home_price: 480000
  },
  {
    city_name: "Media",
    state: "Pennsylvania",
    state_code: "PA",
    latitude: 39.9170,
    longitude: -75.3877,
    population: 5348,
    crime_rate: 14.9,
    cost_of_living_index: 112.3,
    distance_from_major_city: 13,
    nearest_major_city: "Philadelphia",
    school_rating: 8.1,
    median_home_price: 490000
  },
  {
    city_name: "Havertown",
    state: "Pennsylvania",
    state_code: "PA",
    latitude: 39.9801,
    longitude: -75.3080,
    population: 36500,
    crime_rate: 12.4,
    cost_of_living_index: 116.2,
    distance_from_major_city: 9,
    nearest_major_city: "Philadelphia",
    school_rating: 8.4,
    median_home_price: 550000
  },
  {
    city_name: "Cherry Hill",
    state: "New Jersey",
    state_code: "NJ",
    latitude: 39.9340,
    longitude: -75.0300,
    population: 74879,
    crime_rate: 19.3,
    cost_of_living_index: 117.6,
    distance_from_major_city: 9,
    nearest_major_city: "Philadelphia",
    school_rating: 8.2,
    median_home_price: 470000
  },
  {
    city_name: "Ardmore",
    state: "Pennsylvania",
    state_code: "PA",
    latitude: 40.0060,
    longitude: -75.2857,
    population: 13626,
    crime_rate: 13.8,
    cost_of_living_index: 118.9,
    distance_from_major_city: 8,
    nearest_major_city: "Philadelphia",
    school_rating: 8.6,
    median_home_price: 600000
  }
];

async function listSuburbNamedCities() {
  console.log('Listing cities with "suburb" in their names...');
  try {
    const [rows] = await pool.query(`
      SELECT city_name, state, state_code
      FROM cities
      WHERE city_name LIKE '%suburb%' OR city_name LIKE '%Suburb%'
      ORDER BY state_code, city_name
    `);

    if (!rows || rows.length === 0) {
      console.log('No cities with "suburb" in the name found.');
      return;
    }

    console.log(`Found ${rows.length} city/cities with "suburb" in the name:`);
    for (const r of rows) {
      console.log(`  - ${r.city_name}, ${r.state} (${r.state_code})`);
    }
  } catch (err) {
    console.error('Error listing suburb-named cities:', err.message);
  }
}

(async () => {
  let inserted = 0, updated = 0;

  try {
    console.log('--- Step 0: Audit: cities with "suburb" in name ---');
    await listSuburbNamedCities();

    console.log('--- Step 0: Removing duplicate cities ---');
    await removeDuplicateCities();

    console.log('\n--- Step 1: Upserting featured cities from Discover page ---');
    const featuredCities = [
      { city_name: "Fremont", state: "California", state_code: "CA", latitude: 37.5483, longitude: -121.9886, population: 230504, crime_rate: 21.4, cost_of_living_index: 230.5, school_rating: 9, median_home_price: 1400000 },
      { city_name: "Overland Park", state: "Kansas", state_code: "KS", latitude: 38.9822, longitude: -94.6708, population: 197238, crime_rate: 18.2, cost_of_living_index: 105.1, school_rating: 8.5, median_home_price: 450000 },
      { city_name: "Plano", state: "Texas", state_code: "TX", latitude: 33.0198, longitude: -96.6989, population: 285494, crime_rate: 16.9, cost_of_living_index: 109.3, school_rating: 8, median_home_price: 500000 },
      { city_name: "Irvine", state: "California", state_code: "CA", latitude: 33.6846, longitude: -117.8265, population: 307670, crime_rate: 15.1, cost_of_living_index: 187.2, school_rating: 9.5, median_home_price: 1300000 },
      { city_name: "South Burlington", state: "Vermont", state_code: "VT", latitude: 44.4676, longitude: -73.1724, population: 20292, crime_rate: 12.5, cost_of_living_index: 118.7, school_rating: 8, median_home_price: 480000 },
      { city_name: "Boise", state: "Idaho", state_code: "ID", latitude: 43.6150, longitude: -116.2023, population: 235684, crime_rate: 28.3, cost_of_living_index: 106.5, school_rating: 7, median_home_price: 520000 },
      { city_name: "Gilbert", state: "Arizona", state_code: "AZ", latitude: 33.3528, longitude: -111.7890, population: 267918, crime_rate: 11.8, cost_of_living_index: 112.4, school_rating: 7.5, median_home_price: 580000 },
      { city_name: "Bismarck", state: "North Dakota", state_code: "ND", latitude: 46.8083, longitude: -100.7837, population: 73622, crime_rate: 25.9, cost_of_living_index: 98.2, school_rating: 6.5, median_home_price: 350000 }
    ];

    for (const city of featuredCities) {
      const res = await upsertCity(city);
      if (res.action === 'inserted') inserted++; else updated++;
    }
    console.log(`Featured cities upsert complete. Inserted: ${inserted}, Updated: ${updated}`);

    if (SKIP_API) {
      console.log('\n--- Step 2: SKIPPED (SKIP_GEMINI_API=true) ---');
      console.log('Only featured cities were inserted/updated.');
    } else if (USE_STATIC_PHILLY_SUBURBS) {
      console.log('\n--- Step 2: Using static Philadelphia suburbs (no API) ---');
      for (const city of staticPhillySuburbs) {
        try {
          const res = await upsertCity(city);
          if (res.action === 'inserted') inserted++; else updated++;
        } catch (err) {
          console.error('Failed upsert for', city?.city_name || '<unknown>', city?.state_code || city?.state || '<unknown>', err.message);
        }
      }
    } else {
      console.log('\n--- Step 2: Fetching and upserting suburbs of Philadelphia from Gemini API ---');
      const parsed = await callLLM();
      console.log('Parsed JSON OK. Beginning DB upserts...');
      
      const phillySuburbs = (parsed.suburbs?.Philadelphia || []).filter(c => {
        if (!c || !c.city_name) return false;
        return !isInvalidCityName(c.city_name);
      });

      if (phillySuburbs.length === 0) {
        console.log('No Philadelphia suburbs returned from API or fallback.');
      }

      for (const city of phillySuburbs) {
        try {
          const res = await upsertCity(city);
          if (res.action === 'inserted') inserted++; else updated++;
        } catch (err) {
          console.error('Failed upsert for', city?.city_name || '<unknown>', city?.state_code || city?.state || '<unknown>', err.message);
        }
      }
    }

    console.log(`\nUpsert complete. Total Inserted: ${inserted}, Total Updated: ${updated}`);
    process.exit(0);
  } catch (err) {
    console.error('Error during script execution:', err);
    process.exit(2);
  }
})();
