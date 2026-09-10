import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  loginApi,
  registerApi,
  getMeApi,
  updateProfileApi,
  getStoredToken,
  setStoredToken,
  removeStoredToken,
} from "../services/authService";
import { MOCK_USERS } from "../data/mockData";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Keep legacy users directory for non-auth components (e.g., StaffKycReviewer)
  const [users, setUsers] = useState(() => {
    try {
      const stored = window.localStorage.getItem("rr_users");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return MOCK_USERS;
    } catch {
      return MOCK_USERS;
    }
  });

  // Verify stored JWT and restore user session on mount
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const data = await getMeApi(storedToken);
        if (isMounted && data?.user) {
          setUser(data.user);
          setToken(storedToken);
        } else {
          removeStoredToken();
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.warn("Session restore note:", err.message);
        removeStoredToken();
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Log in user against backend POST /api/auth/login.
   * Stores the returned JWT token and updates session user.
   */
  const login = useCallback(async (username, password) => {
    try {
      const data = await loginApi({ username: username.trim(), password });
      setToken(data.token);
      setUser(data.user);
      setStoredToken(data.token);
      return { success: true, user: data.user, token: data.token };
    } catch (err) {
      return {
        success: false,
        message: err.message || "Invalid username or password",
      };
    }
  }, []);

  /**
   * Register user against backend POST /api/auth/register.
   * Stores the returned JWT token and updates session user.
   */
  const signup = useCallback(async (customerData) => {
    try {
      const data = await registerApi(customerData);
      setToken(data.token);
      setUser(data.user);
      setStoredToken(data.token);
      return { success: true, user: data.user, token: data.token };
    } catch (err) {
      return {
        success: false,
        message: err.message || "Registration failed",
      };
    }
  }, []);

  /**
   * Log out user: clears JWT token and active user session.
   */
  const logout = useCallback(() => {
    removeStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Update profile using PUT /api/auth/me
   */
  const updateProfile = useCallback(
    async (updates) => {
      try {
        const data = await updateProfileApi(updates, token);
        if (data?.user) {
          setUser(data.user);
          return { success: true, user: data.user };
        }
        return { success: true };
      } catch (err) {
        // Fallback local update
        setUser((prev) => (prev ? { ...prev, ...updates } : null));
        return { success: false, message: err.message };
      }
    },
    [token]
  );

  /**
   * Google OAuth client-side handler
   */
  const loginWithGoogle = useCallback((googleProfile) => {
    const email = googleProfile.email?.trim().toLowerCase();
    if (!email) {
      return { success: false, message: "Invalid email from Google" };
    }

    const sessionUser = {
      _id: "google_" + (googleProfile.googleId || Date.now()),
      username: email.split("@")[0],
      name: googleProfile.name?.trim() || email.split("@")[0],
      role: "customer",
      email: email,
      phone: googleProfile.phone || "",
      int_Branch_Id: null,
      address: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
      avatar: googleProfile.picture || "",
      authProvider: "google",
      active: true,
    };

    setUser(sessionUser);
    return { success: true, user: sessionUser };
  }, []);

  const createStaff = useCallback((staffData) => {
    const newStaff = {
      username: staffData.username.trim(),
      name: staffData.name.trim(),
      role: "staff",
      int_Branch_Id: Number(staffData.int_Branch_Id),
      email: staffData.email?.trim() || "",
      phone: staffData.phone?.trim() || "",
      active: true,
    };
    setUsers((prev) => [...prev, newStaff]);
    return { success: true, staff: newStaff };
  }, []);

  const toggleStaffStatus = useCallback((username) => {
    setUsers((prev) =>
      prev.map((u) => (u.username === username ? { ...u, active: !u.active } : u))
    );
  }, []);

  const hasRole = useCallback(
    (roles) => {
      if (!user) return false;
      if (Array.isArray(roles)) return roles.includes(user.role);
      return user.role === roles;
    },
    [user]
  );

  const isAdmin = Boolean(user && user.role === "admin");
  const isStaff = Boolean(user && user.role === "staff");
  const isCustomer = Boolean(user && user.role === "customer");

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      users,
      login,
      loginWithGoogle,
      signup,
      logout,
      updateProfile,
      createStaff,
      toggleStaffStatus,
      hasRole,
      isAdmin,
      isStaff,
      isCustomer,
    }),
    [
      user,
      token,
      loading,
      users,
      login,
      loginWithGoogle,
      signup,
      logout,
      updateProfile,
      createStaff,
      toggleStaffStatus,
      hasRole,
      isAdmin,
      isStaff,
      isCustomer,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
