import React from "react";
import "./App.css";
import { Link, Routes, Route } from 'react-router-dom'
import Login from "./Login.jsx";
import VerifyEmail from "./VerifyEmail.jsx";
import CitySearch from "./CitySearch.jsx";
import Account from "./assets/Account.jsx";

function Home() {
  return (
    <main className="homepage">
      <header className="hero">
        <h1>Find Your Dream Home</h1>
        <p>Discover listings, compare neighborhoods, and connect with agents — all in one place.</p>
        <Link to="/login" className="cta-button">Start your search</Link>
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
        <Link to="/Account" className="footer-account-btn">Account</Link>
      </footer>
    </main>
  )
}

// login redirect 
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/Account" element={<Account />} />
      <Route path="/cities" element={<CitySearch />} />
    </Routes>
  )
}

export default App;
