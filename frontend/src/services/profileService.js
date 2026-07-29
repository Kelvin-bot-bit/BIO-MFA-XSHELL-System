/* ./src/services/profileService.js */
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

// Create axios instance
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
  return config;
});

export const profileService = {
  // Change password
  async changePassword(currentPassword, newPassword) {
    const response = await api.post("/profile/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  // Get notification preferences
  async getNotificationPreferences() {
    const response = await api.get("/profile/notification-preferences");
    return response.data;
  },

  // Update notification preferences
  async updateNotificationPreferences(preferences) {
    const response = await api.put(
      "/profile/notification-preferences",
      preferences,
    );
    return response.data;
  },

  // Deactivate account
  async deactivateAccount(reason = "") {
    const response = await api.post("/profile/deactivate", { reason });
    return response.data;
  },

  // Reactivate account
  async reactivateAccount() {
    const response = await api.post("/profile/reactivate");
    return response.data;
  },

  // Delete account permanently
  async deleteAccount(confirmation) {
    const response = await api.post("/profile/delete", { confirmation });
    return response.data;
  },

  // Export user data
  async exportUserData() {
    const response = await api.get("/profile/export-data");
    return response.data;
  },

  // Get backup codes
  async getBackupCodes() {
    const response = await api.get("/profile/backup-codes");
    return response.data;
  },

  // Generate new backup codes
  async generateBackupCodes() {
    const response = await api.post("/profile/backup-codes");
    return response.data;
  },

  // Get login history
  async getLoginHistory(limit = 50) {
    const response = await api.get(`/profile/login-history?limit=${limit}`);
    return response.data;
  },

  // ===== NEW: Get user activity for dashboard =====
  async getUserActivity(limit = 10) {
    try {
      const response = await api.get(`/user/activity?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("Get user activity error:", error);
      return { success: true, activities: [] };
    }
  },
};
