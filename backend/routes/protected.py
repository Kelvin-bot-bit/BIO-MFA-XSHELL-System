# File: .backend/routes/protected.py
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity # type: ignore
import logging
from datetime import datetime, timezone
import json

# Import decorators directly
from utils.decorators import mfa_required, auth_required

logger = logging.getLogger(__name__)

protected_bp = Blueprint('protected', __name__, url_prefix='/api')

@protected_bp.route('/profile', methods=['GET'])
@mfa_required
def get_profile(current_user):
    """Get user profile (requires MFA)"""
    try:
        return jsonify({
            'success': True,
            'user': current_user.to_dict()
        }), 200
    except Exception as e:
        logger.error(f"Profile fetch error: {str(e)}")
        logger.exception("Detailed traceback:")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch profile'
        }), 500

@protected_bp.route('/profile', methods=['PUT'])
@mfa_required
def update_profile(current_user):
    """Update user profile"""
    try:
        data = request.get_json()
        
        logger.info(f"📝 Profile update request for user: {current_user.email}")
        logger.debug(f"Request data: {data}")
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No JSON data provided'
            }), 400
        
        # Import db here to avoid circular imports
        from models import db
        from models.admin_action import AdminAction
        
        # Update allowed fields
        allowed_fields = ['first_name', 'last_name', 'phone']
        updated = False
        validation_errors = []
        updated_fields = []

        for field in allowed_fields:
            if field in data and data[field] is not None:
                # Validate phone if being updated
                if field == 'phone':
                    from utils.validators import Validators
                    is_valid_phone, phone_msg = Validators.validate_phone(data[field])
                    if not is_valid_phone:
                        validation_errors.append(f'Invalid phone: {phone_msg}')
                        continue
                    setattr(current_user, field, is_valid_phone)
                    updated_fields.append(field)
                    logger.info(f"📞 Updated phone to: {is_valid_phone}")
                # Validate name fields
                elif field in ['first_name', 'last_name']:
                    from utils.validators import Validators
                    is_valid_name, name_msg = Validators.validate_name(data[field])
                    if not is_valid_name:
                        validation_errors.append(f'Invalid {field}: {name_msg}')
                        continue
                    setattr(current_user, field, data[field].strip())
                    updated_fields.append(field)
                    logger.info(f"📝 Updated {field} to: {data[field].strip()}")
                else:
                    setattr(current_user, field, data[field].strip())
                    updated_fields.append(field)
                    logger.info(f"📝 Updated {field} to: {data[field].strip()}")
                updated = True
        
        # Return validation errors if any
        if validation_errors:
            return jsonify({
                'success': False,
                'message': 'Validation errors',
                'errors': validation_errors
            }), 400
        
        if updated:
            # Log profile update action
            action = AdminAction(
                user_id=current_user.user_id,
                action_type='profile_update',
                notes=f"Updated profile fields: {', '.join(updated_fields)}",
                ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
            )
            db.session.add(action)
            db.session.commit()
            
            logger.info(f"✅ Profile updated successfully for user: {current_user.email}")
            return jsonify({
                'success': True,
                'message': 'Profile updated successfully',
                'user': current_user.to_dict()
            }), 200
        else:
            logger.info(f"ℹ️ No fields to update for user: {current_user.email}")
            return jsonify({
                'success': False,
                'message': 'No valid fields to update'
            }), 400
        
    except Exception as e:
        from models import db
        db.session.rollback()
        logger.error(f"❌ Profile update error: {str(e)}")
        logger.exception("Detailed traceback:")
        return jsonify({
            'success': False,
            'message': f'Profile update failed: {str(e)}'
        }), 500

@protected_bp.route('/dashboard', methods=['GET'])
@mfa_required
def dashboard(current_user):
    """Protected dashboard endpoint"""
    try:
        # Import FacialData to check if face is registered
        from models.facial_data import FacialData
        
        has_face_registered = FacialData.query.filter_by(user_id=current_user.user_id).first() is not None

        dashboard_data = {
            'welcome_message': f'Welcome back, {current_user.first_name}!',
            'user_stats': {
                'login_count': 'N/A',
                'last_login': 'N/A',
                'account_status': 'Active' if current_user.is_active else 'Inactive'
            },
            'security_status': {
                'mfa_enabled': True,
                'face_registered': has_face_registered,
                'email_verified': True
            }
        }

        return jsonify({
            'success': True,
            'dashboard': dashboard_data
        }), 200
        
    except Exception as e:
        logger.error(f"Dashboard error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load dashboard'
        }), 500

