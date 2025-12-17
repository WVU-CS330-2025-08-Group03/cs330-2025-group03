import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Account.css";
import { API_BASE_URL } from "./config";

export default function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [editForm, setEditForm] = useState({ username: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setEditForm({ username: data.user.username, email: data.user.email || '' });
          if (data.user.profile_image) {
            setProfileImage(data.user.profile_image);
          }
          // Fetch favorites after getting user
          fetchFavorites();
        } else {
          // Not logged in, redirect to login
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
    if (!user || !user.username) return "U";
    return user.username.substring(0, 1).toUpperCase();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageData = reader.result;
        setProfileImage(imageData);
        
        // Save image immediately
        try {
          const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
              username: user.username, 
              email: user.email,
              profile_image: imageData 
            })
          });

          if (response.ok) {
            const data = await response.json();
            setUser({ ...user, profile_image: imageData });
          }
        } catch (error) {
          console.error("Error saving profile image:", error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditFormChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdateMessage('');
    setUpdateError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...editForm, profile_image: profileImage })
      });

      const data = await response.json();

      if (response.ok) {
        setUser({ ...user, ...editForm });
        setUpdateMessage('Profile updated successfully!');
        setIsEditingProfile(false);
        setTimeout(() => setUpdateMessage(''), 3000);
      } else {
        setUpdateError(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setUpdateError('Cannot connect to server');
    }
  };

  const handlePasswordFormChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordMessage('Password changed successfully!');
        setIsChangingPassword(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setPasswordMessage(''), 3000);
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError('Cannot connect to server');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
      navigate('/login');
    }
  };

  if (loading) {
    return <div className="account-page"><p>Loading...</p></div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="account-page">
      <button className="back-button" onClick={() => navigate(-1)}>
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
              {profileImage ? (
                <img src={profileImage} alt="Profile" />
              ) : (
                <div className="profile-initials">
                  {getUserInitials()}
                </div>
              )}
              <input 
                type="file" 
                id="profile-image-upload" 
                accept="image/*" 
                style={{ display: 'none' }}
                onChange={handleImageChange}
              />
              <button 
                className="change-picture-btn"
                onClick={() => document.getElementById('profile-image-upload').click()}
              >
                Change
              </button>
            </div>
          </div>

          {updateMessage && <div className="success-message">{updateMessage}</div>}
          {updateError && <div className="error-message">{updateError}</div>}

          {isEditingProfile ? (
            <form onSubmit={handleUpdateProfile} className="edit-profile-form">
              <div className="form-field">
                <label>Username:</label>
                <input
                  type="text"
                  name="username"
                  value={editForm.username}
                  onChange={handleEditFormChange}
                  required
                />
              </div>
              <div className="form-field">
                <label>Email:</label>
                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleEditFormChange}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn">Save Changes</button>
                <button type="button" className="cancel-btn" onClick={() => setIsEditingProfile(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div className="profile-info">
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Email:</strong> {user.email || 'Not provided'}</p>
              <button onClick={() => setIsEditingProfile(true)}>Edit Profile</button>
            </div>
          )}
        </div>

        {/* CARD 2 - Favorite Cities */}
        <div className="card favorites-card">
          <h2>❤️ Favorite Cities ({favorites.length})</h2>
          {favorites.length > 0 ? (
            <div className="favorites-list">
              {favorites.map((fav) => (
                <div key={fav.id} className="favorite-item">
                  <div className="favorite-info">
                    <strong>{fav.city_name}, {fav.state_code}</strong>
                    <small>Pop: {fav.population?.toLocaleString()}</small>
                  </div>
                  <button 
                    className="remove-favorite-btn"
                    onClick={() => removeFavorite(fav.city_id)}
                    title="Remove from favorites"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">No favorite cities yet. Search for cities and add them to your favorites!</p>
          )}
          <button onClick={() => navigate('/cities')}>Browse Cities</button>
        </div>

        {/* CARD 3 */}
        <div className="card">
          <h2>Account Settings</h2>

          {passwordMessage && <div className="success-message">{passwordMessage}</div>}
          {passwordError && <div className="error-message">{passwordError}</div>}

          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <strong>Password</strong>
                <small>Change your password</small>
              </div>
              <button 
                className="setting-btn"
                onClick={() => setIsChangingPassword(!isChangingPassword)}
              >
                {isChangingPassword ? 'Cancel' : 'Change'}
              </button>
            </div>

            {isChangingPassword && (
              <form onSubmit={handleChangePassword} className="password-change-form">
                <div className="form-field">
                  <label>Current Password:</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordFormChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>New Password:</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordFormChange}
                    required
                    minLength={6}
                  />
                </div>
                <div className="form-field">
                  <label>Confirm New Password:</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordFormChange}
                    required
                    minLength={6}
                  />
                </div>
                <button type="submit" className="save-btn">Update Password</button>
              </form>
            )}
          </div>

          <div className="logout-section">
            <button className="logout-btn" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
