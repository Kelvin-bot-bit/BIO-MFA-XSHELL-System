/* eslint-disable no-unused-vars */
/* ./pages/AdminDashboard.jsx */
import React, { useState, useEffect, useCallback, useRef } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  Users,
  Activity,
  Shield,
  AlertTriangle,
  Monitor,
  Globe,
  Clock,
  TrendingUp,
  UserPlus,
  LogOut,
  XCircle as XCircleIcon,
  Download,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  FileText,
  History,
  Save,
  FileDown,
  Eye,
  Calendar,
  BarChart3,
  Target,
  Fingerprint,
  Key,
  Zap,
  Award,
  AlertCircle,
  MapPin,
  Info,
  Lock,
  Mail,
  Camera,
  Menu,
  ChevronDown,
  Smartphone,
  Laptop,
  Tablet,
  Wifi,
  Server,
  MessageSquare,
  User,
} from "lucide-react";
import { formatDate, formatTimeAgo, getTimezoneOffset } from "../utils/time";
import MessageComposer from "../components/admin/MessageComposer";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [userGrowthData, setUserGrowthData] = useState(null);
  const [loginActivityData, setLoginActivityData] = useState(null);
  const [deviceData, setDeviceData] = useState(null);
  const [browserData, setBrowserData] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [hourlyData, setHourlyData] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({
    page: 1,
    total: 0,
    pages: 1,
    perPage: 20,
  });
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("90d");
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState("90d");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ===== Failed Attempts Analytics State =====
  const [failedAttemptsData, setFailedAttemptsData] = useState(null);
  const [failedAttemptsLoading, setFailedAttemptsLoading] = useState(false);
  const [failedAttemptsTimeRange, setFailedAttemptsTimeRange] = useState("7d");
  const [selectedFailureReason, setSelectedFailureReason] = useState(null);

  // ===== Message Composer State =====
  const [showMessageComposer, setShowMessageComposer] = useState(false);

  // State for security score
  const [securityScore] = useState({
    overall_score: 94,
    grade: "A",
    factors: {},
  });

  // Refs for auto-refresh
  const hourlyRefreshInterval = useRef(null);
  const activitiesRefreshInterval = useRef(null);

  // State for user recording
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordNotes, setRecordNotes] = useState("");
  const [userToRecord, setUserToRecord] = useState(null);
  const [recordingUser, setRecordingUser] = useState(false);
  const [recordSuccess, setRecordSuccess] = useState("");
  const [recordError, setRecordError] = useState("");

  // State for admin actions log
  const [adminActions, setAdminActions] = useState([]);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);

  // State for analytics
  const [mfaSuccessRate, setMfaSuccessRate] = useState(94.5);
  const [riskDistribution, setRiskDistribution] = useState({
    low: 0,
    medium: 0,
    high: 0,
  });
  const [userRetentionData, setUserRetentionData] = useState([]);
  const [authMethodData, setAuthMethodData] = useState([]);
  const [filteredGeoData, setFilteredGeoData] = useState(null);

  const COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
    "#F97316",
    "#6366F1",
    "#84CC16",
  ];

  // ===== Failure Reason Descriptions and Icons =====
  const failureReasonConfig = {
    invalid_password: {
      label: "Invalid Password",
      description: "User entered an incorrect password",
      color: "#EF4444",
      icon: React.createElement(Lock, { className: "w-4 h-4" }),
      severity: "high",
    },
    user_not_found: {
      label: "User Not Found",
      description: "Email address not registered in system",
      color: "#F59E0B",
      icon: React.createElement(Mail, { className: "w-4 h-4" }),
      severity: "medium",
    },
    account_locked: {
      label: "Account Locked",
      description: "Account is temporarily locked due to multiple failures",
      color: "#DC2626",
      icon: React.createElement(Lock, { className: "w-4 h-4" }),
      severity: "high",
    },
    account_inactive: {
      label: "Account Inactive",
      description: "Account has been deactivated",
      color: "#6B7280",
      icon: React.createElement(AlertCircle, { className: "w-4 h-4" }),
      severity: "medium",
    },
    too_many_attempts: {
      label: "Rate Limit Exceeded",
      description: "Too many attempts in a short period",
      color: "#F97316",
      icon: React.createElement(AlertTriangle, { className: "w-4 h-4" }),
      severity: "medium",
    },
    otp_invalid: {
      label: "Invalid OTP",
      description: "The provided OTP code was incorrect",
      color: "#EF4444",
      icon: React.createElement(Key, { className: "w-4 h-4" }),
      severity: "high",
    },
    otp_expired: {
      label: "OTP Expired",
      description: "OTP code has expired (5 minutes window)",
      color: "#F59E0B",
      icon: React.createElement(Clock, { className: "w-4 h-4" }),
      severity: "medium",
    },
    face_verification_failed: {
      label: "Face Verification Failed",
      description: "Face recognition did not match stored data",
      color: "#EF4444",
      icon: React.createElement(Camera, { className: "w-4 h-4" }),
      severity: "high",
    },
    face_not_registered: {
      label: "Face Not Registered",
      description: "No face data found for this user",
      color: "#F59E0B",
      icon: React.createElement(Camera, { className: "w-4 h-4" }),
      severity: "medium",
    },
    face_quality_failed: {
      label: "Face Quality Failed",
      description: "Image quality too low for verification",
      color: "#F97316",
      icon: React.createElement(Camera, { className: "w-4 h-4" }),
      severity: "low",
    },
    session_expired: {
      label: "Session Expired",
      description: "User session has expired",
      color: "#6B7280",
      icon: React.createElement(Clock, { className: "w-4 h-4" }),
      severity: "low",
    },
    token_invalid: {
      label: "Invalid Token",
      description: "Authentication token is invalid",
      color: "#EF4444",
      icon: React.createElement(AlertCircle, { className: "w-4 h-4" }),
      severity: "high",
    },
  };

  // ===== Load Failed Attempts Analytics =====
  const loadFailedAttemptsAnalytics = useCallback(async () => {
    setFailedAttemptsLoading(true);
    try {
      let endpoint = "/api/admin/failed-attempts";
      if (failedAttemptsTimeRange === "7d") {
        endpoint += "?days=7";
      } else if (failedAttemptsTimeRange === "30d") {
        endpoint += "?days=30";
      } else if (failedAttemptsTimeRange === "90d") {
        endpoint += "?days=90";
      }

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.total !== undefined) {
        setFailedAttemptsData(data);
      } else {
        setFailedAttemptsData(null);
      }
    } catch (error) {
      console.error("Error loading failed attempts analytics:", error);
      setFailedAttemptsData(null);
    } finally {
      setFailedAttemptsLoading(false);
    }
  }, [failedAttemptsTimeRange]);

  // Filter out "Local" locations
  const filterGeoData = useCallback((data) => {
    if (!data || !data.labels || !data.datasets) return data;
    const filteredIndices = [];
    const filteredLabels = [];
    const filteredData = [];

    data.labels.forEach((label, index) => {
      if (
        label === "Local" ||
        label === "Local, Local" ||
        label.includes("Local") ||
        !label ||
        label === "Unknown" ||
        label === "Unknown, Unknown"
      ) {
        return;
      }
      filteredIndices.push(index);
      filteredLabels.push(label);
      filteredData.push(data.datasets[0]?.data[index] || 0);
    });

    if (filteredLabels.length === 0) return null;

    const total = filteredData.reduce((a, b) => a + b, 0);
    const normalizedData = filteredData.map(
      (val) => Math.round((val / total) * 100 * 10) / 10,
    );

    return {
      labels: filteredLabels,
      datasets: [
        {
          data: normalizedData,
          backgroundColor:
            data.datasets[0]?.backgroundColor || "rgba(54, 162, 235, 0.7)",
        },
      ],
      raw_data:
        data.raw_data?.filter((_, i) => filteredIndices.includes(i)) || [],
      total_locations: filteredLabels.length,
      original_total: data.labels.length,
    };
  }, []);

  // Load functions
  const loadDashboardData = useCallback(async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/admin/dashboard",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
        if (data.data.risk_distribution) {
          setRiskDistribution(data.data.risk_distribution);
        }
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    }
  }, []);

  const loadUserGrowthData = useCallback(async () => {
    try {
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const response = await fetch(
        `http://localhost:5000/api/admin/charts/user-growth?days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) setUserGrowthData(data.data);
    } catch (error) {
      console.error("Error loading user growth:", error);
    }
  }, [timeRange]);

  const loadLoginActivityData = useCallback(async () => {
    try {
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const response = await fetch(
        `http://localhost:5000/api/admin/charts/login-activity?days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) {
        setLoginActivityData(data.data);
        if (data.data.datasets && data.data.datasets.length >= 2) {
          const success = data.data.datasets[0].data.reduce((a, b) => a + b, 0);
          const failed = data.data.datasets[1].data.reduce((a, b) => a + b, 0);
          const total = success + failed;
          if (total > 0)
            setMfaSuccessRate(((success / total) * 100).toFixed(1));
        }
      }
    } catch (error) {
      console.error("Error loading login activity:", error);
    }
  }, [timeRange]);

  const loadDeviceData = useCallback(async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/admin/charts/device-distribution",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) setDeviceData(data.data);
    } catch (error) {
      console.error("Error loading device data:", error);
    }
  }, []);

  const loadBrowserData = useCallback(async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/admin/charts/browser-distribution",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) setBrowserData(data.data);
    } catch (error) {
      console.error("Error loading browser data:", error);
    }
  }, []);

  const loadGeoData = useCallback(async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/admin/charts/geographic-distribution",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) {
        setGeoData(data.data);
        const filtered = filterGeoData(data.data);
        setFilteredGeoData(filtered);
      } else {
        const emptyData = {
          labels: ["No location data"],
          datasets: [
            { data: [100], backgroundColor: "rgba(156, 163, 175, 0.5)" },
          ],
          message: data.message || "No location data available",
        };
        setGeoData(emptyData);
        setFilteredGeoData(null);
      }
    } catch (error) {
      console.error("Error loading geographic data:", error);
      setGeoData({
        labels: ["Error loading data"],
        datasets: [{ data: [100], backgroundColor: "rgba(239, 68, 68, 0.5)" }],
        error: error.message,
      });
      setFilteredGeoData(null);
    }
  }, [filterGeoData]);

  const refreshHourlyData = useCallback(async () => {
    try {
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const response = await fetch(
        `http://localhost:5000/api/admin/charts/hourly-activity?days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) {
        setHourlyData(data.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error refreshing hourly data:", error);
    }
  }, [timeRange]);

  const refreshRecentActivities = useCallback(async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/admin/activities/recent?limit=20",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) setRecentActivities(data.activities);
    } catch (error) {
      console.error("Error refreshing activities:", error);
    }
  }, []);

  const loadHourlyData = useCallback(async () => {
    try {
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const response = await fetch(
        `http://localhost:5000/api/admin/charts/hourly-activity?days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) {
        setHourlyData(data.data);
      }
    } catch (error) {
      console.error("Error loading hourly data:", error);
    }
  }, [timeRange]);

  const loadRecentActivities = useCallback(async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/admin/activities/recent?limit=20",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) setRecentActivities(data.activities);
    } catch (error) {
      console.error("Error loading activities:", error);
    }
  }, []);

  const generateRetentionData = useCallback(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const retention = months.map((month) => ({
      month,
      "Week 1": Math.floor(Math.random() * 30 + 70),
      "Week 2": Math.floor(Math.random() * 20 + 60),
      "Week 3": Math.floor(Math.random() * 20 + 50),
      "Week 4": Math.floor(Math.random() * 20 + 40),
    }));
    setUserRetentionData(retention);
  }, []);

  const generateAuthMethodData = useCallback(() => {
    setAuthMethodData([
      { name: "Password Only", value: 15, color: "#F59E0B" },
      { name: "Password + OTP", value: 45, color: "#3B82F6" },
      { name: "Full MFA (Face)", value: 40, color: "#10B981" },
    ]);
  }, []);

  const loadUsers = useCallback(async (page = 1, search = "") => {
    try {
      const url = `http://localhost:5000/api/admin/users?page=${page}&per_page=20${search ? `&search=${search}` : ""}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setUsersPagination({
          page: data.current_page,
          total: data.total,
          pages: data.pages,
          perPage: 20,
        });
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserDetails = async (userId) => {
    setUserDetailsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) setUserDetails(data.data);
      else setUserDetails(null);
    } catch (error) {
      console.error("Error loading user details:", error);
      setUserDetails(null);
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const loadAdminActions = useCallback(async () => {
    setActionsLoading(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/admin/admin-actions?page=1&per_page=50",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) {
        setAdminActions(data.actions);
      }
    } catch (error) {
      console.error("Error loading admin actions:", error);
    } finally {
      setActionsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        loadDashboardData(),
        loadUserGrowthData(),
        loadLoginActivityData(),
        loadDeviceData(),
        loadBrowserData(),
        loadGeoData(),
        loadHourlyData(),
        loadRecentActivities(),
        loadUsers(),
        loadFailedAttemptsAnalytics(),
      ]);
      generateRetentionData();
      generateAuthMethodData();
      setLoading(false);
    };
    loadAllData();
  }, [
    loadDashboardData,
    loadUserGrowthData,
    loadLoginActivityData,
    loadDeviceData,
    loadBrowserData,
    loadGeoData,
    loadHourlyData,
    loadRecentActivities,
    loadUsers,
    loadFailedAttemptsAnalytics,
    generateRetentionData,
    generateAuthMethodData,
  ]);

  // Auto-refresh setup
  useEffect(() => {
    if (hourlyRefreshInterval.current)
      clearInterval(hourlyRefreshInterval.current);
    if (activitiesRefreshInterval.current)
      clearInterval(activitiesRefreshInterval.current);

    if (autoRefreshEnabled && activeTab === "overview") {
      hourlyRefreshInterval.current = setInterval(
        () => refreshHourlyData(),
        15000,
      );
      activitiesRefreshInterval.current = setInterval(
        () => refreshRecentActivities(),
        10000,
      );
    }

    return () => {
      if (hourlyRefreshInterval.current)
        clearInterval(hourlyRefreshInterval.current);
      if (activitiesRefreshInterval.current)
        clearInterval(activitiesRefreshInterval.current);
    };
  }, [
    autoRefreshEnabled,
    activeTab,
    refreshHourlyData,
    refreshRecentActivities,
  ]);

  useEffect(() => {
    refreshHourlyData();
    refreshRecentActivities();
    loadGeoData();
    loadFailedAttemptsAnalytics();
  }, [
    timeRange,
    refreshHourlyData,
    refreshRecentActivities,
    loadGeoData,
    loadFailedAttemptsAnalytics,
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboardData(),
      loadUserGrowthData(),
      loadLoginActivityData(),
      loadDeviceData(),
      loadBrowserData(),
      loadGeoData(),
      refreshHourlyData(),
      refreshRecentActivities(),
      loadFailedAttemptsAnalytics(),
    ]);
    generateRetentionData();
    generateAuthMethodData();
    setRefreshing(false);
  };

  const handleUserSearch = (e) => {
    e.preventDefault();
    loadUsers(1, userSearch);
  };

  const handleUserStatusToggle = async (userId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/users/${userId}/toggle-status`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            "Content-Type": "application/json",
          },
        },
      );
      const data = await response.json();
      if (data.success) {
        setUsers(
          users.map((u) =>
            u.user_id === userId ? { ...u, is_active: data.is_active } : u,
          ),
        );
        if (selectedUser && selectedUser.user_id === userId) {
          setSelectedUser({ ...selectedUser, is_active: data.is_active });
        }
        if (userDetails) {
          setUserDetails({
            ...userDetails,
            user: { ...userDetails.user, is_active: data.is_active },
          });
        }
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
    }
  };

  const handleForceLogout = async (userId) => {
    if (
      !window.confirm(
        "Are you sure you want to force logout all sessions for this user?",
      )
    )
      return;
    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/force-logout/${userId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            "Content-Type": "application/json",
          },
        },
      );
      const data = await response.json();
      if (data.success) alert(`Successfully logged out ${data.count} sessions`);
    } catch (error) {
      console.error("Error force logging out:", error);
    }
  };

  const handleRecordUser = async () => {
    if (!userToRecord) return;
    setRecordingUser(true);
    setRecordError("");
    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/users/${userToRecord.user_id}/record`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes: recordNotes }),
        },
      );
      const data = await response.json();
      if (data.success) {
        setRecordSuccess("User recorded successfully");
        setShowRecordModal(false);
        setRecordNotes("");
        setUserToRecord(null);
        loadAdminActions();
        setTimeout(() => setRecordSuccess(""), 3000);
      } else {
        setRecordError(data.message || "Failed to record user");
      }
    } catch (error) {
      console.error("Error recording user:", error);
      setRecordError("Failed to record user. Please try again.");
    } finally {
      setRecordingUser(false);
    }
  };

  const handleExportUsers = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/admin/users/export",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting users:", error);
      alert("Failed to export users");
    }
  };

  const handleMessageSent = (data) => {
    console.log("Message sent:", data);
    alert(data.message);
  };

  const formatNumber = (num) => new Intl.NumberFormat().format(num || 0);

  const formatLocation = (location) => {
    if (!location) return "Unknown";
    if (location === "Local, Local" || location === "Local")
      return "Local Network";
    if (location === "Unknown" || location === "Unknown, Unknown")
      return "Unknown Location";
    return location;
  };

  const getFlagForLocation = (location) => {
    if (!location) return "🌍";
    const locationLower = location.toLowerCase();
    if (locationLower.includes("kenya")) return "🇰🇪";
    if (
      locationLower.includes("usa") ||
      locationLower.includes("united states")
    )
      return "🇺🇸";
    if (
      locationLower.includes("uk") ||
      locationLower.includes("united kingdom")
    )
      return "🇬🇧";
    if (locationLower.includes("japan")) return "🇯🇵";
    if (locationLower.includes("germany")) return "🇩🇪";
    if (locationLower.includes("france")) return "🇫🇷";
    if (locationLower.includes("canada")) return "🇨🇦";
    if (locationLower.includes("australia")) return "🇦🇺";
    if (locationLower.includes("india")) return "🇮🇳";
    if (locationLower.includes("china")) return "🇨🇳";
    if (locationLower.includes("brazil")) return "🇧🇷";
    return "🌍";
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="w-4 h-4 text-blue-500" />;
      case "tablet":
        return <Tablet className="w-4 h-4 text-purple-500" />;
      default:
        return <Laptop className="w-4 h-4 text-green-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const displayGeoData = filteredGeoData || geoData;
  const hasRealLocations =
    filteredGeoData &&
    filteredGeoData.labels &&
    filteredGeoData.labels.length > 0;

  // Mobile tabs component
  const MobileTabs = () => (
    <div className="md:hidden mb-4">
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm"
      >
        <div className="flex items-center space-x-2">
          {activeTab === "overview" && (
            <Activity className="w-5 h-5 text-blue-600" />
          )}
          {activeTab === "users" && <Users className="w-5 h-5 text-blue-600" />}
          {activeTab === "analytics" && (
            <BarChart3 className="w-5 h-5 text-blue-600" />
          )}
          {activeTab === "activity" && (
            <Clock className="w-5 h-5 text-blue-600" />
          )}
          {activeTab === "failed-attempts" && (
            <AlertTriangle className="w-5 h-5 text-blue-600" />
          )}
          <span className="font-medium text-gray-900">
            {activeTab === "overview" && "Overview"}
            {activeTab === "users" && "Users"}
            {activeTab === "analytics" && "Analytics"}
            {activeTab === "activity" && "Activity Log"}
            {activeTab === "failed-attempts" && "Failed Attempts"}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${mobileMenuOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            {[
              { id: "overview", label: "Overview", icon: Activity },
              { id: "users", label: "Users", icon: Users },
              { id: "analytics", label: "Analytics", icon: BarChart3 },
              { id: "activity", label: "Activity Log", icon: Clock },
              {
                id: "failed-attempts",
                label: "Failed Attempts",
                icon: AlertTriangle,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success/Error Messages */}
      <AnimatePresence>
        {recordSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg text-sm sm:text-base"
          >
            {recordSuccess}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3">
            {/* Top row - Logo and title */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Admin Dashboard
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                    Monitor and manage your MFA system
                  </p>
                </div>
              </div>

              {/* Desktop Controls */}
              <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs lg:text-sm text-gray-600">
                    Auto-refresh:
                  </span>
                  <button
                    onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                    className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors ${
                      autoRefreshEnabled ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                        autoRefreshEnabled
                          ? "translate-x-5 sm:translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <button
                  onClick={handleExportUsers}
                  className="flex items-center space-x-1 sm:space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                >
                  <FileDown className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={() => {
                    loadAdminActions();
                    setShowActionsModal(true);
                  }}
                  className="flex items-center space-x-1 sm:space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                >
                  <History className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Audit Log</span>
                </button>
                <button
                  onClick={() => setShowMessageComposer(true)}
                  className="flex items-center space-x-1 sm:space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Send Message</span>
                </button>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <RefreshCw
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-600 sm:hidden">
              Monitor and manage your MFA system
            </p>

            {/* Mobile Controls Bar */}
            <div className="flex md:hidden items-center justify-between gap-2 pt-1">
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg px-2 py-1.5">
                <span className="text-xs text-gray-600">Auto:</span>
                <button
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  className={`relative inline-flex h-5 w-8 items-center rounded-full transition-colors ${
                    autoRefreshEnabled ? "bg-blue-600" : "bg-gray-400"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      autoRefreshEnabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={handleExportUsers}
                className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
              >
                <FileDown className="w-3 h-3" />
                <span>Export</span>
              </button>

              <button
                onClick={() => {
                  loadAdminActions();
                  setShowActionsModal(true);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
              >
                <History className="w-3 h-3" />
                <span>Audit</span>
              </button>

              <button
                onClick={() => setShowMessageComposer(true)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                <span>Send</span>
              </button>

              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">7d</option>
                <option value="30d">30d</option>
                <option value="90d">90d</option>
              </select>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:block border-b border-gray-200">
          <div className="container mx-auto px-4">
            <div className="flex space-x-4">
              {[
                { id: "overview", label: "Overview", icon: Activity },
                { id: "users", label: "Users", icon: Users },
                { id: "analytics", label: "Analytics", icon: BarChart3 },
                { id: "activity", label: "Activity Log", icon: Clock },
                {
                  id: "failed-attempts",
                  label: "Failed Attempts",
                  icon: AlertTriangle,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 font-medium text-sm transition-colors relative ${
                    activeTab === tab.id
                      ? "text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <MobileTabs />

        {/* Overview Tab */}
        {activeTab === "overview" && dashboardData && (
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {[
                {
                  label: "Total Users",
                  value: formatNumber(dashboardData.total_users),
                  icon: Users,
                  color: "blue",
                  trend: `+${dashboardData.active_users_today} today`,
                },
                {
                  label: "Active Sessions",
                  value: formatNumber(dashboardData.active_sessions),
                  icon: Activity,
                  color: "green",
                  trend: `of ${formatNumber(dashboardData.total_sessions)} total`,
                },
                {
                  label: "Failed Attempts",
                  value: formatNumber(dashboardData.failed_attempts_today),
                  icon: AlertTriangle,
                  color: "red",
                  trend: `${formatNumber(dashboardData.failed_attempts_week)} this week`,
                },
                {
                  label: "MFA Completion",
                  value: `${dashboardData.mfa_completion_rate}%`,
                  icon: Shield,
                  color: "purple",
                  trend: `${formatNumber(dashboardData.users_with_face)} users with face`,
                },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-xs sm:text-sm">
                        {stat.label}
                      </p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-${stat.color}-100`}
                    >
                      <stat.icon
                        className={`w-4 h-4 sm:w-5 sm:h-6 text-${stat.color}-600`}
                      />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-4 flex items-center text-xs sm:text-sm">
                    {stat.trend.includes("+") && (
                      <UserPlus className="w-3 h-3 text-green-500 mr-1" />
                    )}
                    <span
                      className={
                        stat.trend.includes("+")
                          ? "text-green-600"
                          : "text-gray-600"
                      }
                    >
                      {stat.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    User Growth
                  </h3>
                  <span className="text-xs text-gray-500">
                    Updated: {formatTimeAgo(lastUpdated)}
                  </span>
                </div>
                <div className="h-48 sm:h-64 lg:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={userGrowthData?.labels?.map((label, index) => ({
                        date: label,
                        users: userGrowthData?.datasets[0]?.data[index] || 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stroke="#3B82F6"
                        fill="#93C5FD"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  Login Activity
                </h3>
                <div className="h-48 sm:h-64 lg:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={loginActivityData?.labels?.map((label, index) => ({
                        date: label,
                        successful:
                          loginActivityData?.datasets[0]?.data[index] || 0,
                        failed:
                          loginActivityData?.datasets[1]?.data[index] || 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="successful" fill="#10B981" />
                      <Bar dataKey="failed" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  Devices
                </h3>
                <div className="h-48 sm:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData?.labels?.map((label, index) => ({
                          name: label,
                          value: deviceData?.datasets[0]?.data[index] || 0,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ percent }) =>
                          percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
                        }
                        labelLine={false}
                      >
                        {deviceData?.labels?.map((entry, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={COLORS[idx % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  Browsers
                </h3>
                <div className="h-48 sm:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={browserData?.labels?.map((label, index) => ({
                          name: label,
                          value: browserData?.datasets[0]?.data[index] || 0,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ percent }) =>
                          percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
                        }
                        labelLine={false}
                      >
                        {browserData?.labels?.map((entry, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={COLORS[idx % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                    <Globe className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                    User Locations
                  </h3>
                </div>
                {hasRealLocations ? (
                  <div className="space-y-2 sm:space-y-3 max-h-48 overflow-y-auto">
                    {displayGeoData.labels
                      .slice(0, 5)
                      .map((location, index) => {
                        const percentage =
                          displayGeoData.datasets[0]?.data[index] || 0;
                        const maxPercentage = Math.max(
                          ...(displayGeoData.datasets[0]?.data || [0]),
                        );
                        const flagEmoji = getFlagForLocation(location);
                        return (
                          <div key={index} className="group">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <span className="text-base sm:text-lg">
                                  {flagEmoji}
                                </span>
                                <span className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-[120px] sm:max-w-[150px]">
                                  {formatLocation(location)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <span className="text-xs sm:text-sm font-semibold text-gray-900">
                                  {percentage}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                                style={{
                                  width: `${(percentage / maxPercentage) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-4 sm:py-6">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-blue-300" />
                    </div>
                    <p className="text-gray-600 text-xs sm:text-sm font-medium">
                      No location data yet
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Hourly Activity */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Hourly Activity (Live Updates)
                </h3>
                <div className="flex items-center space-x-2">
                  {autoRefreshEnabled && (
                    <span className="flex items-center text-xs text-green-600">
                      <span className="relative flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      Live
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    Updated: {formatTimeAgo(lastUpdated)}
                  </span>
                </div>
              </div>
              <div className="h-48 sm:h-64 lg:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={hourlyData?.labels?.map((hour, index) => ({
                      hour,
                      logins: hourlyData?.datasets[0]?.data[index] || 0,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 10 }}
                      interval={2}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="logins"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Recent Activities
                </h3>
                <div className="flex items-center space-x-2">
                  {autoRefreshEnabled && (
                    <span className="flex items-center text-xs text-green-600">
                      <span className="relative flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      Live
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {recentActivities.length} activities
                  </span>
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3 max-h-80 overflow-y-auto">
                {recentActivities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto mb-2 sm:mb-0">
                      {activity.type === "login" ? (
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                          {activity.email} - {activity.details}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className="mr-1">
                            {getFlagForLocation(activity.location)}
                          </span>
                          {formatLocation(activity.location)} • {activity.ip}
                        </p>
                      </div>
                    </div>
                    <div className="text-right w-full sm:w-auto">
                      <span className="text-xs text-gray-500">
                        {formatDate(activity.timestamp, {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatTimeAgo(activity.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
              <form
                onSubmit={handleUserSearch}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4"
              >
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by email or name..."
                    className="w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 text-sm"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Mobile Users List */}
            <div className="block sm:hidden space-y-3">
              {users.map((user) => (
                <div
                  key={user.user_id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {user.first_name?.[0]}
                          {user.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-2">
                      {user.has_face ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300" />
                      )}
                      <span>{user.has_face ? "Face enabled" : "No face"}</span>
                    </div>
                    <div>
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex justify-around pt-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        loadUserDetails(user.user_id);
                      }}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="View User Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setUserToRecord(user);
                        setShowRecordModal(true);
                      }}
                      className="text-green-600 hover:text-green-800 transition-colors"
                      title="Record User Note"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleUserStatusToggle(user.user_id)}
                      className={
                        user.is_active
                          ? "text-red-600 hover:text-red-800"
                          : "text-green-600 hover:text-green-800"
                      }
                      title={
                        user.is_active ? "Deactivate User" : "Activate User"
                      }
                    >
                      {user.is_active ? (
                        <XCircle className="w-5 h-5" />
                      ) : (
                        <CheckCircle className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleForceLogout(user.user_id)}
                      className="text-orange-600 hover:text-orange-800 transition-colors"
                      title="Force Logout All Sessions"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Users Table */}
            <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Face
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr
                      key={user.user_id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {user.first_name?.[0]}
                              {user.last_name?.[0]}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {user.has_face ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            loadUserDetails(user.user_id);
                          }}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="View User Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setUserToRecord(user);
                            setShowRecordModal(true);
                          }}
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                          title="Record User Note"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUserStatusToggle(user.user_id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.is_active
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-green-50 text-green-600 hover:bg-green-100"
                          }`}
                          title={
                            user.is_active ? "Deactivate User" : "Activate User"
                          }
                        >
                          {user.is_active ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleForceLogout(user.user_id)}
                          className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                          title="Force Logout All Sessions"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 gap-3">
                <div className="text-sm text-gray-600">
                  Page {usersPagination.page} of {usersPagination.pages} (
                  {usersPagination.total} total users)
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      loadUsers(usersPagination.page - 1, userSearch)
                    }
                    disabled={usersPagination.page <= 1}
                    className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      loadUsers(usersPagination.page + 1, userSearch)
                    }
                    disabled={usersPagination.page >= usersPagination.pages}
                    className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
                    Advanced Analytics Dashboard
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Deep insights into your MFA system performance and user
                    behavior
                  </p>
                </div>
                <select
                  value={analyticsTimeRange}
                  onChange={(e) => setAnalyticsTimeRange(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="180d">Last 6 Months</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {[
                {
                  label: "MFA Success Rate",
                  value: `${mfaSuccessRate}%`,
                  icon: Shield,
                  color: "green",
                },
                {
                  label: "Face Enrollment",
                  value: dashboardData?.users_with_face || 0,
                  icon: Fingerprint,
                  color: "purple",
                },
                {
                  label: "Avg. Session Duration",
                  value: "24m",
                  icon: Clock,
                  color: "blue",
                },
                {
                  label: "Security Score",
                  value: securityScore.overall_score,
                  icon: Award,
                  color: "yellow",
                },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-600 text-xs">{stat.label}</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-2 rounded-xl bg-${stat.color}-100`}>
                      <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <Key className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                  Authentication Methods
                </h3>
                <div className="h-48 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={authMethodData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ percent }) =>
                          percent > 0.1 ? `${(percent * 100).toFixed(0)}%` : ""
                        }
                      >
                        {authMethodData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-orange-600" />
                  Risk Distribution
                </h3>
                <div className="h-48 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="60%"
                      data={[
                        {
                          subject: "Low Risk",
                          A: riskDistribution.low || 65,
                          fullMark: 100,
                        },
                        {
                          subject: "Medium Risk",
                          A: riskDistribution.medium || 25,
                          fullMark: 100,
                        },
                        {
                          subject: "High Risk",
                          A: riskDistribution.high || 10,
                          fullMark: 100,
                        },
                      ]}
                    >
                      <PolarGrid />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fontSize: 10 }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fontSize: 10 }}
                      />
                      <Radar
                        name="Risk"
                        dataKey="A"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" />
                User Retention (Weekly)
              </h3>
              <div className="h-48 sm:h-64 lg:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={userRetentionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Week 1"
                      stroke="#3B82F6"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="Week 2"
                      stroke="#10B981"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="Week 3"
                      stroke="#F59E0B"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="Week 4"
                      stroke="#EF4444"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Activity Log Tab */}
        {activeTab === "activity" && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                Activity Log
              </h3>
              <div className="text-xs text-gray-500">
                Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone} (
                {getTimezoneOffset()})
              </div>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start space-x-3 flex-1 w-full sm:w-auto mb-2 sm:mb-0">
                    {activity.type === "login" ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.email} - {activity.details}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {getFlagForLocation(activity.location)}{" "}
                          {formatLocation(activity.location)}
                        </span>
                        <span className="flex items-center">
                          <Globe className="w-3 h-3 mr-1" />
                          {activity.ip === "127.0.0.1"
                            ? "localhost"
                            : activity.ip}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right w-full sm:w-auto">
                    <div className="text-xs text-gray-900 font-medium">
                      {formatDate(activity.timestamp, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed Attempts Tab */}
        {activeTab === "failed-attempts" && (
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-red-500" />
                    Failed Login Attempts Analytics
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Detailed analysis of authentication failures, reasons, and
                    trends
                  </p>
                </div>
                <div className="flex space-x-2">
                  <select
                    value={failedAttemptsTimeRange}
                    onChange={(e) => setFailedAttemptsTimeRange(e.target.value)}
                    className="px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                  </select>
                  <button
                    onClick={loadFailedAttemptsAnalytics}
                    disabled={failedAttemptsLoading}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${failedAttemptsLoading ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {failedAttemptsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : failedAttemptsData && failedAttemptsData.total > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                  {[
                    {
                      label: "Total Failed Attempts",
                      value: failedAttemptsData.total,
                      icon: AlertTriangle,
                      color: "red",
                      trend: `${failedAttemptsData.trend_percentage}% vs last period`,
                    },
                    {
                      label: "Recent 7 Days",
                      value: failedAttemptsData.recent_7day_total,
                      icon: Clock,
                      color: "orange",
                      trend: `Previous: ${failedAttemptsData.previous_7day_total}`,
                    },
                    {
                      label: "Overall Failure Rate",
                      value: `${failedAttemptsData.overall_failure_rate}%`,
                      icon: Activity,
                      color: "blue",
                    },
                    {
                      label: "Unique Failure Reasons",
                      value: Object.keys(failedAttemptsData.reasons || {})
                        .length,
                      icon: Filter,
                      color: "purple",
                    },
                  ].map((stat, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-600 text-xs">{stat.label}</p>
                          <p className="text-xl sm:text-2xl font-bold text-gray-900">
                            {stat.value}
                          </p>
                        </div>
                        <div className={`p-2 rounded-xl bg-${stat.color}-100`}>
                          <stat.icon
                            className={`w-4 h-4 text-${stat.color}-600`}
                          />
                        </div>
                      </div>
                      {stat.trend && (
                        <div className="mt-2 flex items-center text-xs">
                          <span className="text-gray-500">{stat.trend}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-red-500" />
                      Top Failure Reasons
                    </h3>
                    <div className="space-y-3">
                      {(failedAttemptsData.top_failure_reasons || [])
                        .slice(0, 5)
                        .map((reason) => {
                          const config = failureReasonConfig[reason.reason] || {
                            label: reason.reason
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase()),
                            color: "#6B7280",
                            icon: React.createElement(AlertCircle, {
                              className: "w-4 h-4",
                            }),
                          };
                          const percentage =
                            (reason.count / failedAttemptsData.total) * 100;
                          return (
                            <div key={reason.reason}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                  <span style={{ color: config.color }}>
                                    {config.icon}
                                  </span>
                                  <span className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-[120px] sm:max-w-[200px]">
                                    {config.label}
                                  </span>
                                  <button
                                    onClick={() =>
                                      setSelectedFailureReason(reason.reason)
                                    }
                                    className="text-blue-500"
                                  >
                                    <Info className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <span className="text-xs sm:text-sm font-semibold text-gray-900">
                                    {reason.count}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({percentage.toFixed(0)}%)
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{
                                    width: `${percentage}%`,
                                    backgroundColor: config.color,
                                  }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {reason.description}
                              </p>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-500" />
                      Daily Failed Attempts
                    </h3>
                    <div className="h-48 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(
                            failedAttemptsData.daily_breakdown || {},
                          ).map(([date, total]) => ({ date, total: total }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar
                            dataKey="total"
                            fill="#EF4444"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 shadow-sm">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-orange-500" />
                    Recent Failed Attempts
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {(failedAttemptsData.recent_attempts || [])
                      .slice(0, 5)
                      .map((attempt, idx) => {
                        const config = failureReasonConfig[attempt.reason] || {
                          label: attempt.reason
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase()),
                          color: "#6B7280",
                          icon: React.createElement(AlertCircle, {
                            className: "w-4 h-4",
                          }),
                        };
                        return (
                          <div
                            key={attempt.attempt_id || idx}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-3 flex-1 w-full sm:w-auto mb-2 sm:mb-0">
                              <div
                                className="p-2 rounded-lg"
                                style={{ backgroundColor: `${config.color}20` }}
                              >
                                {config.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900 truncate max-w-[150px] sm:max-w-[250px]">
                                    {attempt.email}
                                  </p>
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: `${config.color}20`,
                                      color: config.color,
                                    }}
                                  >
                                    {config.label}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  IP: {attempt.ip_address || "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right w-full sm:w-auto">
                              <p className="text-xs text-gray-500">
                                {formatTimeAgo(attempt.attempted_at)}
                              </p>
                              <p className="text-xs text-gray-400">
                                {formatDate(attempt.attempted_at, {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-500 text-base sm:text-lg">
                  No Failed Attempts Found
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  There are no failed login attempts recorded for the selected
                  time period.
                </p>
                <button
                  onClick={loadFailedAttemptsAnalytics}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Refresh Data
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== IMPROVED USER DETAILS MODAL - RESIZED & REORGANIZED ===== */}
        <AnimatePresence>
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto"
              onClick={() => {
                setSelectedUser(null);
                setUserDetails(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl mx-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header - Fixed */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-5 z-10">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                        <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                          User Details
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedUser.first_name} {selectedUser.last_name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setUserDetails(null);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <XCircleIcon className="w-6 h-6 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div
                  className="overflow-y-auto p-6"
                  style={{ maxHeight: "calc(90vh - 80px)" }}
                >
                  {/* Basic User Information - Grid Layout */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 mb-6">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <User className="w-5 h-5 mr-2 text-blue-500" />
                      Personal Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Full Name
                        </p>
                        <p className="text-base font-medium text-gray-900 dark:text-white">
                          {selectedUser.first_name} {selectedUser.last_name}
                        </p>
                      </div>
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Email
                        </p>
                        <p className="text-base font-medium text-gray-900 dark:text-white break-all">
                          {selectedUser.email}
                        </p>
                      </div>
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Phone
                        </p>
                        <p className="text-base font-medium text-gray-900 dark:text-white">
                          {selectedUser.phone || "N/A"}
                        </p>
                      </div>
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          User ID
                        </p>
                        <p className="text-sm font-mono text-gray-900 dark:text-white break-all bg-gray-100 dark:bg-gray-700 p-2 rounded">
                          {selectedUser.user_id}
                        </p>
                      </div>
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Status
                        </p>
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                            selectedUser.is_active
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {selectedUser.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Face Registration
                        </p>
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                            selectedUser.has_face
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {selectedUser.has_face
                            ? "Registered"
                            : "Not Registered"}
                        </span>
                      </div>
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Joined Date
                        </p>
                        <p className="text-base font-medium text-gray-900 dark:text-white">
                          {new Date(selectedUser.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Active Sessions
                        </p>
                        <p className="text-base font-medium text-gray-900 dark:text-white">
                          {selectedUser.active_sessions || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Loading State */}
                  {userDetailsLoading && (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  )}

                  {/* Detailed User Info from API */}
                  {userDetails && !userDetailsLoading && (
                    <>
                      {/* Sessions Section */}
                      {userDetails.recent_sessions &&
                        userDetails.recent_sessions.length > 0 && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 mb-6">
                            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                              <Monitor className="w-5 h-5 mr-2 text-green-500" />
                              Recent Sessions (
                              {userDetails.recent_sessions.length})
                            </h4>
                            <div className="space-y-3">
                              {userDetails.recent_sessions.map(
                                (session, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                                  >
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          {getDeviceIcon(session.device_type)}
                                          <p className="text-base font-medium text-gray-900 dark:text-white">
                                            {session.device_info ||
                                              "Unknown Device"}
                                          </p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                                          <p className="flex items-center">
                                            <Globe className="w-4 h-4 mr-2" />
                                            IP: {session.ip_address || "N/A"}
                                          </p>
                                          <p className="flex items-center">
                                            <MapPin className="w-4 h-4 mr-2" />
                                            Location:{" "}
                                            {session.location || "Unknown"}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                          {new Date(
                                            session.created_at,
                                          ).toLocaleString()}
                                        </p>
                                        <span
                                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                                            session.is_active
                                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                              : "bg-gray-100 text-gray-600 dark:bg-gray-600/30 dark:text-gray-400"
                                          }`}
                                        >
                                          {session.is_active
                                            ? "Active"
                                            : "Inactive"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      {/* Failed Attempts Section */}
                      {userDetails.recent_failures &&
                        userDetails.recent_failures.length > 0 && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 mb-6">
                            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                              <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                              Recent Failed Attempts (
                              {userDetails.recent_failures.length})
                            </h4>
                            <div className="space-y-3">
                              {userDetails.recent_failures.map(
                                (failure, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                                  >
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                      <div className="flex-1">
                                        <p className="text-base font-medium text-gray-900 dark:text-white">
                                          Reason:{" "}
                                          <span className="text-red-600 dark:text-red-400">
                                            {failure.reason || "Unknown"}
                                          </span>
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                          IP: {failure.ip_address || "N/A"}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                          {new Date(
                                            failure.attempted_at,
                                          ).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      {/* Risk History Section */}
                      {userDetails.risk_history &&
                        userDetails.risk_history.length > 0 && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
                            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                              <Shield className="w-5 h-5 mr-2 text-purple-500" />
                              Risk Assessment History
                            </h4>
                            <div className="space-y-3">
                              {userDetails.risk_history.map((risk, idx) => (
                                <div
                                  key={idx}
                                  className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                    <div>
                                      <p className="text-base font-medium text-gray-900 dark:text-white">
                                        Risk Level:
                                        <span
                                          className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                            risk.level === "high"
                                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                              : risk.level === "medium"
                                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                          }`}
                                        >
                                          {risk.level}
                                        </span>
                                      </p>
                                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Score: {risk.score}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(risk.date).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </>
                  )}

                  {/* No additional data message */}
                  {!userDetailsLoading && !userDetails && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        No additional details available
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Actions - Sticky */}
                <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-5 flex flex-wrap justify-end gap-3">
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setUserDetails(null);
                    }}
                    className="px-5 py-2.5 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setUserToRecord(selectedUser);
                      setShowRecordModal(true);
                      setSelectedUser(null);
                    }}
                    className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Add Note
                  </button>
                  <button
                    onClick={() => {
                      handleUserStatusToggle(selectedUser.user_id);
                      setSelectedUser(null);
                    }}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      selectedUser.is_active
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {selectedUser.is_active ? (
                      <>
                        <XCircle className="w-4 h-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Activate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      handleForceLogout(selectedUser.user_id);
                      setSelectedUser(null);
                    }}
                    className="px-5 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Force Logout
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Record Modal */}
        <AnimatePresence>
          {showRecordModal && userToRecord && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50"
              onClick={() => setShowRecordModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl mx-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                  <div className="p-2 sm:p-3 bg-green-100 rounded-xl">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                      Record User
                    </h3>
                    <p className="text-sm text-gray-600">
                      Add notes for {userToRecord.first_name}{" "}
                      {userToRecord.last_name}
                    </p>
                  </div>
                </div>
                {recordError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-700 text-sm">{recordError}</p>
                  </div>
                )}
                <textarea
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  placeholder="Enter notes about this user..."
                  rows="5"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 mb-4 sm:mb-6 text-sm"
                  autoFocus
                />
                <div className="flex space-x-3 sm:space-x-4">
                  <button
                    onClick={() => {
                      setShowRecordModal(false);
                      setRecordNotes("");
                      setRecordError("");
                    }}
                    className="flex-1 bg-gray-500 text-white py-2 sm:py-3 rounded-xl font-semibold hover:bg-gray-600 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRecordUser}
                    disabled={recordingUser || !recordNotes.trim()}
                    className="flex-1 bg-green-600 text-white py-2 sm:py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
                  >
                    {recordingUser ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Record</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Actions Modal - RESIZED VERSION */}
        <AnimatePresence>
          {showActionsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50"
              onClick={() => setShowActionsModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl mx-3"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header - Fixed */}
                <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                      <History className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        Admin Actions Log
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Audit trail of all admin activities
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowActionsModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <XCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div
                  className="overflow-y-auto p-4 sm:p-6"
                  style={{ maxHeight: "calc(90vh - 120px)" }}
                >
                  {actionsLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    </div>
                  ) : (
                    <>
                      {/* Filter Bar */}
                      <div className="mb-4 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Total Actions: {adminActions.length}
                          </span>
                          {(adminActions.length === 50 ||
                            adminActions.length === 100) && (
                            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                              Showing last {adminActions.length}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span className="hidden sm:inline">Timezone:</span>
                          <span className="font-mono text-xs">
                            {Intl.DateTimeFormat().resolvedOptions().timeZone}
                          </span>
                          <button
                            onClick={loadAdminActions}
                            className="ml-2 p-1 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Refresh"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Actions Table - Desktop View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Type
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Notes
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Admin
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                User
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                IP Address
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Date & Time
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {adminActions.length === 0 ? (
                              <tr>
                                <td
                                  colSpan="6"
                                  className="px-4 py-12 text-center"
                                >
                                  <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                  <p className="text-gray-500">
                                    No admin actions found
                                  </p>
                                </td>
                              </tr>
                            ) : (
                              adminActions.map((action) => (
                                <tr
                                  key={action.action_id}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                      {action.action_type === "user_recorded"
                                        ? "📝 Record"
                                        : action.action_type === "send_message"
                                          ? "📧 Message"
                                          : action.action_type ===
                                              "bulk_send_messages"
                                            ? "📧 Bulk"
                                            : action.action_type ===
                                                "toggle_status"
                                              ? "🔄 Status"
                                              : action.action_type ===
                                                  "session_cleanup"
                                                ? "🧹 Cleanup"
                                                : action.action_type ===
                                                    "bulk_revoke_sessions"
                                                  ? "🚫 Revoke"
                                                  : action.action_type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p
                                      className="text-sm text-gray-900 dark:text-white max-w-md truncate"
                                      title={action.notes}
                                    >
                                      {action.notes || "—"}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">
                                          {action.admin_email?.[0]?.toUpperCase() ||
                                            "A"}
                                        </span>
                                      </div>
                                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                                        {action.admin_email || "Unknown"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">
                                          {action.user_email?.[0]?.toUpperCase() ||
                                            "U"}
                                        </span>
                                      </div>
                                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                                        {action.user_email || "System"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <code className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                      {action.ip_address || "N/A"}
                                    </code>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                      {formatDate(action.created_at, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {formatDate(action.created_at, {
                                        hour: "numeric",
                                        minute: "2-digit",
                                        hour12: true,
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Actions Cards - Mobile View */}
                      <div className="md:hidden space-y-3">
                        {adminActions.length === 0 ? (
                          <div className="text-center py-12">
                            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">
                              No admin actions found
                            </p>
                          </div>
                        ) : (
                          adminActions.map((action) => (
                            <div
                              key={action.action_id}
                              className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                  {action.action_type === "user_recorded"
                                    ? "📝 Record"
                                    : action.action_type === "send_message"
                                      ? "📧 Message"
                                      : action.action_type ===
                                          "bulk_send_messages"
                                        ? "📧 Bulk"
                                        : action.action_type === "toggle_status"
                                          ? "🔄 Status"
                                          : action.action_type ===
                                              "session_cleanup"
                                            ? "🧹 Cleanup"
                                            : action.action_type ===
                                                "bulk_revoke_sessions"
                                              ? "🚫 Revoke"
                                              : action.action_type}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDate(action.created_at, {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>

                              <p className="text-sm text-gray-900 dark:text-white mb-3">
                                {action.notes || "—"}
                              </p>

                              <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-500">Admin:</span>
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    {action.admin_email || "Unknown"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-500">User:</span>
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    {action.user_email || "System"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-500">IP:</span>
                                  <code className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                                    {action.ip_address || "N/A"}
                                  </code>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-500">Date:</span>
                                  <span className="text-gray-600">
                                    {formatDate(action.created_at, {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Summary Footer */}
                      {adminActions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-sm">
                          <div className="flex items-center space-x-4">
                            <span className="text-gray-600 dark:text-gray-400">
                              Total:{" "}
                              <strong className="text-gray-900 dark:text-white">
                                {adminActions.length}
                              </strong>{" "}
                              actions
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">
                              Showing:{" "}
                              <strong className="text-gray-900 dark:text-white">
                                {Math.min(adminActions.length, 50)}
                              </strong>{" "}
                              most recent
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              loadAdminActions();
                              // Optional: Add a toast notification
                            }}
                            className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span>Refresh</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Message Composer Modal */}
      {showMessageComposer && (
        <MessageComposer
          onClose={() => setShowMessageComposer(false)}
          onSuccess={handleMessageSent}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
