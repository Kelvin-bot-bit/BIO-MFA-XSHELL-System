/* eslint-disable no-unused-vars */
/* ./src/components/profile/NotificationPreferences.jsx */
import React, { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  Shield,
  Megaphone,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { profileService } from "../../services/profileService";

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState({
    security_alerts: true,
    login_notifications: true,
    promotional_emails: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const response = await profileService.getNotificationPreferences();
      if (response.success && response.preferences) {
        setPreferences(response.preferences);
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = async (key) => {
    const newPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPreferences);
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const response =
        await profileService.updateNotificationPreferences(newPreferences);
      if (response.success) {
        setSuccess("Preferences saved successfully");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const preferenceItems = [
    {
      key: "security_alerts",
      label: "Security Alerts",
      description:
        "Receive alerts about suspicious activity and security events",
      icon: Shield,
      color: "red",
    },
    {
      key: "login_notifications",
      label: "Login Notifications",
      description: "Get notified when someone logs into your account",
      icon: Bell,
      color: "blue",
    },
    {
      key: "promotional_emails",
      label: "Promotional Emails",
      description: "Receive updates about new features and offers",
      icon: Megaphone,
      color: "yellow",
    },
  ];

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
          <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notification Preferences
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Control how you receive updates and alerts
          </p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 flex items-center">
          <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
          <p className="text-sm text-green-700 dark:text-green-300">
            {success}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {preferenceItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`p-2 rounded-lg bg-${item.color}-100 dark:bg-${item.color}-900/30`}
                >
                  <Icon
                    className={`w-5 h-5 text-${item.color}-600 dark:text-${item.color}-400`}
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {item.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => togglePreference(item.key)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences[item.key]
                    ? "bg-blue-600"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences[item.key] ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
        <Mail className="w-3 h-3 inline mr-1" />
        All notifications are sent to your registered email address
      </p>
    </div>
  );
};

export default NotificationPreferences;
