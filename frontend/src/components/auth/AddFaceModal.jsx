/* ./components/auth/AddFaceModal.jsx */
import React, { useState, useRef, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  EyeOff,
} from "lucide-react";

// eslint-disable-next-line no-unused-vars
const AddFaceModal = ({ isOpen, onClose, onSuccess, user }) => {
  // eslint-disable-next-line no-unused-vars
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError("");
      setIsCapturing(true);

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
  };

  const startAutoCapture = () => {
    // Capture frame every 2 seconds
    captureIntervalRef.current = setInterval(() => {
      if (!isVerifying && !success) {
        captureFrame();
      }
    }, 2000);
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current && !isVerifying && !success) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      canvasRef.current.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `face-capture-${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            setImage(file);
            setPreview(URL.createObjectURL(file));

            // Convert blob to base64 for auto-submit
            const reader = new FileReader();
            reader.onloadend = () => {
              autoAddFace(reader.result);
            };
            reader.readAsDataURL(file);
          }
        },
        "image/jpeg",
        0.9,
      );
    }
  };

  const autoAddFace = async (base64Image) => {
    if (loading || isVerifying || success) return;

    setIsVerifying(true);
    setError("");
    setSuccess("Analyzing face...");

    try {
      let imageToSend = base64Image;
      if (base64Image && base64Image.startsWith("data:")) {
        imageToSend = base64Image;
      } else if (base64Image && !base64Image.startsWith("data:")) {
        imageToSend = `data:image/jpeg;base64,${base64Image}`;
      }

      console.log(
        `📸 Sending face image (length: ${imageToSend.length} chars)`,
      );

      const response = await addFaceToBackend(imageToSend);

      if (response && response.success === true) {
        setSuccess("Face added successfully!");
        stopCamera();
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      } else {
        const errorMsg =
          response?.message ||
          "Face registration failed. Please ensure good lighting and try again.";
        setError(errorMsg);
        setSuccess("");
      }
    } catch (error) {
      console.error("Face registration error:", error);
      const errorMsg =
        error.message ||
        "Face registration failed. Please ensure good lighting and try again.";
      setError(errorMsg);
      setSuccess("");
    } finally {
      setIsVerifying(false);
    }
  };

  const addFaceToBackend = async (faceImage) => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("http://localhost:5000/api/auth/add-face", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ face_image: faceImage }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Add face API error:", error);
      throw error;
    }
  };

  const manualCapture = () => {
    if (videoRef.current && canvasRef.current && !isVerifying && !success) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      canvasRef.current.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], "face-capture.jpg", {
              type: "image/jpeg",
            });
            setImage(file);
            setPreview(URL.createObjectURL(file));

            const reader = new FileReader();
            reader.onloadend = () => {
              autoAddFace(reader.result);
            };
            reader.readAsDataURL(file);
          }
        },
        "image/jpeg",
        0.95,
      );
    }
  };

  const retryCapture = () => {
    setImage(null);
    setPreview(null);
    setError("");
    setSuccess("");
    setIsVerifying(false);
    if (!streamRef.current) {
      startCamera();
    } else {
      setIsCapturing(true);
    }
  };

  const handleClose = () => {
    stopCamera();
    setImage(null);
    setPreview(null);
    setError("");
    setSuccess("");
    setIsVerifying(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  Add Face Verification
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Enhance your account security
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-300 text-sm">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-3">
                <div className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    {success}
                  </p>
                </div>
              </div>
            )}

            {/* Camera Feed */}
            {isCapturing && !success && (
              <div className="relative bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 border-4 border-blue-400 border-dashed rounded-xl pointer-events-none"></div>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs sm:text-sm">
                    {isVerifying
                      ? "✨ Registering..."
                      : "🎯 Auto-detecting face..."}
                  </div>
                </div>
                {/* Face guide overlay */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 border-2 border-green-400 rounded-full opacity-50 animate-pulse"></div>
                </div>
              </div>
            )}

            {/* Preview */}
            {preview && !success && (
              <div className="text-center space-y-3">
                <div className="relative inline-block">
                  <img
                    src={preview}
                    alt="Captured face"
                    className="w-48 h-48 object-cover rounded-lg border-2 border-blue-500 shadow-md mx-auto"
                  />
                  <div className="absolute -top-2 -right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
                    Captured
                  </div>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* Buttons */}
            <div className="flex space-x-3">
              {!success && isCapturing && (
                <button
                  type="button"
                  onClick={manualCapture}
                  disabled={isVerifying}
                  className="flex-1 bg-blue-600 text-white py-2 sm:py-3 px-4 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
                >
                  {isVerifying ? "✨ Registering..." : "📸 Capture Now"}
                </button>
              )}

              {!success && !isCapturing && preview && (
                <button
                  type="button"
                  onClick={retryCapture}
                  disabled={isVerifying}
                  className="flex-1 bg-gray-500 text-white py-2 sm:py-3 px-4 rounded-xl font-medium hover:bg-gray-600 disabled:opacity-50 transition-colors text-sm sm:text-base"
                >
                  <RotateCcw className="w-4 h-4 inline mr-2" />
                  Retry
                </button>
              )}
            </div>

            {/* Loading State */}
            {(isVerifying || loading) && (
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 text-blue-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span>Registering face with backend...</span>
                </div>
              </div>
            )}

            {/* Guidelines */}
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm mb-2">
                📋 Face Registration Guidelines:
              </h4>
              <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Ensure good lighting on your face</li>
                <li>• Look directly at the camera</li>
                <li>• Position face within the circle</li>
                <li>• Remove sunglasses or hats</li>
                <li>• Auto-capture happens every 2 seconds</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddFaceModal;
