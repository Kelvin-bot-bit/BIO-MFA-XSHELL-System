/* ./pages/Profile.jsx */
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Save,
  Shield,
  Calendar,
  Key,
  AlertCircle,
  CheckCircle2,
  Camera,
  Settings,
} from "lucide-react";
import { authService } from "../services/authService";
import ProfilePictureModal from "../components/profile/ProfilePictureModal";
import SettingsPanel from "../components/common/SettingsPanel";

const Profile = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
  });

  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    try {
      console.log("📤 Sending profile update:", formData);

      const response = await authService.updateProfile(formData);
      console.log("📥 Update response:", response);

      if (response && response.success === true) {
        setSuccess(response.message || "Profile updated successfully!");

        if (setUser && response.user) {
          setUser({
            ...user,
            ...response.user,
          });
        }

        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(response?.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("❌ Error updating profile:", error);

      let errorMessage = "Failed to update profile. Please try again.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handlePictureSuccess = async () => {
    try {
      const userData = await authService.getProfile();
      if (userData && setUser) {
        setUser(userData);
      }
    } catch (err) {
      console.error("Failed to refresh user data:", err);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  const profilePictureUrl = user?.profile_picture
    ? `http://localhost:5000${user.profile_picture}`
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Profile Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Manage your account information and security preferences
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Main Profile Form */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center space-x-3 mb-6 sm:mb-8">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                    Personal Information
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Update your basic profile details
                  </p>
                </div>
              </div>

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6"
                >
                  <div className="flex items-center">
                    <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400 mr-2 flex-shrink-0" />
                    <p className="text-green-700 dark:text-green-300 font-medium text-sm sm:text-base">
                      {success}
                    </p>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6"
                >
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mr-2 flex-shrink-0" />
                    <p className="text-red-700 dark:text-red-300 font-medium text-sm sm:text-base">
                      {error}
                    </p>
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-base"
                        placeholder="First name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-base"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                    <input
                      value={user?.email || ""}
                      disabled
                      className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 cursor-not-allowed text-sm sm:text-base"
                    />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                    Email cannot be changed for security reasons
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-base"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white py-3 sm:py-4 px-6 rounded-xl sm:rounded-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                        <span className="text-sm sm:text-base">
                          Saving Changes...
                        </span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">
                          Update Profile
                        </span>
                      </>
                    )}
                  </div>
                </motion.button>
              </form>
            </div>
          </motion.div>

          {/* Account Details Sidebar */}
          <motion.div
            variants={itemVariants}
            className="space-y-5 sm:space-y-6"
          >
            {/* Profile Picture Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <div className="relative inline-block mx-auto mb-4">
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt={`${user?.first_name} ${user?.last_name}`}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-blue-500 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto shadow-md">
                    <span className="text-white text-3xl sm:text-4xl font-bold">
                      {user?.first_name?.[0]?.toUpperCase() || "U"}
                      {user?.last_name?.[0]?.toUpperCase() || ""}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setShowPictureModal(true)}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-md hover:bg-blue-700 transition-colors"
                  title="Change profile picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                {user?.first_name} {user?.last_name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1">
                {user?.email}
              </p>
            </div>

            {/* Account Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center space-x-2">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                <span>Account Summary</span>
              </h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Member Since
                  </span>
                  <span className="text-xs sm:text-sm text-gray-900 dark:text-white font-medium">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Account Status
                  </span>
                  <span className="text-green-600 dark:text-green-400 font-semibold flex items-center text-xs sm:text-sm">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-1.5 sm:mr-2"></div>
                    Active
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Security Level
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs sm:text-sm">
                    Advanced
                  </span>
                </div>
              </div>
            </div>

            {/* User ID Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center space-x-2">
                <Key className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                <span>User Identification</span>
              </h3>
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-1">
                    User ID
                  </p>
                  <p className="font-mono text-gray-900 dark:text-white text-xs sm:text-sm bg-gray-50 dark:bg-gray-700 rounded-lg p-2.5 sm:p-3 border border-gray-200 dark:border-gray-600 break-all">
                    {user?.user_id}
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>
                    Registered:{" "}
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Badge */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
                Verified Account
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                Your account has passed all security verifications and is fully
                protected.
              </p>
            </div>

            {/* Settings Button Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <button
                onClick={toggleSettings}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-all duration-300 group"
              >
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:rotate-45 transition-transform duration-300" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Settings
                </span>
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Manage notifications, sessions, backup codes, and account
                preferences
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Profile Picture Modal */}
      <ProfilePictureModal
        isOpen={showPictureModal}
        onClose={() => setShowPictureModal(false)}
        onSuccess={handlePictureSuccess}
        currentPicture={user?.profile_picture}
        userName={`${user?.first_name} ${user?.last_name}`}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default Profile;
