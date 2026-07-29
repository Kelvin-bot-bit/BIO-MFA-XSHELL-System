# ./backend/models/password_reset_tokens.py
from . import db
from datetime import datetime
import uuid

class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'
    
    token_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    token_hash = db.Column(db.String(255), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ===== FIXED RELATIONSHIP =====
    # Changed from backref to back_populates to match User model
    user = db.relationship('User', back_populates='password_reset_tokens')
    
    def is_expired(self):
        """Check if token has expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self):
        """Check if token is still valid and not used"""
        return not self.is_used and not self.is_expired()
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'token_id': self.token_id,
            'user_id': self.user_id,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_used': self.is_used,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_valid': self.is_valid()
        }
    
    def __repr__(self):
        return f'<PasswordResetToken user:{self.user_id}>'