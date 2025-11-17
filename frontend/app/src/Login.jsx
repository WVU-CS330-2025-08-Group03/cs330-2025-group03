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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(""); // Clear error when user types
  };

  const showForm = (which) => {
    setIsLogin(which === "login");
    setError(""); // Clear error when switching forms
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
        // Redirect to city search page immediately after successful login/registration
        navigate("/cities");
      } else {
        console.error("Login failed:", result);
        setError(result.error || result.message || "Something went wrong.");
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
