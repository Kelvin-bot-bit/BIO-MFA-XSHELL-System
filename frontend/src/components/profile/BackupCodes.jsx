/* eslint-disable no-unused-vars */
/* ./src/components/profile/BackupCodes.jsx */
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Key,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Download,
} from "lucide-react";
import { profileService } from "../../services/profileService";

const BackupCodes = () => {
  const [codes, setCodes] = useState([]);
  const [showCodes, setShowCodes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasCodes, setHasCodes] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkBackupCodes();
  }, []);

  const checkBackupCodes = async () => {
    try {
      const response = await profileService.getBackupCodes();
      setHasCodes(response.has_codes);
    } catch (err) {
      console.error("Failed to check backup codes:", err);
    }
  };

  const generateCodes = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await profileService.generateBackupCodes();
      if (response.success) {
        setCodes(response.codes);
        setShowCodes(true);
        setHasCodes(true);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError("Failed to generate backup codes");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const codeString = codes.join("\n");
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCodes = () => {
    const codeString = codes.join("\n");
    const blob = new Blob([codeString], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xshell-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <Key className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Backup Codes
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              One-time codes to access your account if you lose your device
            </p>
          </div>
        </div>
        {!showCodes && (
          <button
            onClick={generateCodes}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>{hasCodes ? "Regenerate Codes" : "Generate Codes"}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {showCodes && codes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-2">
              {codes.map((code, index) => (
                <code
                  key={index}
                  className="text-sm font-mono text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-2 rounded text-center"
                >
                  {code}
                </code>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={copyToClipboard}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copied ? "Copied!" : "Copy Codes"}</span>
            </button>
            <button
              onClick={downloadCodes}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200">
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              ⚠️ Save these codes in a safe place. Each code can only be used
              once. If you lose these codes, you'll need to generate a new set.
            </p>
          </div>
        </motion.div>
      )}

      {!showCodes && hasCodes && (
        <p className="text-sm text-green-600 dark:text-green-400 mt-2">
          ✓ Backup codes have been generated for your account
        </p>
      )}

      {!showCodes && !hasCodes && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Generate backup codes to secure your account recovery options.
        </p>
      )}
    </div>
  );
};

export default BackupCodes;
