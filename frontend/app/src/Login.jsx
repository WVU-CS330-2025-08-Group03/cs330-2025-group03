import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";

function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(""); // Clear error when user types
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;

    try {
      const response = await fetch("/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: unverifiedEmail }),
      });

      const result = await response.json();

      if (response.ok) {
        setError("Verification email resent! Check your inbox.");
        setEmailNotVerified(false);
      } else {
        setError(result.error || "Failed to resend verification email.");
      }
    } catch (error) {
      console.error("Resend error:", error);
      setError("Cannot connect to server. Please try again.");
    }
  };

  const showForm = (which) => {
    setIsLogin(which === "login");
    setError(""); // Clear error when switching forms
    setEmailNotVerified(false);
    setRegistrationSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    const { username, email, password } = formData;
    // Backend routes are under /auth; Vite proxy will forward to the backend port during dev
    const endpoint = isLogin ? "/auth/login" : "/auth/register";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // allow HTTP-only auth cookie
        body: JSON.stringify(
          isLogin ? { username, password } : { username, email, password }
        ),
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Response data:", result);

      if (response.ok) {
        console.log("Server:", result);
        // Check if it's registration or login
        if (!isLogin) {
          // Registration successful
          setRegistrationSuccess(true);
          setFormData({ username: "", email: "", password: "" });
          setError("");
        } else {
          // Login successful
          navigate("/cities");
        }
      } else {
        console.error("Login failed:", result);
        // Check if email verification is required
        if (result.code === "EMAIL_NOT_VERIFIED") {
          setEmailNotVerified(true);
          setUnverifiedEmail(formData.username); // Use username from form or email
          setError("");
        } else {
          setError(result.error || result.message || "Something went wrong.");
          setEmailNotVerified(false);
        }
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setError("Cannot connect to server. Please ensure the backend is running.");
    }
  };

  return (
    <div className="container">
      <div className="auth-card">
        <div className="toggle-buttons">
          <button
            className={isLogin ? "active" : ""}
            onClick={() => showForm("login")}
          >
            Login
          </button>
          <button
            className={!isLogin ? "active" : ""}
            onClick={() => showForm("signup")}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {registrationSuccess && (
          <div className="registration-success-notice">
            <h3>✓ Registration Successful!</h3>
            <p>We've sent a verification email to <strong>{formData.email}</strong></p>
            <p>Please check your inbox and click the verification link to complete your registration.</p>
            <p className="small-text">Once verified, you'll be able to log in to your account.</p>
          </div>
        )}

        {emailNotVerified && (
          <div className="email-verification-notice">
            <h3>Email Verification Required</h3>
            <p>We sent a verification email to your inbox</p>
            <p>Please verify your email before logging in.</p>
            <button
              type="button"
              className="resend-button"
              onClick={handleResendVerification}
            >
              Resend Verification Email
            </button>
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleSubmit} className="active">
            <h2>Login</h2>
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit">Login</button>
          <div className="switch">
            Don’t have an account?{" "}
            <a onClick={() => showForm("signup")}>Sign up</a>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit}>
          <h2>Sign Up</h2>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit">Create Account</button>
          <div className="switch">
            Already have an account?{" "}
            <a onClick={() => showForm("login")}>Login</a>
          </div>
        </form>
      )}
      </div>
    </div>
  );
}

export default Login;
