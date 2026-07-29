/* ./src/components/common/SettingsPanel.jsx */
import React, { useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Bell,
  Monitor,
  Key,
  History,
  Database,
  Power,
  Trash2,
  Fingerprint,
  Shield,
  ChevronRight,
  X,
} from "lucide-react";
import NotificationPreferences from "../profile/NotificationPreferences";
import ActiveSessions from "../profile/ActiveSessions";
import BackupCodes from "../profile/BackupCodes";
import LoginHistory from "../profile/LoginHistory";
import AccountManagement from "../profile/AccountManagement";
import ChangePasswordModal from "../profile/ChangePasswordModal";

const SettingsPanel = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const sections = [
    {
      id: "notifications",
      title: "Notifications",
      description: "Manage your notification preferences",
      icon: Bell,
      color: "blue",
      component: NotificationPreferences,
    },
    {
      id: "sessions",
      title: "Active Sessions",
      description: "View and manage your active sessions",
      icon: Monitor,
      color: "green",
      component: ActiveSessions,
    },
    {
      id: "backup",
      title: "Backup Codes",
      description: "Generate one-time backup codes",
      icon: Key,
      color: "purple",
      component: BackupCodes,
    },
    {
      id: "history",
      title: "Login History",
      description: "View your recent login activity",
      icon: History,
      color: "orange",
      component: LoginHistory,
    },
    {
      id: "account",
      title: "Account Management",
      description: "Export, deactivate, or delete your account",
      icon: Database,
      color: "red",
      component: AccountManagement,
    },
  ];

  const handleSectionClick = (sectionId) => {
    if (activeSection === sectionId) {
      setActiveSection(null);
    } else {
      setActiveSection(sectionId);
    }
  };

  const ActiveComponent = activeSection
    ? sections.find((s) => s.id === activeSection)?.component
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />

          {/* Settings Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Settings
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Manage your account preferences
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Change Password Button */}
              <button
                onClick={() => setShowChangePassword(true)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-md transition-all duration-300 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Change Password
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Update your account password
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </button>

              {/* Settings Sections */}
              <div className="space-y-3">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  const SectionComponent = section.component;

                  return (
                    <div
                      key={section.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => handleSectionClick(section.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 bg-${section.color}-100 dark:bg-${section.color}-900/30 rounded-lg`}
                          >
                            <Icon
                              className={`w-5 h-5 text-${section.color}-600 dark:text-${section.color}-400`}
                            />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {section.title}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {section.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                            isActive ? "rotate-90" : "group-hover:translate-x-1"
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {isActive && SectionComponent && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30"
                          >
                            <div className="p-4">
                              <SectionComponent />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSuccess={() => {
          setShowChangePassword(false);
        }}
      />
    </AnimatePresence>
  );
};

export default SettingsPanel;
