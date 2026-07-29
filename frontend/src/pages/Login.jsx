import React, { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Lock,
  Smartphone,
  Camera,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Mail,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import PasswordStep from "../components/auth/PasswordStep";
import OtpStep from "../components/auth/OtpStep";
import FaceStep from "../components/auth/FaceStep";
import ThemeToggle from "../components/common/ThemeToggle";

const Login = () => {
  const {
    user,
    mfaStep,
    login,
    verifyOtp,
    verifyFace,
    skipFace,
    hasFaceRegistered,
  } = useAuth();
  const { isDark } = useTheme();
  const [stepLoading, setStepLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [faceOptional, setFaceOptional] = useState(false);
  const [faceRequired, setFaceRequired] = useState(false);
  const [faceToken, setFaceToken] = useState(null);
  const [showFaceStep, setShowFaceStep] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const steps = [
    { key: null, label: "Password", icon: Lock },
    { key: "otp", label: "OTP", icon: Smartphone },
    { key: "face", label: "Face", icon: Camera },
  ];

  const currentStepIndex = steps.findIndex((step) => step.key === mfaStep);

  const handleLogin = async (email, password) => {
    setStepLoading(true);
    setUserEmail(email);
    try {
      const response = await login(email, password);
      console.log("Login response:", response);
    } catch (error) {
      console.error("Login failed:", error);
      alert(error.message || "Login failed. Please try again.");
    } finally {
      setStepLoading(false);
    }
  };

  const handleOtpVerify = async (otp) => {
    setStepLoading(true);
    try {
      const response = await verifyOtp(otp);
      console.log("OTP verify response:", response);

      // Check if face verification is needed
      const needsFace =
        response.face_verification_token &&
        response.has_face_registered === true;

      if (needsFace) {
        setFaceOptional(response.face_optional === true);
        setFaceRequired(response.face_required === true);
        setFaceToken(response.face_verification_token);
        setShowFaceStep(true);
      }

      // If login completed without face (access_token received)
      if (response.access_token && !needsFace) {
        console.log("Login completed without face");
      }
    } catch (error) {
      console.error("OTP verification failed:", error);
      alert(error.message || "OTP verification failed. Please try again.");
    } finally {
      setStepLoading(false);
    }
  };

  const handleFaceVerify = async (faceImage) => {
    setStepLoading(true);
    try {
      const response = await verifyFace(faceImage, faceToken);
      console.log("Face verification response:", response);

      if (response.success) {
        setShowFaceStep(false);
        setFaceOptional(false);
        setFaceRequired(false);
        setFaceToken(null);
      }
    } catch (error) {
      console.error("Face verification failed:", error);
      alert(
        error.message ||
          "Face verification failed. Please ensure good lighting and try again.",
      );
    } finally {
      setStepLoading(false);
    }
  };

  const handleSkipFace = async () => {
    setStepLoading(true);
    try {
      const response = await skipFace(faceToken);
      console.log("Skip face response:", response);

      if (response.success) {
        setShowFaceStep(false);
        setFaceOptional(false);
        setFaceRequired(false);
        setFaceToken(null);
      }
    } catch (error) {
      console.error("Skip face failed:", error);
      alert(error.message || "Failed to complete login. Please try again.");
    } finally {
      setStepLoading(false);
    }
  };

  // Determine which step to show
  // Only show face step if we have a face token AND the user actually has face registered
  const getCurrentStep = () => {
    if (showFaceStep && faceToken && hasFaceRegistered) return "face";
    return mfaStep;
  };

  const currentStep = getCurrentStep();

  return (
    <div
      className={`min-h-screen transition-colors duration-300 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
          : "bg-gradient-to-br from-blue-50 via-white to-indigo-50"
      }`}
    >
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={`absolute top-10 left-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse floating ${
            isDark ? "bg-blue-600" : "bg-blue-200"
          }`}
        ></div>
        <div
          className={`absolute top-40 right-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000 floating ${
            isDark ? "bg-indigo-600" : "bg-indigo-200"
          }`}
        ></div>
        <div
          className={`absolute bottom-20 left-20 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000 floating ${
            isDark ? "bg-purple-600" : "bg-purple-200"
          }`}
        ></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={`max-w-md w-full space-y-8 backdrop-blur-sm rounded-2xl shadow-xl border p-6 sm:p-8 relative z-10 transition-colors duration-300 ${
          isDark
            ? "bg-gray-800/80 border-gray-700"
            : "bg-white/80 border-white/20"
        }`}
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg mb-6"
          >
            <Shield className="h-8 w-8 text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`text-2xl sm:text-3xl font-bold mb-3 transition-colors duration-300 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Welcome Back
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`text-base sm:text-lg transition-colors duration-300 ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Secure access to your account
          </motion.p>
        </div>

        {/* Progress Steps - Hide when face is optional and not required */}
        {!(faceOptional && !faceRequired && showFaceStep) && (
          <div className="flex justify-between items-center mb-8">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStepIndex + 1;
              const isCurrent = index === currentStepIndex + 1;

              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-200 ${
                        isCompleted
                          ? "bg-gradient-to-r from-green-500 to-green-600 border-green-500 text-white shadow-lg"
                          : isCurrent
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 border-blue-500 text-white shadow-lg"
                            : isDark
                              ? "bg-gray-700 border-gray-600 text-gray-400"
                              : "bg-gray-100 border-gray-200 text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <StepIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                      )}
                    </motion.div>
                    <span
                      className={`text-xs mt-2 font-medium transition-colors duration-200 ${
                        isCompleted || isCurrent
                          ? isDark
                            ? "text-gray-200"
                            : "text-gray-900"
                          : isDark
                            ? "text-gray-500"
                            : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded-full transition-all duration-200 ${
                        index < currentStepIndex
                          ? "bg-gradient-to-r from-green-500 to-green-600"
                          : isDark
                            ? "bg-gray-700"
                            : "bg-gray-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Current Step Display */}
        <div className="mb-6">
          <AnimatePresence mode="wait">
            {!currentStep && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="text-center"
              >
                <h3
                  className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Step 1: Enter Your Credentials
                </h3>
                <p
                  className={`text-sm transition-colors duration-300 ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Please enter your email and password to begin
                </p>
              </motion.div>
            )}
            {currentStep === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="text-center"
              >
                <h3
                  className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Step 2: Verify Your Identity
                </h3>
                <p
                  className={`text-sm transition-colors duration-300 ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Check your email for the verification code
                </p>
              </motion.div>
            )}
            {currentStep === "face" && (
              <motion.div
                key="face"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="text-center"
              >
                <h3
                  className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Step 3: Face Verification Required
                </h3>
                <p
                  className={`text-sm transition-colors duration-300 ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Complete authentication with facial recognition
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Authentication Steps */}
        <AnimatePresence mode="wait">
          {!currentStep && (
            <motion.div
              key="password"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <PasswordStep onLogin={handleLogin} loading={stepLoading} />
            </motion.div>
          )}
          {currentStep === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <OtpStep
                onVerify={handleOtpVerify}
                onSkipFace={handleSkipFace}
                loading={stepLoading}
                userEmail={userEmail}
                faceOptional={faceOptional}
                faceRequired={faceRequired}
              />
            </motion.div>
          )}
          {currentStep === "face" && (
            <motion.div
              key="face"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <FaceStep
                onVerify={handleFaceVerify}
                loading={stepLoading}
                faceOptional={false}
                onSkip={null}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forgot Password Link - Added here */}
        <div className="text-center">
          <Link
            to="/forgot-password"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200 inline-flex items-center"
          >
            Forgot Password?
          </Link>
        </div>

        {/* Back to register link */}
        <div
          className={`text-center pt-4 border-t transition-colors duration-300 ${
            isDark ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <p
            className={`transition-colors duration-300 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors duration-200 hover:underline inline-flex items-center"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              <span>Sign up</span>
            </Link>
          </p>
        </div>

        {/* Security Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className={`rounded-2xl p-4 sm:p-6 border transition-colors duration-300 ${
            isDark
              ? "bg-gradient-to-r from-gray-700/50 to-gray-800/50 border-gray-600"
              : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50"
          }`}
        >
          <h4
            className={`font-semibold mb-4 text-center flex items-center justify-center space-x-2 transition-colors duration-300 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            <Shield
              className={`w-5 h-5 ${
                isDark ? "text-blue-400" : "text-blue-600"
              }`}
            />
            <span>Multi-Layer Security</span>
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
            <div
              className={`flex items-center space-x-2 transition-colors duration-300 ${
                !currentStep
                  ? isDark
                    ? "text-gray-300"
                    : "text-gray-700"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Password</span>
              {currentStep && <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div
              className={`flex items-center space-x-2 transition-colors duration-300 ${
                currentStep === "otp" || currentStep === "face"
                  ? "text-green-600 dark:text-green-400"
                  : isDark
                    ? "text-gray-300"
                    : "text-gray-700"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>OTP Code</span>
              {currentStep === "face" && <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div
              className={`flex items-center space-x-2 transition-colors duration-300 ${
                currentStep === "face"
                  ? "text-green-600 dark:text-green-400"
                  : isDark
                    ? "text-gray-300"
                    : "text-gray-700"
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Face Verification</span>
              {currentStep === "face" && <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div
              className={`flex items-center space-x-2 transition-colors duration-300 ${
                isDark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <Mail
                className={`w-4 h-4 ${
                  isDark ? "text-blue-400" : "text-blue-600"
                }`}
              />
              <span>Real OTP Emails</span>
            </div>
          </div>

          {/* Real OTP Notice */}
          {currentStep === "otp" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mt-4 p-3 rounded-xl transition-colors duration-300 ${
                isDark
                  ? "bg-green-900/30 border border-green-800 text-green-300"
                  : "bg-green-50 border border-green-200 text-green-800"
              }`}
            >
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="w-4 h-4" />
                <span>
                  <strong>Real OTP Sent!</strong> Check your email at{" "}
                  {userEmail}
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Authentication Flow Info */}
        <div
          className={`rounded-xl p-4 border transition-colors duration-300 ${
            isDark
              ? "bg-amber-900/30 border-amber-800 text-amber-300"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <h4 className="font-semibold text-sm mb-2 flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>Secure Authentication Flow</span>
          </h4>
          <ul className="text-xs sm:text-sm space-y-1">
            <li>• 🔐 Password verification</li>
            <li>• 📧 Real OTP sent to your email</li>
            <li>• 📱 Enter 6-digit code from email</li>
            <li>
              •{" "}
              {hasFaceRegistered
                ? "🔒 Face verification required"
                : "✅ Instant access (no face registered)"}
            </li>
            <li>• ✅ Secure access to dashboard</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
