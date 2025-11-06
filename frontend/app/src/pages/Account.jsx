import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Account.css';


export default function Account() {
  const navigate = useNavigate();
  // mock data for now
  const user = { name: 'Jane Doe', email: 'jane@example.com' };

  return (
    <div className="account-page">
      <header>
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1>Your Account</h1>
        <p>Manage profile, saved listings, and search preferences.</p>
        
      </header>

      <section className="account-grid">
        <div className="card">
          <h2>Profile</h2>
          <div className="profile-picture-container">
            <div className="profile-picture">
              <img src={user.profilePicture || '/default-avatar.png'} alt="Profile" />
              <button className="change-picture-btn">Change Picture</button>
            </div>
          </div>
          <div className="profile-info">
            <p>Name: {user.name}</p>
            <p>Email: {user.email}</p>
            <button>Edit profile</button>
          </div>
        </div>

        <div className="card">
          <h2>Saved Listings</h2>
          <p>No saved listings yet.</p>
        </div>

        <div className="card">
          <h2>Preferences</h2>
          <p>Default radius: 10 mi</p>
          <button>Edit preferences</button>
        </div>
      </section>
    </div>
  );
}
