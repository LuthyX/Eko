import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT to every outgoing request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired / invalid sessions globally.
// When the backend says "401 Unauthorized" — token expired, server restarted,
// bad signature, whatever — we wipe the stale token and bounce to /auth.
// Without this, the app gets stuck in a half-logged-in state where every
// API call silently fails and screens look broken.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect *from* the auth page itself — that creates an
      // infinite loop when login credentials are simply wrong.
      if (window.location.pathname !== "/auth") {
        localStorage.removeItem("token");
        // Hard navigation forces React to re-initialize state cleanly,
        // so isAuthenticated flips to false and routing resets.
        window.location.href = "/auth";
      }
    }
    return Promise.reject(error);
  },
);

// Reusable logout — import this in any component that needs a sign-out
// button. Keeps the token-clearing logic in one place.
export const logout = () => {
  localStorage.removeItem("token");
  window.location.href = "/auth";
};

export default apiClient;
