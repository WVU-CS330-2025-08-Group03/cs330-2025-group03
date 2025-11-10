# City Search Feature Setup Instructions

This guide will help you set up the new city search functionality for your application.

## Overview

The city search feature allows users to:
- Search for cities based on multiple criteria (population, crime rate, cost of living, school ratings, etc.)
- Use autocomplete to prevent typos when entering city names
- View city data including crime rate, cost of living, distance from major cities, school ratings, and more
- View city locations on an interactive map
- Access the feature after logging in or creating an account

## Database Setup

### Step 1: Run the Cities Schema SQL

You need to create the cities table and populate it with sample data. You have two options:

#### Option A: Using Azure MySQL Workbench or MySQL Client

1. Connect to your Azure MySQL database
2. Open the file: `backend/scripts/cities_schema.sql`
3. Execute the entire SQL script to create the cities table and insert sample data

#### Option B: Using the Azure Portal Query Editor

1. Go to your Azure MySQL database in the Azure Portal
2. Navigate to the Query editor
3. Copy and paste the contents of `backend/scripts/cities_schema.sql`
4. Execute the query

#### Option C: Using VSCode SQL Extension

If you have the SQL extension already configured in VSCode:
1. Open `backend/scripts/cities_schema.sql`
2. Select all the content
3. Right-click and choose "Execute Query" or use the command palette

### Step 2: Verify the Table Creation

Run this query to verify the cities table was created successfully:

```sql
USE authdb;
SELECT COUNT(*) FROM cities;
```

You should see 25 cities in the database.

### Step 3: Test a Sample Query

```sql
SELECT city_name, state, population, crime_rate, school_rating 
FROM cities 
WHERE school_rating >= 8.0 
ORDER BY city_name;
```

## Backend Setup

The backend has already been configured with the necessary routes:

- **GET** `/api/cities/search` - Search cities with filters
- **GET** `/api/cities/autocomplete` - Get city name suggestions
- **GET** `/api/cities/:id` - Get specific city details
- **GET** `/api/cities/meta/states` - Get all available states

No additional backend setup is required.

## Frontend Setup

The frontend has been updated with:

1. **New Route**: `/cities` - The city search page
2. **New Component**: `CitySearch.jsx` - Main search interface
3. **New Styles**: `CitySearch.css` - Component styling
4. **Updated Login**: Redirects to `/cities` after successful login/registration

No additional frontend setup is required.

## Running the Application

### 1. Start the Backend Server

```bash
cd backend
npm install  # If you haven't already
npm start
```

The backend should start on port 5175 (or the port specified in your .env file).

### 2. Start the Frontend Development Server

```bash
cd frontend/app
npm install  # If you haven't already
npm run dev
```

The frontend should start on port 5173.

### 3. Configure Vite Proxy (if not already done)

Make sure your `frontend/app/vite.config.js` has the proxy configured:

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:5175',
      '/api': 'http://localhost:5175'
    }
  }
})
```

## Testing the Feature

1. **Navigate to the app**: Open http://localhost:5173
2. **Login or Sign Up**: Go to the login page and create an account or login
3. **Automatic Redirect**: After successful authentication, you'll be redirected to `/cities`
4. **Try the Filters**:
   - Type a city name (e.g., "Austin") and see autocomplete suggestions
   - Set filters like max crime rate (30), min school rating (8.0)
   - Click "Search Cities" to see results
5. **View on Map**: Click "View on Map" on any city card to see its location
6. **Direct Access**: You can also navigate directly to http://localhost:5173/cities

## Sample Search Examples

### Example 1: Safe Cities with Good Schools
- Max Crime Rate: 30
- Min School Rating: 8.0
- Click "Search Cities"

**Expected Results**: Boulder, Chapel Hill, Bellevue, Franklin, Ann Arbor, Madison, Scottsdale, Round Rock

### Example 2: Affordable Cities
- Max Cost of Living Index: 110
- Click "Search Cities"

**Expected Results**: San Marcos, Colorado Springs, Durham, Charlotte, Nashville, Boise, Madison, St. Paul, etc.

### Example 3: Cities Near Major Hubs
- Max Distance from Major City: 30 miles
- Click "Search Cities"

**Expected Results**: Round Rock, Bellevue, Boulder, Chapel Hill, Durham, Scottsdale, Tempe, Franklin, St. Paul

### Example 4: Large Cities
- Min Population: 400,000
- Click "Search Cities"

**Expected Results**: Austin, Seattle, Denver, Charlotte, Phoenix, Nashville, Minneapolis

## Features Implemented

✅ City database with comprehensive data fields
✅ Advanced search with multiple filter options
✅ Autocomplete to prevent city name typos
✅ City cards displaying all relevant metrics
✅ Interactive map integration using OpenStreetMap
✅ Responsive design for mobile and desktop
✅ Automatic redirect after login/registration
✅ Clean, modern UI with gradient themes

## Troubleshooting

### Issue: "Failed to search cities"
- Check that the backend server is running
- Verify the database connection in `backend/config/database.js`
- Ensure the cities table exists in the database

### Issue: "No cities found"
- Verify that the cities_schema.sql was executed successfully
- Check that data was inserted: `SELECT COUNT(*) FROM cities;`

### Issue: Map not loading
- Check your internet connection (maps are loaded from OpenStreetMap)
- Ensure the city has valid latitude/longitude coordinates

### Issue: Autocomplete not working
- Check browser console for errors
- Verify the `/api/cities/autocomplete` endpoint is accessible
- Try typing at least one character

## Database Schema Reference

The `cities` table includes:
- `city_name`, `state`, `state_code`
- `latitude`, `longitude` (for map display)
- `population`
- `crime_rate` (per 1000 residents)
- `cost_of_living_index` (100 = national average)
- `distance_from_major_city` (in miles)
- `nearest_major_city`
- `school_rating` (out of 10)
- `median_home_price` (in USD)
- `unemployment_rate` (percentage)

## Next Steps

To expand the feature, you could:
1. Add more cities to the database
2. Implement user favorites/saved cities
3. Add comparison features (compare 2-3 cities side by side)
4. Integrate real-time data APIs for weather, housing prices
5. Add sorting options (by price, rating, population, etc.)
6. Create detailed city profile pages
7. Add export functionality (PDF reports)
8. Implement map clustering for multiple cities

## Support

If you encounter any issues, check:
1. Backend logs in the terminal running the server
2. Frontend browser console (F12)
3. Database connection status
4. Network tab in browser dev tools for API calls
