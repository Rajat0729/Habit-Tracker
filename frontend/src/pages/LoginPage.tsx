import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // TEMP behavior (replace with backend later)
    if (email && password) {
      navigate("/dashboard");
    }
  }

  return (
    <div className="login-container">

      {/* LEFT PANEL */}
      <div className="left-panel">
        <img src="/graphimage.png" alt="Graph" className="graph-img" />

        <h1 className="title">HabitFlow:</h1>
        <h1 className="subtitle">
          Master your days,
          <br /> visualize your success.
        </h1>

        <p className="tagline">
          A professional habit tracker built for consistency.
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2 className="card-title">Sign In</h2>

          <label className="label">Email Address</label>
          <input
            type="email"
            className="input-box"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="label">Password</label>
          <input
            type="password"
            className="input-box"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="forgot-wrapper">
            <a className="forgot" href="#">Forgot password?</a>
          </div>

          <button type="submit" className="login-btn">
            Sign In
          </button>

          <p className="register-text">
            Don't have an account? <a href="#">Register</a>
          </p>
        </form>
      </div>
    </div>
  );
}
