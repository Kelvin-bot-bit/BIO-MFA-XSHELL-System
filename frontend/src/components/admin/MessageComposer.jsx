/* ./components/admin/MessageComposer.jsx */
import React, { useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import {
  Send,
  Users,
  AlertTriangle,
  Info,
  Bell,
  Shield,
  X,
  CheckCircle,
  Mail,
  Camera,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// eslint-disable-next-line no-unused-vars
const MessageComposer = ({ onClose, onSuccess, userList = null }) => {
  const [formData, setFormData] = useState({
    user_ids: [],
    title: "",
    message: "",
    message_type: "security",
    priority: "normal",
    target_type: "specific", // specific, all_without_face, all_active
  });
  const [users, setUsers] = useState([]);
  const [withoutFaceUsers, setWithoutFaceUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUserList, setShowUserList] = useState(false);

  // Load users
  useEffect(() => {
    loadUsers();
    loadUsersWithoutFace();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        "http://localhost:5000/api/admin/users?per_page=100",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsersWithoutFace = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        "http://localhost:5000/api/admin/stats/no-face-users",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (data.success) {
        setWithoutFaceUsers(data.users);
      }
    } catch (error) {
      console.error("Error loading users without face:", error);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // eslint-disable-next-line no-unused-vars
  const toggleUser = (userId) => {
    setFormData((prev) => ({
      ...prev,
      user_ids: prev.user_ids.includes(userId)
        ? prev.user_ids.filter((id) => id !== userId)
        : [...prev.user_ids, userId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      let endpoint = "/api/admin/messages/send";
      let payload = {};

      if (formData.target_type === "all_without_face") {
        endpoint = "/api/admin/messages/bulk-send";
        payload = {
          user_ids: withoutFaceUsers.map((u) => u.user_id),
          title: formData.title,
          message: formData.message,
          message_type: formData.message_type,
          priority: formData.priority,
        };
      } else if (formData.target_type === "all_active") {
        endpoint = "/api/admin/messages/bulk-send";
        payload = {
          user_ids: ["all"],
          title: formData.title,
          message: formData.message,
          message_type: formData.message_type,
          priority: formData.priority,
        };
      } else {
        if (formData.user_ids.length === 0) {
          alert("Please select at least one user");
          setSending(false);
          return;
        }
        payload = {
          user_id: formData.user_ids[0],
          title: formData.title,
          message: formData.message,
          message_type: formData.message_type,
          priority: formData.priority,
        };
      }

      const token = localStorage.getItem("accessToken");
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        if (onSuccess) onSuccess(data);
        onClose();
      } else {
        alert(data.message || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const messageTypeOptions = [
    { value: "security", label: "Security Alert", icon: Shield, color: "blue" },
    { value: "reminder", label: "Reminder", icon: Bell, color: "yellow" },
    { value: "warning", label: "Warning", icon: AlertTriangle, color: "red" },
    { value: "info", label: "Information", icon: Info, color: "green" },
  ];

  const priorityOptions = [
    { value: "high", label: "High Priority", color: "red" },
    { value: "normal", label: "Normal Priority", color: "blue" },
    { value: "low", label: "Low Priority", color: "gray" },
  ];

  const getCurrentIcon = () => {
    const option = messageTypeOptions.find(
      (o) => o.value === formData.message_type,
    );
    if (option) {
      return React.createElement(option.icon, { className: "w-5 h-5" });
    }
    return <Shield className="w-5 h-5" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                Send Message to Users
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Send security reminders or announcements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          className="p-4 sm:p-6 overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 140px)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Target Audience Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Target Audience
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      target_type: "specific",
                      user_ids: [],
                    })
                  }
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                    formData.target_type === "specific"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-1" />
                  Specific User
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      target_type: "all_without_face",
                      user_ids: [],
                    })
                  }
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                    formData.target_type === "all_without_face"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                  }`}
                >
                  <Camera className="w-4 h-4 inline mr-1" />
                  No Face ({withoutFaceUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      target_type: "all_active",
                      user_ids: [],
                    })
                  }
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                    formData.target_type === "all_active"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-1" />
                  All Users
                </button>
              </div>
            </div>

            {/* User Selection Dropdown - Only show for specific users */}
            {formData.target_type === "specific" && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowUserList(!showUserList)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {formData.user_ids.length === 0
                        ? "Select a user..."
                        : `${formData.user_ids.length} user(s) selected`}
                    </span>
                  </div>
                  {showUserList ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {showUserList && (
                  <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {loading ? (
                        <div className="p-4 text-center text-gray-500">
                          Loading...
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No users found
                        </div>
                      ) : (
                        filteredUsers.map((user) => (
                          <label
                            key={user.user_id}
                            className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {user.email}
                              </div>
                            </div>
                            <input
                              type="radio"
                              name="selected_user"
                              checked={formData.user_ids[0] === user.user_id}
                              onChange={() =>
                                setFormData({
                                  ...formData,
                                  user_ids: [user.user_id],
                                })
                              }
                              className="w-4 h-4 text-blue-600 ml-3 flex-shrink-0"
                            />
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Message Type and Priority - Side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message Type
                </label>
                <select
                  value={formData.message_type}
                  onChange={(e) =>
                    setFormData({ ...formData, message_type: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {messageTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {priorityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Title Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Security Reminder: Enable Face Recognition"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Message Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message
              </label>
              <textarea
                required
                rows="4"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                placeholder="Write your message here..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Preview Section */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </h4>
              <div className="border-l-4 border-blue-500 pl-3">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-blue-500">{getCurrentIcon()}</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {formData.title || "Message Title"}
                  </span>
                  {formData.priority === "high" && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      High Priority
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.message || "Your message will appear here..."}
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  <span className="inline-flex items-center">
                    {
                      messageTypeOptions.find(
                        (o) => o.value === formData.message_type,
                      )?.label
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Info Box for Bulk Sending */}
            {(formData.target_type === "all_without_face" ||
              formData.target_type === "all_active") && (
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {formData.target_type === "all_without_face"
                      ? `This message will be sent to ${withoutFaceUsers.length} user(s) who haven't registered face verification.`
                      : "This message will be sent to ALL active users in the system."}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-800 py-4 -mb-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  sending ||
                  (formData.target_type === "specific" &&
                    formData.user_ids.length === 0)
                }
                className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm transition-colors"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default MessageComposer;
