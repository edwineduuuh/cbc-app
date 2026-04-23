const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

export async function register(userData) {
  const response = await fetch(`${API_URL}/auth/register/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    // DRF returns field-level errors like {"username": ["Already exists"]}
    // Pass them through as a JSON string so the register page can parse them
    if (typeof data === "object" && !data.error) {
      throw new Error(JSON.stringify(data));
    }
    throw new Error(data.error || data.detail || "Registration failed");
  }
  return data;
}

// Login user..
export async function login(credentials) {
  const resposne = await fetch(`${API_URL}/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await resposne.json();

  if (!resposne.ok) {
    throw new Error(data.error || "Login failed!");
  }
  return data;
}

// Get current use details
export async function getCurrentUser(accessToken) {
  const response = await fetch(`${API_URL}/auth/me/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to get user");
  }
  return data;
}

export async function refreshAccessToken(refreshToken) {
  const response = await fetch(`${API_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Token refresh failed");
  }
  return data;
}
// ─── Central authenticated fetch with auto token refresh ──────────────────────
export async function fetchWithAuth(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const makeRequest = (token) => {
    const headers = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(url, { ...options, headers });
  };

  let token = localStorage.getItem("accessToken");
  let response = await makeRequest(token);

  // Token expired — try to refresh once and retry
  if (response.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      window.location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }

    try {
      const refreshed = await refreshAccessToken(refreshToken);
      localStorage.setItem("accessToken", refreshed.access);
      token = refreshed.access;
      response = await makeRequest(token); // retry with new token
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }
  }

  return response;
}
