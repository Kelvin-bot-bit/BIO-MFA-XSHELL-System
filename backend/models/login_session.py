# ./backend/models/login_session.py
from . import db
from datetime import datetime, timedelta, timezone
import uuid

class LoginSession(db.Model):
    __tablename__ = 'login_sessions'
    
    # Primary key
    session_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    
    # Device fingerprinting fields
    device_info = db.Column(db.Text)
    device_type = db.Column(db.String(50))  # mobile, tablet, desktop
    browser = db.Column(db.String(50))
    browser_version = db.Column(db.String(20))
    os = db.Column(db.String(50))
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    location = db.Column(db.JSON)  # Store location data as JSON
    timezone = db.Column(db.String(50))  # Store client timezone
    
    # MFA progression tracking
    password_verified = db.Column(db.Boolean, default=False)
    otp_verified = db.Column(db.Boolean, default=False)
    face_verified = db.Column(db.Boolean, default=False)
    
    # JWT tokens (hashed)
    access_token_hash = db.Column(db.String(255))
    refresh_token_hash = db.Column(db.String(255))
    
    # Session timestamps - Use timezone-aware
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_activity = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime, nullable=False)
    logged_out_at = db.Column(db.DateTime)
    
    # Session source and status
    session_source = db.Column(db.String(50), default='login')
    session_status = db.Column(db.String(20), default='active')
    
    # Relationship
    user = db.relationship('User', back_populates='login_sessions')
    
    def _ensure_timezone(self, dt):
        """Ensure datetime is timezone-aware (UTC)"""
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.now(timezone.utc)
        if self.session_status == 'inactive':
            self.session_status = 'active'
        db.session.commit()
    
    def mark_logged_out(self):
        """Mark session as logged out"""
        self.logged_out_at = datetime.now(timezone.utc)
        self.session_status = 'terminated'
        db.session.commit()
    
    def mark_expired(self):
        """Mark session as expired"""
        if not self.logged_out_at:
            self.logged_out_at = datetime.now(timezone.utc)
        self.session_status = 'expired'
        db.session.commit()
    
    def is_active(self):
        """Check if session is still active"""
        now = datetime.now(timezone.utc)
        
        # Ensure expires_at is timezone-aware
        expires_at = self._ensure_timezone(self.expires_at)
        logged_out_at = self._ensure_timezone(self.logged_out_at)
        
        return (logged_out_at is None and 
                now < expires_at and 
                self.face_verified and
                self.session_status == 'active')
    
    def is_expired(self):
        """Check if session has expired"""
        now = datetime.now(timezone.utc)
        expires_at = self._ensure_timezone(self.expires_at)
        return now > expires_at
    
    def is_inactive(self, inactivity_threshold_minutes=60):
        """Check if session has been inactive for too long"""
        if not self.last_activity:
            return False
        now = datetime.now(timezone.utc)
        last_activity = self._ensure_timezone(self.last_activity)
        inactive_time = now - last_activity
        return inactive_time.total_seconds() / 60 > inactivity_threshold_minutes
    
    def get_session_age_minutes(self):
        """Get session age in minutes"""
        if not self.created_at:
            return 0
        now = datetime.now(timezone.utc)
        created_at = self._ensure_timezone(self.created_at)
        delta = now - created_at
        return int(delta.total_seconds() / 60)
    
    def get_inactivity_minutes(self):
        """Get minutes since last activity"""
        if not self.last_activity:
            return 0
        now = datetime.now(timezone.utc)
        last_activity = self._ensure_timezone(self.last_activity)
        delta = now - last_activity
        return int(delta.total_seconds() / 60)
    
    def get_remaining_seconds(self):
        """Get remaining seconds until session expires"""
        if self.expires_at:
            now = datetime.now(timezone.utc)
            expires_at = self._ensure_timezone(self.expires_at)
            delta = expires_at - now
            return max(0, int(delta.total_seconds()))
        return 0
    
    def extend_session(self, days=30):
        """Extend session expiration"""
        self.expires_at = datetime.now(timezone.utc) + timedelta(days=days)
        self.update_activity()
        db.session.commit()
    
    def get_client_time(self):
        """Get the current time in client's timezone if available"""
        if self.timezone:
            try:
                import pytz
                client_tz = pytz.timezone(self.timezone)
                return datetime.now(client_tz)
            except ImportError:
                return datetime.now(timezone.utc)
            except Exception:
                return datetime.now(timezone.utc)
        return datetime.now(timezone.utc)
    
    def to_dict(self):
        """Convert session object to dictionary for API responses"""
        def format_datetime(dt):
            if dt:
                dt = self._ensure_timezone(dt)
                return dt.isoformat()
            return None

        return {
            'session_id': self.session_id,
            'user_id': self.user_id,
            'device_info': self.device_info,
            'device_type': self.device_type,
            'browser': self.browser,
            'browser_version': self.browser_version,
            'os': self.os,
            'ip_address': self.ip_address,
            'location': self.location,
            'timezone': self.timezone,
            'password_verified': self.password_verified,
            'otp_verified': self.otp_verified,
            'face_verified': self.face_verified,
            'created_at': format_datetime(self.created_at),
            'last_activity': format_datetime(self.last_activity),
            'expires_at': format_datetime(self.expires_at),
            'logged_out_at': format_datetime(self.logged_out_at),
            'is_active': self.is_active(),
            'is_expired': self.is_expired(),
            'session_status': self.session_status,
            'inactivity_minutes': self.get_inactivity_minutes(),
            'session_age_minutes': self.get_session_age_minutes(),
            'remaining_seconds': self.get_remaining_seconds(),
            'session_source': self.session_source
        }
    
    def __repr__(self):
        return f'<LoginSession user_id: {self.user_id} status: {self.session_status}>'