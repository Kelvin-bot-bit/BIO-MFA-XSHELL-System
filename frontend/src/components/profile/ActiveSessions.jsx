/* eslint-disable no-unused-vars */
/* ./src/components/profile/ActiveSessions.jsx */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  MapPin,
  Clock,
  LogOut,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { authService } from "../../services/authService";

const ActiveSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await authService.getActiveSessions();
      if (response.success) {
        setSessions(response.sessions);
        setCurrentSessionId(response.current_session_id);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId) => {
    setRevokingId(sessionId);
    try {
      const response = await authService.revokeSession(sessionId);
      if (response.success) {
        setSessions(sessions.filter((s) => s.session_id !== sessionId));
      }
    } catch (error) {
      console.error("Failed to revoke session:", error);
    } finally {
      setRevokingId(null);
      setShowConfirm(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    try {
      const response = await authService.revokeAllOtherSessions();
      if (response.success) {
        setSessions(sessions.filter((s) => s.session_id === currentSessionId));
      }
    } catch (error) {
      console.error("Failed to revoke all sessions:", error);
    } finally {
      setShowConfirm(null);
    }
  };

  const getDeviceIcon = (deviceType, browser) => {
    if (deviceType === "mobile")
      return <Smartphone className="w-5 h-5 text-blue-500" />;
    if (deviceType === "tablet")
      return <Tablet className="w-5 h-5 text-purple-500" />;
    return <Monitor className="w-5 h-5 text-green-500" />;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getLocationDisplay = (location) => {
    if (!location) return "Unknown";
    if (typeof location === "object") {
      if (location.city && location.country)
        return `${location.city}, ${location.country}`;
      if (location.country) return location.country;
    }
    return "Unknown";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <Monitor className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Active Sessions
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Devices where you're currently logged in
            </p>
          </div>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={() => setShowConfirm("all")}
            className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Revoke All Others</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8">
          <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No active sessions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <motion.div
              key={session.session_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border ${
                session.session_id === currentSessionId
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getDeviceIcon(session.device_type, session.browser)}
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {session.device_info ||
                          `${session.browser || "Unknown Browser"} on ${session.os || "Unknown OS"}`}
                      </p>
                      {session.session_id === currentSessionId && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          Current Device
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <Globe className="w-3 h-3 mr-1" />
                        {session.ip_address || "Unknown IP"}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {getLocationDisplay(session.location)}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Last active: {formatDate(session.last_activity)}
                      </span>
                    </div>
                  </div>
                </div>
                {session.session_id !== currentSessionId && (
                  <button
                    onClick={() => setShowConfirm(session.session_id)}
                    disabled={revokingId === session.session_id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Revoke session"
                  >
                    {revokingId === session.session_id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Confirm Revoke
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {showConfirm === "all"
                    ? "Are you sure you want to revoke all other sessions? You will be logged out from all other devices."
                    : "Are you sure you want to revoke this session? The device will be logged out immediately."}
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowConfirm(null)}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (showConfirm === "all") {
                        revokeAllOtherSessions();
                      } else {
                        revokeSession(showConfirm);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Confirm Revoke
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActiveSessions;
