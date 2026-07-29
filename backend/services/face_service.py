# ./backend/services/face_service.py
import numpy as np
import logging
import base64
import io
from PIL import Image

# Import db directly
from models import db

logger = logging.getLogger(__name__)

class FaceService:
    """Face recognition service with configurable tolerance and confidence normalization"""

    def __init__(self, tolerance=0.6, model='large'):
        """Use a reasonable default tolerance (0.6). Callers can override if needed."""
        self.tolerance = tolerance
        self.model = model

    def _process_image_data(self, image_data):
        """Process image data (base64 or data URL) into PIL Image"""
        try:
            # Handle data URL format (data:image/jpeg;base64,...)
            if isinstance(image_data, str) and image_data.startswith('data:image'):
                image_data = image_data.split(';base64,')[1]

            # Decode base64 string
            if isinstance(image_data, str):
                image_bytes = base64.b64decode(image_data)
            else:
                image_bytes = image_data

            # Convert to PIL Image
            image = Image.open(io.BytesIO(image_bytes))

            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')

            return image

        except Exception as e:
            logger.error(f"Error processing image data: {str(e)}")
            raise ValueError(f"Invalid image data: {str(e)}")

    def encode_face_from_image(self, image_data):
        """Encode face from image data with quality checks"""
        try:
            import face_recognition
            import cv2
            import numpy as np

            # Process image data
            image = self._process_image_data(image_data)
            image_np = np.array(image)

            # Convert to grayscale for quality checks
            gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)

            # Detect faces (use CNN for accuracy when available)
            face_locations = face_recognition.face_locations(image_np, model='cnn')

            if not face_locations:
                raise ValueError("No face detected in the image")

            if len(face_locations) > 1:
                raise ValueError("Multiple faces detected. Please provide an image with only one face")

            # Use first detected face
            top, right, bottom, left = face_locations[0]

            # Face size checks
            face_height = bottom - top
            image_height = image_np.shape[0]
            min_face_ratio = 0.15
            if face_height < image_height * min_face_ratio:
                raise ValueError("Face is too small in the image. Please move closer to the camera")

            # Aspect ratio check
            face_width = right - left
            aspect_ratio = face_width / face_height
            if aspect_ratio < 0.7 or aspect_ratio > 1.3:
                raise ValueError("Face is at an extreme angle. Please look directly at the camera")

            # Brightness and contrast checks
            face_region = gray[top:bottom, left:right]
            brightness = np.mean(face_region)
            contrast = np.std(face_region)

            if brightness < 50 or brightness > 200:
                raise ValueError("Image is too dark or too bright. Please adjust lighting")

            if contrast < 20:
                raise ValueError("Low image contrast. Please ensure good lighting conditions")

            # Encode the face (increase jitters for better accuracy)
            face_encodings = face_recognition.face_encodings(
                image_np,
                known_face_locations=[(top, right, bottom, left)],
                model=self.model,
                num_jitters=10,
            )

            if not face_encodings:
                raise ValueError("Could not encode the detected face. Please try again with better lighting")

            encoding = face_encodings[0]
            logger.info(f"✅ Face encoded - Shape: {encoding.shape}, Quality checks passed")

            return encoding

        except ImportError as e:
            if "face_recognition" in str(e):
                logger.error("face_recognition library not installed. Please install it with: pip install face_recognition")
                raise ValueError("Face recognition library not available")
            elif "cv2" in str(e):
                logger.error("OpenCV not installed. Falling back to basic encoding without OpenCV checks")
                return self._encode_face_basic(image_data)
            else:
                raise
        except Exception as e:
            logger.error(f"❌ Face encoding failed: {str(e)}")
            raise ValueError(f"Face quality check failed: {str(e)}")

    def _encode_face_basic(self, image_data):
        """Fallback face encoding without OpenCV quality checks"""
        try:
            import face_recognition
            import numpy as np

            image = self._process_image_data(image_data)
            image_np = np.array(image)

            face_locations = face_recognition.face_locations(image_np, model='hog')
            if not face_locations:
                raise ValueError("No face detected in the image")
            if len(face_locations) > 1:
                raise ValueError("Multiple faces detected. Please provide an image with only one face")

            face_encodings = face_recognition.face_encodings(
                image_np,
                known_face_locations=[face_locations[0]],
                model=self.model
            )

            if not face_encodings:
                raise ValueError("Could not encode the detected face")

            encoding = face_encodings[0]
            logger.info(f"✅ Basic face encoded (fallback) - Shape: {encoding.shape}")

            return encoding

        except Exception as e:
            logger.error(f"❌ Basic face encoding failed: {str(e)}")
            raise ValueError(f"Face encoding failed: {str(e)}")

    def save_facial_encoding(self, user_id, facial_encoding):
        """Save facial encoding to database"""
        try:
            from models.facial_data import FacialData

            encoding_bytes = facial_encoding.tobytes()

            existing_data = FacialData.query.filter_by(user_id=user_id).first()

            if existing_data:
                existing_data.facial_encoding = encoding_bytes
                logger.info(f"✅ Updated facial data for user: {user_id}")
            else:
                facial_data = FacialData(
                    user_id=user_id,
                    facial_encoding=encoding_bytes
                )
                db.session.add(facial_data)
                logger.info(f"✅ Created new facial data for user: {user_id}")

            db.session.commit()
            return True

        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ Error saving facial encoding: {str(e)}")
            raise

    def verify_face(self, user_id, captured_image_data):
        """Verify face against stored encoding with confidence scoring"""
        try:
            from models.facial_data import FacialData

            facial_data = FacialData.query.filter_by(user_id=user_id).first()
            if not facial_data:
                return False, 0.0, "No facial data registered for user"

            stored_encoding = np.frombuffer(facial_data.facial_encoding, dtype=np.float64)

            # Encode captured face
            captured_encoding = self.encode_face_from_image(captured_image_data)

            # Compare encodings
            try:
                import face_recognition
                matches = face_recognition.compare_faces(
                    [stored_encoding],
                    captured_encoding,
                    tolerance=self.tolerance
                )
                distance = face_recognition.face_distance([stored_encoding], captured_encoding)[0]
                is_match = matches[0] if matches else False
            except ImportError:
                distance = np.linalg.norm(stored_encoding - captured_encoding)
                is_match = distance <= self.tolerance
                logger.warning(f"Using manual comparison - Distance: {distance:.4f}")

            # Normalize confidence against a stable max distance
            max_distance = max(self.tolerance, 0.6)
            confidence = max(0, (1 - (distance / max_distance)) * 100)

            logger.info(
                f"🔍 verification - Distance: {distance:.4f}, Confidence: {confidence:.1f}%, Match: {is_match}, Tolerance: {self.tolerance}"
            )

            # Acceptance policy: require a match and reasonable confidence
            acceptance_confidence = 40.0
            if is_match and confidence >= acceptance_confidence:
                return True, confidence, f"Face verified with {confidence:.1f}% confidence"
            else:
                logger.warning(f"Face verification rejection - Distance: {distance:.4f}, Confidence: {confidence:.1f}%, Match: {is_match}")
                return False, confidence, f"Face verification failed (confidence: {confidence:.1f}%)"

        except Exception as e:
            logger.error(f"❌ Error in face verification: {str(e)}")
            return False, 0.0, f"Verification error: {str(e)}"

    def validate_face_uniqueness(self, user_id, facial_encoding):
        """Ensure the face doesn't match other users (anti-spoofing)"""
        try:
            from models.facial_data import FacialData

            other_faces = FacialData.query.filter(FacialData.user_id != user_id).all()
            if not other_faces:
                return True, "No other faces to compare against"

            try:
                import face_recognition
                for other_face in other_faces:
                    other_encoding = np.frombuffer(other_face.facial_encoding, dtype=np.float64)
                    distance = face_recognition.face_distance([other_encoding], facial_encoding)[0]

                    cross_user_threshold = 0.5
                    if distance < cross_user_threshold:
                        logger.warning(f"❌ Face too similar to another user: {other_face.user_id}, distance: {distance:.4f}")
                        return False, "Face is too similar to another registered user"

                return True, "Face is unique"

            except ImportError:
                logger.warning("face_recognition not available, skipping uniqueness check")
                return True, "Uniqueness check skipped"

        except Exception as e:
            logger.error(f"Uniqueness check error: {str(e)}")
            return True, "Uniqueness check failed"

    def get_face_similarity_score(self, encoding1, encoding2):
        """Get similarity score between two face encodings (0-1 scale)"""
        try:
            import face_recognition
            distance = face_recognition.face_distance([encoding1], encoding2)[0]
            similarity = 1 - distance
            return max(0, min(1, similarity))
        except ImportError:
            distance = np.linalg.norm(encoding1 - encoding2)
            similarity = 1 - (distance / np.sqrt(len(encoding1)))
            return max(0, min(1, similarity))

    def batch_verify_faces(self, user_ids, captured_encoding):
        """Verify against multiple users at once (for admin purposes)"""
        try:
            from models.facial_data import FacialData

            results = {}
            facial_data_list = FacialData.query.filter(FacialData.user_id.in_(user_ids)).all()

            for facial_data in facial_data_list:
                stored_encoding = np.frombuffer(facial_data.facial_encoding, dtype=np.float64)

                try:
                    import face_recognition
                    distance = face_recognition.face_distance([stored_encoding], captured_encoding)[0]
                    is_match = distance <= self.tolerance
                    max_distance = max(self.tolerance, 0.6)
                    confidence = max(0, (1 - (distance / max_distance)) * 100)
                except ImportError:
                    distance = np.linalg.norm(stored_encoding - captured_encoding)
                    is_match = distance <= self.tolerance
                    max_distance = max(self.tolerance, 0.6)
                    confidence = max(0, (1 - (distance / max_distance)) * 100)

                results[facial_data.user_id] = {
                    'match': is_match,
                    'confidence': confidence,
                    'distance': distance
                }

            return results

        except Exception as e:
            logger.error(f"Batch verification error: {str(e)}")
            return {}