@protected_bp.route('/check-mfa-status', methods=['GET'])
@jwt_required()
def check_mfa_status():
    """Check user's MFA configuration status"""
    try:
        current_user_id = get_jwt_identity()
        
        # Import models here to avoid circular imports
        from models.user import User
        from models.facial_data import FacialData
        
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Check if user has facial data registered
        has_face_registered = FacialData.query.filter_by(user_id=user.user_id).first() is not None
        
        mfa_status = {
            'user_id': user.user_id,
            'email': user.email,
            'has_face_enrolled': has_face_registered,
            'mfa_configured': has_face_registered,
            'account_status': 'active' if user.is_active else 'inactive'
        }
        
        return jsonify({
            'success': True,
            'mfa_status': mfa_status
        }), 200
    
    except Exception as e:
        logger.error(f"MFA status check error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to check MFA status'
        }), 500

# ===== FACE STATUS ENDPOINT =====

@protected_bp.route('/user/face-status', methods=['GET'])
@jwt_required()
def get_face_status():
    """Check if user has face registered and get face configuration"""
    try:
        current_user_id = get_jwt_identity()
        
        # Import models here to avoid circular imports
        from models.user import User
        from models.facial_data import FacialData
        
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Check if user has facial data registered
        facial_data = FacialData.query.filter_by(user_id=user.user_id).first()
        has_face_registered = facial_data is not None
        
        # Get face registration date if available
        registered_at = None
        if has_face_registered and facial_data.registered_at:
            registered_at = facial_data.registered_at.isoformat() if facial_data.registered_at else None
        
        return jsonify({
            'success': True,
            'has_face_registered': has_face_registered,
            'face_enabled': user.face_enabled if has_face_registered else False,
            'face_available': has_face_registered and user.face_enabled,
            'preferred_auth_method': user.preferred_auth_method,
            'registered_at': registered_at
        }), 200
    
    except Exception as e:
        logger.error(f"Face status error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to check face status'
        }), 500

# ===== FACE PREFERENCE ENDPOINT =====

@protected_bp.route('/user/face-preference', methods=['PUT'])
@jwt_required()
def update_face_preference():
    """Update user's face verification preference"""
    try:
        current_user_id = get_jwt_identity()
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No JSON data provided'
            }), 400
        
        preference = data.get('preference')
        if not preference:
            return jsonify({
                'success': False,
                'message': 'Preference is required'
            }), 400
        
        # Valid preferences: 'auto', 'face_first', 'otp_only'
        valid_preferences = ['auto', 'face_first', 'otp_only']
        if preference not in valid_preferences:
            return jsonify({
                'success': False,
                'message': f'Invalid preference. Must be one of: {", ".join(valid_preferences)}'
            }), 400
        
        from models.user import User
        from models import db
        from models.admin_action import AdminAction
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        old_preference = user.preferred_auth_method
        user.preferred_auth_method = preference
        db.session.commit()
        
        # Log face preference change
        action = AdminAction(
            user_id=current_user_id,
            action_type='face_preference_change',
            notes=f'Changed face preference from {old_preference} to {preference}',
            ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
        )
        db.session.add(action)
        db.session.commit()
        
        logger.info(f"✅ Updated face preference for user {user.email} to: {preference}")
        
        return jsonify({
            'success': True,
            'message': 'Face preference updated successfully',
            'preference': preference
        }), 200
    
    except Exception as e:
        from models import db
        db.session.rollback()
        logger.error(f"❌ Face preference update error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update face preference'
        }), 500

# ===== PROFILE PICTURE ENDPOINTS =====

