# ./backend/models/risk_assessment.py
from . import db
from datetime import datetime
import uuid

class RiskAssessment(db.Model):
    __tablename__ = 'risk_assessments'
    
    assessment_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    risk_score = db.Column(db.Integer, nullable=False)  # 0-100
    risk_level = db.Column(db.String(20), nullable=False)  # low, medium, high
    risk_factors = db.Column(db.JSON)  # Store risk factors as JSON
    required_auth = db.Column(db.JSON)  # Required auth methods
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    device_fingerprint = db.Column(db.String(255))
    location_info = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ===== UPDATED RELATIONSHIP =====
    # Changed from backref to back_populates to match User model
    user = db.relationship('User', back_populates='risk_assessments')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'assessment_id': self.assessment_id,
            'user_id': self.user_id,
            'risk_score': self.risk_score,
            'risk_level': self.risk_level,
            'risk_factors': self.risk_factors,
            'required_auth': self.required_auth,
            'ip_address': self.ip_address,
            'device_fingerprint': self.device_fingerprint,
            'location_info': self.location_info,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<RiskAssessment user:{self.user_id} risk:{self.risk_level}>'