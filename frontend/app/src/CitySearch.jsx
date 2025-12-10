import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CitySearch.css";
import CityMap from "./CityMap";
import { API_BASE_URL } from "./config";

function CitySearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [filters, setFilters] = useState({
    city_name: "",
    min_population: "",
    max_population: "",
    max_crime_rate: "",
    max_cost_of_living: "",
    min_school_rating: "",
    max_distance: "",
    state: ""
  });
  
  const [cities, setCities] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedMajorCity, setSelectedMajorCity] = useState(""); // Store the major city name for distance display
  const [cityDisplayValue, setCityDisplayValue] = useState(""); // For showing "City, ST" format
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState([]);

  // Fetch current user data on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          console.log("User data:", data.user);
          setCurrentUser(data.user);
          if (data.user.profile_image) {
            setProfileImage(data.user.profile_image);
          }
          // Fetch favorites after getting user
          fetchFavorites();
        } else {
          console.log("User not authenticated");
          setCurrentUser({ username: "Guest" }); // Fallback for non-authenticated users
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setCurrentUser({ username: "Guest" }); // Fallback for errors
      }
    };
    fetchUser();
  }, []);

  // Handle URL parameters for city search
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const cityParam = searchParams.get('city');
    
    if (cityParam) {
      // Parse city name and state if present (format: "City, State")
      const parts = cityParam.split(',').map(p => p.trim());
      const cityName = parts[0];
      const stateCode = parts[1] || '';
      
      // Set the city name in filters and display value
      setCityDisplayValue(cityParam);
      setFilters(prev => ({ 
        ...prev, 
        city_name: cityName,
        state: stateCode,
        max_distance: '' // Clear distance to search for exact city
      }));
      
      // Trigger search automatically after a short delay to ensure state is updated
      setTimeout(() => {
        handleSearchFromUrl(cityName, stateCode);
      }, 100);
    }
  }, [location.search]);

  // Fetch user's favorite cities
  const fetchFavorites = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/favorites`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Favorites loaded:", data.favorites);
        setFavorites(data.favorites || []);
      } else {
        console.log("Could not fetch favorites, status:", response.status);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  // Handle search from URL parameters
  const handleSearchFromUrl = async (cityName, stateCode = '') => {
    console.log('=== handleSearchFromUrl called ===');
    console.log('cityName:', cityName);
    console.log('stateCode:', stateCode);
    setLoading(true);
    setError("");
    
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('city_name', cityName);
      if (stateCode) {
        queryParams.append('state', stateCode);
      }

      const apiUrl = `/api/cities/search?${queryParams.toString()}`;
      console.log('Fetching:', apiUrl);
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      console.log('Response status:', response.status);
      console.log('Search results:', data);
      
      if (data.success) {
        setCities(data.cities);
        setSelectedCity(null); // Show all cities on map, not just one
        setSelectedMajorCity(cityName); // Set for distance display if needed

        if (data.cities.length > 0) {
          setResultsVisible(true); // Show the results panel
          console.log('Results visible set to true, cities found:', data.cities.length);
        } else if (data.suggestions && data.suggestions.length > 0) {
          setAiSuggestions(data.suggestions);
          setError(`No results for "${cityName}". Did you mean one of these?`);
          setResultsVisible(false);
        } else {
          setError("City not found. Try adjusting your search.");
          setResultsVisible(false);
        }
      } else {
        setError(data.error || "Failed to search cities");
        setResultsVisible(false);
      }
    } catch (error) {
      console.error("Error searching cities:", error);
      setError("Error connecting to server. Please try again.");
      setResultsVisible(false);
    } finally {
      setLoading(false);
    }
  };

  // Check if a city is favorited
  const isFavorite = (cityId) => {
    return favorites.some(fav => fav.city_id === cityId);
  };

  // Toggle favorite status
  const toggleFavorite = async (city) => {
    console.log("Toggling favorite for city:", city.city_name);
    try {
      if (isFavorite(city.id)) {
        // Remove from favorites
        console.log("Removing from favorites");
        const response = await fetch(`${API_BASE_URL}/api/favorites/${city.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (response.ok) {
          console.log("Removed successfully");
          setFavorites(favorites.filter(fav => fav.city_id !== city.id));
        } else {
          console.error("Failed to remove favorite, status:", response.status);
        }
      } else {
        // Add to favorites
        console.log("Adding to favorites");
        const response = await fetch(`${API_BASE_URL}/api/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ city_id: city.id })
        });
        if (response.ok) {
          const data = await response.json();
          console.log("Added successfully:", data.favorite);
          setFavorites([...favorites, data.favorite]);
        } else {
          console.error("Failed to add favorite, status:", response.status);
        }
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  // Get user initials for profile icon
  const getUserInitials = () => {
    if (!currentUser || !currentUser.username) return "U";
    return currentUser.username.substring(0, 1).toUpperCase();
  };

  // Autocomplete for city name
  const handleCityNameChange = async (value) => {
    setCityDisplayValue(value); // Update display value as user types
    
    // Extract just the city name if user types "City, ST" format
    const cityNameOnly = value.split(',')[0].trim();
    setFilters({ ...filters, city_name: cityNameOnly });
    
    if (value.length >= 1) {
      try {
        const response = await fetch(`/api/cities/autocomplete?term=${encodeURIComponent(cityNameOnly)}`);
        const data = await response.json();
        if (data.success) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    // Display as "City, STATE" in the input field
    const displayValue = `${suggestion.city_name}, ${suggestion.state_code}`;
    setCityDisplayValue(displayValue);
    setSelectedMajorCity(suggestion.city_name); // Store major city name for distance display
    setFilters({ 
      ...filters, 
      city_name: suggestion.city_name, // Store just the city name for backend search
      state: suggestion.state_code // Auto-fill state
    });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const searchCities = async (e, suggestedFilters) => {
    // Determine which filters to use: the suggested ones or the current state
    const filtersToUse = suggestedFilters || filters;

    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      
      // Check if this is an exact city search (city name without distance or distance is 0)
      const isExactCitySearch = filtersToUse.city_name && (!filtersToUse.max_distance || filtersToUse.max_distance === "0" || filtersToUse.max_distance === 0);
      
      Object.keys(filtersToUse).forEach(key => {
        if (filtersToUse[key]) {
          // For exact city search, skip max_distance parameter
          if (isExactCitySearch && key === 'max_distance') {
            return;
          }
          // When doing distance search, rename 'state' to 'state_code' to identify the major city
          // but not filter results by state (we want all nearby states)
          if (key === 'state' && filtersToUse.max_distance && !isExactCitySearch) {
            queryParams.append('state_code', filtersToUse[key]);
          } else {
            queryParams.append(key, filtersToUse[key]);
          }
        }
      });

      const response = await fetch(`/api/cities/search?${queryParams.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setCities(data.cities);
        setSelectedCity(null); // Clear single city selection to show all results on map

        // Show results if cities were found
        if (data.cities.length > 0) {
          setResultsVisible(true);
        }

        // Handle AI-powered suggestions if the search returned none
        if (data.suggestions && data.suggestions.length > 0) {
          setAiSuggestions(data.suggestions);
          setError(`No results for "${filtersToUse.city_name}". Did you mean one of these?`);
        } else if (data.cities.length === 0) {
          setError("No cities found matching your criteria. Try adjusting your filters.");
          setResultsVisible(false);
        } else {
          // Clear suggestions on a successful search
        }
      } else {
        setError(data.error || "Failed to search cities");
      }
    } catch (error) {
      console.error("Error searching cities:", error);
      setError("Error connecting to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const resetFilters = () => {
    setFilters({
      city_name: "",
      min_population: "",
      max_population: "",
      max_crime_rate: "",
      max_cost_of_living: "",
      min_school_rating: "",
      max_distance: "",
      state: ""
    });
    setCityDisplayValue(""); // Clear the display value
    setCities([]);
    setError("");
    setSelectedCity(null);
    setAiSuggestions([]);
  };

  const viewCityOnMap = (city) => {
    setSelectedCity(city);
    // Scroll to map
    document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAiSuggestionClick = (suggestion) => {
    const newFilters = { ...filters, city_name: suggestion.city_name, state: suggestion.state_code };
    setFilters(newFilters);
    searchCities(null, newFilters);
  };

  return (
    <div className="city-search-container">
      <header className="search-header">
        <div className="header-content">
          <div className="logo-section">
            <img src="LiveWiseClear.png" alt="LiveWise Logo" className="map-logo" />
            <div className="logo-title-block">
              <span className="livewise-title">LiveWise</span>
              <div>
                <h1>Find Your Perfect City</h1>
                <p>Search and filter cities based on your preferences</p>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="back-to-dashboard-btn"
              onClick={() => navigate('/dashboard')}
              title="Back to Dashboard"
            >
              ← Dashboard
            </button>
            <div 
              className="user-profile-icon"
              onClick={() => navigate('/account')}
              title="Account"
            >
              {profileImage ? (
                <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                getUserInitials()
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="search-content">
        {/* Left Sidebar - Filters + Results Combined */}
        <aside className={`left-sidebar ${!resultsVisible ? 'results-hidden' : ''}`}>
          <div className="filters-section">
            <div className="filters-header">
              <h2>Find Your City</h2>
            </div>
            <form onSubmit={searchCities}>
            <div className="filter-group">
              <label>Major City (Optional)</label>
              <div className="autocomplete-wrapper">
                <input
                  type="text"
                  name="city_name"
                  placeholder="Start typing major city name or leave blank..."
                  value={cityDisplayValue}
                  onChange={(e) => handleCityNameChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="suggestions-list">
                    {suggestions.map((suggestion, idx) => (
                      <li
                        key={idx}
                        onClick={() => selectSuggestion(suggestion)}
                      >
                        {suggestion.city_name}, {suggestion.state_code}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <small>Optional - Select a major city to search near</small>
            </div>

            <div className="filter-group">
              <label>
                Max Distance from Major City: {filters.max_distance ? `${filters.max_distance} miles` : 'Any'}
              </label>
              <input
                type="range"
                name="max_distance"
                min="0"
                max="80"
                step="5"
                value={filters.max_distance || 0}
                onChange={handleFilterChange}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280' }}>
                <span>0 mi</span>
                <span>40 mi</span>
                <span>80 mi</span>
              </div>
              <small>Optional - Leave at 0 for any distance</small>
            </div>

            <div className="filter-group">
              <label>Population Range (Optional)</label>
              <div className="range-inputs">
                <input
                  type="number"
                  name="min_population"
                  placeholder="Min"
                  value={filters.min_population}
                  onChange={handleFilterChange}
                />
                <span>to</span>
                <input
                  type="number"
                  name="max_population"
                  placeholder="Max"
                  value={filters.max_population}
                  onChange={handleFilterChange}
                />
              </div>
            </div>

            <div className="filter-group">
              <label>Max Crime Rate (Optional, per 1000)</label>
              <input
                type="number"
                name="max_crime_rate"
                placeholder="e.g., 30"
                value={filters.max_crime_rate}
                onChange={handleFilterChange}
                step="0.1"
              />
            </div>

            <div className="filter-group">
              <label>Max Cost of Living Index (Optional)</label>
              <input
                type="number"
                name="max_cost_of_living"
                placeholder="e.g., 120"
                value={filters.max_cost_of_living}
                onChange={handleFilterChange}
                step="0.1"
              />
              <small>100 = national average</small>
            </div>

            <div className="filter-group">
              <label>Min School Rating (Optional, 1-10)</label>
              <input
                type="number"
                name="min_school_rating"
                placeholder="e.g., 7.5"
                value={filters.min_school_rating}
                onChange={handleFilterChange}
                step="0.1"
                min="1"
                max="10"
              />
            </div>

              <div className="filter-actions">
                <button type="submit" className="search-btn" disabled={loading}>
                  {loading ? "Searching..." : "Find Cities"}
                </button>
                <button type="button" className="reset-btn" onClick={resetFilters}>
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* Results Section - Below Filters in Same Sidebar */}
          <div className="results-section">
            {cities.length > 0 && (
              <div className="results-header">
                <button 
                  type="button"
                  className="toggle-results-btn"
                  onClick={() => setResultsVisible(!resultsVisible)}
                >
                  {resultsVisible ? '▲ Hide Results' : '▼ Show Results'}
                </button>
              </div>
            )}
            {resultsVisible && (
            <div className="results-content">
            {error && <div className="error-message">{error}</div>}
            
            {aiSuggestions.length > 0 && (
              <div className="ai-suggestions">
                <ul>
                  {aiSuggestions.map(suggestion => (
                    <li key={suggestion.id}>
                      <button onClick={() => handleAiSuggestionClick(suggestion)}>
                        {suggestion.city_name}, {suggestion.state_code}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {cities.length > 0 ? (
              <div className="cities-list">
                {cities.map((city) => (
                  <div key={city.id} id={`city-card-${city.id}`} className="city-card">
                    <div className="city-header">
                      <h3>{city.city_name}</h3>
                      <span className="state-badge">{city.state_code}</span>
                    </div>
                    <div className="city-details">
                      <div className="detail-item">
                        <span className="label">Population:</span>
                        <span className="value">{city.population.toLocaleString()}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Crime Rate:</span>
                        <span className="value">{city.crime_rate} per 1000</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Cost of Living:</span>
                        <span className="value">{city.cost_of_living_index}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">School Rating:</span>
                        <span className="value">{city.school_rating}/10</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Median Home Price:</span>
                        <span className="value">${city.median_home_price.toLocaleString()}</span>
                      </div>
                      {city.distance_from_selected_city && (
                        <div className="detail-item">
                          <span className="label">Distance to {selectedMajorCity}:</span>
                          <span className="value">{city.distance_from_selected_city.toFixed(1)} miles</span>
                        </div>
                      )}
                    </div>
                    <div className="city-actions">
                      <button 
                        className={`favorite-btn ${isFavorite(city.id) ? 'favorited' : ''}`}
                        onClick={() => toggleFavorite(city)}
                        title={isFavorite(city.id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFavorite(city.id) ? '❤️' : '🤍'}
                      </button>
                      <button 
                        className="view-map-btn" 
                        onClick={() => viewCityOnMap(city)}
                      >
                        📍 View on Map
                      </button>
                      <a 
                        href={`https://www.zillow.com/homes/${encodeURIComponent(city.city_name)}-${city.state_code}_rb/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="housing-link"
                      >
                        🏠 View Listings
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !loading && !error && aiSuggestions.length === 0 && (
                <div className="no-results">
                  <p>Use the filters above to search for cities</p>
                </div>
              )
            )}
            </div>
            )}
          </div>
        </aside>

        {/* Right Side - Leaflet Map Takes Full Height */}
        <div className="map-panel">
          <div className="map-sticky" id="map-section">
            <CityMap
              cities={cities}
              selectedCity={selectedCity}
              selectedMajorCity={selectedMajorCity}
              onCityClick={(city) => setSelectedCity(city)}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CitySearch;
