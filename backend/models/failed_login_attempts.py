# ./backend/models/failed_login_attempts.py
from . import db
from datetime import datetime
import uuid

class FailedLoginAttempt(db.Model):
    __tablename__ = 'failed_login_attempts'
    
    attempt_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    ip_address = db.Column(db.String(45), nullable=False)
    user_agent = db.Column(db.Text)
    reason = db.Column(db.String(100), nullable=False)
    attempted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ===== ADD RELATIONSHIP =====
    user = db.relationship('User', back_populates='failed_attempts')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'attempt_id': self.attempt_id,
            'user_id': self.user_id,
            'email': self.email,
            'ip_address': self.ip_address,
            'reason': self.reason,
            'attempted_at': self.attempted_at.isoformat() if self.attempted_at else None
        }
    
    def __repr__(self):
        return f'<FailedLoginAttempt {self.email} - {self.reason}>'