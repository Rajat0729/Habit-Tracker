import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../services/api.js";

export default function SignupPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const isMobile = width < 820;

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

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
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
      } else {
        setSuccess("Account created successfully!");
        setTimeout(() => navigate("/login"), 1200);
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
        flexDirection: isMobile ? "column" : "row",
        height: "100vh",
        width: "100%",
        backgroundColor: "#0d1117",
        color: "white",
      }}
    >
      {/* LEFT SIDE — Branding */}
      <div
        style={{
          width: isMobile ? "100%" : "50%",
          padding: isMobile ? "30px 20px" : "60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          textAlign: isMobile ? "center" : "left",
          alignItems: isMobile ? "center" : "flex-start",
        }}
      >
        <img
          src="/graphimage.png"
          alt="Graph"
          style={{
            width: isMobile ? "65%" : "320px",
            maxWidth: "350px",
            marginBottom: "40px",
            opacity: 0.9,
          }}
        />

        <h1
          style={{
            fontSize: isMobile ? "32px" : "42px",
            fontWeight: 600,
          }}
        >
          HabitFlow:
        </h1>

        <h1
          style={{
            fontSize: isMobile ? "26px" : "36px",
            fontWeight: 700,
            marginTop: "10px",
            lineHeight: 1.3,
          }}
        >
          Master your days, <br /> visualize your success.
        </h1>

        <p
          style={{
            marginTop: "20px",
            color: "#aaa",
            fontSize: "15px",
            maxWidth: "420px",
          }}
        >
          A professional habit tracker built for consistency.
        </p>
      </div>

      {/* RIGHT SIDE — Registration Form */}
      <div
        style={{
          width: isMobile ? "100%" : "50%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: isMobile ? "20px 0" : "0",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: "#1c1f25",
            padding: isMobile ? "24px" : "30px",
            width: isMobile ? "88%" : "350px",
            borderRadius: "12px",
            boxShadow: "0px 2px 15px rgba(0,0,0,0.4)",
          }}
        >
          <h2
            style={{
              fontSize: "24px",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            Create account
          </h2>

          {/* EMAIL */}
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
              fontSize: "15px",
            }}
          />

          {/* PASSWORD */}
          <label style={{ fontSize: "14px" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "6px",
              marginBottom: "12px",
              borderRadius: "8px",
              border: "1px solid #333",
              backgroundColor: "#0f1115",
              color: "white",
              fontSize: "15px",
            }}
          />

          {/* CONFIRM PASSWORD */}
          <label style={{ fontSize: "14px" }}>Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "6px",
              marginBottom: "12px",
              borderRadius: "8px",
              border: "1px solid #333",
              backgroundColor: "#0f1115",
              color: "white",
              fontSize: "15px",
            }}
          />

          {/* STATUS MESSAGES */}
          {error && (
            <div style={{ color: "salmon", marginBottom: "10px" }}>{error}</div>
          )}
          {success && (
            <div style={{ color: "lightgreen", marginBottom: "10px" }}>
              {success}
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              backgroundColor: "#22c55e",
              padding: "12px",
              borderRadius: "8px",
              marginTop: "10px",
              fontSize: "16px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              color: "#04150d",
              transition: "0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#18a84c")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#22c55e")
            }
          >
            {loading ? "Creating..." : "Create account"}
          </button>

          {/* FOOTER */}
          <p
            style={{
              textAlign: "center",
              marginTop: "20px",
              color: "#ccc",
              fontSize: "14px",
            }}
          >
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#2ecc71", textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
