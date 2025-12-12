import dotenv from 'dotenv';
import pool from '../config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error('Missing OPENAI_API_KEY environment variable.');
  process.exit(1);
}

async function removeDuplicateCities() {
  console.log('Checking for and removing duplicate cities...');
  try {
    const [rows] = await pool.query(`
      SELECT city_name, state_code, COUNT(*) as cnt, GROUP_CONCAT(id ORDER BY id) as ids
      FROM cities
      GROUP BY city_name, state_code
      HAVING cnt > 1
    `);

    const [idResult] = await pool.query(`SHOW KEYS FROM cities WHERE Key_name = 'PRIMARY'`);
    const pkColumn = idResult.length > 0 ? idResult[0].Column_name : 'id';
    console.log(`Detected primary key column: ${pkColumn}`);

    if (!rows || rows.length === 0) {
      console.log('No duplicates found.\n');
      return;
    }

    console.log(`Found ${rows.length} sets of duplicates:`);
    let totalRemoved = 0;

    for (const row of rows) {
      const idList = row.ids.split(',').map(id => parseInt(id, 10));
      const keepId = Math.min(...idList);
      const removeIds = idList.filter(id => id !== keepId);

      console.log(`  - ${row.city_name}, ${row.state_code}: ${row.cnt} entries (IDs: ${row.ids})`);

      if (removeIds.length > 0) {
        const placeholders = removeIds.map(() => '?').join(',');
        const deleteQuery = `DELETE FROM cities WHERE ${pkColumn} IN (${placeholders})`;
        const [delResult] = await pool.query(deleteQuery, removeIds);
        console.log(`    ✓ Removed ${delResult.affectedRows} duplicate(s)`);
        totalRemoved += delResult.affectedRows;
      }
    }

    console.log(`\nTotal duplicates removed: ${totalRemoved}\n`);
  } catch (err) {
    console.error('Error removing duplicates:', err.message);
  }
}

function generatePromptForCity(cityName, count = 30) {
  return `You are a data assistant. Produce ONLY a valid JSON object with NO explanation, NO markdown, NO extra text.

Output format (MUST be valid JSON):
{
  "suburbs": [...]
}

For each suburb include: city_name, state, state_code, latitude, longitude, population, crime_rate, cost_of_living_index, distance_from_major_city, nearest_major_city, school_rating, median_home_price.

Rules:
- Use ONLY double quotes for all strings
- NO single quotes
- NO newlines inside strings
- NO trailing commas
- ALL numbers must be numeric (not strings)
- crime_rate must be between 0 and 100
- suburbs: array of ${count} real suburbs/cities/neighborhoods near ${cityName}
- Include diverse areas: inner suburbs, outer suburbs, nearby cities
- Each suburb: nearest_major_city = "${cityName}", distance_from_major_city = integer miles
- Include the major city ${cityName} itself with distance_from_major_city = 0

Return ONLY valid JSON. START with { and END with }`;
}

async function callLLMForCity(cityName, count = 30) {
  console.log(`Generating ${count} cities for ${cityName}...`);
  await new Promise(resolve => setTimeout(resolve, 1000));

  const client = new OpenAI({ apiKey: API_KEY });
  const prompt = generatePromptForCity(cityName, count);

  const maxRetries = 2;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a data assistant that outputs only valid JSON. Ensure crime_rate values are between 0 and 100.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      });

      const rawText = response.choices[0].message.content;
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('LLM did not return JSON-like content.');
      }

      const jsonText = rawText.slice(firstBrace, lastBrace + 1);
      return JSON.parse(jsonText);
    } catch (err) {
      attempt++;
      if (err.status === 429 && attempt < maxRetries) {
        let waitTime = 15000;
        console.log(`  Rate limit. Waiting ${waitTime / 1000}s... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      console.error(`  Error for ${cityName}:`, err.message || err);
      if (attempt >= maxRetries) {
        return { suburbs: [] };
      }
    }
  }

  return { suburbs: [] };
}

async function upsertCity(city) {
  const { city_name, state, state_code, latitude, longitude, population, crime_rate, cost_of_living_index, distance_from_major_city, nearest_major_city, school_rating, median_home_price } = city;

  if (!city_name || !state_code) {
    throw new Error('City must have city_name and state_code');
  }

  // Ensure crime_rate is within valid range
  const validCrimeRate = crime_rate !== null && crime_rate !== undefined 
    ? Math.min(Math.max(parseFloat(crime_rate), 0), 100) 
    : null;

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

  const [result] = await pool.query(query, [
    city_name, state, state_code, latitude, longitude, population, 
    validCrimeRate, cost_of_living_index, distance_from_major_city, 
    nearest_major_city, school_rating, median_home_price
  ]);

  return { action: result.affectedRows === 1 ? 'inserted' : 'updated' };
}

(async () => {
  let inserted = 0, updated = 0;

  try {
    console.log('=== Adding More Chicago and Los Angeles Suburbs ===\n');

    // Process Chicago - 3 batches of 30 cities each
    for (let batch = 1; batch <= 3; batch++) {
      console.log(`\nChicago Batch ${batch}/3:`);
      const parsed = await callLLMForCity('Chicago', 30);
      const suburbs = (parsed.suburbs || []).filter(c => c && c.city_name);

      for (const city of suburbs) {
        try {
          const res = await upsertCity(city);
          if (res.action === 'inserted') inserted++; else updated++;
        } catch (err) {
          console.error(`  Failed: ${city?.city_name || '<unknown>'}`, err.message);
        }
      }
      console.log(`  Batch ${batch} done: +${suburbs.length} cities`);
    }

    // Process Los Angeles - 3 batches of 30 cities each
    for (let batch = 1; batch <= 3; batch++) {
      console.log(`\nLos Angeles Batch ${batch}/3:`);
      const parsed = await callLLMForCity('Los Angeles', 30);
      const suburbs = (parsed.suburbs || []).filter(c => c && c.city_name);

      for (const city of suburbs) {
        try {
          const res = await upsertCity(city);
          if (res.action === 'inserted') inserted++; else updated++;
        } catch (err) {
          console.error(`  Failed: ${city?.city_name || '<unknown>'}`, err.message);
        }
      }
      console.log(`  Batch ${batch} done: +${suburbs.length} cities`);
    }

    console.log('\n--- Removing duplicates ---');
    await removeDuplicateCities();

    console.log(`\n✅ Complete! Total Inserted: ${inserted}, Total Updated: ${updated}`);
    console.log('No duplicates in database.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
})();
