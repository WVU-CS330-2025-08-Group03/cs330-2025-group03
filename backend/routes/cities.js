import express from 'express';
import pool from '../config/database.js';

const levenshtein = (s1, s2) => {
  if (s1.length < s2.length) return levenshtein(s2, s1);
  if (s2.length === 0) return s1.length;

  let previousRow = Array.from({ length: s2.length + 1 }, (_, i) => i);
  for (let i = 0; i < s1.length; i++) {
    let currentRow = [i + 1];
    for (let j = 0; j < s2.length; j++) {
      let insertions = previousRow[j + 1] + 1;
      let deletions = currentRow[j] + 1;
      let substitutions = previousRow[j] + (s1[i] !== s2[j]);
      currentRow.push(Math.min(insertions, deletions, substitutions));
    }
    previousRow = currentRow;
  }
  return previousRow[previousRow.length - 1];
};

// Function to get city suggestions based on string similarity
const getSimilarCitySuggestions = async (typedCityName) => {
  const [allCities] = await pool.query('SELECT id, city_name, state_code FROM cities');
  const suggestions = allCities
    .map(city => ({
      ...city,
      distance: levenshtein(typedCityName.toLowerCase(), city.city_name.toLowerCase())
    }))
    .filter(city => city.distance > 0 && city.distance <= 3) // Threshold for similarity
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3); // Return top 3 suggestions
  return suggestions;
};

const router = express.Router();

// Get all cities with optional filters
router.get('/search', async (req, res) => {
  try {
    const {
      city_name,
      min_population,
      max_population,
      max_crime_rate,
      max_cost_of_living,
      min_school_rating,
      max_distance,
      state,
      state_code // Used to identify which major city when multiple cities have the same name
    } = req.query;

    let majorCityLat = null;
    let majorCityLon = null;

    // Check if this is a distance-based search or exact city search
    const isDistanceSearch = max_distance && parseInt(max_distance) > 0;
    
    // Major city filter - find the major city's coordinates first (only for distance searches)
    if (city_name && isDistanceSearch) {
      let majorCityQuery = 'SELECT latitude, longitude FROM cities WHERE city_name = ?';
      let majorCityParams = [city_name];
      
      // Use state_code if provided (for distance searches), otherwise use state (handles duplicate city names)
      const stateFilter = state_code || state;
      if (stateFilter) {
        majorCityQuery += ' AND state_code = ?';
        majorCityParams.push(stateFilter);
      }
      majorCityQuery += ' LIMIT 1';
      
      const [majorCityData] = await pool.query(majorCityQuery, majorCityParams);
      
      if (majorCityData.length > 0) {
        majorCityLat = parseFloat(majorCityData[0].latitude);
        majorCityLon = parseFloat(majorCityData[0].longitude);
      }
    }

    // Build query with distance calculation if major city is selected AND distance is specified
    let query;
    let selectParams = [];
    let whereParams = [];
    
    if (majorCityLat !== null && majorCityLon !== null && isDistanceSearch) {
      // Query with distance calculation
      query = `SELECT DISTINCT cities.id, cities.city_name, cities.state, cities.state_code, 
               cities.latitude, cities.longitude, cities.population, cities.crime_rate,
               cities.cost_of_living_index, cities.distance_from_major_city, 
               cities.nearest_major_city, cities.school_rating, cities.median_home_price,
               cities.unemployment_rate, (
        3959 * acos(
          cos(radians(?)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians(?)) + 
          sin(radians(?)) * sin(radians(latitude))
        )
      ) AS distance_from_selected_city FROM cities WHERE 1=1`;
      
      selectParams = [majorCityLat, majorCityLon, majorCityLat];
      
      // Exclude the major city itself
      query += ' AND city_name != ?';
      whereParams.push(city_name);
    } else {
      query = 'SELECT DISTINCT * FROM cities WHERE 1=1';
      
      // For exact city search (city name without distance), add city and state filters
      if (city_name && !isDistanceSearch) {
        query += ' AND city_name = ?';
        whereParams.push(city_name);
        if (state) {
          query += ' AND state_code = ?';
          whereParams.push(state.toUpperCase());
        }
      }
    }

    // Population filter
    if (min_population) {
      query += ' AND population >= ?';
      whereParams.push(parseInt(min_population));
    }
    if (max_population) {
      query += ' AND population <= ?';
      whereParams.push(parseInt(max_population));
    }

    // Crime rate filter
    if (max_crime_rate) {
      query += ' AND crime_rate <= ?';
      whereParams.push(parseFloat(max_crime_rate));
    }

    // Cost of living filter
    if (max_cost_of_living) {
      query += ' AND cost_of_living_index <= ?';
      whereParams.push(parseFloat(max_cost_of_living));
    }

    // School rating filter
    if (min_school_rating) {
      query += ' AND school_rating >= ?';
      whereParams.push(parseFloat(min_school_rating));
    }

    // State filter - only apply if NOT doing a distance-based search AND NOT already filtered by city_name
    // (distance searches should return cities from all nearby states)
    if (state && !isDistanceSearch && !city_name) {
      query += ' AND state_code = ?';
      whereParams.push(state.toUpperCase());
    }

    // Add distance filter and ordering
    if (majorCityLat !== null && majorCityLon !== null && isDistanceSearch) {
      query += ' HAVING distance_from_selected_city <= ?';
      whereParams.push(parseInt(max_distance));
      query += ' ORDER BY distance_from_selected_city ASC LIMIT 500';
    } else {
      query += ' ORDER BY city_name ASC LIMIT 500';
    }

    // Combine parameters in correct order
    const params = [...selectParams, ...whereParams];
    
    console.log('Query:', query);
    console.log('Params:', params);
    
    const [cities] = await pool.query(query, params);

    // --- AI Suggestion Logic ---
    // If no cities were found AND a city name was part of the filter,
    // try to find similar cities.
    if (cities.length === 0 && city_name) {
      const suggestions = await getSimilarCitySuggestions(city_name);
      if (suggestions.length > 0) {
        return res.json({ success: true, cities: [], suggestions });
      }
      // If no suggestions found either, return error message
      return res.json({ 
        success: false, 
        error: `City "${city_name}" not found. Please check the spelling or try a different city.`,
        cities: [], 
        suggestions: [] 
      });
    }
    // --- End AI Logic ---

    res.json({ success: true, cities, suggestions: [] });

  } catch (error) {
    console.error('Error searching cities:', error);
    res.status(500).json({ success: false, error: 'Failed to search cities' });
  }
});

