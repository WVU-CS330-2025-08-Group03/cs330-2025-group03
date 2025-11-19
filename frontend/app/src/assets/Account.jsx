import React from "react";
import { useNavigate } from "react-router-dom";
import ChangePasswordForm from "../components/ChangePasswordForm";
import "./account.css";

export default function Account() {
  const navigate = useNavigate();

  return (
    <div className="account-page">
      <button className="back-button" onClick={() => navigate("/")}>
        ← Back
      </button>

      <header>
        <h1>Your Account</h1>
        <p>Manage your profile, preferences, and settings</p>
      </header>

      <div className="account-grid">
        {/* CARD 1 */}
        <div className="card">
          <h2>Profile Info</h2>

          <div className="profile-picture-container">
            <div className="profile-picture">
              <img
                src="/default-profile.jpg"
                alt="Profile"
              />
              <button className="change-picture-btn">Change</button>
            </div>
          </div>

          <div className="profile-info">
            <p><strong>Name:</strong> John Doe</p>
            <p><strong>Email:</strong> example@email.com</p>
          </div>

          <button>Edit Profile</button>
        </div>

        {/* CARD 2 */}
        <div className="card">
          <h2>Account Settings</h2>
          <p className="empty">No settings added yet.</p>
          <button>Add Settings</button>
        </div>

        {/* CARD 3 */}
        <div className="card">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
