import logging
import csv
import json
import io
from datetime import datetime, timedelta, timezone
from models import db
from models.user import User
from models.login_session import LoginSession
from models.failed_login_attempts import FailedLoginAttempt
from models.admin_action import AdminAction

logger = logging.getLogger(__name__)

class ProfileService:
    """Service for user profile management features"""
    
    def __init__(self):
        pass
    
    def change_password(self, user_id, current_password, new_password):
        """Change user password with current password verification"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False, "User not found"
            
            if not user.check_password(current_password):
                return False, "Current password is incorrect"
            
            from utils.validators import Validators
            is_valid, password_msg = Validators.validate_password(new_password)
            if not is_valid:
                return False, password_msg
            
            user.set_password(new_password)
            
            # Log password change in admin actions
            admin_action = AdminAction(
                user_id=user_id,
                action_type='password_change',
                notes='User changed password',
                ip_address=None
            )
            db.session.add(admin_action)
            
            db.session.commit()
            return True, "Password changed successfully"
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Change password error: {str(e)}")
            return False, "Failed to change password"
    
    def update_notification_preferences(self, user_id, preferences):
        """Update user notification preferences"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False, "User not found"
            
            # Store preferences as JSON in user table (add new column)
            user.notification_preferences = json.dumps(preferences)
            db.session.commit()
            
            return True, "Notification preferences updated"
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Update notification preferences error: {str(e)}")
            return False, "Failed to update preferences"
    
    def deactivate_account(self, user_id, reason=""):
        """Temporarily deactivate user account"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False, "User not found"
            
            user.is_active = False
            
            # Revoke all active sessions
            sessions = LoginSession.query.filter_by(
                user_id=user_id,
                logged_out_at=None
            ).all()
            
            for session in sessions:
                session.logged_out_at = datetime.now(timezone.utc)
                session.session_status = 'deactivated'
            
            # Log the action
            admin_action = AdminAction(
                user_id=user_id,
                action_type='account_deactivated',
                notes=f"Account deactivated by user. Reason: {reason}",
                ip_address=None
            )
            db.session.add(admin_action)
            
            db.session.commit()
            return True, "Account deactivated successfully"
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Deactivate account error: {str(e)}")
            return False, "Failed to deactivate account"
    
    def reactivate_account(self, user_id):
        """Reactivate a deactivated account"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False, "User not found"
            
            user.is_active = True
            
            db.session.commit()
            return True, "Account reactivated successfully"
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Reactivate account error: {str(e)}")
            return False, "Failed to reactivate account"
    
    def delete_account(self, user_id, confirmation):
        """Permanently delete user account"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False, "User not found"
            
            if confirmation != "DELETE":
                return False, "Confirmation text does not match"
            
            # Log before deletion
            admin_action = AdminAction(
                user_id=user_id,
                action_type='account_deleted',
                notes=f"Account deleted permanently by user",
                ip_address=None
            )
            db.session.add(admin_action)
            db.session.commit()
            
            # Delete the user (cascade will handle related records if configured)
            db.session.delete(user)
            db.session.commit()
            
            return True, "Account deleted successfully"
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Delete account error: {str(e)}")
            return False, "Failed to delete account"
    
    def export_user_data(self, user_id):
        """Export all user data as CSV/JSON"""
        try:
            user = User.query.get(user_id)
            if not user:
                return None, "User not found"
            
            data = {
                'profile': {
                    'user_id': user.user_id,
                    'email': user.email,
                    'phone': user.phone,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_active': user.is_active,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'updated_at': user.updated_at.isoformat() if user.updated_at else None,
                    'has_face_registered': user.has_face_registered() if hasattr(user, 'has_face_registered') else False
                },
                'sessions': [],
                'failed_attempts': [],
                'login_history': []
            }
            
            # Get sessions
            sessions = LoginSession.query.filter_by(user_id=user_id).order_by(LoginSession.created_at.desc()).all()
            for session in sessions:
                data['sessions'].append({
                    'session_id': session.session_id,
                    'device_info': session.device_info,
                    'device_type': session.device_type,
                    'ip_address': session.ip_address,
                    'location': session.location,
                    'created_at': session.created_at.isoformat() if session.created_at else None,
                    'last_activity': session.last_activity.isoformat() if session.last_activity else None,
                    'expires_at': session.expires_at.isoformat() if session.expires_at else None
                })
            
            # Get failed attempts
            attempts = FailedLoginAttempt.query.filter_by(user_id=user_id).order_by(FailedLoginAttempt.attempted_at.desc()).limit(100).all()
            for attempt in attempts:
                data['failed_attempts'].append({
                    'reason': attempt.reason,
                    'ip_address': attempt.ip_address,
                    'attempted_at': attempt.attempted_at.isoformat() if attempt.attempted_at else None
                })
            
            return data, None
            
        except Exception as e:
            logger.error(f"Export data error: {str(e)}")
            return None, f"Failed to export data: {str(e)}"
    
    def generate_backup_codes(self, user_id):
        """Generate one-time backup codes for account recovery"""
        try:
            import secrets
            codes = []
            for i in range(10):
                code = f"{secrets.token_hex(4)}-{secrets.token_hex(2)}".upper()
                codes.append(code)
            
            # Store hashed codes in a new table or user field
            user = User.query.get(user_id)
            if user:
                # Store hashed codes (implement hashing)
                user.backup_codes_hash = self._hash_backup_codes(codes)
                db.session.commit()
            
            return codes, None
            
        except Exception as e:
            logger.error(f"Generate backup codes error: {str(e)}")
            return None, str(e)
    
    def _hash_backup_codes(self, codes):
        """Hash backup codes for storage"""
        import hashlib
        import json
        combined = json.dumps(codes)
        return hashlib.sha256(combined.encode()).hexdigest()
    
    def get_login_history(self, user_id, limit=50):
        """Get user login history"""
        try:
            sessions = LoginSession.query.filter_by(
                user_id=user_id
            ).order_by(LoginSession.created_at.desc()).limit(limit).all()
            
            history = []
            for session in sessions:
                history.append({
                    'session_id': session.session_id,
                    'device_info': session.device_info,
                    'ip_address': session.ip_address,
                    'location': session.location,
                    'created_at': session.created_at.isoformat() if session.created_at else None,
                    'password_verified': session.password_verified,
                    'otp_verified': session.otp_verified,
                    'face_verified': session.face_verified,
                    'is_active': session.is_active()
                })
            
            return history, None
            
        except Exception as e:
            logger.error(f"Get login history error: {str(e)}")
            return None, str(e)