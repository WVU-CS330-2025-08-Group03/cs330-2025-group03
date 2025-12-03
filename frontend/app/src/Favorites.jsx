import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Favorites.css";

function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/favorites', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites || []);
      } else if (response.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to load favorites');
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (cityId) => {
    try {
      const response = await fetch(`/api/favorites/${cityId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setFavorites(favorites.filter(fav => fav.city_id !== cityId));
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  if (loading) {
    return (
      <div className="favorites-page">
        <div className="loading">Loading your favorites...</div>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <header className="favorites-header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate("/cities")}>
            ← Back to Search
          </button>
          <div>
            <h1>❤️ My Favorite Cities</h1>
            <p>Cities you've saved for future reference</p>
          </div>
        </div>
      </header>

      <div className="favorites-content">
        {error && <div className="error-banner">{error}</div>}

        {favorites.length > 0 ? (
          <div className="favorites-grid">
            {favorites.map((fav) => (
              <div key={fav.id} className="favorite-city-card">
                <div className="card-header">
                  <h2>{fav.city_name}, {fav.state_code}</h2>
                  <button 
                    className="remove-btn"
                    onClick={() => removeFavorite(fav.city_id)}
                    title="Remove from favorites"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="city-stats">
                  <div className="stat-item">
                    <span className="stat-label">Population</span>
                    <span className="stat-value">{fav.population?.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Crime Rate</span>
                    <span className="stat-value">{fav.crime_rate} per 1000</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Cost of Living</span>
                    <span className="stat-value">{fav.cost_of_living_index}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">School Rating</span>
                    <span className="stat-value">{fav.school_rating}/10</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Median Home Price</span>
                    <span className="stat-value">${fav.median_home_price?.toLocaleString()}</span>
                  </div>
                </div>

                <div className="card-actions">
                  <a 
                    href={`https://www.zillow.com/homes/${encodeURIComponent(fav.city_name)}-${fav.state_code}_rb/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-link"
                  >
                    🏠 View Listings
                  </a>
                  <a 
                    href={`https://www.google.com/maps/search/${encodeURIComponent(fav.city_name + ', ' + fav.state_code)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-link"
                  >
                    📍 View on Map
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💔</div>
            <h2>No favorites yet</h2>
            <p>Start exploring cities and add your favorites by clicking the heart icon!</p>
            <button className="explore-btn" onClick={() => navigate('/cities')}>
              Explore Cities
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Favorites;
