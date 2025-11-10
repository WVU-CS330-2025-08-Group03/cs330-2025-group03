# Bug Fix: DC Area City Search

## Problem
The website couldn't find cities within 25 miles of Washington DC despite the database containing 107 DC metro area cities.

## Root Cause
When users selected "Washington, DC" from autocomplete, the frontend sent two parameters:
- `city_name=Washington`
- `state=DC`

The backend was using the `state` parameter for TWO different purposes:
1. **Major city identification**: Which "Washington" (DC, state, etc.)
2. **Result filtering**: Only show cities in DC state

This caused the search to only return 1 city (Washington DC itself), excluding all nearby cities in Virginia and Maryland.

## Solution
Created a new parameter `state_code` specifically for major city identification:

### Frontend Changes (`frontend/app/src/CitySearch.jsx`)
- When doing distance-based searches (`max_distance` is set), the frontend now sends:
  - `city_name=Washington`
  - `state_code=DC` (for identification only)
  - `max_distance=25`
- The `state` parameter is NOT sent for distance searches
- This allows the backend to identify the correct "Washington" without filtering results by state

### Backend Changes (`backend/routes/cities.js`)
- Added new `state_code` parameter extraction
- Updated major city lookup to use `state_code` if provided, otherwise `state`
- Kept `state` parameter for filtering results when NOT doing distance searches
- Distance searches now return cities from all nearby states

## Results
**Before Fix**: 1 city (only Washington DC)
**After Fix**: 71 cities (1 DC, 35 VA, 35 MD)

Cities within 25 miles now include:
- **DC**: Washington DC
- **Virginia**: Arlington, Alexandria, Falls Church, McLean, Annandale, etc.
- **Maryland**: Silver Spring, Bethesda, Rockville, Chevy Chase, Takoma Park, etc.

## Testing
Test the fix with:
```bash
curl "http://localhost:5177/api/cities/search?city_name=Washington&state_code=DC&max_distance=25"
```

Should return 71 cities from DC, VA, and MD.

## User Action Required
**Refresh your browser** to load the updated frontend code.
