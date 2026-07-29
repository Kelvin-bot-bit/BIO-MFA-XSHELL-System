import os
import uuid
import logging
from datetime import datetime
from werkzeug.utils import secure_filename
from PIL import Image
import io
import base64
from models import db
from models.user import User

logger = logging.getLogger(__name__)

class ProfilePictureService:
    """Service for handling profile picture uploads and management"""
    
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    UPLOAD_FOLDER = 'uploads/profile_pictures'
    
    def __init__(self, app=None):
        self.app = app
        if app:
            self.UPLOAD_FOLDER = os.path.join(app.root_path, self.UPLOAD_FOLDER)
            os.makedirs(self.UPLOAD_FOLDER, exist_ok=True)
    
    def allowed_file(self, filename):
        """Check if file extension is allowed"""
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in self.ALLOWED_EXTENSIONS
    
    def validate_image_size(self, file_data):
        """Validate image file size"""
        if len(file_data) > self.MAX_FILE_SIZE:
            raise ValueError(f"File size exceeds {self.MAX_FILE_SIZE // (1024*1024)}MB limit")
        return True
    
    def process_base64_image(self, base64_string):
        """Process base64 encoded image from canvas"""
        try:
            # Remove data URL prefix if present
            if 'base64,' in base64_string:
                base64_string = base64_string.split('base64,')[1]
            
            # Decode base64
            image_data = base64.b64decode(base64_string)
            
            # Validate size
            self.validate_image_size(image_data)
            
            # Open with PIL
            image = Image.open(io.BytesIO(image_data))
            
            # Convert RGBA to RGB if needed
            if image.mode == 'RGBA':
                image = image.convert('RGB')
            
            # Resize if too large (max 500x500)
            max_size = 500
            if image.width > max_size or image.height > max_size:
                image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # Generate unique filename
            filename = f"{uuid.uuid4().hex}.jpg"
            filepath = os.path.join(self.UPLOAD_FOLDER, filename)
            
            # Save image
            image.save(filepath, 'JPEG', quality=85)
            
            # Return relative path for database
            return f"/uploads/profile_pictures/{filename}"
            
        except Exception as e:
            logger.error(f"Error processing base64 image: {str(e)}")
            raise ValueError(f"Failed to process image: {str(e)}")
    
    def save_profile_picture(self, user_id, base64_image):
        """Save profile picture for user"""
        try:
            user = User.query.get(user_id)
            if not user:
                raise ValueError("User not found")
            
            # Delete old profile picture if exists
            if user.profile_picture:
                old_path = os.path.join(self.UPLOAD_FOLDER, os.path.basename(user.profile_picture))
                if os.path.exists(old_path):
                    os.remove(old_path)
            
            # Process and save new image
            file_path = self.process_base64_image(base64_image)
            
            # Update user record
            user.profile_picture = file_path
            user.profile_picture_updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"✅ Profile picture updated for user {user.email}")
            return file_path
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error saving profile picture: {str(e)}")
            raise
    
    def delete_profile_picture(self, user_id):
        """Delete user's profile picture"""
        try:
            user = User.query.get(user_id)
            if not user:
                raise ValueError("User not found")
            
            if user.profile_picture:
                old_path = os.path.join(self.UPLOAD_FOLDER, os.path.basename(user.profile_picture))
                if os.path.exists(old_path):
                    os.remove(old_path)
                
                user.profile_picture = None
                db.session.commit()
                logger.info(f"✅ Profile picture deleted for user {user.email}")
            
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting profile picture: {str(e)}")
            raise
    
    def get_profile_picture_url(self, user):
        """Get full URL for profile picture"""
        if user and user.profile_picture:
            return user.profile_picture
        return None