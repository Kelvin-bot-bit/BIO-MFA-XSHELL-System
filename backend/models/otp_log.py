# ./backend/models/otp_log.py
from . import db
from datetime import datetime, timedelta
import uuid

class OTPLog(db.Model):
    __tablename__ = 'otp_logs'
    
    otp_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    otp_hash = db.Column(db.String(255), nullable=False)
    purpose = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    
    # ===== ADDED RELATIONSHIP =====
    # This creates a bidirectional link with User.otp_logs
    user = db.relationship('User', back_populates='otp_logs')
    
    def is_expired(self):
        """Check if OTP has expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self):
        """Check if OTP is still valid and not used"""
        return not self.is_used and not self.is_expired()
    
    def mark_used(self):
        """Mark OTP as used"""
        self.is_used = True
    
    def to_dict(self):
        """Convert OTP log object to dictionary"""
        return {
            'otp_id': self.otp_id,
            'user_id': self.user_id,
            'purpose': self.purpose,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_used': self.is_used,
            'is_valid': self.is_valid()
        }
    
    def __repr__(self):
        return f'<OTPLog user_id: {self.user_id}, purpose: {self.purpose}>'