// Get city autocomplete suggestions
router.get('/autocomplete', async (req, res) => {
  try {
    const { term } = req.query;
    
    if (!term || term.length < 1) {
      return res.json({ success: true, suggestions: [] });
    }

    const query = `
      SELECT DISTINCT city_name, state_code 
      FROM cities 
      WHERE LOWER(city_name) LIKE ? 
      ORDER BY 
        CASE WHEN LOWER(city_name) LIKE ? THEN 0 ELSE 1 END,
        city_name ASC 
      LIMIT 10
    `;
    
    const searchTerm = `%${term.toLowerCase()}%`;
    const startsWithTerm = `${term.toLowerCase()}%`;
    const [suggestions] = await pool.query(query, [searchTerm, startsWithTerm]);
    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Error getting autocomplete:', error);
    res.status(500).json({ success: false, error: 'Failed to get suggestions' });
  }
});

// Get specific city by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [cities] = await pool.query('SELECT * FROM cities WHERE id = ?', [id]);
    
    if (cities.length === 0) {
      return res.status(404).json({ success: false, error: 'City not found' });
    }
    
    res.json({ success: true, city: cities[0] });
  } catch (error) {
    console.error('Error getting city:', error);
    res.status(500).json({ success: false, error: 'Failed to get city' });
  }
});

// Get all unique states
router.get('/meta/states', async (req, res) => {
  try {
    const query = 'SELECT DISTINCT state, state_code FROM cities ORDER BY state ASC';
    const [states] = await pool.query(query);
    res.json({ success: true, states });
  } catch (error) {
    console.error('Error getting states:', error);
    res.status(500).json({ success: false, error: 'Failed to get states' });
  }
});

export default router;
