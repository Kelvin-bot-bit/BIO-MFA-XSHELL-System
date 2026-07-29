from . import db
from datetime import datetime, timezone
import uuid

class AdminMessage(db.Model):
    __tablename__ = 'admin_messages'
    
    message_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    admin_id = db.Column(db.String(36), db.ForeignKey('admins.admin_id', ondelete='SET NULL'), nullable=True)
    
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(50), default='security')  # security, reminder, warning, info
    priority = db.Column(db.String(20), default='normal')  # high, normal, low
    
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime)
    is_archived = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime)  # Optional expiry for time-sensitive messages
    
    # Action buttons (optional)
    action_buttons = db.Column(db.JSON, default=[])  # e.g., [{"label": "Add Face", "url": "/profile/face"}]
    
    # Relationships
    user = db.relationship('User', back_populates='admin_messages')
    admin = db.relationship('Admin', back_populates='messages')
    
    def to_dict(self):
        """Convert message to dictionary"""
        def format_datetime(dt):
            if dt:
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.isoformat()
            return None
        
        return {
            'message_id': self.message_id,
            'user_id': self.user_id,
            'admin_id': self.admin_id,
            'admin_name': f"{self.admin.user.first_name} {self.admin.user.last_name}" if self.admin and self.admin.user else 'System',
            'title': self.title,
            'message': self.message,
            'message_type': self.message_type,
            'priority': self.priority,
            'is_read': self.is_read,
            'read_at': format_datetime(self.read_at),
            'is_archived': self.is_archived,
            'created_at': format_datetime(self.created_at),
            'expires_at': format_datetime(self.expires_at),
            'action_buttons': self.action_buttons or []
        }
    
    def mark_as_read(self):
        """Mark message as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.now(timezone.utc)
            db.session.commit()
    
    def __repr__(self):
        return f'<AdminMessage {self.title} for user {self.user_id}>'