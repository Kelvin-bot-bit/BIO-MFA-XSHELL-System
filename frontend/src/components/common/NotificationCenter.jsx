import React, { useState, useEffect, useCallback } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  MessageSquare,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  ChevronRight,
  Mail,
  Shield,
  Camera,
  Key,
  Clock,
  ExternalLink,
  CheckCheck,
  Eye,
} from "lucide-react";

const NotificationCenter = () => {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch("http://localhost:5000/api/messages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages);
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMessages();

    // Refresh every 60 seconds
    const interval = setInterval(fetchMessages, 60000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Mark single message as read
  const markAsRead = async (messageId) => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `http://localhost:5000/api/messages/${messageId}/read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();

      if (data.success) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.message_id === messageId ? { ...msg, is_read: true } : msg,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        "http://localhost:5000/api/messages/mark-all-read",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();

      if (data.success) {
        setMessages((prev) => prev.map((msg) => ({ ...msg, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    } finally {
      setMarkingAll(false);
    }
  };

  // Get priority styling
  const getPriorityStyles = (priority) => {
    switch (priority) {
      case "high":
        return {
          border: "border-red-500",
          bg: "bg-red-50 dark:bg-red-900/20",
          icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
        };
      case "normal":
        return {
          border: "border-blue-500",
          bg: "bg-blue-50 dark:bg-blue-900/20",
          icon: <Info className="w-4 h-4 text-blue-500" />,
        };
      default:
        return {
          border: "border-gray-500",
          bg: "bg-gray-50 dark:bg-gray-800",
          icon: <Info className="w-4 h-4 text-gray-500" />,
        };
    }
  };

  // Get message type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case "security":
        return <Shield className="w-4 h-4 text-blue-500" />;
      case "reminder":
        return <Bell className="w-4 h-4 text-yellow-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "info":
        return <Info className="w-4 h-4 text-green-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "";
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);

    const minute = 60;
    const hour = minute * 60;
    const day = hour * 24;

    if (diffInSeconds < minute) return "Just now";
    if (diffInSeconds < hour) {
      const minutes = Math.floor(diffInSeconds / minute);
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    }
    if (diffInSeconds < day) {
      const hours = Math.floor(diffInSeconds / hour);
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    }
    const days = Math.floor(diffInSeconds / day);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  };

  // Render action button if available
  const renderActionButton = (button) => {
    if (!button || !button.label) return null;
    return (
      <a
        href={button.url}
        className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2"
      >
        <span>{button.label}</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={markingAll}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center space-x-1"
                >
                  {markingAll ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  ) : (
                    <>
                      <CheckCheck className="w-3 h-3" />
                      <span>Mark all read</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Messages List */}
            <div className="max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No notifications
                  </p>
                </div>
              ) : (
                messages.slice(0, 10).map((message) => {
                  const priorityStyles = getPriorityStyles(message.priority);
                  const isUnread = !message.is_read;

                  return (
                    <div
                      key={message.message_id}
                      className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                        isUnread ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                      }`}
                      onClick={() => {
                        if (!message.is_read) {
                          markAsRead(message.message_id);
                        }
                      }}
                    >
                      <div
                        className={`border-l-4 ${priorityStyles.border} pl-3`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2 flex-1">
                            {getTypeIcon(message.message_type)}
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                              {message.title}
                            </h4>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTimeAgo(message.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {message.message}
                        </p>
                        {message.action_buttons?.length > 0 &&
                          message.action_buttons.map((btn, idx) => (
                            <div key={idx} className="mt-2">
                              {renderActionButton(btn)}
                            </div>
                          ))}
                        {!message.is_read && (
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(message.message_id);
                              }}
                              className="text-xs text-gray-500 hover:text-blue-600 flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Mark as read</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {messages.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    // Navigate to messages page if you create one
                    // navigate("/messages");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center justify-center space-x-1"
                >
                  <span>View all notifications</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
