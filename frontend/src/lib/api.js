const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";

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
    throw new Error(accountBlockMessage(data) || data.error || "Login failed!");
  }
  return data;
}

// The backend answers a suspended/rejected/pending account with
// {code: "account_inactive", reason}. Turn that into words a person can act on.
export function accountBlockMessage(data) {
  if (!data || data.code !== "account_inactive") return null;
  return {
    suspended: "This account has been suspended. Contact StadiSpace on 0704 699683 if you think this is a mistake.",
    rejected: "This account was not approved. Contact StadiSpace on 0704 699683 for help.",
    awaiting_verification: "Check your inbox and click the link we sent to verify your email.",
    awaiting_approval: "Your facilitator account is waiting for approval.",
  }[data.reason] || data.detail;
}

// Exchange a Google/Microsoft access token for StadiSpace tokens. `role` only
// matters the first time (sign-up); for an existing account it is ignored.
export async function socialLogin(provider, accessToken, role) {
  const response = await fetch(`${API_URL}/auth/auth/${provider}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken, ...(role ? { role } : {}) }),
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    // allauth's refusal arrives wrapped as text inside non_field_errors.
    const wrapped = data.non_field_errors && data.non_field_errors[0];
    if (typeof wrapped === "string" && wrapped.trim().startsWith("{")) {
      try { data = { ...data, ...JSON.parse(wrapped), non_field_errors: undefined }; } catch {}
    }
    if (data.code === "email_exists") {
      throw new Error("An account with this email already exists. Sign in with your email and password instead.");
    }
    throw new Error(accountBlockMessage(data) || data.error || data.detail ||
      (data.non_field_errors && data.non_field_errors[0]) ||
      `${provider === "google" ? "Google" : "Microsoft"} sign-in failed. Try again.`);
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

// Fail fast instead of hanging forever on a slow/asleep backend. A request that
// never resolves leaves pages stuck and unresponsive after the tab has sat idle.
const REQUEST_TIMEOUT_MS = 25000;

function fetchWithTimeout(url, options = {}, ms = REQUEST_TIMEOUT_MS) {
  // Respect a caller-supplied AbortSignal (e.g. quiz submit) - don't override it.
  if (options.signal) return fetch(url, options);
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id),
  );
}

export async function refreshAccessToken(refreshToken) {
  const response = await fetchWithTimeout(`${API_URL}/auth/token/refresh/`, {
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
    return fetchWithTimeout(url, { ...options, headers });
  };

  let token = localStorage.getItem("accessToken");
  let response = await makeRequest(token);

  // Token expired - try to refresh once and retry
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

  // An account that is not active (unverified, suspended…) is refused
  // everywhere but its own profile - send the person to the screen that
  // explains why, instead of leaving a page half-loaded.
  if (response.status === 403) {
    try {
      const body = await response.clone().json();
      if (body && body.code === "account_inactive" &&
          !window.location.pathname.startsWith("/account-status")) {
        window.location.href = `/account-status?reason=${encodeURIComponent(body.reason || "")}`;
      }
    } catch {}
  }

  return response;
}
