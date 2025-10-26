import React from "react";
import "./App.css";

function App() {
  return (
    <main className="homepage">
      <header className="hero">
        <h1>Find Your Dream Home</h1>
        <p>Discover listings, compare neighborhoods, and connect with agents — all in one place.</p>
        <button className="cta-button">Start Your Search</button>
      </header>

      <section className="features">
        <div>
          <h2>🏡 Browse Listings</h2>
          <p>Filter by price, location, and home type to find the perfect match.</p>
        </div>
        <div>
          <h2>📍 Explore Neighborhoods</h2>
          <p> Compare school ratings, amenities, and commute times for your ideal area.</p>
        </div>
        <div>
          <h2>🤝 Connect with Realtors</h2>
          <p>Message trusted local agents and schedule tours directly.</p>
        </div>
      </section>

      <footer>
        <p>© 2025 LiveWise — Your path to homeownership made simple.</p>
      </footer>
    </main>
  );
}

export default App;
