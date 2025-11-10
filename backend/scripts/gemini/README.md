# Gemini AI City Population Scripts

This folder contains scripts that use Google Gemini AI to generate realistic city data and populate the database.

## Prerequisites

1. **Gemini API Key**: Set `GEMINI_API_KEY` in `backend/.env`
2. **Install Dependencies**: `npm install @google/genai` (already installed)

## Scripts

### 1. `populate_from_api.js` (Recommended - First Run)
**Purpose**: Initial database population with 250+ major US cities

**Usage**:
```bash
cd backend
node scripts/gemini/populate_from_api.js
```

**What it does**:
- Generates 150-300 cities using Gemini AI
- Includes all major metros and surrounding areas
- **Clears existing data** before inserting
- Takes ~30-60 seconds

**Cities included**:
- Major metros: NYC, LA, Chicago, Houston, Phoenix, etc.
- Texas area: Austin, Round Rock, Cedar Park, Kyle, Buda, etc.
- Nationwide coverage

---

### 2. `add_dc_nyc_deep.js` (Deep Metro Coverage)
**Purpose**: Add comprehensive DC and NYC metropolitan area cities

**Usage**:
```bash
cd backend
node scripts/gemini/add_dc_nyc_deep.js
```

**What it does**:
- Adds 200 cities focused on DC and NYC metros
- **Preserves existing data** (only adds new cities)
- Takes ~2-3 minutes

**Cities added**:
- **DC Metro**: Virginia suburbs, Maryland suburbs, DC proper
- **NYC Metro**: 5 boroughs, Long Island, Westchester, NJ, CT

---

### 3. `add_metro_cities.js` (Three Major Metros)
**Purpose**: Add DC, NYC, and LA metropolitan areas (150 cities total)

**Usage**:
```bash
cd backend
node scripts/gemini/add_metro_cities.js
```

**What it does**:
- Adds cities from DC, NYC, and LA metro areas
- **Preserves existing data**
- Takes ~1-2 minutes

---

### 4. `add_more_cities.js` (General Expansion)
**Purpose**: Add 300 additional mid-sized cities across all states

**Usage**:
```bash
cd backend
node scripts/gemini/add_more_cities.js
```

**What it does**:
- Adds mid-sized cities (30k-150k population)
- Focuses on states/regions not heavily covered
- **Preserves existing data**
- Takes ~1-2 minutes

---

### 5. `populate_comprehensive.js` (Large Scale - 10 Batches)
**Purpose**: Comprehensive nationwide coverage with 800-1000 cities

**Usage**:
```bash
cd backend
node scripts/gemini/populate_comprehensive.js
```

**What it does**:
- Makes 10 separate Gemini requests
- Generates 100 cities per batch
- **Clears existing data** before inserting
- Takes ~5-10 minutes
- More prone to API rate limits

**Note**: May fail if Gemini API is overloaded. Use smaller scripts instead.

---

## Recommended Workflow

### Starting Fresh:
```bash
# Step 1: Initial population
node scripts/gemini/populate_from_api.js

# Step 2: Add DC and NYC coverage
node scripts/gemini/add_dc_nyc_deep.js

# Step 3 (Optional): Add more nationwide cities
node scripts/gemini/add_more_cities.js
```

This gives you 600-800 cities with excellent coverage!

---

## Data Generated

Each city includes:
- **Basic Info**: City name, state, coordinates, population
- **Demographics**: 
  - Crime rate (per 1000 residents)
  - Cost of living index (100 = national average)
  - School rating (1-10 scale)
  - Median home price
  - Unemployment rate

All demographic data is AI-generated based on realistic patterns for each city.

---

## Troubleshooting

### "API key expired" or "API key invalid"
- Get a new API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Update `GEMINI_API_KEY` in `backend/.env`

### "Model is overloaded" (Error 503)
- Gemini API is temporarily busy
- Wait a few minutes and try again
- Use smaller scripts instead of `populate_comprehensive.js`

### "Failed to connect to MySQL"
- Check your database credentials in `backend/.env`
- Ensure SSL certificate exists: `backend/config/DigiCertGlobalRootG2.crt.pem`

### Duplicate cities
- Scripts automatically skip duplicates
- Each city is checked by name + state before insertion

---

## Current Database Status

After running the recommended scripts, you should have:
- **450+ cities** total
- **107 DC metro cities** (VA, MD, DC)
- **106 NYC metro cities** (NY, NJ, CT)
- **38 Texas cities** (Austin area + major cities)
- **Major metros nationwide**

Check your database:
```bash
cd backend
node scripts/check_cities.js
```
