/* ./pages/Register.jsx */
import React, { useState, useEffect, useRef } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Mail,
  Phone,
  User,
  Lock,
  Camera,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  Fingerprint,
  Smartphone,
  RotateCcw,
} from "lucide-react";
import ThemeToggle from "../components/common/ThemeToggle";

const Register = () => {
  const { user, register } = useAuth();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [faceCaptured, setFaceCaptured] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [faceOptional, setFaceOptional] = useState(true); // Face is now optional
  const [captureStatus, setCaptureStatus] = useState(
    "Face registration is optional. Complete form to enable face capture.",
  );
  const [formCompleted, setFormCompleted] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);

  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
    first_name: "",
    last_name: "",
    face_image: "",
  });

  // Check if form is completed (except face)
  useEffect(() => {
    const isFormValid =
      formData.email &&
      formData.phone &&
      formData.password &&
      formData.first_name &&
      formData.last_name &&
      formData.password.length >= 8;

    setFormCompleted(isFormValid);

    // Update status message based on form completion
    if (isFormValid && !faceCaptured && !cameraStarted) {
      setCaptureStatus("Ready to start face capture (optional)");
    } else if (!isFormValid && !faceCaptured) {
      setCaptureStatus("Complete form to enable face capture");
    }
  }, [formData, faceCaptured, cameraStarted]);

  const startCamera = async () => {
    try {
      setError("");
      setIsCapturing(true);
      setCameraStarted(true);
      setCaptureStatus("Starting camera...");

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Start auto-capture after camera is ready
      setTimeout(() => {
        startAutoCapture();
      }, 1000);
    } catch (error) {
      console.error("Error accessing camera:", error);
      setError(
        "Unable to access camera. Please check permissions and try again.",
      );
      setIsCapturing(false);
      setCameraStarted(false);
      setCaptureStatus(
        "Camera access failed - please allow camera permissions",
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    setIsCapturing(false);
    setCameraStarted(false);
  };

  const startAutoCapture = () => {
    setCaptureStatus("Looking for face...");
    // Capture frame every 3 seconds
    captureIntervalRef.current = setInterval(() => {
      captureFrame();
    }, 3000);
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current && !faceCaptured) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      canvasRef.current.toBlob(
        (blob) => {
          const file = new File([blob], `face-registration-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });

          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Image = reader.result;
            setFormData((prev) => ({ ...prev, face_image: base64Image }));
            setFaceCaptured(true);
            setCaptureStatus("✅ Face captured successfully!");
            stopCamera();

            setSuccess(
              "🎉 Face registered! You can now complete your registration.",
            );
          };
          reader.readAsDataURL(file);
        },
        "image/jpeg",
        0.8,
      );
    }
  };

  // eslint-disable-next-line no-unused-vars
  const manualCapture = () => {
    if (videoRef.current && canvasRef.current && !faceCaptured && isCapturing) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      canvasRef.current.toBlob(
        (blob) => {
          const file = new File([blob], "face-registration.jpg", {
            type: "image/jpeg",
          });

          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Image = reader.result;
            setFormData((prev) => ({ ...prev, face_image: base64Image }));
            setFaceCaptured(true);
            setCaptureStatus("✅ Face captured successfully!");
            stopCamera();

            setSuccess(
              "🎉 Face registered! You can now complete your registration.",
            );
          };
          reader.readAsDataURL(file);
        },
        "image/jpeg",
        0.9,
      );
    }
  };

  // eslint-disable-next-line no-unused-vars
  const retryFaceCapture = () => {
    setFormData((prev) => ({ ...prev, face_image: "" }));
    setFaceCaptured(false);
    setCaptureStatus("Ready to start face capture (optional)");
    setSuccess("");
    setError("");
    stopCamera();
  };

  const startFaceCapture = () => {
    if (formCompleted && !faceCaptured) {
      startCamera();
    }
  };

  const cancelFaceCapture = () => {
    stopCamera();
    setCaptureStatus("Ready to start face capture (optional)");
  };

  const skipFace = () => {
    setFaceCaptured(false);
    setSuccess("Face registration skipped. You can add it later from profile.");
    setCaptureStatus("Face registration skipped (optional)");
  };

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (showLogin) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const registrationData = {
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        // Only include face_image if captured
        ...(formData.face_image && { face_image: formData.face_image }),
      };

      console.log("Sending registration data to backend:", {
        ...registrationData,
        password: "***",
        face_image: registrationData.face_image
          ? "Base64 image data"
          : "Not provided (optional)",
      });

      const response = await register(registrationData);

      if (response.success) {
        setSuccess(
          "🎉 Registration successful! Your account has been created. Redirecting to login...",
        );

        setTimeout(() => {
          setShowLogin(true);
        }, 2000);
      } else {
        throw new Error(response.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    // Face is no longer required for registration
    return (
      formData.email &&
      formData.phone &&
      formData.password &&
      formData.first_name &&
      formData.last_name &&
      formData.password.length >= 8
      // face_image is now OPTIONAL
    );
  };

  const passwordStrength = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };

  const strengthScore = Object.values(passwordStrength).filter(Boolean).length;
  const strengthColor = {
    0: isDark ? "bg-gray-600" : "bg-gray-200",
    1: "bg-red-500",
    2: "bg-orange-500",
    3: "bg-yellow-500",
    4: "bg-blue-500",
    5: "bg-green-500",
  }[strengthScore];

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
        className={`max-w-2xl w-full space-y-8 backdrop-blur-sm rounded-2xl shadow-xl border p-6 sm:p-8 relative z-10 transition-colors duration-300 ${
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
            Join XShell
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`text-base sm:text-lg transition-colors duration-300 ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Create your account with optional facial recognition
          </motion.p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`backdrop-blur-sm border rounded-xl p-4 transition-colors duration-300 ${
                isDark
                  ? "bg-red-900/30 border-red-800"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center">
                <AlertCircle
                  className={`w-5 h-5 mr-3 ${
                    isDark ? "text-red-400" : "text-red-500"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    isDark ? "text-red-300" : "text-red-700"
                  }`}
                >
                  {error}
                </p>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`backdrop-blur-sm border rounded-xl p-4 transition-colors duration-300 ${
                isDark
                  ? "bg-green-900/30 border-green-800"
                  : "bg-green-50 border-green-200"
              }`}
            >
              <div className="flex items-center">
                <CheckCircle2
                  className={`w-5 h-5 mr-3 ${
                    isDark ? "text-green-400" : "text-green-500"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    isDark ? "text-green-300" : "text-green-700"
                  }`}
                >
                  {success}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Column - Registration Form */}
          <motion.form
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            onSubmit={handleSubmit}
            className="space-y-5 sm:space-y-6"
          >
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label
                  className={`block text-sm font-medium transition-colors duration-300 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  First Name *
                </label>
                <div className="relative group">
                  <div className="relative">
                    <User
                      className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 ${
                        isDark ? "text-gray-500" : "text-gray-400"
                      }`}
                    />
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-500 text-sm sm:text-base ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-200 text-gray-900 placeholder-gray-500"
                      }`}
                      placeholder="First name"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className={`block text-sm font-medium transition-colors duration-300 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Last Name *
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-500 text-sm sm:text-base ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-200 text-gray-900 placeholder-gray-500"
                    }`}
                    placeholder="Last name"
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label
                className={`block text-sm font-medium transition-colors duration-300 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Email Address *
              </label>
              <div className="relative">
                <Mail
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  }`}
                />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-500 text-sm sm:text-base ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-200 text-gray-900 placeholder-gray-500"
                  }`}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <label
                className={`block text-sm font-medium transition-colors duration-300 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Phone Number *
              </label>
              <div className="relative">
                <Phone
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  }`}
                />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-500 text-sm sm:text-base ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-200 text-gray-900 placeholder-gray-500"
                  }`}
                  placeholder="+254 5123-4567"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-3">
              <label
                className={`block text-sm font-medium transition-colors duration-300 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Password *
              </label>
              <div className="relative">
                <Lock
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  }`}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className={`w-full pl-9 sm:pl-10 pr-10 sm:pr-12 py-2 sm:py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-500 text-sm sm:text-base ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-200 text-gray-900 placeholder-gray-500"
                  }`}
                  placeholder="Create your password"
                  minLength="8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${
                    isDark
                      ? "text-gray-400 hover:text-gray-300"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2"
                >
                  <div
                    className={`flex justify-between text-xs ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    <span>Password Strength</span>
                    <span>{strengthScore}/5</span>
                  </div>
                  <div
                    className={`w-full rounded-full h-2 ${
                      isDark ? "bg-gray-700" : "bg-gray-200"
                    }`}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(strengthScore / 5) * 100}%` }}
                      className={`h-2 rounded-full transition-all duration-500 ${strengthColor}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {Object.entries(passwordStrength).map(([key, met]) => (
                      <div key={key} className="flex items-center">
                        <div
                          className={`w-1.5 h-1.5 rounded-full mr-2 ${
                            met
                              ? "bg-green-500"
                              : isDark
                                ? "bg-gray-600"
                                : "bg-gray-300"
                          }`}
                        />
                        <span
                          className={
                            met
                              ? "text-green-600 dark:text-green-400"
                              : isDark
                                ? "text-gray-400"
                                : "text-gray-500"
                          }
                        >
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !isFormValid()}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="relative flex items-center justify-center space-x-2 sm:space-x-3">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                    <span className="text-sm sm:text-base">
                      Creating Your Account...
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base">
                      Complete Registration
                    </span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </>
                )}
              </div>
            </motion.button>

            {/* Login Link */}
            <div
              className={`text-center pt-4 border-t transition-colors duration-300 ${
                isDark ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <p
                className={
                  isDark ? "text-gray-400 text-sm" : "text-gray-600 text-sm"
                }
              >
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setShowLogin(true)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors duration-200 hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </motion.form>

          {/* Right Column - Face Registration (OPTIONAL) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="space-y-5 sm:space-y-6"
          >
            <div className="space-y-3">
              <label
                className={`block text-sm font-medium transition-colors duration-300 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Fingerprint
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      isDark ? "text-purple-400" : "text-purple-500"
                    }`}
                  />
                  <span>Face Registration (Optional)</span>
                  {faceCaptured && (
                    <span className="text-green-600 dark:text-green-400 text-xs">
                      ✓ Captured
                    </span>
                  )}
                </div>
              </label>

              {/* Status Message */}
              <div className="text-center">
                <p
                  className={`text-xs sm:text-sm font-medium ${
                    faceCaptured
                      ? "text-green-600 dark:text-green-400"
                      : formCompleted
                        ? "text-blue-600 dark:text-blue-400"
                        : isDark
                          ? "text-gray-400"
                          : "text-gray-500"
                  }`}
                >
                  {captureStatus}
                </p>
              </div>

              {/* Skip Face Button */}
              {!faceCaptured && !isCapturing && formCompleted && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={skipFace}
                  className="w-full bg-gray-500 text-white py-2 sm:py-3 px-4 rounded-xl font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 text-sm sm:text-base"
                >
                  Skip Face Registration (Register with Email + OTP only)
                </motion.button>
              )}

              {/* Start Face Capture Button */}
              {formCompleted && !faceCaptured && !isCapturing && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startFaceCapture}
                  className="w-full bg-purple-600 text-white py-2 sm:py-3 px-4 rounded-xl font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 text-sm sm:text-base"
                >
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" />
                  Start Face Capture (Optional)
                </motion.button>
              )}

              {/* Cancel Button */}
              {isCapturing && !faceCaptured && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={cancelFaceCapture}
                  className="w-full bg-gray-500 text-white py-2 sm:py-3 px-4 rounded-xl font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 text-sm sm:text-base"
                >
                  Cancel Face Capture
                </motion.button>
              )}

              {/* Face Capture Interface */}
              <div className="space-y-4">
                {/* Live Camera Feed */}
                {isCapturing && !faceCaptured && (
                  <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 border-4 border-blue-400 border-dashed rounded-lg pointer-events-none"></div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs sm:text-sm">
                        🎯 {captureStatus}
                      </div>
                    </div>
                    {/* Face guide overlay */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 border-2 border-green-400 rounded-full opacity-50 animate-pulse"></div>
                    </div>
                  </div>
                )}

                {/* Captured Image Preview */}
                {faceCaptured && formData.face_image && (
                  <div className="text-center space-y-3 sm:space-y-4">
                   
                    <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="font-medium text-sm sm:text-base">
                        Face successfully registered!
                      </span>
                    </div>

                    {/* Retry button */}
                    
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />

                {/* Manual Capture Button */}
                
              </div>
            </div>

            {/* Face Capture Guidelines */}
            <div
              className={`rounded-lg p-3 sm:p-4 border transition-colors duration-300 ${
                isDark
                  ? "bg-blue-900/30 border-blue-800"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <h4
                className={`font-semibold mb-2 text-sm sm:text-base ${
                  isDark ? "text-blue-300" : "text-blue-900"
                }`}
              >
                📋 Face Capture Guidelines (Optional):
              </h4>
              <ul
                className={`text-xs sm:text-sm space-y-1 ${
                  isDark ? "text-blue-300" : "text-blue-800"
                }`}
              >
                <li>• Ensure good lighting on your face</li>
                <li>• Look directly at the camera</li>
                <li>• Position face within the circle</li>
                <li>• Remove sunglasses or hats</li>
                <li>• Auto-capture happens every 3 seconds</li>
                <li className="text-green-600 dark:text-green-400 font-medium">
                  • Face registration is OPTIONAL - you can skip and add later
                </li>
              </ul>
            </div>

            {/* Info about adding face later */}
            {!faceCaptured && (
              <div
                className={`rounded-lg p-3 sm:p-4 border transition-colors duration-300 ${
                  isDark
                    ? "bg-yellow-900/30 border-yellow-800"
                    : "bg-yellow-50 border-yellow-200"
                }`}
              >
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4
                      className={`font-semibold text-xs sm:text-sm mb-1 ${
                        isDark ? "text-yellow-300" : "text-yellow-800"
                      }`}
                    >
                      ✨ Face Registration is Optional
                    </h4>
                    <p
                      className={`text-xs ${
                        isDark ? "text-yellow-300" : "text-yellow-700"
                      }`}
                    >
                      You can register now without face and add it later from
                      your profile page. Without face, you'll still have
                      password + OTP protection.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Security Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 border transition-colors duration-300 ${
            isDark
              ? "bg-gradient-to-r from-gray-700/50 to-gray-800/50 border-gray-600"
              : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50"
          }`}
        >
          <h4
            className={`font-semibold mb-3 sm:mb-4 text-center flex items-center justify-center space-x-2 transition-colors duration-300 text-sm sm:text-base ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            <Shield
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                isDark ? "text-blue-400" : "text-blue-600"
              }`}
            />
            <span>Next-Gen Security Features</span>
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div
              className={`flex items-center space-x-2 ${
                isDark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <Fingerprint
                className={`w-3 h-3 sm:w-4 sm:h-4 ${
                  isDark ? "text-purple-400" : "text-purple-600"
                }`}
              />
              <span>Optional Face Recognition</span>
            </div>
            <div
              className={`flex items-center space-x-2 ${
                isDark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <Smartphone
                className={`w-3 h-3 sm:w-4 sm:h-4 ${
                  isDark ? "text-blue-400" : "text-blue-600"
                }`}
              />
              <span>2FA Protection</span>
            </div>
            <div
              className={`flex items-center space-x-2 ${
                isDark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <Sparkles
                className={`w-3 h-3 sm:w-4 sm:h-4 ${
                  isDark ? "text-yellow-400" : "text-yellow-600"
                }`}
              />
              <span>AI Security</span>
            </div>
            <div
              className={`flex items-center space-x-2 ${
                isDark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <CheckCircle2
                className={`w-3 h-3 sm:w-4 sm:h-4 ${
                  isDark ? "text-green-400" : "text-green-600"
                }`}
              />
              <span>Zero Trust Ready</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Register;
