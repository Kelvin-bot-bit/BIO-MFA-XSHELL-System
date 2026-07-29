/* eslint-disable no-unused-vars */
/* ./src/components/profile/LoginHistory.jsx */
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  History,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Globe,
  Clock,
  ChevronRight,
} from "lucide-react";
import { profileService } from "../../services/profileService";

const LoginHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadLoginHistory();
  }, []);

  const loadLoginHistory = async () => {
    setLoading(true);
    try {
      const response = await profileService.getLoginHistory(showAll ? 100 : 10);
      if (response.success) {
        setHistory(response.history);
      }
    } catch (error) {
      console.error("Failed to load login history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceInfo) => {
    const info = (deviceInfo || "").toLowerCase();
    if (
      info.includes("mobile") ||
      info.includes("iphone") ||
      info.includes("android")
    ) {
      return <Smartphone className="w-4 h-4 text-blue-500" />;
    } else if (info.includes("tablet") || info.includes("ipad")) {
      return <Tablet className="w-4 h-4 text-purple-500" />;
    } else {
      return <Monitor className="w-4 h-4 text-green-500" />;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getLocationDisplay = (location) => {
    if (!location) return "Unknown Location";
    if (typeof location === "string") {
      try {
        const loc = JSON.parse(location);
        if (loc.city && loc.country) return `${loc.city}, ${loc.country}`;
        if (loc.country) return loc.country;
      } catch {
        return location;
      }
    } else if (location.city && location.country) {
      return `${location.city}, ${location.country}`;
    } else if (location.country) {
      return location.country;
    }
    return "Unknown Location";
  };

  const getStatusBadge = (
    isActive,
    passwordVerified,
    otpVerified,
    faceVerified,
  ) => {
    if (isActive && passwordVerified && otpVerified) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
          Completed
        </span>
      );
    } else if (passwordVerified && !otpVerified) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
          Partial
        </span>
      );
    } else {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
          Failed
        </span>
      );
    }
  };

  const displayedHistory = showAll ? history : history.slice(0, 5);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Login History
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Recent login attempts to your account
            </p>
          </div>
        </div>
        {history.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            {showAll ? "Show Less" : "View All"}
            <ChevronRight
              className={`w-4 h-4 ml-1 transition-transform ${showAll ? "rotate-90" : ""}`}
            />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-8">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No login history available</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {displayedHistory.map((entry, index) => (
            <motion.div
              key={entry.session_id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="mt-0.5">
                    {getDeviceIcon(entry.device_info)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {entry.device_info || "Unknown Device"}
                      </p>
                      {getStatusBadge(
                        entry.is_active,
                        entry.password_verified,
                        entry.otp_verified,
                        entry.face_verified,
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <Globe className="w-3 h-3 mr-1" />
                        {entry.ip_address || "Unknown IP"}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {getLocationDisplay(entry.location)}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(entry.created_at)}
                      </span>
                    </div>
                    {entry.face_verified && (
                      <span className="text-xs text-green-600 mt-1 inline-block">
                        ✓ Face verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoginHistory;
