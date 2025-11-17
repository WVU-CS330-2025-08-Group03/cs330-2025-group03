import React, { useState, useEffect } from "react";
import "./CitySearch.css";
import CityMap from "./CityMap";

function CitySearch() {
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
      Object.keys(filtersToUse).forEach(key => {
        if (filtersToUse[key]) {
          // When doing distance search, rename 'state' to 'state_code' to identify the major city
          // but not filter results by state (we want all nearby states)
          if (key === 'state' && filtersToUse.max_distance) {
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

        // Handle AI-powered suggestions if the search returned none
        if (data.suggestions && data.suggestions.length > 0) {
          setAiSuggestions(data.suggestions);
          setError(`No results for "${filtersToUse.city_name}". Did you mean one of these?`);
        } else if (data.cities.length === 0) {
          setError("No cities found matching your criteria. Try adjusting your filters.");
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
        <h1>Find Your Perfect City</h1>
        <p>Search and filter cities based on your preferences</p>
      </header>

      <div className="search-content">
        {/* Left Sidebar - Filters + Results Combined */}
        <aside className="left-sidebar">
          <div className="filters-section">
            <h2>Find Your City</h2>
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
        </aside>

        {/* Right Side - Leaflet Map Takes Full Height */}
        <div className="map-panel">
          <div className="map-sticky" id="map-section">
            <CityMap
              cities={cities}
              selectedCity={selectedCity}
              selectedMajorCity={selectedMajorCity}
              onCityClick={(city) => setSelectedCity(city)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CitySearch;