@protected_bp.route('/profile/picture', methods=['POST'])
@jwt_required()
def upload_profile_picture():
    """Upload or update profile picture"""
    try:
        current_user_id = get_jwt_identity()
        from models.user import User
        from models.admin_action import AdminAction
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'message': 'Image data is required'
            }), 400
        
        # Get base64 image
        image_data = data['image']
        
        # Save profile picture
        from services.profile_picture_service import ProfilePictureService
        pic_service = ProfilePictureService(current_app)
        file_path = pic_service.save_profile_picture(current_user_id, image_data)
        
        # Log profile picture update
        action = AdminAction(
            user_id=current_user_id,
            action_type='profile_picture_update',
            notes='Updated profile picture',
            ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
        )
        db.session.add(action)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile picture updated successfully',
            'profile_picture': file_path
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400
    except Exception as e:
        logger.error(f"Upload profile picture error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to upload profile picture'
        }), 500


@protected_bp.route('/profile/picture', methods=['DELETE'])
@jwt_required()
def delete_profile_picture():
    """Delete profile picture"""
    try:
        current_user_id = get_jwt_identity()
        
        from services.profile_picture_service import ProfilePictureService
        from models.admin_action import AdminAction
        
        pic_service = ProfilePictureService(current_app)
        pic_service.delete_profile_picture(current_user_id)
        
        # Log profile picture deletion
        action = AdminAction(
            user_id=current_user_id,
            action_type='profile_picture_delete',
            notes='Deleted profile picture',
            ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
        )
        db.session.add(action)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile picture deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Delete profile picture error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to delete profile picture'
        }), 500


@protected_bp.route('/profile/picture', methods=['GET'])
@jwt_required()
def get_profile_picture():
    """Get profile picture URL"""
    try:
        current_user_id = get_jwt_identity()
        from models.user import User
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        return jsonify({
            'success': True,
            'profile_picture': user.profile_picture
        }), 200
        
    except Exception as e:
        logger.error(f"Get profile picture error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get profile picture'
        }), 500

# ===== CHANGE PASSWORD ENDPOINT =====

