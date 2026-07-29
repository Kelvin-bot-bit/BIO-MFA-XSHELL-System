# ./backend/models/facial_data.py
from . import db
from datetime import datetime
import uuid

class FacialData(db.Model):
    __tablename__ = 'facial_data'
    
    face_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id', ondelete='CASCADE'), unique=True, nullable=False)
    facial_encoding = db.Column(db.LargeBinary, nullable=False)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # ===== RELATIONSHIP =====
    # Define the relationship with User model using back_populates
    # This creates a bidirectional link with User.facial_data
    user = db.relationship('User', back_populates='facial_data')
    
    def to_dict(self):
        """Convert facial data object to dictionary"""
        return {
            'face_id': self.face_id,
            'user_id': self.user_id,
            'registered_at': self.registered_at.isoformat() if self.registered_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<FacialData user_id: {self.user_id}>'