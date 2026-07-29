# ./backend/models/user.py
from . import db, bcrypt
from datetime import datetime
import uuid
import json

class User(db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Optional: Preference for face verification
    face_enabled = db.Column(db.Boolean, default=True)  # User can disable face verification
    preferred_auth_method = db.Column(db.String(50), default='auto')  # 'auto', 'face_first', 'otp_only'
    
    # Profile picture
    profile_picture = db.Column(db.String(500), nullable=True)  # Stores file path
    profile_picture_updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # ===== NEW FIELDS - ADDED FOR NOTIFICATIONS AND BACKUP CODES =====
    # Notification preferences as JSON string
    notification_preferences = db.Column(db.Text, default=json.dumps({
        'security_alerts': True,
        'login_notifications': True,
        'promotional_emails': False
    }))
    
    # Backup codes hash (for account recovery)
    backup_codes_hash = db.Column(db.String(255), nullable=True)
    
    # ===== RELATIONSHIPS =====
    # Facial data relationship (one-to-one)
    facial_data = db.relationship('FacialData', back_populates='user', uselist=False, cascade='all, delete-orphan')
    
    # Admin relationship (one-to-one)
    admin = db.relationship('Admin', back_populates='user', uselist=False, cascade='all, delete-orphan')
    
    # Login sessions relationship (one-to-many)
    login_sessions = db.relationship('LoginSession', back_populates='user', lazy='dynamic', cascade='all, delete-orphan')
    
    # Failed login attempts relationship (one-to-many)
    failed_attempts = db.relationship('FailedLoginAttempt', back_populates='user', lazy='dynamic', cascade='all, delete-orphan')
    
    # Risk assessments relationship (one-to-many)
    risk_assessments = db.relationship('RiskAssessment', back_populates='user', lazy='dynamic', cascade='all, delete-orphan')
    
    # OTP logs relationship (one-to-many)
    otp_logs = db.relationship('OTPLog', back_populates='user', lazy='dynamic', cascade='all, delete-orphan')
    
    # Password reset tokens relationship (one-to-many)
    password_reset_tokens = db.relationship('PasswordResetToken', back_populates='user', lazy='dynamic', cascade='all, delete-orphan')
    
    # Admin messages relationship (one-to-many)
    admin_messages = db.relationship('AdminMessage', back_populates='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        """Check password against hash"""
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert user object to dictionary"""
        # Parse notification preferences
        try:
            notif_prefs = json.loads(self.notification_preferences) if self.notification_preferences else {
                'security_alerts': True,
                'login_notifications': True,
                'promotional_emails': False
            }
        except:
            notif_prefs = {
                'security_alerts': True,
                'login_notifications': True,
                'promotional_emails': False
            }
        
        return {
            'user_id': self.user_id,
            'email': self.email,
            'phone': self.phone,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'has_face_registered': self.has_face_registered(),
            'face_enabled': self.face_enabled,
            'preferred_auth_method': self.preferred_auth_method,
            'profile_picture': self.profile_picture,
            'notification_preferences': notif_prefs,
            'has_backup_codes': bool(self.backup_codes_hash)
        }
    
    def has_face_registered(self):
        """Check if user has facial data registered"""
        return self.facial_data is not None
    
    def can_use_face(self):
        """Check if user can use face verification (has face AND has it enabled)"""
        return self.has_face_registered() and self.face_enabled
    
    def is_admin_user(self):
        """Check if user is an admin"""
        return self.admin is not None
    
    def get_active_sessions_count(self):
        """Get count of active sessions"""
        from models.login_session import LoginSession
        return LoginSession.query.filter_by(
            user_id=self.user_id, 
            logged_out_at=None
        ).count()
    
    def get_security_level(self):
        """Get user's overall security level"""
        if self.has_face_registered():
            return 'high'
        elif self.phone and self.email:
            return 'medium'
        else:
            return 'low'
    
    def get_auth_preference(self):
        """Get user's authentication preference"""
        if not self.has_face_registered():
            return 'otp_only'
        
        if self.preferred_auth_method == 'face_first' and self.can_use_face():
            return 'face_first'
        elif self.preferred_auth_method == 'otp_only':
            return 'otp_only'
        else:
            return 'auto'  # Let risk assessment decide
    
    def enable_face(self):
        """Enable face verification for this user"""
        if self.has_face_registered():
            self.face_enabled = True
            return True
        return False
    
    def disable_face(self):
        """Disable face verification for this user"""
        self.face_enabled = False
        return True
    
    def set_auth_preference(self, method):
        """Set authentication preference"""
        valid_methods = ['auto', 'face_first', 'otp_only']
        if method in valid_methods:
            self.preferred_auth_method = method
            return True
        return False
    
    def get_face_status(self):
        """Get detailed face verification status"""
        return {
            'registered': self.has_face_registered(),
            'enabled': self.face_enabled,
            'available': self.can_use_face(),
            'registered_at': self.facial_data.registered_at.isoformat() if self.facial_data else None
        }
    
    def get_notification_preferences(self):
        """Get notification preferences as dictionary"""
        try:
            return json.loads(self.notification_preferences) if self.notification_preferences else {
                'security_alerts': True,
                'login_notifications': True,
                'promotional_emails': False
            }
        except:
            return {
                'security_alerts': True,
                'login_notifications': True,
                'promotional_emails': False
            }
    
    def update_notification_preferences(self, preferences):
        """Update notification preferences"""
        self.notification_preferences = json.dumps(preferences)
        return True
    
    def get_unread_messages_count(self):
        """Get count of unread admin messages"""
        from models.admin_message import AdminMessage
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc)
        return self.admin_messages.filter(
            AdminMessage.is_read == False,
            AdminMessage.is_archived == False,
            (AdminMessage.expires_at.is_(None)) | (AdminMessage.expires_at > now)
        ).count()
    
    def get_recent_messages(self, limit=10):
        """Get recent admin messages"""
        from models.admin_message import AdminMessage
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc)
        return self.admin_messages.filter(
            AdminMessage.is_archived == False,
            (AdminMessage.expires_at.is_(None)) | (AdminMessage.expires_at > now)
        ).order_by(
            AdminMessage.priority.desc(),
            AdminMessage.created_at.desc()
        ).limit(limit).all()
    
    def __repr__(self):
        return f'<User {self.email}>'