@protected_bp.route('/profile/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password with current password verification"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'success': False, 'message': 'Current and new password required'}), 400
        
        from models.user import User
        from utils.validators import Validators
        from models import db
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Verify current password
        if not user.check_password(current_password):
            return jsonify({'success': False, 'message': 'Current password is incorrect'}), 401
        
        # Validate new password strength
        is_valid, password_msg = Validators.validate_password(new_password)
        if not is_valid:
            return jsonify({'success': False, 'message': password_msg}), 400
        
        # Update password
        user.set_password(new_password)
        
        # Log password change
        from models.admin_action import AdminAction
        action = AdminAction(
            user_id=current_user_id,
            action_type='password_change',
            notes='User changed password',
            ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
        )
        db.session.add(action)
        
        db.session.commit()
        
        logger.info(f"✅ Password changed for user {user.email}")
        
        return jsonify({'success': True, 'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        from models import db
        db.session.rollback()
        logger.error(f"Change password error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to change password'}), 500


# ===== NOTIFICATION PREFERENCES ENDPOINTS =====

@protected_bp.route('/profile/notification-preferences', methods=['GET'])
@jwt_required()
def get_notification_preferences():
    """Get user notification preferences"""
    try:
        current_user_id = get_jwt_identity()
        from models.user import User
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        preferences = json.loads(user.notification_preferences) if user.notification_preferences else {
            'security_alerts': True,
            'login_notifications': True,
            'promotional_emails': False
        }
        
        return jsonify({'success': True, 'preferences': preferences}), 200
        
    except Exception as e:
        logger.error(f"Get notification preferences error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to get preferences'}), 500


@protected_bp.route('/profile/notification-preferences', methods=['PUT'])
@jwt_required()
def update_notification_preferences():
    """Update user notification preferences"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        from models.user import User
        from models import db
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Validate preferences
        valid_keys = ['security_alerts', 'login_notifications', 'promotional_emails']
        for key in data:
            if key not in valid_keys:
                return jsonify({'success': False, 'message': f'Invalid preference key: {key}'}), 400
        
        # Merge with existing preferences
        existing = json.loads(user.notification_preferences) if user.notification_preferences else {}
        existing.update(data)
        
        user.notification_preferences = json.dumps(existing)
        db.session.commit()
        
        logger.info(f"✅ Notification preferences updated for user {user.email}")
        
        return jsonify({'success': True, 'message': 'Notification preferences updated'}), 200
        
    except Exception as e:
        from models import db
        db.session.rollback()
        logger.error(f"Update notification preferences error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to update preferences'}), 500


# ===== ACCOUNT MANAGEMENT ENDPOINTS =====

@protected_bp.route('/profile/deactivate', methods=['POST'])
@jwt_required()
def deactivate_account():
    """Temporarily deactivate user account"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}
        reason = data.get('reason', '')
        
        from models.user import User
        from models.login_session import LoginSession
        from models.admin_action import AdminAction
        from models import db
        from datetime import datetime, timezone
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        if not user.is_active:
            return jsonify({'success': False, 'message': 'Account is already deactivated'}), 400
        
        user.is_active = False
        
        # Revoke all active sessions
        sessions = LoginSession.query.filter_by(
            user_id=current_user_id,
            logged_out_at=None
        ).all()
        
        now = datetime.now(timezone.utc)
        for session in sessions:
            session.logged_out_at = now
            session.session_status = 'deactivated'
        
        # Log the action
        action = AdminAction(
            user_id=current_user_id,
            action_type='account_deactivated',
            notes=f"Account deactivated by user. Reason: {reason}",
            ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
        )
        db.session.add(action)
        
        db.session.commit()
        
        logger.info(f"✅ Account deactivated for user {user.email}")
        
        # Clear tokens from response (client should handle logout)
        return jsonify({'success': True, 'message': 'Account deactivated successfully'}), 200
        
    except Exception as e:
        from models import db
        db.session.rollback()
        logger.error(f"Deactivate account error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to deactivate account'}), 500


@protected_bp.route('/profile/reactivate', methods=['POST'])
@jwt_required()
def reactivate_account():
    """Reactivate a deactivated account"""
    try:
        current_user_id = get_jwt_identity()
        
        from models.user import User
        from models import db
        from models.admin_action import AdminAction
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        if user.is_active:
            return jsonify({'success': False, 'message': 'Account is already active'}), 400
        
        user.is_active = True
        
        # Log the action
        action = AdminAction(
            user_id=current_user_id,
            action_type='account_reactivated',
            notes='Account reactivated by user',
            ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
        )
        db.session.add(action)
        
        db.session.commit()
        
        logger.info(f"✅ Account reactivated for user {user.email}")
        
        return jsonify({'success': True, 'message': 'Account reactivated successfully'}), 200
        
    except Exception as e:
        from models import db
        db.session.rollback()
        logger.error(f"Reactivate account error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to reactivate account'}), 500


@protected_bp.route('/profile/delete', methods=['POST'])
@jwt_required()
def delete_account():
    """Permanently delete user account"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}
        confirmation = data.get('confirmation', '')
        
        if confirmation != "DELETE":
            return jsonify({'success': False, 'message': 'Please type DELETE to confirm account deletion'}), 400
        
        from models.user import User
        from models import db
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Log before deletion
        from models.admin_action import AdminAction
        action = AdminAction(
            user_id=current_user_id,
            action_type='account_deleted',
            notes='Account permanently deleted by user',
            ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
        )
        db.session.add(action)
        db.session.commit()
        
        # Store email for logging before deletion
        user_email = user.email
        
        # Delete the user (cascade will handle related records)
        db.session.delete(user)
        db.session.commit()
        
        logger.info(f"✅ Account permanently deleted for user {user_email}")
        
        return jsonify({'success': True, 'message': 'Account deleted successfully'}), 200
        
    except Exception as e:
        from models import db
        db.session.rollback()
        logger.error(f"Delete account error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to delete account'}), 500


# ===== EXPORT USER DATA ENDPOINT =====

@protected_bp.route('/profile/export-data', methods=['GET'])
@jwt_required()
def export_user_data():
    """Export all user data as JSON"""
    try:
        current_user_id = get_jwt_identity()
        
        from models.user import User
        from models.login_session import LoginSession
        from models.failed_login_attempts import FailedLoginAttempt
        from models.facial_data import FacialData
        from models.admin_action import AdminAction
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Collect all user data
        data = {
            'profile': user.to_dict(),
            'sessions': [],
            'failed_attempts': [],
            'admin_actions': [],
            'has_face': FacialData.query.filter_by(user_id=current_user_id).first() is not None,
            'exported_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Get sessions
        sessions = LoginSession.query.filter_by(user_id=current_user_id).order_by(LoginSession.created_at.desc()).all()
        for session in sessions:
            data['sessions'].append({
                'session_id': session.session_id,
                'device_info': session.device_info,
                'device_type': session.device_type,
                'browser': session.browser,
                'os': session.os,
                'ip_address': session.ip_address,
                'location': session.location,
                'created_at': session.created_at.isoformat() if session.created_at else None,
                'last_activity': session.last_activity.isoformat() if session.last_activity else None,
                'expires_at': session.expires_at.isoformat() if session.expires_at else None,
                'logged_out_at': session.logged_out_at.isoformat() if session.logged_out_at else None
            })
        
        # Get failed attempts
        attempts = FailedLoginAttempt.query.filter_by(user_id=current_user_id).order_by(FailedLoginAttempt.attempted_at.desc()).limit(100).all()
        for attempt in attempts:
            data['failed_attempts'].append({
                'reason': attempt.reason,
                'ip_address': attempt.ip_address,
                'attempted_at': attempt.attempted_at.isoformat() if attempt.attempted_at else None
            })
        
        # Get admin actions (notes about user)
        actions = AdminAction.query.filter_by(user_id=current_user_id).order_by(AdminAction.created_at.desc()).limit(50).all()
        for action in actions:
            data['admin_actions'].append({
                'action_type': action.action_type,
                'notes': action.notes,
                'created_at': action.created_at.isoformat() if action.created_at else None
            })
        
        return jsonify({'success': True, 'data': data}), 200
        
    except Exception as e:
        logger.error(f"Export data error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to export data'}), 500


# ===== LOGIN HISTORY ENDPOINT =====

@protected_bp.route('/profile/login-history', methods=['GET'])
@jwt_required()
def get_login_history():
    """Get user login history"""
    try:
        current_user_id = get_jwt_identity()
        limit = request.args.get('limit', 50, type=int)
        
        from models.login_session import LoginSession
        
        sessions = LoginSession.query.filter_by(
            user_id=current_user_id
        ).order_by(LoginSession.created_at.desc()).limit(limit).all()
        
        history = []
        for session in sessions:
            history.append({
                'session_id': session.session_id,
                'device_info': session.device_info,
                'device_type': session.device_type,
                'browser': session.browser,
                'os': session.os,
                'ip_address': session.ip_address,
                'location': session.location,
                'created_at': session.created_at.isoformat() if session.created_at else None,
                'last_activity': session.last_activity.isoformat() if session.last_activity else None,
                'password_verified': session.password_verified,
                'otp_verified': session.otp_verified,
                'face_verified': session.face_verified,
                'is_active': session.is_active()
            })
        
        return jsonify({'success': True, 'history': history}), 200
        
    except Exception as e:
        logger.error(f"Login history error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to get login history'}), 500


# ===== BACKUP CODES ENDPOINTS =====

@protected_bp.route('/profile/backup-codes', methods=['GET'])
@jwt_required()
def get_backup_codes_status():
    """Check if user has backup codes"""
    try:
        current_user_id = get_jwt_identity()
        from models.user import User
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        has_codes = bool(user.backup_codes_hash)
        
        return jsonify({'success': True, 'has_codes': has_codes}), 200
        
    except Exception as e:
        logger.error(f"Get backup codes status error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to check backup codes'}), 500


@protected_bp.route('/profile/backup-codes', methods=['POST'])
@jwt_required()
def generate_backup_codes():
    """Generate new backup codes for user"""
    try:
        current_user_id = get_jwt_identity()
        import secrets
        import hashlib
        
        from models.user import User
        from models import db
        from models.admin_action import AdminAction
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Generate 10 backup codes
        codes = []
        hashed_codes = []
        
        for i in range(10):
            code = f"{secrets.token_hex(4)}-{secrets.token_hex(2)}".upper()
            codes.append(code)
            hashed_codes.append({
                'code': hashlib.sha256(code.encode()).hexdigest(),
                'used': False,
                'used_at': None
            })
        
        # Store hashed codes as JSON for individual tracking
        user.backup_codes_hash = json.dumps(hashed_codes)
        db.session.commit()
        
        # Log backup codes generation
        action = AdminAction(
            user_id=current_user_id,
            action_type='backup_codes_generated',
            notes='Generated new backup codes',
            ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
        )
        db.session.add(action)
        db.session.commit()
        
        logger.info(f"✅ Backup codes generated for user {user.email}")
        
        return jsonify({'success': True, 'codes': codes}), 200
        
    except Exception as e:
        from models import db
        db.session.rollback()
        logger.error(f"Generate backup codes error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to generate backup codes'}), 500


# ===== EXPANDED USER ACTIVITY ENDPOINT - SHOWS ALL ACTIVITY TYPES =====

@protected_bp.route('/user/activity', methods=['GET'])
@jwt_required()
def get_user_activity():
    """Get user's recent activity (login, profile, security events, etc.)"""
    try:
        current_user_id = get_jwt_identity()
        limit = request.args.get('limit', 10, type=int)
        
        from models.login_session import LoginSession
        from models.admin_action import AdminAction
        from models.facial_data import FacialData
        
        activities = []
        
        # 1. Get login sessions (login activities)
        sessions = LoginSession.query.filter_by(
            user_id=current_user_id
        ).order_by(LoginSession.created_at.desc()).limit(limit).all()
        
        for session in sessions:
            # Determine activity type based on verification status
            if session.face_verified:
                action_type = "face"
                action_name = "Full MFA Login (Password + OTP + Face)"
            elif session.otp_verified:
                action_type = "login"
                action_name = "Secure Login (Password + OTP)"
            else:
                action_type = "login"
                action_name = "Login Attempt"
            
            activities.append({
                'id': session.session_id,
                'action': action_name,
                'type': action_type,
                'timestamp': session.created_at.isoformat(),
                'status': 'success',
                'device': session.device_info,
                'location': session.location,
                'ip': session.ip_address
            })
        
        # 2. Get admin actions (profile updates, password changes, etc.)
        actions = AdminAction.query.filter_by(
            user_id=current_user_id
        ).order_by(AdminAction.created_at.desc()).limit(limit).all()
        
        for action in actions:
            action_type = "profile"
            action_name = action.action_type.replace('_', ' ').title()
            
            # Customize display names for better UX
            if action.action_type == 'password_change':
                action_name = "Password Changed"
                action_type = "security"
            elif action.action_type == 'account_deactivated':
                action_name = "Account Deactivated"
                action_type = "security"
            elif action.action_type == 'account_reactivated':
                action_name = "Account Reactivated"
                action_type = "security"
            elif action.action_type == 'profile_update':
                action_name = "Profile Information Updated"
                action_type = "profile"
            elif action.action_type == 'profile_picture_update':
                action_name = "Profile Picture Updated"
                action_type = "profile"
            elif action.action_type == 'profile_picture_delete':
                action_name = "Profile Picture Removed"
                action_type = "profile"
            elif action.action_type == 'backup_codes_generated':
                action_name = "Backup Codes Generated"
                action_type = "security"
            elif action.action_type == 'face_preference_change':
                action_name = "Face Verification Preference Changed"
                action_type = "face"
            elif action.action_type == 'face_registered':
                action_name = "Face Recognition Enabled"
                action_type = "face"
            elif action.action_type == 'face_verified':
                action_name = "Face Verification Completed"
                action_type = "face"
            
            activities.append({
                'id': f"action_{action.action_id}",
                'action': action_name,
                'type': action_type,
                'timestamp': action.created_at.isoformat(),
                'status': 'info',
                'device': None,
                'location': None,
                'ip': action.ip_address
            })
        
        # 3. Get face registration event
        face_data = FacialData.query.filter_by(
            user_id=current_user_id
        ).order_by(FacialData.registered_at.desc()).first()
        
        if face_data:
            activities.append({
                'id': 'face_registration',
                'action': 'Face Recognition Registered',
                'type': 'face',
                'timestamp': face_data.registered_at.isoformat(),
                'status': 'success',
                'device': None,
                'location': None,
                'ip': None
            })
        
        # Sort by timestamp (most recent first) and limit
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        activities = activities[:limit]
        
        return jsonify({
            'success': True,
            'activities': activities
        }), 200
        
    except Exception as e:
        logger.error(f"Get user activity error: {str(e)}")
        return jsonify({
            'success': False,
            'activities': []
        }), 500


# ===== SECURITY SCORE ENDPOINT =====

@protected_bp.route('/security-score', methods=['GET'])
@jwt_required()
def get_security_score():
    """Get user's dynamic security score based on multiple factors"""
    try:
        current_user_id = get_jwt_identity()
        
        # Import services here to avoid circular imports
        from services.security_score_service import SecurityScoreService
        
        score_service = SecurityScoreService()
        security_score = score_service.calculate_security_score(current_user_id)
        
        return jsonify({
            'success': True,
            'security_score': security_score
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Security score error: {str(e)}")
        logger.exception("Detailed traceback:")
        return jsonify({
            'success': False,
            'message': 'Failed to calculate security score',
            'error': str(e)
        }), 500


# ===== USER MESSAGE ENDPOINTS =====

@protected_bp.route('/messages', methods=['GET'])
@jwt_required()
def get_user_messages():
    """Get messages for the current user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Import models here to avoid circular imports
        from models.admin_message import AdminMessage
        
        # Get query parameters
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        limit = int(request.args.get('limit', 50))
        
        query = AdminMessage.query.filter_by(
            user_id=current_user_id,
            is_archived=False
        )
        
        # Filter for unexpired messages (if expires_at is set)
        now = datetime.now(timezone.utc)
        query = query.filter(
            (AdminMessage.expires_at.is_(None)) | (AdminMessage.expires_at > now)
        )
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        messages = query.order_by(
            # Priority: high first, then by created_at desc
            AdminMessage.priority.desc(),
            AdminMessage.created_at.desc()
        ).limit(limit).all()
        
        return jsonify({
            'success': True,
            'messages': [msg.to_dict() for msg in messages],
            'unread_count': AdminMessage.query.filter_by(
                user_id=current_user_id, 
                is_read=False,
                is_archived=False
            ).filter(
                (AdminMessage.expires_at.is_(None)) | (AdminMessage.expires_at > now)
            ).count()
        }), 200
        
    except Exception as e:
        logger.error(f"Get user messages error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch messages'
        }), 500


@protected_bp.route('/messages/<message_id>/read', methods=['POST'])
@jwt_required()
def mark_message_read(message_id):
    """Mark a message as read"""
    try:
        current_user_id = get_jwt_identity()
        
        # Import models here to avoid circular imports
        from models.admin_message import AdminMessage
        from models import db
        
        message = AdminMessage.query.filter_by(
            message_id=message_id,
            user_id=current_user_id
        ).first()
        
        if not message:
            return jsonify({
                'success': False,
                'message': 'Message not found'
            }), 404
        
        message.mark_as_read()
        
        return jsonify({
            'success': True,
            'message': 'Message marked as read'
        }), 200
        
    except Exception as e:
        logger.error(f"Mark message read error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to mark message as read'
        }), 500


@protected_bp.route('/messages/mark-all-read', methods=['POST'])
@jwt_required()
def mark_all_messages_read():
    """Mark all messages as read for the current user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Import models here to avoid circular imports
        from models.admin_message import AdminMessage
        from models import db
        
        now = datetime.now(timezone.utc)
        
        unread_messages = AdminMessage.query.filter_by(
            user_id=current_user_id,
            is_read=False,
            is_archived=False
        ).filter(
            (AdminMessage.expires_at.is_(None)) | (AdminMessage.expires_at > now)
        ).all()
        
        count = len(unread_messages)
        
        for message in unread_messages:
            message.is_read = True
            message.read_at = now
        
        db.session.commit()
        
        logger.info(f"✅ User {current_user_id} marked {count} messages as read")
        
        return jsonify({
            'success': True,
            'message': f'Marked {count} messages as read',
            'count': count
        }), 200
        
    except Exception as e:
        from models import db
        db.session.rollback()
        logger.error(f"Mark all messages read error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to mark messages as read'
        }), 500