/* ./components/auth/authService.jsx */
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Log request for debugging
  console.log(`📤 ${config.method?.toUpperCase()} request to: ${config.url}`);
  return config;
});

// Track if refresh is already in progress
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Handle errors with proper refresh token logic
api.interceptors.response.use(
  (response) => {
    console.log(`📥 Response from ${response.config.url}:`, response.status);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // SPECIAL: Do NOT trigger auth failure for face verification failures
    if (originalRequest?.url?.includes("/verify-face")) {
      console.log("🧪 Face verification failed - NOT redirecting to login");
      return Promise.reject(error);
    }

    // SPECIAL: Skip for password reset endpoints
    if (
      originalRequest?.url?.includes("/verify-reset-token") ||
      originalRequest?.url?.includes("/reset-password") ||
      originalRequest?.url?.includes("/forgot-password")
    ) {
      console.log("🔑 Password reset endpoint - NOT redirecting to login");
      return Promise.reject(error);
    }

    // Log detailed error information
    if (error.response) {
      console.error(
        `❌ API Error: ${error.response.status} - ${error.response.statusText}`,
      );
      console.error(`   URL: ${originalRequest?.url}`);
      console.error(`   Method: ${originalRequest?.method?.toUpperCase()}`);
      console.error(`   Response data:`, error.response.data);
    } else if (error.request) {
      console.error(
        `❌ No response received from server for: ${originalRequest?.url}`,
      );
    } else {
      console.error(`❌ Request setup error: ${error.message}`);
    }

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh for these endpoints
      if (
        originalRequest?.url?.includes("/login") ||
        originalRequest?.url?.includes("/register")
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          console.log("🔄 Attempting to refresh token...");

          // Make refresh request WITHOUT the access token in header
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${refreshToken}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (refreshResponse.data && refreshResponse.data.success) {
            const newAccessToken = refreshResponse.data.access_token;
            console.log("✅ Token refreshed successfully");

            // Store new access token
            localStorage.setItem("accessToken", newAccessToken);

            // Update the default Authorization header for all future requests
            api.defaults.headers.common["Authorization"] =
              `Bearer ${newAccessToken}`;

            // Update the Authorization header for the original request
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            // Process queued requests
            processQueue(null, newAccessToken);

            // Retry the original request
            return api(originalRequest);
          } else {
            console.error("❌ Token refresh failed - invalid response");
            processQueue(error, null);
            handleAuthFailure();
            return Promise.reject(error);
          }
        } catch (refreshError) {
          console.error("❌ Token refresh failed:", refreshError);
          processQueue(refreshError, null);
          handleAuthFailure();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token available
        console.log("🔒 No refresh token available");
        handleAuthFailure();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

// Helper function to handle authentication failures
function handleAuthFailure() {
  console.log("🔒 Authentication failed, redirecting to login...");

  // Don't redirect if we're already on auth pages
  const currentPath = window.location.pathname;
  const authPages = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];

  if (authPages.includes(currentPath)) {
    console.log("Already on auth page, not redirecting");
    return;
  }

  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("tempToken");
  localStorage.removeItem("faceToken");
  localStorage.removeItem("facePreference");

  // Clear axios default header
  delete api.defaults.headers.common["Authorization"];

  // Redirect to login page
  window.location.href = "/login";
}

// Helper function to decode JWT token (for debugging)
function decodeToken(token) {
  try {
    if (!token || token === "demo-access-token") {
      return { demo: true, message: "Demo token" };
    }
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return payload;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

// Helper function to get user's timezone
function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error("Error getting timezone:", error);
    return "UTC";
  }
}

// Helper function to save face preference
function saveFacePreference(preference) {
  localStorage.setItem("facePreference", preference);
}

// Helper function to get face preference
function getFacePreference() {
  return localStorage.getItem("facePreference") || "auto"; // auto, always, never
}

export const authService = {
  // ===== AUTHENTICATION METHODS =====

  async login(email, password) {
    try {
      console.log("📤 Sending login request to:", `${API_BASE_URL}/auth/login`);
      console.log("📧 Email:", email);
      console.log("⏰ Timezone:", getUserTimezone());

      const response = await api.post(
        "/auth/login",
        { email, password },
        {
          headers: {
            "X-Timezone": getUserTimezone(),
          },
        },
      );

      console.log("📥 Login response status:", response.status);
      console.log("📥 Login response data:", response.data);

      // Store temp token for OTP step
      if (response.data.temp_token) {
        localStorage.setItem("tempToken", response.data.temp_token);
      }

      return response.data;
    } catch (error) {
      console.error("❌ Login API error:", error);

      if (error.response) {
        console.error("📊 Response status:", error.response.status);
        console.error("📊 Response data:", error.response.data);
      } else if (error.request) {
        console.error("📡 No response received from server");
        console.error(
          "💡 Tip: Make sure backend is running on http://localhost:5000",
        );
      }

      throw new Error(
        error.response?.data?.message || "Login failed. Please try again.",
      );
    }
  },

  async verifyOtp(otp, token, skipFace = false) {
    try {
      console.log("📤 Verifying OTP...");
      console.log("   Skip face:", skipFace);

      const response = await api.post(
        "/auth/verify-otp",
        { otp, skip_face: skipFace },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("📥 OTP verification response:", response.data);

      // Store face verification token if needed
      if (response.data.face_verification_token) {
        localStorage.setItem(
          "faceToken",
          response.data.face_verification_token,
        );
      }

      // If login completed without face, store tokens
      if (response.data.access_token) {
        localStorage.setItem("accessToken", response.data.access_token);
        localStorage.setItem("refreshToken", response.data.refresh_token);
        if (response.data.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }
        // Update axios default header
        api.defaults.headers.common["Authorization"] =
          `Bearer ${response.data.access_token}`;
      }

      return response.data;
    } catch (error) {
      console.error("❌ OTP API error:", error);

      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }

      throw new Error(
        error.response?.data?.message || "OTP verification failed.",
      );
    }
  },

  async verifyFace(faceImage, token) {
    try {
      console.log("📤 Sending face image to backend...");

      // Extract base64 data if it's a data URL
      let imageData = faceImage;
      if (faceImage.startsWith("data:")) {
        imageData = faceImage.split(",")[1];
        console.log("📸 Face image extracted from data URL");
      }

      const response = await api.post(
        "/auth/verify-face",
        {
          face_image: imageData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      console.log("📥 Face verification response:", response.data);

      // Store tokens after successful face verification
      if (response.data.success) {
        localStorage.setItem("accessToken", response.data.access_token);
        localStorage.setItem("refreshToken", response.data.refresh_token);

        if (response.data.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }

        // Update the default Authorization header
        api.defaults.headers.common["Authorization"] =
          `Bearer ${response.data.access_token}`;

        // Clear temp tokens
        localStorage.removeItem("tempToken");
        localStorage.removeItem("faceToken");

        // Debug: Log token claims
        const decodedToken = decodeToken(response.data.access_token);
        console.log("🔐 Token claims after face verify:", decodedToken);
        console.log("🔐 mfa_verified:", decodedToken?.mfa_verified);

        // Update timezone after successful login
        authService.updateTimezone().catch((err) => {
          console.warn("Timezone update failed (non-critical):", err.message);
        });
      }

      return response.data;
    } catch (error) {
      console.error("❌ Face verification API error:", error);

      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }

      // Re-throw the error without clearing tokens or redirecting
      throw error;
    }
  },

  async skipFace(token) {
    try {
      console.log("📤 Skipping face verification...");

      const response = await api.post(
        "/auth/skip-face",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("📥 Skip face response:", response.data);

      if (response.data.success) {
        localStorage.setItem("accessToken", response.data.access_token);
        localStorage.setItem("refreshToken", response.data.refresh_token);
        if (response.data.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }

        // Update axios default header
        api.defaults.headers.common["Authorization"] =
          `Bearer ${response.data.access_token}`;

        // Clear temp tokens
        localStorage.removeItem("tempToken");
        localStorage.removeItem("faceToken");
      }

      return response.data;
    } catch (error) {
      console.error("❌ Skip face API error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to skip face verification.",
      );
    }
  },

  async register(userData) {
    try {
      console.log("📤 Sending registration request to backend...");
      console.log("📧 Email:", userData.email);
      console.log("👤 Name:", userData.first_name, userData.last_name);
      console.log(
        "📸 Face image:",
        userData.face_image ? "Provided" : "Not provided",
      );

      const response = await api.post("/auth/register", userData);

      console.log("📥 Registration response:", response.data);

      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.message || "Registration failed");
      }
    } catch (error) {
      console.error("❌ Register API error:", error);

      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }

      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }

      throw new Error(
        error.response?.data?.message ||
          "Registration failed. Please try again.",
      );
    }
  },

  async addFace(faceImage) {
    try {
      console.log("📤 Adding face to existing account...");

      let imageData = faceImage;
      if (faceImage.startsWith("data:")) {
        imageData = faceImage.split(",")[1];
      }

      const response = await api.post(
        "/auth/add-face",
        { face_image: imageData },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );

      console.log("📥 Add face response:", response.data);

      if (response.data.success && response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error) {
      console.error("❌ Add face API error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to add face verification.",
      );
    }
  },

  async updateFacePreference(preference) {
    try {
      console.log("📤 Updating face preference:", preference);

      const response = await api.put(
        "/user/face-preference",
        { preference },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );

      if (response.data.success) {
        saveFacePreference(preference);
      }

      return response.data;
    } catch (error) {
      console.error("❌ Update face preference error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to update preference.",
      );
    }
  },

  getFacePreference() {
    return getFacePreference();
  },

  async logout() {
    try {
      console.log("📤 Logging out...");
      const response = await api.post("/auth/logout");

      // Clear tokens regardless of API response
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("tempToken");
      localStorage.removeItem("faceToken");
      localStorage.removeItem("facePreference");

      // Clear the default Authorization header
      delete api.defaults.headers.common["Authorization"];

      console.log("✅ Logout successful");
      return response.data;
    } catch (error) {
      console.error("❌ Logout API error:", error);

      // Always clear tokens even if API call fails
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("tempToken");
      localStorage.removeItem("faceToken");
      localStorage.removeItem("facePreference");

      delete api.defaults.headers.common["Authorization"];

      return { success: true };
    }
  },

  // ===== PROFILE METHODS =====

  async getProfile() {
    try {
      console.log("📤 Fetching profile...");
      const response = await api.get("/profile");
      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
      console.log("✅ Profile fetched successfully");
      return response.data.user;
    } catch (error) {
      console.error("❌ Profile API error:", error);

      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }

      throw new Error("Failed to fetch profile.");
    }
  },

  async updateProfile(profileData) {
    try {
      const currentToken = localStorage.getItem("accessToken");
      console.log(
        "🔐 Updating profile with token:",
        currentToken ? "Token exists" : "No token",
      );

      const response = await api.put("/profile", profileData);
      console.log("✅ Profile update successful:", response.data);

      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error) {
      console.error("❌ Update profile API error:", error);

      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }

      throw new Error(
        error.response?.data?.message || "Failed to update profile.",
      );
    }
  },

  // ===== DASHBOARD METHODS =====

  async getDashboard() {
    try {
      console.log("📤 Fetching dashboard...");
      const response = await api.get("/dashboard");
      console.log("✅ Dashboard fetched successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Dashboard API error:", error);

      if (error.response?.status === 401) {
        console.log("Dashboard 401 - token may be expired");
        throw error;
      }

      throw new Error("Failed to load dashboard.");
    }
  },

  async checkMfaStatus() {
    try {
      const response = await api.get("/check-mfa-status");
      return response.data;
    } catch (error) {
      console.error("MFA status API error:", error);
      throw new Error("Failed to check MFA status.");
    }
  },

  async getFaceStatus() {
    try {
      const response = await api.get("/user/face-status");
      return response.data;
    } catch (error) {
      console.error("Face status API error:", error);
      return {
        success: true,
        has_face_registered: false,
        face_enabled: true,
        face_available: false,
      };
    }
  },

  // ===== SECURITY SCORE METHODS =====

  async getSecurityScore() {
    try {
      console.log("📤 Fetching security score...");
      const response = await api.get("/security-score");
      console.log(
        "✅ Security score fetched:",
        response.data.security_score?.score,
      );
      return response.data;
    } catch (error) {
      console.error("❌ Security score API error:", error);
      if (error.response?.status === 401) {
        console.log("Security score 401 - token may be expired");
        throw error;
      }
      return {
        success: true,
        security_score: {
          score: 75,
          grade: "B",
          grade_message: "Good Security",
          recommendations: ["Enable all security features"],
          factors: {},
        },
      };
    }
  },

  // ===== SESSION MANAGEMENT METHODS =====

  async getActiveSessions() {
    try {
      const response = await api.get("/auth/sessions");
      return response.data;
    } catch (error) {
      console.error("Get sessions API error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch sessions.",
      );
    }
  },

  async revokeSession(sessionId) {
    try {
      const response = await api.delete(`/auth/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error("Revoke session API error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to revoke session.",
      );
    }
  },

  async revokeAllOtherSessions() {
    try {
      const response = await api.post("/auth/sessions/revoke-all");
      return response.data;
    } catch (error) {
      console.error("Revoke all sessions API error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to revoke sessions.",
      );
    }
  },

  // ===== TOKEN MANAGEMENT METHODS =====

  async refreshToken() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      console.log("🔄 Manually refreshing token...");
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        const newAccessToken = response.data.access_token;
        localStorage.setItem("accessToken", newAccessToken);
        api.defaults.headers.common["Authorization"] =
          `Bearer ${newAccessToken}`;
        console.log("✅ Token refreshed manually");
        return response.data;
      } else {
        throw new Error("Token refresh failed");
      }
    } catch (error) {
      console.error("Manual token refresh failed:", error);
      throw new Error(error.response?.data?.message || "Token refresh failed");
    }
  },

  // ===== TIMEZONE METHODS =====

  async updateTimezone() {
    try {
      const timezone = getUserTimezone();
      console.log(`📤 Updating timezone to: ${timezone}`);
      const response = await api.post("/auth/timezone", { timezone });
      console.log(`✅ Timezone updated: ${timezone}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error updating timezone:", error.message);
      return { success: false };
    }
  },

  getCurrentTimezone() {
    return getUserTimezone();
  },

  isAuthenticated() {
    const accessToken = localStorage.getItem("accessToken");
    return !!accessToken;
  },

  getTokens() {
    return {
      accessToken: localStorage.getItem("accessToken"),
      refreshToken: localStorage.getItem("refreshToken"),
      tempToken: localStorage.getItem("tempToken"),
      faceToken: localStorage.getItem("faceToken"),
      user: localStorage.getItem("user"),
    };
  },

  clearTokens() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("tempToken");
    localStorage.removeItem("faceToken");
    localStorage.removeItem("facePreference");
    delete api.defaults.headers.common["Authorization"];
    console.log("🧹 Tokens cleared");
  },

  debugToken() {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.log("No token found");
      return null;
    }
    const payload = decodeToken(token);
    console.log("Current token payload:", payload);
    console.log("mfa_verified:", payload?.mfa_verified);
    console.log("session_id:", payload?.session_id);
    console.log("expires_at:", new Date(payload?.exp * 1000).toLocaleString());
    return payload;
  },
};
