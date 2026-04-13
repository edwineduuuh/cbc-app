"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  login as loginAPI,
  register as registerAPI,
  getCurrentUser,
  refreshAccessToken,
} from "@/lib/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Wrap a promise with a timeout so the app never hangs on a sleeping backend
  const withTimeout = (promise, ms = 10000) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), ms),
      ),
    ]);

  // Check and load user on mount
  const initializeAuth = useCallback(async () => {
    setLoading(true);
    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      setLoading(false);
      return;
    }

    // Immediately show cached user so the app isn't stuck on a spinner
    const cachedUser = localStorage.getItem("user");
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch (_) {
        /* corrupt cache — ignore */
      }
    }

    try {
      const userData = await withTimeout(getCurrentUser(accessToken));
      const quotaInfo = await withTimeout(fetchQuotaInfo(accessToken));
      const fullUser = { ...userData, ...quotaInfo };
      setUser(fullUser);
      localStorage.setItem("user", JSON.stringify(fullUser));
    } catch (error) {
      // If we already set a cached user above, don't blow it away —
      // just try a token refresh in case the access token expired.
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const { access } = await withTimeout(
            refreshAccessToken(refreshToken),
          );
          localStorage.setItem("accessToken", access);
          const refreshedUser = await withTimeout(getCurrentUser(access));
          const quotaInfo = await withTimeout(fetchQuotaInfo(access));
          const fullUser = { ...refreshedUser, ...quotaInfo };
          setUser(fullUser);
          localStorage.setItem("user", JSON.stringify(fullUser));
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          // Only log out if we have NO cached user to fall back on
          if (!cachedUser) logout();
        }
      } else if (!cachedUser) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Fetch user quota info
  const fetchQuotaInfo = async (token) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/credits/status/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const quotaData = await response.json();
        return quotaData;
      }
    } catch (error) {
      console.error("Failed to fetch quota:", error);
    }
    return null;
  };
  // Redirect based on role after login/register
  const redirectByRole = (userData) => {
    if (!userData) return "/login";

    if (
      userData.is_superuser ||
      userData.is_staff ||
      userData.role === "admin" ||
      userData.role === "super_admin" ||
      userData.role === "superadmin" ||
      userData.role === "teacher" ||
      userData.role === "school_admin"
    ) {
      return "/admin";
    } else {
      return "/dashboard";
    }
  };

  const login = async (credentials) => {
    try {
      const data = await loginAPI(credentials);

      localStorage.setItem("accessToken", data.tokens.access);
      localStorage.setItem("refreshToken", data.tokens.refresh);

      // Fetch full user data
      // Fetch full user data
      const userData = await getCurrentUser(data.tokens.access);
      const quotaInfo = await fetchQuotaInfo(data.tokens.access);

      const fullUser = { ...userData, ...quotaInfo };
      setUser(fullUser);
      localStorage.setItem("user", JSON.stringify(fullUser)); // SAVE TO LOCALSTORAGE

      // Route based on role - covers all admin variants
      const adminRoles = ["admin", "super_admin", "superadmin", "school_admin"];
      if (
        adminRoles.includes(userData.role) ||
        userData.role === "teacher" ||
        userData.is_staff ||
        userData.is_superuser
      ) {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message || "Login failed" };
    }
  };

  const register = async (userData) => {
    try {
      const data = await registerAPI(userData);

      localStorage.setItem("accessToken", data.tokens.access);
      localStorage.setItem("refreshToken", data.tokens.refresh);

      const fullUser = await getCurrentUser(data.tokens.access);
      setUser(fullUser);

      const redirectPath = redirectByRole(fullUser);
      router.push(redirectPath);

      return { success: true };
    } catch (error) {
      console.error("Register error:", error);
      return { success: false, error: error.message || "Registration failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login"); // ← CORRECT
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
