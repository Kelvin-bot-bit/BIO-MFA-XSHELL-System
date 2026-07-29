# ./backend/models/admin_action.py
from . import db
from datetime import datetime
import uuid

class AdminAction(db.Model):
    __tablename__ = 'admin_actions'
    
    action_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    admin_id = db.Column(db.String(36), db.ForeignKey('admins.admin_id', ondelete='SET NULL'), nullable=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=True)
    action_type = db.Column(db.String(50), nullable=False)
    notes = db.Column(db.Text)
    ip_address = db.Column(db.String(45))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    admin = db.relationship('Admin', backref=db.backref('actions', lazy='dynamic'))
    user = db.relationship('User', backref=db.backref('admin_actions', lazy='dynamic'))
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'action_id': self.action_id,
            'admin_id': self.admin_id,
            'user_id': self.user_id,
            'action_type': self.action_type,
            'notes': self.notes,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'admin_email': self.admin.user.email if self.admin and self.admin.user else None,
            'user_email': self.user.email if self.user else None
        }
    
    def __repr__(self):
        return f'<AdminAction {self.action_type} by {self.admin_id}>'