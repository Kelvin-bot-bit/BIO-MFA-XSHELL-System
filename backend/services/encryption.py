#./backend/services/encryption.py
import hashlib
import secrets
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()

class EncryptionService:
    """Service for handling encryption and hashing operations"""
    
    @staticmethod
    def hash_password(password):
        """Hash a password using bcrypt"""
        return bcrypt.generate_password_hash(password).decode('utf-8')
    
    @staticmethod
    def check_password(password_hash, password):
        """Check password against hash"""
        return bcrypt.check_password_hash(password_hash, password)
    
    @staticmethod
    def hash_otp(otp):
        """Hash OTP using SHA-256 for faster verification"""
        return hashlib.sha256(otp.encode()).hexdigest()
    
    @staticmethod
    def generate_crypto_token(length=32):
        """Generate cryptographically secure random token"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def verify_otp_hash(otp_hash, otp):
        """Verify OTP against its hash"""
        return otp_hash == hashlib.sha256(otp.encode()).hexdigest()