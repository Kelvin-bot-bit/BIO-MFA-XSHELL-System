import logging
import secrets
from datetime import datetime, timedelta, timezone
from models import db
from models.user import User
from models.password_reset_tokens import PasswordResetToken
from services.email_service import EmailService
from services.encryption import EncryptionService

logger = logging.getLogger(__name__)

class PasswordResetService:
    """Service for handling password reset functionality"""
    
    def __init__(self, token_expiry_minutes=15):
        self.token_expiry_minutes = token_expiry_minutes
    
    def generate_reset_token(self):
        """Generate a secure random token for password reset"""
        return secrets.token_urlsafe(32)
    
    def create_reset_token(self, user_id):
        """Create and store a password reset token for user"""
        try:
            # Clean up any existing unused tokens for this user
            PasswordResetToken.query.filter_by(
                user_id=user_id,
                is_used=False
            ).delete()
            
            # Generate new token
            raw_token = self.generate_reset_token()
            token_hash = EncryptionService.hash_otp(raw_token)  # Reuse OTP hashing
            
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.token_expiry_minutes)
            
            reset_token = PasswordResetToken(
                user_id=user_id,
                token_hash=token_hash,
                expires_at=expires_at
            )
            
            db.session.add(reset_token)
            db.session.commit()
            
            logger.info(f"✅ Password reset token created for user {user_id}")
            return raw_token, reset_token
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ Error creating reset token: {str(e)}")
            raise
    
    def send_reset_email(self, user, reset_token):
        """Send password reset email to user"""
        try:
            email_service = EmailService()
            
            reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
            
            subject = "XShell - Password Reset Request"
            
            body = f"""
Hello {user.first_name},

We received a request to reset your password for your XShell account.

Click the link below to reset your password (this link expires in {self.token_expiry_minutes} minutes):

{reset_link}

If you didn't request this, please ignore this email or contact support.

Stay secure,
The XShell Team

---
This is an automated message. Please do not reply to this email.
            """
            
            success = email_service.send_email(user.email, subject, body)
            
            if success:
                logger.info(f"✅ Password reset email sent to {user.email}")
            else:
                logger.error(f"❌ Failed to send reset email to {user.email}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Error sending reset email: {str(e)}")
            return False
    
    def verify_reset_token(self, token):
        """Verify reset token and return user if valid"""
        try:
            token_hash = EncryptionService.hash_otp(token)
            
            reset_record = PasswordResetToken.query.filter_by(
                token_hash=token_hash,
                is_used=False
            ).first()
            
            if not reset_record:
                return None, "Invalid or expired reset token"
            
            if reset_record.is_expired():
                return None, "Reset token has expired. Please request a new one."
            
            user = User.query.get(reset_record.user_id)
            if not user:
                return None, "User not found"
            
            if not user.is_active:
                return None, "Account is deactivated"
            
            return user, None
            
        except Exception as e:
            logger.error(f"❌ Error verifying reset token: {str(e)}")
            return None, "Error verifying token"
    
    def reset_password(self, token, new_password):
        """Reset user's password using valid token"""
        try:
            # Verify token first
            user, error = self.verify_reset_token(token)
            if error:
                return False, error
            
            # Validate new password
            from utils.validators import Validators
            is_valid, password_msg = Validators.validate_password(new_password)
            if not is_valid:
                return False, password_msg
            
            # Update password
            user.set_password(new_password)
            
            # Mark token as used
            token_hash = EncryptionService.hash_otp(token)
            reset_record = PasswordResetToken.query.filter_by(
                token_hash=token_hash,
                is_used=False
            ).first()
            
            if reset_record:
                reset_record.is_used = True
            
            # Revoke all active sessions for security
            from models.login_session import LoginSession
            active_sessions = LoginSession.query.filter_by(
                user_id=user.user_id,
                logged_out_at=None
            ).all()
            
            for session in active_sessions:
                session.logged_out_at = datetime.now(timezone.utc)
                session.session_status = 'terminated'
            
            db.session.commit()
            
            logger.info(f"✅ Password reset successful for user {user.email}")
            return True, "Password reset successfully. Please login with your new password."
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ Error resetting password: {str(e)}")
            return False, "Failed to reset password. Please try again."