// frontend/src/api.ts

import { getToken } from "../utils/auth.js";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * ✔ fetchWithAuth
 * - returns the raw Response object
 * - Dashboard will call res.ok, res.json() manually
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * ✔ request()
 * - wrapper that automatically does JSON + returns parsed data
 * - Used by login/register flows
 */
async function request(url: string, options: any = {}) {
  const res = await fetchWithAuth(url, options);
  return res.json();
}

/**
 * ✔ api object
 * - Optional high-level helpers if you prefer these instead of fetchWithAuth
 */
export const api = {
  login: (email: string, password: string) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getHabits: () => request("/habits", { method: "GET" }),

  createHabit: (name: string, description: string) =>
    request("/habits", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),

  deleteHabit: (id: string) =>
    request(`/habits/${id}`, { method: "DELETE" }),

  recordHabitCompletion: (id: string) =>
    request(`/habits/${id}/complete`, { method: "POST" }),
};
