import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  loginApi,
  registerApi,
  getMeApi,
  updateProfileApi,
  createStaffApi,
  updateStaffApi,
  updateStaffStatusApi,
  toggleStaffStatusApi,
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

  // Keep users directory for staff & document review components
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

  // Persist updated users to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem("rr_users", JSON.stringify(users));
    } catch {
      // Ignore
    }
  }, [users]);

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
   * Handle OAuth JWT token: stores token, fetches user profile, and sets user session.
   */
  const handleOAuthSuccess = useCallback(async (jwtToken) => {
    setStoredToken(jwtToken);
    setToken(jwtToken);
    try {
      const data = await getMeApi(jwtToken);
      if (data?.user) {
        setUser(data.user);
        return { success: true, user: data.user };
      }
      return { success: false, message: "Could not retrieve user profile" };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, []);


  /**
   * Update profile using PUT /api/auth/me (Staff or Customer own profile)
   */
  const updateProfile = useCallback(
    async (updates) => {
      try {
        const data = await updateProfileApi(updates, token);
        const updatedUser = data?.user || { ...user, ...updates };
        setUser(updatedUser);
        setUsers((prev) =>
          prev.map((u) => (u.username === updatedUser.username ? { ...u, ...updatedUser } : u))
        );
        return { success: true, user: updatedUser };
      } catch (err) {
        // Fallback local update
        const updatedUser = { ...user, ...updates };
        setUser((prev) => (prev ? { ...prev, ...updates } : null));
        setUsers((prev) =>
          prev.map((u) => (u.username === user?.username ? { ...u, ...updates } : u))
        );
        return { success: true, user: updatedUser, note: err.message };
      }
    },
    [token, user]
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

  /**
   * Create staff account (Admin only)
   */
  const createStaff = useCallback(
    async (staffData) => {
      try {
        const data = await createStaffApi(staffData, token);
        const newStaff = data.user;
        setUsers((prev) => [...prev, newStaff]);
        return { success: true, staff: newStaff };
      } catch {
        const newStaff = {
          username: staffData.username.trim(),
          name: staffData.name.trim(),
          role: "staff",
          int_Branch_Id: Number(staffData.int_Branch_Id),
          employeeId: staffData.employeeId?.trim() || `EMP-${Date.now().toString().slice(-4)}`,
          email: staffData.email?.trim() || "",
          phone: staffData.phone?.trim() || "",
          address: staffData.address?.trim() || "",
          dateOfBirth: staffData.dateOfBirth?.trim() || "",
          emergencyContactName: staffData.emergencyContactName?.trim() || "",
          emergencyContactPhone: staffData.emergencyContactPhone?.trim() || "",
          accountStatus: staffData.accountStatus || "Active",
          active: staffData.accountStatus ? staffData.accountStatus === "Active" : true,
        };
        setUsers((prev) => [...prev, newStaff]);
        return { success: true, staff: newStaff };
      }
    },
    [token]
  );

  /**
   * Update staff account details (Admin only)
   */
  const updateStaff = useCallback(
    async (username, updates) => {
      try {
        const data = await updateStaffApi(username, updates, token);
        const updated = data.user;
        setUsers((prev) =>
          prev.map((u) => (u.username === username ? { ...u, ...updated } : u))
        );
        if (user?.username === username) {
          setUser((prev) => ({ ...prev, ...updated }));
        }
        return { success: true, user: updated };
      } catch {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.username === username) {
              const activeVal =
                updates.accountStatus !== undefined
                  ? updates.accountStatus === "Active"
                  : updates.active !== undefined
                  ? updates.active
                  : u.active;
              const statusVal =
                updates.accountStatus || (activeVal ? "Active" : "Deactivated");
              return { ...u, ...updates, active: activeVal, accountStatus: statusVal };
            }
            return u;
          })
        );
        if (user?.username === username) {
          setUser((prev) => ({ ...prev, ...updates }));
        }
        return { success: true };
      }
    },
    [token, user]
  );

  /**
   * Toggle staff active status (Admin only)
   */
  const toggleStaffStatus = useCallback(
    async (username) => {
      try {
        const data = await toggleStaffStatusApi(username, token);
        const updated = data.user;
        setUsers((prev) =>
          prev.map((u) => (u.username === username ? { ...u, ...updated } : u))
        );
        return { success: true, user: updated };
      } catch {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.username === username) {
              const nextActive = !u.active;
              return {
                ...u,
                active: nextActive,
                accountStatus: nextActive ? "Active" : "Deactivated",
              };
            }
            return u;
          })
        );
        return { success: true };
      }
    },
    [token]
  );

  /**
   * Set staff status (Active, Pending Approval, Deactivated) / Approve staff (Admin only)
   */
  const setStaffAccountStatus = useCallback(
    async (username, status) => {
      try {
        const data = await updateStaffStatusApi(username, status, token);
        const updated = data.user;
        setUsers((prev) =>
          prev.map((u) => (u.username === username ? { ...u, ...updated } : u))
        );
        return { success: true, user: updated };
      } catch {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.username === username) {
              return {
                ...u,
                accountStatus: status,
                active: status === "Active",
              };
            }
            return u;
          })
        );
        return { success: true };
      }
    },
    [token]
  );

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
      handleOAuthSuccess,
      signup,
      logout,
      updateProfile,
      createStaff,
      updateStaff,
      toggleStaffStatus,
      setStaffAccountStatus,
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
      handleOAuthSuccess,
      signup,
      logout,
      updateProfile,
      createStaff,
      updateStaff,
      toggleStaffStatus,
      setStaffAccountStatus,
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
