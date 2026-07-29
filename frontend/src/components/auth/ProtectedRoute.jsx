/* ./components/auth/ProtectedRoute.jsx */
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Debug logging to understand what's happening on refresh
  console.log(
    "🔒 ProtectedRoute - loading:",
    loading,
    "user:",
    user?.email || "null",
  );

  // Show a nice loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Verifying your session...
        </p>
      </div>
    );
  }

  // Only redirect after loading is complete and no user exists
  if (!user) {
    console.log("🔒 No user found, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  console.log("🔒 User authenticated, rendering protected content");
  return children;
};

export default ProtectedRoute;
