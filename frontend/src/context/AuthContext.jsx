/* eslint-disable no-unused-vars */
import React, { createContext, useState, useContext, useEffect, useRef } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mfaStep, setMfaStep] = useState(null);
  const [tempToken, setTempToken] = useState(null);
  const [faceData, setFaceData] = useState(null);
  const [hasFaceRegistered, setHasFaceRegistered] = useState(false);
  
  // Use ref to prevent multiple auth checks
  const authCheckPerformed = useRef(false);

  useEffect(() => {
    // Only run auth check once
    if (!authCheckPerformed.current) {
      authCheckPerformed.current = true;
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");

      console.log("🔍 Checking auth status on page load/refresh...");
      console.log("   Access token exists:", !!token);
      console.log("   Refresh token exists:", !!refreshToken);

      // If no tokens, clear user immediately
      if (!token || !refreshToken) {
        console.log("❌ No tokens found, user not authenticated");
        setUser(null);
        setLoading(false);
        return;
      }

      // Try to get user profile with existing token
      let userData = null;
      let profileFetchSuccess = false;
      
      try {
        userData = await authService.getProfile();
        if (userData && userData.email) {
          profileFetchSuccess = true;
          console.log("✅ User authenticated from token:", userData?.email);
          setUser(userData);
        }
      } catch (error) {
        console.error("❌ Token validation failed:", error);
        profileFetchSuccess = false;
      }

      // If profile fetch failed, try to refresh token
      if (!profileFetchSuccess) {
        try {
          console.log("🔄 Attempting to refresh token...");
          const refreshResponse = await authService.refreshToken();

          if (refreshResponse && refreshResponse.success) {
            console.log("✅ Token refreshed successfully");
            // Get user data with new token
            userData = await authService.getProfile();
            if (userData && userData.email) {
              setUser(userData);
              profileFetchSuccess = true;
            }
          } else {
            throw new Error("Refresh failed");
          }
        } catch (refreshError) {
          console.error("❌ Token refresh failed, clearing storage");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          localStorage.removeItem("tempToken");
          localStorage.removeItem("faceToken");
          setUser(null);
          setLoading(false);
          return;
        }
      }

      // If we have user data, check face status
      if (profileFetchSuccess && userData) {
        try {
          const faceStatus = await authService.getFaceStatus();
          setHasFaceRegistered(faceStatus.has_face_registered || false);
          console.log("👤 Face registered:", faceStatus.has_face_registered);
        } catch (error) {
          console.error("Failed to check face status:", error);
          setHasFaceRegistered(false);
        }
      }
      
    } catch (error) {
      console.error("Auth status check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log("🔐 Auth check completed, loading:", false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log("Attempting login with:", email);
      const response = await authService.login(email, password);

      console.log("Login response:", response);

      if (response.success) {
        setMfaStep("otp");
        setTempToken(response.temp_token);
        return response;
      } else {
        throw new Error(response.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw new Error(
        error.response?.data?.message || "Login failed. Please try again.",
      );
    }
  };

  const verifyOtp = async (otp, skipFace = false) => {
    try {
      console.log("Verifying OTP:", otp, "Skip face:", skipFace);
      const response = await authService.verifyOtp(otp, tempToken, skipFace);

      if (response.success) {
        // Check if face verification is required
        const faceRequired = response.face_required === true;
        const hasFace = response.has_face_registered === true;

        setHasFaceRegistered(hasFace);

        if (faceRequired && hasFace) {
          // User has face registered and must verify
          setMfaStep("face");
          setTempToken(response.face_verification_token);
        } else if (response.access_token) {
          // Login completed (no face required)
          localStorage.setItem("accessToken", response.access_token);
          localStorage.setItem("refreshToken", response.refresh_token);
          if (response.user) {
            localStorage.setItem("user", JSON.stringify(response.user));
          }
          setUser(response.user);
          setMfaStep(null);
          setTempToken(null);
        } else if (response.face_verification_token) {
          // Face verification token received (for users with face)
          setMfaStep("face");
          setTempToken(response.face_verification_token);
        }

        return response;
      } else {
        throw new Error(response.message || "OTP verification failed");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      throw new Error(
        error.response?.data?.message || "OTP verification failed",
      );
    }
  };

  const verifyFace = async (faceImage, token) => {
    try {
      console.log("Verifying face with image data");

      // Store face data for potential registration or future use
      setFaceData(faceImage);

      const response = await authService.verifyFace(
        faceImage,
        token || tempToken,
      );
      console.log("Face verification response in context:", response);

      if (response && response.success === true) {
        // Tokens are stored in authService.verifyFace
        setUser(response.user);
        setMfaStep(null);
        setTempToken(null);
        setHasFaceRegistered(true);

        // Clear face data after successful verification
        setFaceData(null);

        return response;
      } else {
        throw new Error(response?.message || "Face verification failed");
      }
    } catch (error) {
      console.error("Face verification error in context:", error);
      setFaceData(null);
      throw error;
    }
  };

  const skipFace = async (token) => {
    try {
      console.log("Skipping face verification...");
      const response = await authService.skipFace(token || tempToken);

      if (response.success) {
        localStorage.setItem("accessToken", response.access_token);
        localStorage.setItem("refreshToken", response.refresh_token);
        if (response.user) {
          localStorage.setItem("user", JSON.stringify(response.user));
        }
        setUser(response.user);
        setMfaStep(null);
        setTempToken(null);
        setHasFaceRegistered(false);
        return response;
      } else {
        throw new Error(response.message || "Failed to skip face verification");
      }
    } catch (error) {
      console.error("Skip face error:", error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      console.log("Registering user with data:", {
        ...userData,
        password: "***",
        face_image: userData.face_image ? "Base64 image data" : "No face image",
      });

      const response = await authService.register(userData);

      if (response.success) {
        console.log("User registered successfully:", response.user.email);

        if (response.has_face_registered) {
          setHasFaceRegistered(true);
        }

        return response;
      } else {
        throw new Error(response.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const registerWithFace = async (userData, faceImage) => {
    try {
      console.log("Registering user with face data");

      const registrationData = {
        ...userData,
        face_image: faceImage,
      };

      const response = await authService.register(registrationData);
      return response;
    } catch (error) {
      console.error("Registration with face error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log("🔄 Logging out...");
      await authService.logout();
      console.log("✅ Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always clear local state regardless of API response
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("tempToken");
      localStorage.removeItem("faceToken");
      setUser(null);
      setMfaStep(null);
      setTempToken(null);
      setFaceData(null);
      setHasFaceRegistered(false);
    }
  };

  const resetMfaFlow = () => {
    setMfaStep(null);
    setTempToken(null);
    setFaceData(null);
  };

  const getFaceVerificationStatus = () => {
    return hasFaceRegistered ? "available" : "not_registered";
  };

  const refreshTokens = async () => {
    try {
      console.log("🔄 Manually refreshing tokens...");
      const response = await authService.refreshToken();

      if (response.success) {
        console.log("✅ Tokens refreshed successfully");
        return response;
      } else {
        throw new Error("Token refresh failed");
      }
    } catch (error) {
      console.error("❌ Manual token refresh failed:", error);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setUser(null);
      throw error;
    }
  };

  const isAuthenticated = () => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    return !!(accessToken && refreshToken && user);
  };

  const getCurrentTokens = () => {
    return {
      accessToken: localStorage.getItem("accessToken"),
      refreshToken: localStorage.getItem("refreshToken"),
      hasUser: !!user,
    };
  };

  // Helper function to verify current token without redirecting
  const verifyCurrentToken = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        return { valid: false };
      }

      const response = await fetch(
        "http://localhost:5000/api/auth/check-token",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      return { valid: data.success, claims: data.claims };
    } catch (error) {
      console.error("Token verification error:", error);
      return { valid: false };
    }
  };

  // Helper function to debug token claims
  const debugTokenClaims = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.log("No token found");
      return null;
    }
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(base64));
      console.log("Token claims:", payload);
      return payload;
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  };

  // ===== PROFILE MANAGEMENT METHODS =====

  // Change user password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      console.log("🔐 Changing password...");
      const response = await authService.changePassword(
        currentPassword,
        newPassword,
      );
      if (response.success) {
        console.log("✅ Password changed successfully");
        return response;
      } else {
        throw new Error(response.message || "Password change failed");
      }
    } catch (error) {
      console.error("❌ Password change error:", error);
      throw error;
    }
  };

  // Update notification preferences
  const updateNotificationPreferences = async (preferences) => {
    try {
      console.log("🔔 Updating notification preferences...");
      const response =
        await authService.updateNotificationPreferences(preferences);
      if (response.success) {
        console.log("✅ Notification preferences updated");
        return response;
      } else {
        throw new Error(response.message || "Failed to update preferences");
      }
    } catch (error) {
      console.error("❌ Update preferences error:", error);
      throw error;
    }
  };

  // Get notification preferences
  const getNotificationPreferences = async () => {
    try {
      const response = await authService.getNotificationPreferences();
      return response;
    } catch (error) {
      console.error("❌ Get preferences error:", error);
      return {
        success: true,
        preferences: {
          security_alerts: true,
          login_notifications: true,
          promotional_emails: false,
        },
      };
    }
  };

  // Deactivate account
  const deactivateAccount = async (reason = "") => {
    try {
      console.log("🔒 Deactivating account...");
      const response = await authService.deactivateAccount(reason);
      if (response.success) {
        console.log("✅ Account deactivated");
        // Clear local session
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        setUser(null);
        return response;
      } else {
        throw new Error(response.message || "Failed to deactivate account");
      }
    } catch (error) {
      console.error("❌ Deactivate account error:", error);
      throw error;
    }
  };

  // Delete account permanently
  const deleteAccount = async (confirmation) => {
    try {
      console.log("🗑️ Deleting account...");
      const response = await authService.deleteAccount(confirmation);
      if (response.success) {
        console.log("✅ Account deleted");
        // Clear all local storage
        localStorage.clear();
        setUser(null);
        return response;
      } else {
        throw new Error(response.message || "Failed to delete account");
      }
    } catch (error) {
      console.error("❌ Delete account error:", error);
      throw error;
    }
  };

  // Export user data
  const exportUserData = async () => {
    try {
      console.log("📤 Exporting user data...");
      const response = await authService.exportUserData();
      if (response.success) {
        console.log("✅ Data exported successfully");
        return response;
      } else {
        throw new Error(response.message || "Failed to export data");
      }
    } catch (error) {
      console.error("❌ Export data error:", error);
      throw error;
    }
  };

  // Get login history
  const getLoginHistory = async (limit = 50) => {
    try {
      const response = await authService.getLoginHistory(limit);
      return response;
    } catch (error) {
      console.error("❌ Get login history error:", error);
      return { success: true, history: [] };
    }
  };

  // Get backup codes
  const getBackupCodes = async () => {
    try {
      const response = await authService.getBackupCodes();
      return response;
    } catch (error) {
      console.error("❌ Get backup codes error:", error);
      return { success: true, has_codes: false };
    }
  };

  // Generate backup codes
  const generateBackupCodes = async () => {
    try {
      console.log("🔑 Generating backup codes...");
      const response = await authService.generateBackupCodes();
      if (response.success) {
        console.log("✅ Backup codes generated");
        return response;
      } else {
        throw new Error(response.message || "Failed to generate backup codes");
      }
    } catch (error) {
      console.error("❌ Generate backup codes error:", error);
      throw error;
    }
  };

  // Update face preference
  const updateFacePreference = async (preference) => {
    try {
      console.log("🎭 Updating face preference:", preference);
      const response = await authService.updateFacePreference(preference);
      if (response.success) {
        console.log("✅ Face preference updated");
        return response;
      } else {
        throw new Error(response.message || "Failed to update face preference");
      }
    } catch (error) {
      console.error("❌ Update face preference error:", error);
      throw error;
    }
  };

  // Get face preference
  const getFacePreference = () => {
    return authService.getFacePreference();
  };

  const value = {
    // State
    user,
    loading,
    mfaStep,
    tempToken,
    faceData,
    hasFaceRegistered,

    // Auth Actions
    login,
    verifyOtp,
    verifyFace,
    skipFace,
    register,
    registerWithFace,
    logout,
    checkAuthStatus,
    resetMfaFlow,
    getFaceVerificationStatus,
    refreshTokens,
    isAuthenticated,
    getCurrentTokens,
    verifyCurrentToken,
    debugTokenClaims,

    // Profile Management Actions
    changePassword,
    updateNotificationPreferences,
    getNotificationPreferences,
    deactivateAccount,
    deleteAccount,
    exportUserData,
    getLoginHistory,
    getBackupCodes,
    generateBackupCodes,
    updateFacePreference,
    getFacePreference,

    // Setters
    setUser,
    setMfaStep,
    setHasFaceRegistered,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};