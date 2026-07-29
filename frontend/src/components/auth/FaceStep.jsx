/* ./components/auth/FaceStep.jsx */
import React, { useState, useRef, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import {
  Camera,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  EyeOff,
} from "lucide-react";

const FaceStep = ({ onVerify, loading, faceOptional = false, onSkip }) => {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const cameraReadyRef = useRef(false);
  const isActiveRef = useRef(true);
  const errorRef = useRef(false); // Use ref to track error state synchronously
  const isRestartingRef = useRef(false); // Track if restart is in progress

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => {
      setShake(false);
    }, 1000);
  };

  const stopCameraTracks = () => {
    console.log("🛑 Stopping camera tracks...");
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        if (track.readyState === "live") {
          track.stop();
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    cameraReadyRef.current = false;
  };

  const startCamera = async () => {
    if (!isActiveRef.current) return;

    try {
      console.log("📷 Starting camera...");
      setIsCapturing(true);
      cameraReadyRef.current = false;
      errorRef.current = false;
      isRestartingRef.current = false;

      stopCameraTracks();

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      if (!isActiveRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        videoRef.current.onloadedmetadata = () => {
          if (!isActiveRef.current) return;
          console.log("✅ Video metadata loaded");
          cameraReadyRef.current = true;
          // Wait a bit before starting auto-capture to ensure everything is ready
          setTimeout(() => {
            if (
              !isRestartingRef.current &&
              cameraReadyRef.current &&
              !errorRef.current
            ) {
              startAutoCapture();
            }
          }, 500);
        };

        videoRef.current.play().catch((err) => {
          console.warn("Video play warning:", err.message);
        });
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      if (isActiveRef.current) {
        errorRef.current = true;
        setError(
          "Unable to access camera. Please check permissions and try again.",
        );
        triggerShake();
        setIsCapturing(false);
      }
    }
  };

  const stopCamera = () => {
    stopCameraTracks();
    setIsCapturing(false);
  };

  const startAutoCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    console.log("🎯 Auto-capture started - will capture every 3 seconds");

    const attemptCapture = () => {
      // Check conditions using refs for synchronous access
      const isReady =
        cameraReadyRef.current &&
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        !isVerifying &&
        !success &&
        !errorRef.current && // Use ref instead of state
        !isRestartingRef.current &&
        isActiveRef.current;

      if (isReady) {
        console.log("📸 Auto-capturing frame...");
        captureFrame();
      }
    };

    // First capture after 1 second
    setTimeout(attemptCapture, 1000);

    // Then every 3 seconds
    captureIntervalRef.current = setInterval(attemptCapture, 3000);
  };

  const captureFrame = () => {
    if (errorRef.current || isRestartingRef.current) return;

    if (
      videoRef.current &&
      canvasRef.current &&
      !loading &&
      !isVerifying &&
      !success &&
      videoRef.current.videoWidth > 0 &&
      videoRef.current.videoHeight > 0 &&
      isActiveRef.current &&
      !errorRef.current
    ) {
      try {
        const context = canvasRef.current.getContext("2d");
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        canvasRef.current.toBlob(
          (blob) => {
            if (
              blob &&
              isActiveRef.current &&
              !errorRef.current &&
              !isRestartingRef.current
            ) {
              const previewUrl = URL.createObjectURL(blob);
              setPreview(previewUrl);

              const reader = new FileReader();
              reader.onloadend = () => {
                if (
                  isActiveRef.current &&
                  !errorRef.current &&
                  !isRestartingRef.current
                ) {
                  autoVerifyFace(reader.result);
                }
              };
              reader.readAsDataURL(blob);
            }
          },
          "image/jpeg",
          0.9,
        );
      } catch (err) {
        console.error("Capture frame error:", err);
      }
    }
  };

  const autoVerifyFace = async (base64Image) => {
    if (loading || isVerifying || success || !isActiveRef.current) return;

    setIsVerifying(true);
    setSuccess("Analyzing face...");

    try {
      let imageToSend = base64Image;
      if (base64Image && base64Image.startsWith("data:image")) {
        imageToSend = base64Image;
      } else if (base64Image && !base64Image.startsWith("data:image")) {
        imageToSend = `data:image/jpeg;base64,${base64Image}`;
      }

      console.log(
        `📸 Sending face image (length: ${imageToSend.length} chars)`,
      );

      const response = await onVerify(imageToSend);
      console.log("Face verification response:", response);

      if (response && response.success === true) {
        setSuccess("Face verified successfully!");
        stopCamera();
        if (preview) {
          URL.revokeObjectURL(preview);
          setPreview(null);
        }
      } else {
        const errorMsg =
          response?.message ||
          "Face verification failed. Please ensure good lighting and try again.";
        errorRef.current = true;
        setError(errorMsg);
        setSuccess("");
        triggerShake();

        if (captureIntervalRef.current) {
          clearInterval(captureIntervalRef.current);
          captureIntervalRef.current = null;
        }
        setIsCapturing(false);
      }
    } catch (error) {
      console.error("Face verification error:", error);
      const errorMsg =
        error.message ||
        "Face verification failed. Please ensure good lighting and try again.";
      errorRef.current = true;
      setError(errorMsg);
      setSuccess("");
      triggerShake();

      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      setIsCapturing(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const restartVerification = () => {
    console.log(
      "🔄 Restarting face verification - will restart auto-capture...",
    );

    // Mark that we're restarting to prevent captures during restart
    isRestartingRef.current = true;

    // Stop any ongoing capture
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    // Clear error ref and state FIRST
    errorRef.current = false;
    setError("");
    setSuccess("");
    setIsVerifying(false);
    setShake(false);

    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }

    // Stop current camera
    stopCameraTracks();

    // Wait for cleanup, then restart
    setTimeout(() => {
      // Reset restart flag after a delay
      setTimeout(() => {
        isRestartingRef.current = false;
      }, 1000);

      // Start fresh camera
      startCamera();
    }, 300);
  };

  const handleSkip = async () => {
    if (skipLoading || !onSkip) return;
    setSkipLoading(true);
    errorRef.current = false;
    setError("");
    try {
      await onSkip();
    } catch (error) {
      console.error("Skip face error:", error);
      errorRef.current = true;
      setError(error.message || "Failed to skip face verification");
      triggerShake();
    } finally {
      setSkipLoading(false);
    }
  };

  useEffect(() => {
    isActiveRef.current = true;
    console.log("FaceStep mounted, starting camera...");
    startCamera();
    return () => {
      console.log("FaceStep unmounting, cleaning up...");
      isActiveRef.current = false;
      isRestartingRef.current = true;
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      stopCameraTracks();
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="text-center">
        <Camera className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {faceOptional ? "Face Verification (Optional)" : "Face Verification"}
        </h3>
        <p className="text-gray-600 mb-6">
          {isCapturing && !success && !error && !isVerifying
            ? cameraReadyRef.current
              ? "Auto-capturing face every 3 seconds..."
              : "Starting camera..."
            : isVerifying
              ? "Verifying..."
              : success
                ? "Verification complete!"
                : error
                  ? "Verification failed. Click 'Try Again' to restart."
                  : faceOptional
                    ? "Add an extra layer of security with face recognition"
                    : "Position your face in the frame"}
        </p>
      </div>

      {error && (
        <div
          className={`bg-red-50 border border-red-200 rounded-lg p-4 transition-all duration-200 ${
            shake ? "animate-shake" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={restartVerification}
              disabled={isVerifying || loading}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
            <p className="text-green-700 text-sm font-medium">{success}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {isCapturing && !success && !error && (
          <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 border-4 border-blue-400 border-dashed rounded-lg pointer-events-none"></div>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                {!cameraReadyRef.current
                  ? "📷 Starting camera..."
                  : isVerifying
                    ? "✨ Verifying..."
                    : "🎯 Auto-detecting face..."}
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-48 h-48 border-2 border-green-400 rounded-full opacity-50 animate-pulse"></div>
            </div>
          </div>
        )}

        {!isCapturing && !success && error && (
          <div className="text-center py-8 bg-gray-100 rounded-lg">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">Face verification failed</p>
            <button
              onClick={restartVerification}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {faceOptional && onSkip && !success && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSkip}
            disabled={loading || isVerifying || skipLoading}
            className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {skipLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Completing Login...</span>
              </div>
            ) : (
              <>
                <EyeOff className="w-4 h-4 inline mr-2" />
                Skip Face Verification
              </>
            )}
          </motion.button>
        )}
      </div>

      {(loading || isVerifying) && (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span>Verifying face with backend...</span>
          </div>
        </div>
      )}

      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">
          📋 Face Verification Guidelines:
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Ensure good lighting on your face</li>
          <li>• Look directly at the camera</li>
          <li>• Position face within the circle</li>
          <li>• Remove sunglasses or hats</li>
          <li>• Auto-capture happens every 3 seconds</li>
          <li>• Click "Try Again" to restart auto-capture</li>
        </ul>
      </div>

      <div className="text-center text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
        <p className="font-medium">🔒 Secure Backend Processing</p>
        <p className="text-xs mt-1">
          Your face data is securely processed by our facial recognition backend
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out 0s 2;
        }
      `}</style>
    </motion.div>
  );
};

export default FaceStep;
