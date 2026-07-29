/* ./components/auth/AdminRoute.jsx */
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      // Don't check if still loading auth
      if (loading) {
        return;
      }

      if (!user) {
        console.log("🔒 AdminRoute: No user found");
        setChecking(false);
        return;
      }

      console.log("🔒 AdminRoute: Checking admin status for:", user.email);

      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          console.log("🔒 AdminRoute: No access token found");
          setIsAdmin(false);
          setChecking(false);
          return;
        }

        const response = await fetch(
          "http://localhost:5000/api/admin/check-status",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = await response.json();
        console.log("🔒 AdminRoute: Admin status response:", data);
        setIsAdmin(data.isAdmin);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    // Only run check when auth loading is complete
    if (!loading) {
      checkAdminStatus();
    }
  }, [user, loading]);

  // Show loading spinner while checking authentication or admin status
  if (loading || checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {loading ? "Verifying your session..." : "Checking permissions..."}
        </p>
      </div>
    );
  }

  // Log the decision being made
  console.log("🔒 AdminRoute - user:", user?.email, "isAdmin:", isAdmin);

  if (!user) {
    console.log("🔒 AdminRoute: No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    console.log("🔒 AdminRoute: User is not admin, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  console.log("🔒 AdminRoute: Admin access granted");
  return children;
};

export default AdminRoute;
