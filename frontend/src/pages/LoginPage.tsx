import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../services/api.js";
import { saveToken } from "../utils/auth.js";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      if (data.token) {
        saveToken(data.token);
        navigate("/dashboard");
      } else {
        setError("No token returned by server.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        backgroundColor: "#0d1117",
        color: "white",
      }}
    >
      {}
      <div
        style={{
          width: "50%",
          padding: "60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <img
          src="/graphimage.png"
          alt="Graph"
          style={{
            width: "350px",
            marginBottom: "40px",
            opacity: 0.9,
          }}
        />

        <h1 style={{ fontSize: "42px", fontWeight: 600 }}>HabitFlow:</h1>

        <h1 style={{ fontSize: "36px", fontWeight: 700, marginTop: "10px" }}>
          Master your days, <br /> visualize your success.
        </h1>

        <p style={{ marginTop: "20px", color: "#aaa", fontSize: "15px" }}>
          A professional habit tracker built for consistency.
        </p>
      </div>

      {}
      <div
        style={{
          width: "50%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: "#1c1f25",
            padding: "30px",
            width: "350px",
            borderRadius: "12px",
            boxShadow: "0px 4px 18px rgba(0,0,0,0.45)",
          }}
        >
          <h2 style={{ fontSize: "24px", marginBottom: "20px" }}>Sign In</h2>

          <label style={{ fontSize: "14px" }}>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "6px",
              marginBottom: "12px",
              borderRadius: "8px",
              border: "1px solid #333",
              backgroundColor: "#0f1115",
              color: "white",
            }}
          />

          <label style={{ fontSize: "14px" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "6px",
              marginBottom: "12px",
              borderRadius: "8px",
              border: "1px solid #333",
              backgroundColor: "#0f1115",
              color: "white",
            }}
          />

          <div style={{ display: "flex", justifyContent: "end" }}>
            <a
              href="#"
              style={{
                fontSize: "13px",
                marginBottom: "10px",
                color: "#82b6ff",
                textDecoration: "none",
              }}
            >
              Forgot password?
            </a>
          </div>

          {error && (
            <div style={{ color: "salmon", marginBottom: "10px" }}>{error}</div>
          )}

          <button
            type="submit"
            className="w-full bg-(--accent) py-3 rounded-md mt-5 text-base font-semibold hover:bg-[#18a84c]"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p
            style={{
              textAlign: "center",
              marginTop: "20px",
              color: "#ccc",
              fontSize: "14px",
            }}
          >
            Don't have an account?{" "}
            <Link to="/signup" style={{ color: "#2ecc71", textDecoration: "none" }}>
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
