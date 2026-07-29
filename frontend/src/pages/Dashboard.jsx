/* eslint-disable no-unused-vars */
/* ./pages/Dashboard.jsx */
import React, { useState, useEffect, useCallback, useRef } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import {
  Shield,
  User,
  Activity,
  Camera,
  CheckCircle2,
  Clock,
  Smartphone,
  RefreshCw,
  MapPin,
  Monitor,
  Award,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
  ChevronRight,
  Fingerprint,
  Key,
  Globe,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { formatTimeAgo, formatDate, isToday, isYesterday } from "../utils/time";
import AddFaceModal from "../components/auth/AddFaceModal";
import SettingsPanel from "../components/common/SettingsPanel";

// Helper function to convert location object to string
const getLocationString = (location) => {
  if (!location) return "Unknown";
  if (typeof location === "string") return location;
  if (typeof location === "object") {
    const parts = [];
    if (location.city && location.city !== "Unknown") parts.push(location.city);
    if (location.country && location.country !== "Unknown")
      parts.push(location.country);
    return parts.length > 0 ? parts.join(", ") : "Unknown";
  }
  return "Unknown";
};

// Helper function to get flag emoji from location
const getFlagFromLocation = (location) => {
  const locationStr = getLocationString(location).toLowerCase();
  if (locationStr.includes("kenya")) return "🇰🇪";
  if (locationStr.includes("usa") || locationStr.includes("united states"))
    return "🇺🇸";
  if (locationStr.includes("uk") || locationStr.includes("united kingdom"))
    return "🇬🇧";
  if (locationStr.includes("japan")) return "🇯🇵";
  if (locationStr.includes("germany")) return "🇩🇪";
  if (locationStr.includes("france")) return "🇫🇷";
  if (locationStr.includes("canada")) return "🇨🇦";
  if (locationStr.includes("australia")) return "🇦🇺";
  if (locationStr.includes("india")) return "🇮🇳";
  if (locationStr.includes("china")) return "🇨🇳";
  if (locationStr.includes("brazil")) return "🇧🇷";
  return "🌍";
};

const Dashboard = () => {
  const { user, verifyCurrentToken, debugTokenClaims } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [securityScore, setSecurityScore] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(true);
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const [showAddFaceModal, setShowAddFaceModal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Use ref to prevent multiple initial loads
  const initialLoadDone = useRef(false);

  // Toggle settings panel
  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };

  // Verify token on mount (silent, no UI warning)
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const result = await verifyCurrentToken();
        console.log("Dashboard token verification:", result);
      } catch (error) {
        console.error("Token verification failed:", error);
      }
    };
    verifyToken();
  }, [verifyCurrentToken]);

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.log("No token for dashboard");
        return;
      }
      const data = await authService.getDashboard();
      setDashboardData(data.dashboard);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    }
  }, []);

  // Client-side fallback calculation
  const calculateClientSideScore = useCallback(() => {
    let score = 0;
    const factors = {};

    const hasFace = dashboardData?.security_status?.face_registered;
    if (hasFace) {
      score += 35;
      factors.face_registered = 35;
    } else {
      factors.face_registered = 0;
    }

    if (hasFace) {
      score += 20;
      factors.mfa_enabled = 20;
    } else {
      factors.mfa_enabled = 0;
    }

    if (user?.created_at) {
      const age = Date.now() - new Date(user.created_at).getTime();
      const days = age / (1000 * 60 * 60 * 24);
      let ageScore = 0;
      if (days > 365) ageScore = 15;
      else if (days > 180) ageScore = 12;
      else if (days > 90) ageScore = 10;
      else if (days > 30) ageScore = 7;
      else if (days > 7) ageScore = 5;
      else ageScore = 3;
      score += ageScore;
      factors.account_age = ageScore;
    }

    factors.password_strength = 12;
    score += 12;
    factors.session_management = 8;
    score += 8;
    factors.login_activity = 5;
    score += 5;

    score = Math.min(100, Math.max(0, score));

    let grade = "C";
    let gradeMessage = "Good Security";
    if (score >= 90) {
      grade = "A+";
      gradeMessage = "Excellent Security";
    } else if (score >= 80) {
      grade = "A";
      gradeMessage = "Very Strong Security";
    } else if (score >= 70) {
      grade = "B";
      gradeMessage = "Good Security";
    } else if (score >= 60) {
      grade = "C";
      gradeMessage = "Fair Security";
    } else if (score >= 50) {
      grade = "D";
      gradeMessage = "Needs Improvement";
    } else {
      grade = "F";
      gradeMessage = "Poor Security";
    }

    const recommendations = [];
    if (!hasFace) {
      recommendations.push("Enable facial recognition for maximum security");
    }
    recommendations.push("Review your active sessions regularly");
    recommendations.push("Use a strong, unique password");

    setSecurityScore({
      score: Math.round(score * 10) / 10,
      grade: grade,
      grade_message: gradeMessage,
      factors: factors,
      recommendations: recommendations.slice(0, 3),
      max_score: 100,
    });
  }, [dashboardData, user]);

  // Fetch security score from backend
  const fetchSecurityScore = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.log("No token found for security score");
        setScoreLoading(false);
        return;
      }

      const response = await fetch("http://localhost:5000/api/security-score", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });
      const data = await response.json();
      if (data.success && data.security_score) {
        setSecurityScore(data.security_score);
      } else {
        calculateClientSideScore();
      }
    } catch (error) {
      console.error("Error fetching security score:", error);
      calculateClientSideScore();
    } finally {
      setScoreLoading(false);
    }
  }, [calculateClientSideScore]);

  // Get color for score ring
  const getScoreColor = (score) => {
    if (score >= 90)
      return { main: "#10B981", light: "#34D399", dark: "#059669" };
    if (score >= 80)
      return { main: "#3B82F6", light: "#60A5FA", dark: "#2563EB" };
    if (score >= 70)
      return { main: "#8B5CF6", light: "#A78BFA", dark: "#7C3AED" };
    if (score >= 60)
      return { main: "#F59E0B", light: "#FBBF24", dark: "#D97706" };
    return { main: "#EF4444", light: "#F87171", dark: "#DC2626" };
  };

  // Get status emoji and icon
  const getStatusInfo = (score) => {
    if (score >= 90)
      return {
        emoji: "🛡️",
        icon: Shield,
        text: "Excellent",
        description: "Your account is exceptionally secure",
      };
    if (score >= 80)
      return {
        emoji: "🔒",
        icon: Shield,
        text: "Very Strong",
        description: "Great security practices",
      };
    if (score >= 70)
      return {
        emoji: "✅",
        icon: CheckCircle2,
        text: "Good",
        description: "Good security, room for improvement",
      };
    if (score >= 60)
      return {
        emoji: "⚠️",
        icon: AlertTriangle,
        text: "Fair",
        description: "Security needs attention",
      };
    return {
      emoji: "🔓",
      icon: AlertTriangle,
      text: "Poor",
      description: "Immediate action required",
    };
  };

  // Get factor icon
  const getFactorIcon = (key) => {
    const icons = {
      face_registered: <Fingerprint className="w-4 h-4" />,
      mfa_enabled: <Shield className="w-4 h-4" />,
      password_strength: <Key className="w-4 h-4" />,
      session_management: <Globe className="w-4 h-4" />,
      login_activity: <Activity className="w-4 h-4" />,
      risk_assessment: <AlertTriangle className="w-4 h-4" />,
      account_age: <Clock className="w-4 h-4" />,
      failed_attempts: <TrendingUp className="w-4 h-4" />,
    };
    return icons[key] || <Zap className="w-4 h-4" />;
  };

  // Get factor label
  const getFactorLabel = (key) => {
    const labels = {
      face_registered: "Face Recognition",
      mfa_enabled: "MFA Enabled",
      password_strength: "Password Strength",
      session_management: "Session Management",
      login_activity: "Login Activity",
      risk_assessment: "Risk Assessment",
      account_age: "Account Age",
      failed_attempts: "Failed Attempts",
    };
    return (
      labels[key] ||
      key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  // Get max value for factor
  const getFactorMax = (key) => {
    const maxes = {
      face_registered: 35,
      mfa_enabled: 20,
      password_strength: 15,
      session_management: 10,
      login_activity: 10,
      risk_assessment: 10,
      account_age: 5,
      failed_attempts: 5,
    };
    return maxes[key] || 10;
  };

  // Get recommendation icon
  const getRecommendationIcon = (rec) => {
    if (rec.includes("face"))
      return <Fingerprint className="w-4 h-4 text-yellow-500" />;
    if (rec.includes("session"))
      return <Globe className="w-4 h-4 text-yellow-500" />;
    if (rec.includes("password"))
      return <Key className="w-4 h-4 text-yellow-500" />;
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  };

  // Handle face addition success
  const handleFaceAdded = useCallback(() => {
    loadDashboard();
    fetchSecurityScore();
    authService.getProfile().then((userData) => {
      if (userData) {
        localStorage.setItem("user", JSON.stringify(userData));
      }
    });
  }, [loadDashboard, fetchSecurityScore]);

  // Initial load
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const loadAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([loadDashboard(), fetchSecurityScore()]);
        console.log(
          "✅ Dashboard initial load completed at:",
          new Date().toLocaleTimeString(),
        );
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();

    // Set up interval for periodic refresh (every 30 seconds)
    const intervalId = setInterval(() => {
      const refreshData = async () => {
        setRefreshing(true);
        try {
          await fetchSecurityScore();
          console.log(
            "🔄 Dashboard data refreshed at:",
            new Date().toLocaleTimeString(),
          );
        } catch (error) {
          console.error("Error refreshing data:", error);
        } finally {
          setRefreshing(false);
        }
      };
      refreshData();
    }, 30000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    console.log("🔄 Manual refresh triggered...");
    try {
      await Promise.all([fetchSecurityScore(), loadDashboard()]);
      console.log(
        "✅ Manual refresh completed at:",
        new Date().toLocaleTimeString(),
      );
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Debug function to check token
  const handleDebugToken = async () => {
    debugTokenClaims();
    verifyCurrentToken();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const scoreColors = securityScore
    ? getScoreColor(securityScore.score)
    : { main: "#3B82F6", light: "#60A5FA", dark: "#2563EB" };
  const statusInfo = securityScore
    ? getStatusInfo(securityScore.score)
    : {
        emoji: "🔒",
        icon: Shield,
        text: "Good",
        description: "Your account is protected",
      };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-8 mb-8 border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
              >
                Welcome back, {user?.first_name}! 👋
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-gray-600 dark:text-gray-400 text-lg"
              >
                Your account is protected with advanced multi-factor
                authentication
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-2 text-sm text-gray-500 dark:text-gray-500 flex items-center"
              >
                <Clock className="w-4 h-4 mr-1" />
                Last updated: {formatTimeAgo(lastUpdated)}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="ml-3 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="Refresh data"
                >
                  <RefreshCw
                    className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  onClick={handleDebugToken}
                  className="ml-3 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
                  title="Debug token"
                >
                  🔍
                </button>
              </motion.div>
            </div>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="hidden lg:block"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-md">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        >
          {/* MFA Status Card */}
          <motion.div
            variants={itemVariants}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Security Status
              </h3>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Password
                  </span>
                </div>
                <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                  Active
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-5 h-5 text-purple-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    OTP Verification
                  </span>
                </div>
                <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                  Active
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Camera className="w-5 h-5 text-blue-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Face Recognition
                  </span>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    dashboardData?.security_status?.face_registered
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                  }`}
                >
                  {dashboardData?.security_status?.face_registered
                    ? "Active"
                    : "Setup"}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Account Info Card */}
          <motion.div
            variants={itemVariants}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Account Info
              </h3>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
                <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-gray-600 dark:text-gray-400">Status</span>
                <span className="text-green-600 dark:text-green-400 font-semibold flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-gray-600 dark:text-gray-400">Email</span>
                <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
                  {user?.email}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-gray-600 dark:text-gray-400">Phone</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {user?.phone}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-gray-600 dark:text-gray-400">
                  Member since
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {user?.created_at
                    ? formatDate(user.created_at, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Security Score Card */}
          <motion.div
            variants={itemVariants}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative"
          >
            <div
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{
                background: `radial-gradient(circle at top right, ${scoreColors.main}, transparent 70%)`,
              }}
            />

            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Security Score
              </h3>
              <div
                className="p-3 rounded-2xl"
                style={{ backgroundColor: `${scoreColors.main}20` }}
              >
                <Award
                  className="w-6 h-6"
                  style={{ color: scoreColors.main }}
                />
              </div>
            </div>

            {scoreLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
              </div>
            ) : securityScore ? (
              <>
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <svg className="w-36 h-36 transform -rotate-90">
                      <circle
                        className="text-gray-200 dark:text-gray-700"
                        strokeWidth="12"
                        stroke="currentColor"
                        fill="transparent"
                        r="62"
                        cx="72"
                        cy="72"
                      />
                      <circle
                        strokeWidth="12"
                        strokeDasharray={389.5}
                        strokeDashoffset={
                          389.5 - (389.5 * securityScore.score) / 100
                        }
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="62"
                        cx="72"
                        cy="72"
                        style={{
                          stroke: scoreColors.main,
                          transition: "stroke-dashoffset 1s ease",
                        }}
                      />
                    </svg>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                      <span
                        className="text-4xl font-bold"
                        style={{ color: scoreColors.main }}
                      >
                        {Math.round(securityScore.score)}%
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
                        <span>{statusInfo.emoji}</span>
                        <span>{statusInfo.text}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {statusInfo.description}
                  </p>
                </div>

                <button
                  onClick={() => setShowScoreDetails(!showScoreDetails)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-2">
                    <Info className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Score Breakdown
                    </span>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showScoreDetails ? "rotate-90" : ""}`}
                  />
                </button>

                {showScoreDetails && securityScore.factors && (
                  <div className="mt-4 space-y-3 animate-fade-in">
                    {Object.entries(securityScore.factors).map(
                      ([key, value]) => {
                        const maxValue = getFactorMax(key);
                        const percentage = (value / maxValue) * 100;
                        const isGood = percentage >= 70;
                        const isWarning = percentage >= 40 && percentage < 70;

                        let statusColor = "";
                        let statusText = "";
                        if (isGood) {
                          statusColor = "bg-green-500";
                          statusText = "Good";
                        } else if (isWarning) {
                          statusColor = "bg-yellow-500";
                          statusText = "Fair";
                        } else {
                          statusColor = "bg-red-500";
                          statusText = "Poor";
                        }

                        return (
                          <div key={key} className="group">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-2">
                                <div
                                  className="text-gray-500"
                                  style={{ color: scoreColors.main }}
                                >
                                  {getFactorIcon(key)}
                                </div>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {getFactorLabel(key)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span
                                  className="text-xs font-semibold"
                                  style={{ color: scoreColors.main }}
                                >
                                  {value}
                                </span>
                                <span className="text-xs text-gray-400">
                                  / {maxValue}
                                </span>
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded-full ${statusColor} bg-opacity-20 text-${statusColor.replace("bg-", "")}`}
                                >
                                  {statusText}
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-1.5 rounded-full transition-all duration-500"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: scoreColors.main,
                                }}
                              />
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}

                {securityScore.recommendations &&
                  securityScore.recommendations.length > 0 &&
                  securityScore.score < 90 && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-400 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Quick Wins to Improve Security
                      </p>
                      <ul className="space-y-1.5">
                        {securityScore.recommendations
                          .slice(0, 2)
                          .map((rec, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-300"
                            >
                              {getRecommendationIcon(rec)}
                              <span>{rec}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                {securityScore.score >= 95 && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Award className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">
                        Perfect Security Configuration!
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Unable to calculate security score</p>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Face Registration Recommendation - Only */}
        {!dashboardData?.security_status?.face_registered && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-800"
          >
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-2xl">
                <Camera className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                  Enhance Your Security
                </h3>
                <p className="text-yellow-800 dark:text-yellow-400 mb-4 text-sm">
                  Add facial recognition for the ultimate secure login
                  experience. It's fast, convenient, and extremely secure.
                </p>
                <button
                  onClick={() => setShowAddFaceModal(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2 rounded-xl font-semibold transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <Camera className="w-4 h-4 inline mr-2" />
                  Setup Face ID
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <AddFaceModal
        isOpen={showAddFaceModal}
        onClose={() => setShowAddFaceModal(false)}
        onSuccess={handleFaceAdded}
        user={user}
      />

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
