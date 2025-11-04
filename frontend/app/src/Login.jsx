import React, { useState } from "react";
import "./login.css";

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const showForm = (which) => {
    setIsLogin(which === "login");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      const result = await response.json();

      if (response.ok) {
        alert(isLogin ? "Login successful" : "Account created!");
        console.log("Server:", result);
      } else {
        alert(result.error || result.message || "Something went wrong.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div className="container">
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
  );
}

export default Login;