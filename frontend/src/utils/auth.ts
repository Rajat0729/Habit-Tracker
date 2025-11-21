// auth.ts
export const API_BASE = "http://localhost:5000"; // change if backend runs elsewhere

export function saveToken(token: string) {
  localStorage.setItem("hf_token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("hf_token");
}

export function clearToken() {
  localStorage.removeItem("hf_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
