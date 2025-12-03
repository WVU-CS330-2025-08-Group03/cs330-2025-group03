import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to fit map bounds when cities change
function MapUpdater({ cities, selectedCity }) {
  const map = useMap();

  useEffect(() => {
    if (selectedCity) {
      // Zoom to selected city
      map.setView([selectedCity.latitude, selectedCity.longitude], 12);
    } else if (cities && cities.length > 0) {
      // Fit bounds to show all cities
      const bounds = cities.map(city => [
        parseFloat(city.latitude),
        parseFloat(city.longitude)
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // Default view of USA
      map.setView([39.8283, -98.5795], 4);
    }
  }, [cities, selectedCity, map]);

  return null;
}

function CityMap({ cities, selectedCity, selectedMajorCity, onCityClick, favorites = [], onToggleFavorite, isFavorite }) {
  // Default view centered on mainland USA (Kansas)
  const defaultCenter = [39.8283, -98.5795];
  const defaultZoom = 4;

  const handleFavoriteClick = (e, city) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(city);
    }
  };

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      minZoom={2}
      maxZoom={18}
      worldCopyJump={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapUpdater cities={cities} selectedCity={selectedCity} />

      {cities.map((city) => {
        const isFav = isFavorite ? isFavorite(city.id) : false;
        return (
          <Marker
            key={city.id}
            position={[parseFloat(city.latitude), parseFloat(city.longitude)]}
            eventHandlers={{
              click: () => {
                if (onCityClick) {
                  onCityClick(city);
                }
              },
            }}
          >
            <Popup>
              <div style={{ minWidth: '220px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ margin: '0', fontSize: '1.1rem', fontWeight: 'bold', flex: 1 }}>
                    {city.city_name}, {city.state_code}
                  </h3>
                  <button
                    onClick={(e) => handleFavoriteClick(e, city)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      padding: '0 0 0 8px',
                      lineHeight: '1',
                      transition: 'transform 0.2s',
                      outline: 'none'
                    }}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {isFav ? '❤️' : '🤍'}
                  </button>
                </div>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Population:</strong> {city.population.toLocaleString()}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Crime Rate:</strong> {city.crime_rate} per 1000
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Cost of Living:</strong> {city.cost_of_living_index}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>School Rating:</strong> {city.school_rating}/10
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Median Home:</strong> ${city.median_home_price.toLocaleString()}
                  </p>
                  {city.distance_from_selected_city && selectedMajorCity && (
                    <p style={{ margin: '4px 0' }}>
                      <strong>Distance:</strong> {city.distance_from_selected_city.toFixed(1)} miles to {selectedMajorCity}
                    </p>
                  )}
                  <a 
                    href={`https://www.zillow.com/homes/${encodeURIComponent(city.city_name)}-${city.state_code}_rb/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      marginTop: '8px',
                      padding: '6px 12px',
                      background: '#0066cc',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold'
                    }}
                  >
                    🏠 View Listings
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export default CityMap;
