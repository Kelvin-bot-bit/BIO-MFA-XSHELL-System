/* eslint-disable no-unused-vars */
/* ./components/profile/ProfilePictureModal.jsx */
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  X,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle2,
  User,
} from "lucide-react";

const ProfilePictureModal = ({
  isOpen,
  onClose,
  onSuccess,
  currentPicture,
  userName,
}) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
    } catch (error) {
      console.error("Error accessing camera:", error);
      setError("Unable to access camera. Please check permissions.");
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      canvasRef.current.toBlob(
        (blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setImage(reader.result);
            setPreview(reader.result);
            stopCamera();
          };
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.9,
      );
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a valid image file (JPG, PNG, WEBP, or GIF)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!image) {
      setError("Please select an image first");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        "http://localhost:5000/api/profile/picture",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ image: image }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setSuccess("Profile picture updated successfully!");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      } else {
        setError(data.message || "Failed to update profile picture");
      }
    } catch (error) {
      console.error("Error saving profile picture:", error);
      setError("Failed to save profile picture. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm("Are you sure you want to remove your profile picture?")
    ) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        "http://localhost:5000/api/profile/picture",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        setSuccess("Profile picture removed successfully!");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      } else {
        setError(data.message || "Failed to remove profile picture");
      }
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      setError("Failed to remove profile picture. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    stopCamera();
    setImage(null);
    setPreview(null);
    setError("");
    setSuccess("");
    onClose();
  };

  const resetAndRetake = () => {
    setImage(null);
    setPreview(null);
    setError("");
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50"
        onClick={handleCancel}
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
                  Profile Picture
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Upload or take a photo
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
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

            {/* Current Picture Preview */}
            {!image && currentPicture && !isCapturing && (
              <div className="text-center">
                <div className="relative inline-block">
                  <img
                    src={`http://localhost:5000${currentPicture}`}
                    alt="Current profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-md mx-auto"
                  />
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs">
                    Current
                  </div>
                </div>
              </div>
            )}

            {/* Camera Feed */}
            {isCapturing && !image && (
              <div className="space-y-4">
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
                      📸 Position your face in the frame
                    </div>
                  </div>
                  {/* Face guide overlay */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 border-2 border-green-400 rounded-full opacity-50 animate-pulse"></div>
                  </div>
                </div>
                <button
                  onClick={capturePhoto}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  📸 Capture Photo
                </button>
              </div>
            )}

            {/* Preview after capture */}
            {preview && (
              <div className="text-center space-y-4">
                <div className="relative inline-block">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-32 h-32 rounded-full object-cover border-4 border-green-500 shadow-md mx-auto"
                  />
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-2 py-0.5 rounded-full text-xs">
                    Preview
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={resetAndRetake}
                    className="flex-1 bg-gray-500 text-white py-2 rounded-xl font-medium hover:bg-gray-600 transition-colors"
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white py-2 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}

            {/* Upload Options */}
            {!isCapturing && !preview && (
              <div className="space-y-3">
                {/* Upload from file */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>Upload from Device</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Take photo with camera */}
                <button
                  onClick={startCamera}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Camera className="w-5 h-5" />
                  <span>Take Photo with Camera</span>
                </button>

                {/* Delete current picture */}
                {currentPicture && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>
                      {deleting ? "Removing..." : "Remove Current Picture"}
                    </span>
                  </button>
                )}
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* Guidelines */}
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm mb-2">
                📋 Guidelines:
              </h4>
              <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Use a clear, well-lit photo of your face</li>
                <li>• JPG, PNG, WEBP, or GIF formats accepted</li>
                <li>• Maximum file size: 5MB</li>
                <li>• Image will be resized to 500x500 pixels</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProfilePictureModal;
