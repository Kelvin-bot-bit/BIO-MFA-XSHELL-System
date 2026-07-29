/* eslint-disable no-unused-vars */
/* ./src/components/profile/AccountManagement.jsx */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Power,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  FileJson,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const AccountManagement = () => {
  const { user, deactivateAccount, deleteAccount, exportUserData, logout } =
    useAuth();
  const navigate = useNavigate();
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deactivateReason, setDeactivateReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [exportData, setExportData] = useState(null);

  const handleExportData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await exportUserData();
      if (response.success) {
        setExportData(response.data);
        setShowExportModal(true);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err.message || "Failed to export data");
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xshell-user-data-${user?.user_id?.slice(0, 8)}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    setSuccess("Data exported successfully!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleDeactivateAccount = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await deactivateAccount(deactivateReason);
      if (response.success) {
        setSuccess("Account deactivated successfully. Redirecting to login...");
        setTimeout(() => {
          logout();
          navigate("/login");
        }, 2000);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err.message || "Failed to deactivate account");
    } finally {
      setLoading(false);
      setShowDeactivateModal(false);
      setDeactivateReason("");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      setError('Please type "DELETE" to confirm');
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await deleteAccount(deleteConfirmation);
      if (response.success) {
        setSuccess("Account deleted successfully. Redirecting...");
        setTimeout(() => {
          logout();
          navigate("/register");
        }, 2000);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err.message || "Failed to delete account");
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setDeleteConfirmation("");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
          <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Account Management
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your account data and status
          </p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 flex items-center">
          <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
          <p className="text-sm text-green-700 dark:text-green-300">
            {success}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {/* Export Data Button */}
        <button
          onClick={handleExportData}
          disabled={loading}
          className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 transition-colors">
              <FileJson className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">
                Export My Data
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Download a copy of all your account data
              </p>
            </div>
          </div>
          <Download className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
        </button>

        {/* Deactivate Account Button */}
        <button
          onClick={() => setShowDeactivateModal(true)}
          disabled={loading}
          className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg group-hover:bg-yellow-200 transition-colors">
              <Power className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">
                Deactivate Account
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Temporarily disable your account
              </p>
            </div>
          </div>
          <Power className="w-5 h-5 text-gray-400 group-hover:text-yellow-500 transition-colors" />
        </button>

        {/* Delete Account Button */}
        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={loading}
          className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg group-hover:bg-red-200 transition-colors">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">
                Delete Account
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Permanently delete your account and all data
              </p>
            </div>
          </div>
          <Trash2 className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
        </button>
      </div>

      {/* Export Data Modal */}
      <AnimatePresence>
        {showExportModal && exportData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <FileJson className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Your Data
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Review your data before downloading
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
                  {JSON.stringify(exportData, null, 2)}
                </pre>
              </div>
              <div className="flex space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={downloadJSON}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download JSON</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deactivate Account Modal */}
      <AnimatePresence>
        {showDeactivateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDeactivateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Power className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Deactivate Account
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Your account will be temporarily deactivated. You can
                    reactivate it by logging in again. All your data will be
                    preserved.
                  </p>
                  <textarea
                    value={deactivateReason}
                    onChange={(e) => setDeactivateReason(e.target.value)}
                    placeholder="Optional: Tell us why you're leaving..."
                    className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 mb-4"
                    rows="3"
                  />
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowDeactivateModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeactivateAccount}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Deactivating..." : "Deactivate"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Delete Account
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    This action is{" "}
                    <span className="font-bold text-red-600">permanent</span>.
                    All your data will be deleted and cannot be recovered.
                  </p>
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Type <span className="font-bold">DELETE</span> to confirm
                      account deletion
                    </p>
                  </div>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Type DELETE here"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 mb-4"
                  />
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={loading || deleteConfirmation !== "DELETE"}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Deleting..." : "Delete Permanently"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccountManagement;
