// SignupPage.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./LoginPage.css"; // reuse same styles for consistency
import { API_BASE } from "../utils/auth.js";

export default function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Registration failed");
      } else {
        // success
        setSuccess("Registration successful. You can now log in.");
        // optionally redirect to login after a delay
        setTimeout(() => navigate("/login"), 1200);
      }
    } catch (err) {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="left-panel">
        <img src="/graphimage.png" alt="Graph" className="graph-img" />
        <h1 className="title">HabitFlow:</h1>
        <h1 className="subtitle">
          Master your days,
          <br /> visualize your success.
        </h1>
        <p className="tagline">A professional habit tracker built for consistency.</p>
      </div>

      <div className="right-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2 className="card-title">Create account</h2>

          <label className="label">Email Address</label>
          <input
            type="email"
            className="input-box"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label className="label">Password</label>
          <input
            type="password"
            className="input-box"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <label className="label">Confirm Password</label>
          <input
            type="password"
            className="input-box"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />

          {error && <div style={{ color: "salmon", marginBottom: 8 }}>{error}</div>}
          {success && <div style={{ color: "lightgreen", marginBottom: 8 }}>{success}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>

          <p className="register-text">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
