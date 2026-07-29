/* eslint-disable no-unused-vars */
/*./pages/Sessions.jsx*/
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  MapPin,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
  LogOut,
  Monitor,
  Cpu,
  Chrome,
  Firefox,
  Safari,
  Edge,
  Apple,
  Windows,
  Linux,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Filter,
  Trash2,
} from "lucide-react";
import { authService } from "../services/authService";

const Sessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState("all"); // all, mobile, desktop, tablet
  const [sortBy, setSortBy] = useState("last_activity"); // last_activity, created_at, device_type

  useEffect(() => {
    loadSessions();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (autoRefresh) {
        loadSessions();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadSessions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authService.getActiveSessions();
      if (response.success) {
        setSessions(response.sessions);
        setCurrentSessionId(response.current_session_id);
        setLastUpdated(new Date());
      } else {
        setError("Failed to load sessions");
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
      setError("Failed to load active sessions. Please try again.");

      // Demo data for development
      if (error.message.includes("Network Error")) {
        setSessions(getDemoSessions());
        setCurrentSessionId("sess_001");
      }
    } finally {
      setLoading(false);
    }
  };

  const getDemoSessions = () => {
    const now = new Date();
    return [
      {
        session_id: "sess_001",
        device_info: "Chrome 120 · Windows 11 · New York, USA",
        ip_address: "192.168.1.100",
        location: {
          city: "New York",
          country: "USA",
          latitude: 40.7128,
          longitude: -74.006,
        },
        created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
        last_activity: new Date(now.getTime() - 5 * 60000).toISOString(),
        expires_at: new Date(now.getTime() + 7 * 86400000).toISOString(),
        browser: "Chrome",
        browser_version: "120.0",
        os: "Windows 11",
        device_type: "desktop",
        is_current: true,
        inactivity_minutes: 5,
        session_age_minutes: 2880,
        session_status: "active",
      },
      {
        session_id: "sess_002",
        device_info: "Safari · iPhone 15 Pro · Nairobi, Kenya",
        ip_address: "154.159.252.1",
        location: {
          city: "Nairobi",
          country: "Kenya",
          latitude: -1.2864,
          longitude: 36.8172,
        },
        created_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
        last_activity: new Date(now.getTime() - 2 * 3600000).toISOString(),
        expires_at: new Date(now.getTime() + 4 * 86400000).toISOString(),
        browser: "Safari",
        browser_version: "17.0",
        os: "iOS 17",
        device_type: "mobile",
        is_current: false,
        inactivity_minutes: 120,
        session_age_minutes: 7200,
        session_status: "inactive",
      },
      {
        session_id: "sess_003",
        device_info: "Firefox · Ubuntu · London, UK",
        ip_address: "86.134.45.78",
        location: {
          city: "London",
          country: "UK",
          latitude: 51.5074,
          longitude: -0.1278,
        },
        created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
        last_activity: new Date(now.getTime() - 12 * 3600000).toISOString(),
        expires_at: new Date(now.getTime() + 6 * 86400000).toISOString(),
        browser: "Firefox",
        browser_version: "121.0",
        os: "Ubuntu 22.04",
        device_type: "desktop",
        is_current: false,
        inactivity_minutes: 720,
        session_age_minutes: 1440,
        session_status: "inactive",
      },
      {
        session_id: "sess_004",
        device_info: "Edge · Surface Pro · Tokyo, Japan",
        ip_address: "126.112.84.32",
        location: {
          city: "Tokyo",
          country: "Japan",
          latitude: 35.6762,
          longitude: 139.6503,
        },
        created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
        last_activity: new Date(now.getTime() - 1 * 86400000).toISOString(),
        expires_at: new Date(now.getTime() + 4 * 86400000).toISOString(),
        browser: "Edge",
        browser_version: "120.0",
        os: "Windows 11",
        device_type: "tablet",
        is_current: false,
        inactivity_minutes: 1440,
        session_age_minutes: 4320,
        session_status: "inactive",
      },
    ];
  };

  // Filter sessions based on device type
  const getFilteredSessions = () => {
    if (filterType === "all") return sessions;
    return sessions.filter((session) => session.device_type === filterType);
  };

  // Sort sessions
  const getSortedSessions = () => {
    const filtered = getFilteredSessions();
    return [...filtered].sort((a, b) => {
      if (sortBy === "last_activity") {
        return new Date(b.last_activity) - new Date(a.last_activity);
      } else if (sortBy === "created_at") {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === "device_type") {
        return (a.device_type || "").localeCompare(b.device_type || "");
      }
      return 0;
    });
  };

  const getDeviceIcon = (session) => {
    const deviceType = session.device_type || "desktop";
    const browser = session.browser?.toLowerCase() || "";

    if (deviceType === "mobile") {
      return <Smartphone className="w-6 h-6 text-blue-500" />;
    } else if (deviceType === "tablet") {
      return <Tablet className="w-6 h-6 text-purple-500" />;
    } else {
      if (browser.includes("chrome")) {
        return <Chrome className="w-6 h-6 text-green-600" />;
      } else if (browser.includes("firefox")) {
        return <Firefox className="w-6 h-6 text-orange-600" />;
      } else if (browser.includes("safari")) {
        return <Safari className="w-6 h-6 text-blue-600" />;
      } else if (browser.includes("edge")) {
        return <Edge className="w-6 h-6 text-blue-600" />;
      } else {
        return <Monitor className="w-6 h-6 text-gray-600" />;
      }
    }
  };

  const getOsIcon = (session) => {
    const os = session.os?.toLowerCase() || "";

    if (os.includes("windows")) {
      return <Windows className="w-4 h-4 text-blue-600" />;
    } else if (os.includes("mac") || os.includes("ios")) {
      return <Apple className="w-4 h-4 text-gray-800 dark:text-gray-400" />;
    } else if (os.includes("linux") || os.includes("ubuntu")) {
      return <Linux className="w-4 h-4 text-orange-600" />;
    } else {
      return <Cpu className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - activityTime) / 1000);

    const minute = 60;
    const hour = minute * 60;
    const day = hour * 24;

    if (diffInSeconds < minute) {
      return "Just now";
    } else if (diffInSeconds < hour) {
      const minutes = Math.floor(diffInSeconds / minute);
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    } else if (diffInSeconds < day) {
      const hours = Math.floor(diffInSeconds / hour);
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    } else {
      const days = Math.floor(diffInSeconds / day);
      return `${days} ${days === 1 ? "day" : "days"} ago`;
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getInactivityWarning = (minutes) => {
    if (minutes >= 60) {
      return {
        text: `Inactive for ${Math.floor(minutes / 60)}h ${minutes % 60}m`,
        color: "text-orange-600",
        bg: "bg-orange-50",
        icon: <AlertTriangle className="w-3 h-3" />,
      };
    } else if (minutes >= 30) {
      return {
        text: `Inactive for ${minutes} minutes`,
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        icon: <Clock className="w-3 h-3" />,
      };
    }
    return null;
  };

  const handleRevokeSession = async (sessionId) => {
    setRevokingId(sessionId);
    setError("");
    setSuccess("");

    try {
      const response = await authService.revokeSession(sessionId);
      if (response.success) {
        setSessions(sessions.filter((s) => s.session_id !== sessionId));
        setSuccess("Session revoked successfully");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Failed to revoke session");
      }
    } catch (error) {
      console.error("Error revoking session:", error);
      setError("Failed to revoke session. Please try again.");
    } finally {
      setRevokingId(null);
      setSessionToRevoke(null);
      setShowConfirmDialog(false);
    }
  };

  const handleRevokeAllOthers = async () => {
    setRevokingAll(true);
    setError("");
    setSuccess("");

    try {
      const response = await authService.revokeAllOtherSessions();
      if (response.success) {
        // Keep only current session
        setSessions(sessions.filter((s) => s.is_current));
        setSuccess("All other sessions revoked successfully");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Failed to revoke sessions");
      }
    } catch (error) {
      console.error("Error revoking all sessions:", error);
      setError("Failed to revoke sessions. Please try again.");
    } finally {
      setRevokingAll(false);
      setShowConfirmDialog(false);
    }
  };

  const confirmRevoke = (session) => {
    setSessionToRevoke(session);
    setShowConfirmDialog(true);
  };

  const confirmRevokeAll = () => {
    setSessionToRevoke(null);
    setShowConfirmDialog(true);
  };

  const getActiveSessionCount = () => {
    return sessions.filter(
      (s) => s.is_current || (s.is_active && s.face_verified),
    ).length;
  };

  const getInactiveSessionCount = () => {
    return sessions.filter((s) => s.inactivity_minutes > 60).length;
  };

  const sortedSessions = getSortedSessions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                <Smartphone className="w-8 h-8 mr-3 text-blue-600 dark:text-blue-400" />
                Active Sessions
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Manage devices where you're currently logged in
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Auto-refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  autoRefresh
                    ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                }`}
                title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
              >
                <RefreshCw
                  className={`w-4 h-4 ${autoRefresh ? "animate-spin-slow" : ""}`}
                />
              </button>

              {/* Filter Button */}
              <button
                onClick={() => setShowFilter(!showFilter)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilter
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
                title="Filter sessions"
              >
                <Filter className="w-4 h-4" />
              </button>

              {/* Refresh Button */}
              <button
                onClick={loadSessions}
                className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {sessions.length}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Total Sessions
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {getActiveSessionCount()}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Active</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {getInactiveSessionCount()}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Inactive
              </p>
            </div>
          </div>

          {/* Last Updated */}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 text-right">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </motion.div>

        {/* Filter Bar */}
        <AnimatePresence>
          {showFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Filter by Device Type
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="all">All Devices</option>
                      <option value="desktop">Desktop</option>
                      <option value="mobile">Mobile</option>
                      <option value="tablet">Tablet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sort by
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="last_activity">
                        Last Activity (Recent first)
                      </option>
                      <option value="created_at">
                        Created Date (Recent first)
                      </option>
                      <option value="device_type">Device Type</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4"
            >
              <div className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400 mr-3" />
                <p className="text-green-700 dark:text-green-300 font-medium">
                  {success}
                </p>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4"
            >
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mr-3" />
                <p className="text-red-700 dark:text-red-300 font-medium">
                  {error}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sessions List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {sortedSessions.map((session, index) => {
            const inactivityWarning = session.inactivity_minutes
              ? getInactivityWarning(session.inactivity_minutes)
              : null;

            return (
              <motion.div
                key={session.session_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white dark:bg-gray-800 rounded-2xl border ${
                  session.is_current
                    ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20"
                    : session.inactivity_minutes > 60
                      ? "border-orange-200 dark:border-orange-800"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700"
                } shadow-sm hover:shadow-md transition-all duration-300`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {/* Device Icon */}
                      <div
                        className={`p-3 rounded-xl ${
                          session.is_current
                            ? "bg-blue-100 dark:bg-blue-900/50"
                            : "bg-gray-100 dark:bg-gray-700"
                        }`}
                      >
                        {getDeviceIcon(session)}
                      </div>

                      {/* Session Details */}
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {session.device_info?.split("·")[0] ||
                              "Unknown Device"}
                          </h3>
                          {session.is_current && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                              Current Device
                            </span>
                          )}
                          {session.session_status === "inactive" && (
                            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs font-medium rounded-full">
                              Inactive
                            </span>
                          )}
                          {getOsIcon(session)}
                        </div>

                        {/* Device Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Globe className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-1">IP:</span>
                            {session.ip_address}
                          </div>

                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-1">Location:</span>
                            {session.location?.city || "Unknown"},{" "}
                            {session.location?.country || "Unknown"}
                          </div>

                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-1">
                              Last active:
                            </span>
                            {formatTimeAgo(session.last_activity)}
                          </div>

                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-1">Created:</span>
                            {formatDate(session.created_at)}
                          </div>

                          {session.inactivity_minutes !== undefined && (
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <AlertCircle className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium mr-1">
                                Inactive:
                              </span>
                              {session.inactivity_minutes} minutes
                            </div>
                          )}

                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 md:col-span-2">
                            <Shield className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-1">Browser:</span>
                            {session.browser} {session.browser_version} on{" "}
                            {session.os}
                          </div>
                        </div>

                        {/* Inactivity Warning */}
                        {inactivityWarning && !session.is_current && (
                          <div
                            className={`mt-3 flex items-center text-xs ${inactivityWarning.color} ${inactivityWarning.bg} dark:bg-opacity-20 rounded-lg px-3 py-2`}
                          >
                            {inactivityWarning.icon}
                            <span className="ml-2">
                              {inactivityWarning.text}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Revoke Button */}
                    {!session.is_current && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => confirmRevoke(session)}
                        disabled={revokingId === session.session_id}
                        className="ml-4 p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-200"
                        title="Revoke session"
                      >
                        {revokingId === session.session_id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </motion.button>
                    )}
                  </div>

                  {/* Expiry Info */}
                  {new Date(session.expires_at) <
                    new Date(Date.now() + 2 * 86400000) && (
                    <div className="mt-3 flex items-center text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Session expires in {formatTimeAgo(session.expires_at)}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Actions */}
        {sessions.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex justify-end"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={confirmRevokeAll}
              disabled={revokingAll}
              className="flex items-center space-x-2 bg-red-600 dark:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg"
            >
              {revokingAll ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Revoking All...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5" />
                  <span>Revoke All Other Sessions</span>
                </>
              )}
            </motion.button>
          </motion.div>
        )}

        {/* Empty State */}
        {sessions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Smartphone className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Active Sessions
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have any active sessions at the moment.
            </p>
          </motion.div>
        )}

        {/* Security Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-start space-x-3">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Security Tip
              </h4>
              <p className="text-blue-800 dark:text-blue-300 text-sm">
                Regularly review your active sessions and revoke any you don't
                recognize. If you see a session from an unknown location or
                device, revoke it immediately and change your password. Sessions
                that are inactive for over 60 minutes will be automatically
                terminated.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-4">
                {sessionToRevoke
                  ? "Revoke Session"
                  : "Revoke All Other Sessions"}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
                {sessionToRevoke ? (
                  <>
                    Are you sure you want to revoke this session from{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {sessionToRevoke.device_info?.split("·")[0]}
                    </span>
                    ? This will log them out immediately.
                  </>
                ) : (
                  <>
                    Are you sure you want to revoke all other sessions? This
                    will log out all devices except your current one.
                  </>
                )}
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 bg-gray-500 dark:bg-gray-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (sessionToRevoke) {
                      handleRevokeSession(sessionToRevoke.session_id);
                    } else {
                      handleRevokeAllOthers();
                    }
                  }}
                  className="flex-1 bg-red-600 dark:bg-red-700 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 dark:hover:bg-red-800 transition-colors duration-300"
                >
                  {revokingId || revokingAll ? "Revoking..." : "Revoke"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sessions;
