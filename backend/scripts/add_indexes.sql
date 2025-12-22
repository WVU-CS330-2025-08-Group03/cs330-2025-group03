-- Performance optimization: Add indexes for frequently queried columns

-- Index for city name searches (autocomplete and exact searches)
CREATE INDEX idx_city_name ON cities(city_name);

-- Index for state filtering
CREATE INDEX idx_state_code ON cities(state_code);

-- Composite index for city + state lookups
CREATE INDEX idx_city_state ON cities(city_name, state_code);

-- Index for population filtering
CREATE INDEX idx_population ON cities(population);

-- Index for crime rate filtering
CREATE INDEX idx_crime_rate ON cities(crime_rate);

-- Index for cost of living filtering
CREATE INDEX idx_cost_of_living ON cities(cost_of_living_index);

-- Index for school rating filtering
CREATE INDEX idx_school_rating ON cities(school_rating);

-- Composite index for geospatial queries
CREATE INDEX idx_lat_lon ON cities(latitude, longitude);
