import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { API_BASE_URL } from './config';

// State name to state code mapping
const STATE_CODES = {
  'California': 'CA',
  'Kansas': 'KS',
  'Texas': 'TX',
  'Vermont': 'VT',
  'Idaho': 'ID',
  'Arizona': 'AZ',
  'North Dakota': 'ND'
};

const TOP_US_CITIES = [
  {
    id: 1,
    name: "Fremont",
    state: "California",
    rank: 1,
    matchScore: 98,
    image: "https://www.fremont.gov/home/showpublishedimage/4388/637860624781630000",
    tags: ["High Income", "Education", "Safety"],
    highlights: "High median family income, excellent education and childcare, low poverty, strong health metrics",
    costOfLiving: "$3,200"
  },
  {
    id: 2,
    name: "Overland Park",
    state: "Kansas",
    rank: 2,
    matchScore: 95,
    image: "https://images.squarespace-cdn.com/content/v1/65f1f3ec14981e66377be4e7/83dc449c-4e18-4988-9db7-4a8d1709f5ff/41061140_10156689978955126_8074015054455898112_o.jpg",
    tags: ["Affordable", "Family-Friendly", "Safe"],
    highlights: "Very affordable relative to income, low poverty, strong socioeconomic stability",
    costOfLiving: "$1,800"
  },
  {
    id: 3,
    name: "Plano",
    state: "Texas",
    rank: 3,
    matchScore: 92,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Legacy_West.jpg/1200px-Legacy_West.jpg",
    tags: ["Affordable", "Amenities", "Quality"],
    highlights: "Good mix of affordability, family-friendly amenities, and reasonable safety metrics",
    costOfLiving: "$2,100"
  },
  {
    id: 4,
    name: "Irvine",
    state: "California",
    rank: 4,
    matchScore: 89,
    image: "https://www.redfin.com/blog/wp-content/uploads/2023/12/GettyImages-185099098.jpg",
    tags: ["Top Schools", "Safety", "Quality"],
    highlights: "Highly rated public services, excellent schools, clean infrastructure, strong community",
    costOfLiving: "$3,400"
  },
  {
    id: 5,
    name: "South Burlington",
    state: "Vermont",
    rank: 5,
    matchScore: 87,
    image: "https://www.southburlingtonvt.gov/ImageRepository/Document?documentID=1607",
    tags: ["Small City", "Education", "Environment"],
    highlights: "Strong safety and education, quality of life, clean environment, slower-paced living",
    costOfLiving: "$2,300"
  },
  {
    id: 6,
    name: "Boise",
    state: "Idaho",
    rank: 6,
    matchScore: 85,
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTW_pJjHPPc19wWiWHPGRCXXcDrkwYLbrpNkg&s",
    tags: ["Affordable", "Outdoors", "Community"],
    highlights: "More affordable, access to outdoor space, family-oriented community environment",
    costOfLiving: "$1,900"
  },
  {
    id: 7,
    name: "Gilbert",
    state: "Arizona",
    rank: 7,
    matchScore: 83,
    image: "https://www.gilbertaz.gov/home/showpublishedimage/24101/638089672395830000",
    tags: ["Family", "Safety", "Amenities"],
    highlights: "Good balance of safety, family amenities, and community infrastructure",
    costOfLiving: "$2,000"
  },
  {
    id: 8,
    name: "Bismarck",
    state: "North Dakota",
    rank: 8,
    matchScore: 80,
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6l1IauPk7E8gl0TWE6lM-7pc6h4VU9e84UQ&s",
    tags: ["Hidden Gem", "Low Crime", "Affordable"],
    highlights: "Low crime, manageable housing expenses, solid community services",
    costOfLiving: "$1,600"
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('discover');
  const [currentUser, setCurrentUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch user data on component mount
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          if (data.user.profile_image) {
            setProfileImage(data.user.profile_image);
          }
          fetchFavorites();
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  // Fetch user's favorite cities
  const fetchFavorites = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/favorites`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  const removeFavorite = async (cityId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/favorites/${cityId}`, {
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

  const getUserInitials = () => {
    if (!currentUser || !currentUser.username) return "U";
    return currentUser.username.substring(0, 1).toUpperCase();
  };

  if (loading) {
    return <div className="dashboard-container"><p>Loading...</p></div>;
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="logo-container" onClick={() => navigate('/')}>
            <img src="LiveWiseClear.png" alt="LiveWise Logo" className="logo-icon" width="40" height="40" />
            <span className="logo-text">LiveWise</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            onClick={() => setActiveTab('discover')}
            className={`nav-button ${activeTab === 'discover' ? 'active' : ''}`}
          >
            <span className="nav-icon">🗺️</span>
            Discover
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={`nav-button ${activeTab === 'saved' ? 'active' : ''}`}
          >
            <span className="nav-icon">❤️</span>
            Saved Cities
          </button>
        </nav>

        <div className="sidebar-footer">
          <button 
            onClick={() => navigate('/cities')}
            className="nav-button"
          >
            <span className="nav-icon">🔍</span>
            Advanced Search
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="nav-button logout"
          >
            <span className="nav-icon">🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search by city, state or vibe..."
              className="search-input"
            />
          </div>

          <div className="header-actions">
            <div 
              className="user-avatar" 
              onClick={() => navigate('/account')}
              title="Go to Account"
            >
              {profileImage ? (
                <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                getUserInitials()
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="dashboard-content">
          {activeTab === 'discover' ? (
            <>
              {/* Header Section */}
              <div className="content-header">
                <div>
                  <h1 className="content-title">Discover Top U.S. Cities</h1>
                  <p className="content-subtitle">
                    Exploring the <span className="highlight">best-ranked cities</span> for families & quality of life.
                  </p>
                </div>
              </div>

              {/* City Cards Grid */}
              <div className="cities-grid">
            {TOP_US_CITIES.map(city => (
              <div key={city.id} className="city-card">
                <div className="city-image-container">
                  <img src={city.image} alt={`${city.name}, ${city.state}`} className="city-image" />
                  <div className="city-rank">#{city.rank}</div>
                  <div className="city-match">
                    <span className="match-icon">✨</span>
                    {city.matchScore}% Match
                  </div>
                </div>
                
                <div className="city-info">
                  <div className="city-header">
                    <h3 className="city-name">{city.name}</h3>
                    <span className="city-state">{city.state}</span>
                  </div>
                  
                  <div className="city-tags">
                    {city.tags.map((tag, idx) => (
                      <span key={idx} className="city-tag">{tag}</span>
                    ))}
                  </div>
                  
                  <p className="city-highlights">{city.highlights}</p>
                  
                  <div className="city-footer">
                    <div className="city-price">
                      <span className="price-label">Avg. Cost:</span>
                      <span className="price-value">{city.costOfLiving}/mo</span>
                    </div>
                    <button 
                      className="view-details-btn"
                      onClick={() => navigate(`/cities?city=${encodeURIComponent(city.name)}, ${encodeURIComponent(STATE_CODES[city.state] || city.state)}`)}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="load-more-container">
            <button 
              className="load-more-btn"
              onClick={() => navigate('/cities')}
            >
              Explore All Cities with Advanced Search
            </button>
          </div>
          </>
          ) : (
            <>
              {/* Saved Cities Section */}
              <div className="content-header">
                <div>
                  <h1 className="content-title">Your Saved Cities ({favorites.length})</h1>
                  <p className="content-subtitle">
                    Cities you've <span className="highlight">favorited</span> for future reference.
                  </p>
                </div>
              </div>

              {favorites.length > 0 ? (
                <div className="cities-grid">
                  {favorites.map(fav => (
                    <div key={fav.id} className="city-card saved-city-card">
                      <div className="city-info">
                        <div className="city-header">
                          <div className="city-header-content">
                            <h3 className="city-name">{fav.city_name}</h3>
                            <span className="city-state">{fav.state_code}</span>
                          </div>
                          <button 
                            className="remove-favorite-badge-inline"
                            onClick={() => removeFavorite(fav.city_id)}
                            title="Remove from favorites"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div className="city-details-list">
                          <div className="detail-row">
                            <span className="detail-label">Population:</span>
                            <span className="detail-value">{fav.population?.toLocaleString()}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Crime Rate:</span>
                            <span className="detail-value">{fav.crime_rate} per 1000</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Cost of Living:</span>
                            <span className="detail-value">{fav.cost_of_living_index}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">School Rating:</span>
                            <span className="detail-value">{fav.school_rating}/10</span>
                          </div>
                        </div>
                        
                        <div className="city-footer">
                          <div className="city-price">
                            <span className="price-label">Median Home:</span>
                            <span className="price-value">${fav.median_home_price?.toLocaleString()}</span>
                          </div>
                          <button 
                            className="view-details-btn"
                            onClick={() => navigate(`/cities?city=${encodeURIComponent(fav.city_name)}, ${encodeURIComponent(fav.state_code)}`)}
                          >
                            View on Map →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p className="empty-icon">❤️</p>
                  <h3>No saved cities yet</h3>
                  <p>Start exploring and save your favorite cities!</p>
                  <button 
                    className="load-more-btn"
                    onClick={() => setActiveTab('discover')}
                  >
                    Discover Cities
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
