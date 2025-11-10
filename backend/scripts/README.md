# Backend Scripts

This directory contains utility scripts for database management and city data population.

## Directory Structure

```
scripts/
├── gemini/              # Google Gemini AI city population scripts
│   ├── README.md        # Detailed documentation for Gemini scripts
│   ├── populate_from_api.js           # Initial database population
│   ├── add_dc_nyc_deep.js            # Add DC & NYC metro areas
│   ├── add_metro_cities.js           # Add DC, NYC, LA metros
│   ├── add_more_cities.js            # Add 300+ nationwide cities
│   └── populate_comprehensive.js     # Large-scale population (10 batches)
├── check_cities.js      # View current database statistics
├── cleanup_and_add_cities.js         # Remove duplicates, add Austin cities
├── cities_schema.sql    # Database schema definition
└── init_db.sql          # Database initialization script
```

## Quick Start

### 1. Check Current Database Status
```bash
cd backend
node scripts/check_cities.js
```

Shows:
- Total city count
- Latest cities added
- Cities by state (with focus on Texas)

---

### 2. Populate Database with Cities

**First Time Setup**:
```bash
# Install Gemini AI package
npm install @google/genai

# Add your Gemini API key to backend/.env
# GEMINI_API_KEY=your_key_here
```

**Get API Key**: [Google AI Studio](https://aistudio.google.com/app/apikey)

**Recommended Workflow**:
```bash
# Step 1: Initial population (250-300 cities)
node scripts/gemini/populate_from_api.js

# Step 2: Add DC and NYC metro areas (200 cities)
node scripts/gemini/add_dc_nyc_deep.js

# Step 3 (Optional): Add more nationwide coverage
node scripts/gemini/add_more_cities.js
```

See `scripts/gemini/README.md` for detailed documentation on all AI population scripts.

---

### 3. Database Maintenance

**Remove Duplicates and Add Austin Area Cities**:
```bash
node scripts/cleanup_and_add_cities.js
```

What it does:
- Removes duplicate city entries
- Adds missing Austin area cities (Kyle, Buda, Cedar Park, etc.)
- Shows summary of changes

---

## Database Schema

The cities table includes:
- **Location**: city_name, state, state_code, latitude, longitude
- **Demographics**: population, crime_rate, cost_of_living_index
- **Quality of Life**: school_rating, median_home_price, unemployment_rate
- **Timestamps**: created_at, updated_at

See `cities_schema.sql` for complete schema definition.

---

## Current Database Status

After running recommended scripts:
- ✅ **450+ cities** total
- ✅ **107 DC metro cities** (VA, MD, DC)
- ✅ **106 NYC metro cities** (NY, NJ, CT)  
- ✅ **38 Texas cities** (Austin area + major cities)
- ✅ **Major metros nationwide**

---

## Troubleshooting

### Database Connection Issues
- Check credentials in `backend/.env`
- Ensure SSL certificate exists: `backend/config/DigiCertGlobalRootG2.crt.pem`

### Gemini API Issues
- "API key expired": Get new key from Google AI Studio
- "Model overloaded" (503): Wait a few minutes and retry
- See `scripts/gemini/README.md` for detailed troubleshooting

---

## Notes

- All Gemini AI scripts **preserve existing data** except `populate_from_api.js` and `populate_comprehensive.js` which clear the database first
- Scripts automatically skip duplicate cities
- Each script takes 30 seconds to 3 minutes depending on size
- Demographic data is AI-generated with realistic values for each city
