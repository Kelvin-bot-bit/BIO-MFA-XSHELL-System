# ./backend/models/__init__.py
# Initialize extensions first
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

# Import models
from .user import User
from .admin import Admin
from .facial_data import FacialData
from .login_session import LoginSession  # This line must be exactly this
from .failed_login_attempts import FailedLoginAttempt
from .otp_log import OTPLog
from .password_reset_tokens import PasswordResetToken
from .risk_assessment import RiskAssessment
from .admin_action import AdminAction
from .admin_message import AdminMessage  # NEW: Admin messages model

# Export all models
__all__ = [
    'User',
    'Admin',
    'FacialData',
    'LoginSession',  # This should match
    'FailedLoginAttempt',
    'OTPLog',
    'PasswordResetToken',
    'RiskAssessment',
    'AdminAction',
    'AdminMessage'  # NEW: Export AdminMessage
]