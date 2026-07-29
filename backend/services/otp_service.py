#./backend/services/otp_service.py
import secrets
from datetime import datetime, timedelta
import logging

# Import db directly
from models import db
from services.encryption import EncryptionService
from services.email_service import EmailService

logger = logging.getLogger(__name__)

class OTPService:
    """Service for OTP generation, storage, and verification"""
    
    def __init__(self, expiry_minutes=5, otp_length=6):
        self.expiry_minutes = expiry_minutes
        self.otp_length = otp_length
    
    def generate_otp(self):
        """Generate a cryptographically secure numeric OTP"""
        # Generate REAL random OTP using cryptographically secure random
        otp = ''.join(secrets.choice('0123456789') for _ in range(self.otp_length))
        logger.info(f"🔑 Generated REAL OTP: {otp}")
        return otp
    
    def create_otp_record(self, user_id, purpose='login'):
        """Create and store OTP record in database"""
        try:
            # Import models here to avoid circular imports
            from models.otp_log import OTPLog
            
            # Generate OTP and hash
            otp = self.generate_otp()
            otp_hash = EncryptionService.hash_otp(otp)
            
            # Calculate expiry
            expires_at = datetime.utcnow() + timedelta(minutes=self.expiry_minutes)
            
            # Create OTP record
            otp_record = OTPLog(
                user_id=user_id,
                otp_hash=otp_hash,
                purpose=purpose,
                expires_at=expires_at
            )
            
            db.session.add(otp_record)
            db.session.commit()
            
            logger.info(f"✅ OTP record created for user {user_id}, purpose: {purpose}")
            logger.info(f"📝 REAL OTP: {otp}, Expires: {expires_at}")
            
            return otp, otp_record
        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ Error creating OTP record: {str(e)}")
            raise
    
    def verify_otp(self, user_id, otp, purpose='login'):
        """Verify OTP for a user"""
        try:
            # Import models here to avoid circular imports
            from models.otp_log import OTPLog
            
            logger.info(f"🔍 Verifying OTP for user {user_id}, purpose: {purpose}")
            logger.info(f"📝 Provided OTP: {otp}")
            
            # Find the most recent valid OTP for the user
            otp_record = OTPLog.query.filter_by(
                user_id=user_id,
                purpose=purpose,
                is_used=False
            ).order_by(OTPLog.created_at.desc()).first()
            
            if not otp_record:
                logger.warning(f"❌ No OTP found for user {user_id}, purpose: {purpose}")
                return False, "No OTP found or OTP already used"
            
            logger.info(f"📋 Found OTP record: ID {otp_record.otp_id}, Created: {otp_record.created_at}")
            logger.info(f"⏰ OTP expires at: {otp_record.expires_at}, Current time: {datetime.utcnow()}")
            
            if otp_record.is_expired():
                logger.warning(f"❌ OTP expired for user {user_id}")
                return False, "OTP has expired"
            
            # Verify OTP hash
            is_valid = EncryptionService.verify_otp_hash(otp_record.otp_hash, otp)
            logger.info(f"🔐 OTP hash verification: {is_valid}")
            
            if not is_valid:
                logger.warning(f"❌ Invalid OTP for user {user_id}")
                return False, "Invalid OTP"
            
            # Mark OTP as used
            otp_record.mark_used()
            db.session.commit()
            
            logger.info(f"✅ OTP verified successfully for user {user_id}")
            return True, "OTP verified successfully"
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ Error verifying OTP: {str(e)}")
            return False, "Error verifying OTP"
    
    def send_otp_to_user(self, user, purpose='login'):
        """Generate and send OTP to user via email"""
        try:
            logger.info(f"🚀 Starting REAL OTP send process for user: {user.email}")
            
            otp, otp_record = self.create_otp_record(user.user_id, purpose)
            logger.info(f"📝 REAL OTP generated: {otp} for user: {user.email}")
            
            # Send OTP via email using the new method
            email_service = EmailService()
            logger.info(f"📧 Attempting to send REAL OTP email to: {user.email}")
            
            success = email_service.send_otp_email(
                to_email=user.email,
                user_name=user.first_name,
                otp_code=otp,
                purpose=purpose
            )
            
            if success:
                logger.info(f"✅ REAL OTP sent successfully to {user.email}")
                return True, "OTP sent successfully"
            else:
                logger.error(f"❌ Failed to send REAL OTP email to {user.email}")
                return False, "Failed to send OTP via email"
            
        except Exception as e:
            logger.error(f"💥 Error in send_otp_to_user: {str(e)}")
            return False, "Error sending OTP"
    
    def get_active_otp(self, user_id, purpose='login'):
        """Get the current active OTP for a user (for debugging)"""
        try:
            from models.otp_log import OTPLog
            
            otp_record = OTPLog.query.filter_by(
                user_id=user_id,
                purpose=purpose,
                is_used=False
            ).order_by(OTPLog.created_at.desc()).first()
            
            if otp_record and not otp_record.is_expired():
                # Note: We can't decrypt the OTP, but we can show its status
                return {
                    'exists': True,
                    'expires_at': otp_record.expires_at,
                    'is_expired': otp_record.is_expired(),
                    'created_at': otp_record.created_at
                }
            return {'exists': False}
            
        except Exception as e:
            logger.error(f"Error getting active OTP: {str(e)}")
            return {'exists': False, 'error': str(e)}
    
    def cleanup_expired_otps(self):
        """Clean up expired OTPs from the database"""
        try:
            from models.otp_log import OTPLog
            
            expired_count = OTPLog.query.filter(
                OTPLog.expires_at < datetime.utcnow()
            ).delete()
            
            db.session.commit()
            logger.info(f"🧹 Cleaned up {expired_count} expired OTPs")
            return expired_count
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error cleaning up expired OTPs: {str(e)}")
            return 0