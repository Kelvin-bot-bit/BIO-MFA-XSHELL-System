/* ./components/auth/OtpStep.jsx */
import React, { useState, useRef, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import {
  Smartphone,
  RotateCcw,
  Mail,
  AlertCircle,
  CheckCircle2,
  EyeOff,
} from "lucide-react";

const OtpStep = ({
  onVerify,
  loading,
  userEmail,
  onSkipFace,
  faceOptional = false,
  faceRequired = false,
}) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(300); // 5 minutes
  const [resendEnabled, setResendEnabled] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);
  const inputsRef = useRef([]);

  useEffect(() => {
    const countdown = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setResendEnabled(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1].focus();
    }

    // Auto-submit when all digits are entered
    if (value && index === 5) {
      const otpString = newOtp.join("");
      if (otpString.length === 6) {
        handleSubmit(newOtp.join(""));
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const handleSubmit = async (otpString = null) => {
    const finalOtp = otpString || otp.join("");
    if (finalOtp.length === 6) {
      await onVerify(finalOtp);
    }
  };

  const handleSkipFace = async () => {
    if (skipLoading) return;
    setSkipLoading(true);
    try {
      await onSkipFace();
    } catch (error) {
      console.error("Skip face error:", error);
    } finally {
      setSkipLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!resendEnabled || resendLoading) return;

    setResendLoading(true);
    setResendSuccess(false);

    try {
      // Call your resend OTP API here
      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("tempToken");
      const response = await fetch(
        "http://localhost:5000/api/auth/resend-otp",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        setResendSuccess(true);
        setTimer(300); // Reset to 5 minutes
        setResendEnabled(false);
        setOtp(["", "", "", "", "", ""]);
        inputsRef.current[0]?.focus();

        // Auto-hide success message after 3 seconds
        setTimeout(() => setResendSuccess(false), 3000);
      } else {
        alert(data.message || "Failed to resend OTP");
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      alert("Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const maskedEmail = userEmail
    ? userEmail.replace(
        /(.{2})(.*)(?=@)/,
        (match, p1, p2) => p1 + "*".repeat(p2.length),
      )
    : "your email";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-2xl mb-4">
          <Smartphone className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Enter Verification Code
        </h3>
        <p className="text-gray-600 mb-2">
          We sent a 6-digit code to your registered email
        </p>
        {userEmail && (
          <p className="text-sm text-blue-600 font-medium mb-4 flex items-center justify-center">
            <Mail className="w-4 h-4 mr-2" />
            {maskedEmail}
          </p>
        )}

        {/* OTP Input Fields */}
        <div className="flex justify-center space-x-2 sm:space-x-3 mb-6">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputsRef.current[index] = el)}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={(e) => {
                e.preventDefault();
                const pasteData = e.clipboardData.getData("text").slice(0, 6);
                const pasteArray = pasteData.split("");
                const newOtp = [...otp];
                pasteArray.forEach((char, idx) => {
                  if (idx < 6 && /^\d?$/.test(char)) {
                    newOtp[idx] = char;
                  }
                });
                setOtp(newOtp);

                // Focus on the next empty field or last field
                const nextEmptyIndex = newOtp.findIndex((d) => d === "");
                if (nextEmptyIndex !== -1 && nextEmptyIndex < 6) {
                  inputsRef.current[nextEmptyIndex]?.focus();
                } else {
                  inputsRef.current[5]?.focus();
                }
              }}
              className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-center text-xl sm:text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all duration-200 bg-white shadow-sm"
              disabled={loading || skipLoading}
            />
          ))}
        </div>

        {/* Timer and Resend Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 text-sm">
            <span className="text-gray-600">Code expires in</span>
            <span
              className={`font-mono font-bold ${timer < 60 ? "text-red-500" : "text-blue-600"}`}
            >
              {formatTime(timer)}
            </span>
          </div>

          {resendEnabled && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleResendOtp}
              disabled={resendLoading}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resendLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Resend Code
                </>
              )}
            </motion.button>
          )}

          {resendSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center space-x-2 text-green-600 text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>New code sent successfully!</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Submit Button - Changes based on face requirement */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleSubmit()}
        disabled={loading || skipLoading || otp.join("").length !== 6}
        className="w-full bg-blue-600 text-white py-3 sm:py-4 px-4 rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-3 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        {loading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Verifying OTP...</span>
          </div>
        ) : faceRequired ? (
          "Continue to Face Verification"
        ) : faceOptional ? (
          "Continue (Face Optional)"
        ) : (
          "Continue to Face Verification"
        )}
      </motion.button>

      {/* Skip Face Button - Only show when face is optional */}
      {faceOptional && onSkipFace && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleSkipFace}
          disabled={loading || skipLoading}
          className="w-full bg-gray-500 text-white py-3 sm:py-4 px-4 rounded-xl font-semibold hover:bg-gray-600 focus:outline-none focus:ring-3 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
        >
          {skipLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Completing Login...</span>
            </div>
          ) : (
            <>
              <EyeOff className="w-5 h-5 inline mr-2" />
              Skip Face Verification (Continue with OTP only)
            </>
          )}
        </motion.button>
      )}

      {/* Face Required Warning */}
      {faceRequired && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-800 text-sm mb-1">
                🔐 Face Verification Required
              </h4>
              <p className="text-red-700 text-sm">
                Due to security concerns (unusual location or device), face
                verification is required to complete your login.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Face Optional Info */}
      {faceOptional && (
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-800 text-sm mb-1">
                ✨ Face Verification Optional
              </h4>
              <p className="text-green-700 text-sm">
                Your login is low risk. You can skip face verification and
                continue with OTP only, or add face for enhanced security.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real OTP Information */}
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 text-sm mb-1">
                📧 Check Your Email
              </h4>
              <p className="text-blue-800 text-sm">
                A <strong>real 6-digit OTP</strong> has been sent to your email
                address. Check your inbox and spam folder for the verification
                code.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 text-sm mb-1">
                ⚡ Auto-Submit Enabled
              </h4>
              <p className="text-amber-800 text-sm">
                The form will automatically submit when all 6 digits are
                entered, or you can paste the entire code at once.
              </p>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="text-center text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <p className="font-medium">🔒 Secure Verification</p>
          <p className="mt-1">
            Your OTP is securely generated and will expire in 5 minutes for your
            protection.
          </p>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 text-xs text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="truncate">Check spam folder</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="truncate">Expires in 5 min</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span className="truncate">Paste with Ctrl+V</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <span className="truncate">Resend if needed</span>
        </div>
      </div>
    </motion.div>
  );
};

export default OtpStep;


