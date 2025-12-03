# Favorites Feature Setup

## Database Setup

Run this SQL in your Azure MySQL database to create the favorites table:

```sql
-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  city_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_city (user_id, city_id)
);

-- Add indexes for faster queries
CREATE INDEX idx_user_favorites ON favorites(user_id);
CREATE INDEX idx_city_favorites ON favorites(city_id);
```

## Features Implemented

### Frontend (CitySearch.jsx)
- ❤️ Heart icon button on each city card
- Toggle favorite status (filled heart = favorited, outline heart = not favorited)
- Real-time updates when adding/removing favorites
- Favorites persist across sessions

### Backend (routes/favorites.js)
- `GET /api/favorites` - Get all favorites for logged-in user
- `POST /api/favorites` - Add a city to favorites
- `DELETE /api/favorites/:cityId` - Remove a city from favorites

### Account Page
- Displays all favorite cities
- Shows city name, state, and population
- Quick remove button for each favorite
- "Browse Cities" button to go back to search

## How to Use

1. **Run the SQL**: Execute the `favorites_table.sql` file in your MySQL database
2. **Restart Backend**: Restart your backend server to load the new routes
3. **Test**: 
   - Login to your account
   - Search for cities
   - Click the heart icon on any city card to add/remove from favorites
   - Go to Account page to see all your favorites

## Security

- All favorites endpoints require authentication
- Users can only see/modify their own favorites
- Foreign key constraints ensure data integrity
