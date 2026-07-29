# ./backend/models/admin.py
from . import db
from datetime import datetime, timezone
import uuid

class Admin(db.Model):
    __tablename__ = 'admins'
    
    admin_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id', ondelete='CASCADE'), unique=True, nullable=False)
    role = db.Column(db.String(50), default='admin')  # 'super_admin', 'admin', 'viewer'
    permissions = db.Column(db.JSON, default={})  # Store specific permissions
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_active = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Updated relationship - using back_populates instead of backref
    user = db.relationship('User', back_populates='admin')
    
    # NEW: Relationship with AdminMessage (one-to-many)
    messages = db.relationship('AdminMessage', back_populates='admin', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert admin object to dictionary with timezone-aware datetime formatting"""
        def format_datetime(dt):
            if dt:
                if dt.tzinfo is None:
                    # If naive datetime, assume UTC
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.isoformat()
            return None
        
        return {
            'admin_id': self.admin_id,
            'user_id': self.user_id,
            'email': self.user.email if self.user else None,
            'name': f"{self.user.first_name} {self.user.last_name}" if self.user else None,
            'role': self.role,
            'permissions': self.permissions,
            'created_at': format_datetime(self.created_at),
            'last_active': format_datetime(self.last_active)
        }
    
    def update_last_active(self):
        """Update last active timestamp"""
        self.last_active = datetime.now(timezone.utc)
        db.session.commit()
    
    def __repr__(self):
        return f'<Admin {self.user.email if self.user else None} - {self.role}>'