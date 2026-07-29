# ./backend/routes/admin.py
from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from datetime import datetime, timedelta, timezone
from functools import wraps
import json

from models import db
from models.user import User
from models.admin import Admin
from models.facial_data import FacialData
from models.admin_action import AdminAction
from models.admin_message import AdminMessage  # NEW IMPORT
from services.admin_service import AdminService
from services.failed_login_service import FailedLoginService
from models.failed_login_attempts import FailedLoginAttempt
from models.login_session import LoginSession

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# Helper function to format datetime with timezone
def format_datetime(dt):
    """Format datetime with timezone for JSON response"""
    if dt:
        if dt.tzinfo is None:
            # If naive datetime, assume UTC
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    return None

# Admin decorator to check if user is admin
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        
        # Check if user is admin
        admin = Admin.query.filter_by(user_id=current_user_id).first()
        if not admin:
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        # Update last active with timezone-aware datetime
        admin.last_active = datetime.now(timezone.utc)
        db.session.commit()
        
        return f(*args, **kwargs)
    return decorated_function

# Super admin decorator for higher privileges
def super_admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        
        admin = Admin.query.filter_by(user_id=current_user_id).first()
        if not admin or admin.role != 'super_admin':
            return jsonify({
                'success': False,
                'message': 'Super admin access required'
            }), 403
        
        return f(*args, **kwargs)
    return decorated_function

# ===== ADMIN STATUS CHECK ENDPOINT =====
@admin_bp.route('/check-status', methods=['GET'])
@jwt_required()
def check_admin_status():
    """Check if current user is an admin"""
    try:
        current_user_id = get_jwt_identity()
        
        admin = Admin.query.filter_by(user_id=current_user_id).first()
        
        return jsonify({
            'success': True,
            'isAdmin': admin is not None,
            'role': admin.role if admin else None,
            'admin_id': admin.admin_id if admin else None
        }), 200
    except Exception as e:
        logger.error(f"Check admin status error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to check admin status'
        }), 500

@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@admin_required
def get_dashboard():
    """Get admin dashboard overview"""
    try:
        service = AdminService()
        data = service.get_system_overview()
        
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        logger.error(f"Admin dashboard error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load dashboard'
        }), 500

@admin_bp.route('/charts/user-growth', methods=['GET'])
@jwt_required()
@admin_required
def get_user_growth():
    """Get user growth chart data"""
    try:
        days = int(request.args.get('days', 30))
        service = AdminService()
        data = service.get_user_growth_chart(days)
        
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        logger.error(f"User growth chart error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load chart data'
        }), 500

@admin_bp.route('/charts/login-activity', methods=['GET'])
@jwt_required()
@admin_required
def get_login_activity():
    """Get login activity chart data"""
    try:
        days = int(request.args.get('days', 7))
        service = AdminService()
        data = service.get_login_activity_chart(days)
        
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        logger.error(f"Login activity chart error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load chart data'
        }), 500

@admin_bp.route('/charts/device-distribution', methods=['GET'])
@jwt_required()
@admin_required
def get_device_distribution():
    """Get device distribution chart data"""
    try:
        service = AdminService()
        data = service.get_device_distribution()
        
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        logger.error(f"Device distribution error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load chart data'
        }), 500

@admin_bp.route('/charts/browser-distribution', methods=['GET'])
@jwt_required()
@admin_required
def get_browser_distribution():
    """Get browser distribution chart data"""
    try:
        service = AdminService()
        data = service.get_browser_distribution()
        
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        logger.error(f"Browser distribution error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load chart data'
        }), 500

@admin_bp.route('/charts/geographic-distribution', methods=['GET'])
@jwt_required()
@admin_required
def get_geographic_distribution():
    """Get geographic distribution chart data"""
    try:
        service = AdminService()
        data = service.get_geographic_distribution()
        
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        logger.error(f"Geographic distribution error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load chart data'
        }), 500

@admin_bp.route('/charts/hourly-activity', methods=['GET'])
@jwt_required()
@admin_required
def get_hourly_activity():
    """Get hourly activity chart data"""
    try:
        days = int(request.args.get('days', 7))
        service = AdminService()
        data = service.get_hourly_activity(days)
        
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        logger.error(f"Hourly activity error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load chart data'
        }), 500

@admin_bp.route('/activities/recent', methods=['GET'])
@jwt_required()
@admin_required
def get_recent_activities():
    """Get recent system activities with proper timezone handling"""
    try:
        limit = int(request.args.get('limit', 50))
        service = AdminService()
        activities = service.get_recent_activities(limit)
        
        # Ensure all timestamps are in ISO format with timezone
        for activity in activities:
            if activity.get('timestamp'):
                # If timestamp is a datetime object (should be handled by service)
                if hasattr(activity['timestamp'], 'isoformat'):
                    dt = activity['timestamp']
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    activity['timestamp'] = dt.isoformat()
        
        return jsonify({
            'success': True,
            'activities': activities
        }), 200
    except Exception as e:
        logger.error(f"Recent activities error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load activities'
        }), 500

# ===== USERS ENDPOINT =====
@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def get_users():
    """Get all users with pagination"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        search = request.args.get('search', '')
        
        logger.info(f"Fetching users - page: {page}, per_page: {per_page}, search: {search}")
        
        query = User.query
        if search:
            query = query.filter(
                (User.email.contains(search)) |
                (User.first_name.contains(search)) |
                (User.last_name.contains(search))
            )
        
        paginated = query.order_by(User.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        users = []
        for user in paginated.items:
            try:
                user_data = user.to_dict()
                
                # Check facial data
                facial_data = FacialData.query.filter_by(user_id=user.user_id).first()
                user_data['has_face'] = facial_data is not None
                
                # Check if user is admin
                admin = Admin.query.filter_by(user_id=user.user_id).first()
                user_data['is_admin'] = admin is not None
                
                # Add session count
                session_count = LoginSession.query.filter_by(
                    user_id=user.user_id, 
                    logged_out_at=None
                ).count()
                user_data['active_sessions'] = session_count
                
                users.append(user_data)
            except Exception as e:
                logger.error(f"Error processing user {user.user_id}: {str(e)}")
                # Still add basic user data
                user_data = user.to_dict()
                user_data['has_face'] = False
                user_data['is_admin'] = False
                user_data['active_sessions'] = 0
                users.append(user_data)
        
        return jsonify({
            'success': True,
            'users': users,
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        logger.error(f"Get users error: {str(e)}")
        logger.exception("Full traceback:")
        return jsonify({
            'success': False,
            'message': f'Failed to load users: {str(e)}'
        }), 500

# ===== RECORD USER ACTION =====
@admin_bp.route('/users/<user_id>/record', methods=['POST'])
@jwt_required()
@admin_required
def record_user(user_id):
    """Record an admin note about a user"""
    try:
        current_user_id = get_jwt_identity()
        admin = Admin.query.filter_by(user_id=current_user_id).first()
        
        if not admin:
            return jsonify({
                'success': False,
                'message': 'Admin not found'
            }), 403
        
        data = request.get_json() or {}
        notes = data.get('notes', '')
        
        if not notes:
            return jsonify({
                'success': False,
                'message': 'Notes are required'
            }), 400
        
        # Create admin action record
        action = AdminAction(
            admin_id=admin.admin_id,
            user_id=user_id,
            action_type='user_recorded',
            notes=notes,
            ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
        )
        
        db.session.add(action)
        db.session.commit()
        
        logger.info(f"Admin {admin.admin_id} recorded user {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'User recorded successfully',
            'action': action.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Record user error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to record user: {str(e)}'
        }), 500

# ===== EXPORT USERS AS CSV =====
@admin_bp.route('/users/export', methods=['GET'])
@jwt_required()
@admin_required
def export_users():
    """Export all users as CSV"""
    try:
        import csv
        from io import StringIO
        
        users = User.query.order_by(User.created_at.desc()).all()
        
        # Create CSV in memory
        output = StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow([
            'User ID', 'Email', 'First Name', 'Last Name', 'Phone',
            'Status', 'Created At', 'Has Face', 'Is Admin', 'Active Sessions'
        ])
        
        # Write data
        for user in users:
            # Check face status
            facial_data = FacialData.query.filter_by(user_id=user.user_id).first()
            has_face = facial_data is not None
            
            # Check admin status
            admin = Admin.query.filter_by(user_id=user.user_id).first()
            is_admin = admin is not None
            
            # Count active sessions
            active_sessions = LoginSession.query.filter_by(
                user_id=user.user_id, 
                logged_out_at=None
            ).count()
            
            # Format created_at with timezone
            created_at = user.created_at
            if created_at:
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                created_at_str = created_at.isoformat()
            else:
                created_at_str = ''
            
            writer.writerow([
                user.user_id,
                user.email,
                user.first_name,
                user.last_name,
                user.phone,
                'Active' if user.is_active else 'Inactive',
                created_at_str,
                'Yes' if has_face else 'No',
                'Yes' if is_admin else 'No',
                active_sessions
            ])
        
        # Prepare response
        response = make_response(output.getvalue())
        response.headers["Content-Type"] = "text/csv"
        response.headers["Content-Disposition"] = f"attachment; filename=users_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
        
        logger.info(f"Exported {len(users)} users to CSV")
        
        return response
        
    except Exception as e:
        logger.error(f"Export users error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to export users: {str(e)}'
        }), 500

# ===== GET ADMIN ACTIONS LOG =====
@admin_bp.route('/admin-actions', methods=['GET'])
@jwt_required()
@admin_required
def get_admin_actions():
    """Get audit log of admin actions"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        
        paginated = AdminAction.query.order_by(
            AdminAction.created_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        actions = []
        for action in paginated.items:
            action_dict = action.to_dict()
            # Safely add admin email
            if action.admin and action.admin.user:
                action_dict['admin_email'] = action.admin.user.email
            else:
                action_dict['admin_email'] = None
            
            # Format created_at with timezone
            if action_dict.get('created_at'):
                # Assuming to_dict() returns ISO string, but we'll ensure it has timezone
                pass
            
            actions.append(action_dict)
        
        return jsonify({
            'success': True,
            'actions': actions,
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': paginated.page
        }), 200
        
    except Exception as e:
        logger.error(f"Get admin actions error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch admin actions: {str(e)}'
        }), 500

@admin_bp.route('/users/<user_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_user_details(user_id):
    """Get detailed user information"""
    try:
        service = AdminService()
        details = service.get_user_details(user_id)
        
        if not details:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': details
        }), 200
    except Exception as e:
        logger.error(f"User details error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load user details'
        }), 500

@admin_bp.route('/users/<user_id>/toggle-status', methods=['POST'])
@jwt_required()
@admin_required
def toggle_user_status(user_id):
    """Activate or deactivate a user account"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        user.is_active = not user.is_active
        db.session.commit()
        
        # Log this action
        current_user_id = get_jwt_identity()
        admin = Admin.query.filter_by(user_id=current_user_id).first()
        if admin:
            action = AdminAction(
                admin_id=admin.admin_id,
                user_id=user_id,
                action_type='toggle_status',
                notes=f"User {'activated' if user.is_active else 'deactivated'}",
                ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
            )
            db.session.add(action)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'User {"activated" if user.is_active else "deactivated"} successfully',
            'is_active': user.is_active
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Toggle user status error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update user status'
        }), 500

@admin_bp.route('/users/<user_id>/make-admin', methods=['POST'])
@jwt_required()
@super_admin_required
def make_admin(user_id):
    """Make a user an admin"""
    try:
        data = request.get_json() or {}
        role = data.get('role', 'admin')
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Check if already admin
        existing = Admin.query.filter_by(user_id=user_id).first()
        if existing:
            return jsonify({
                'success': False,
                'message': 'User is already an admin'
            }), 400
        
        admin = Admin(
            user_id=user_id,
            role=role,
            permissions={}
        )
        db.session.add(admin)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'User {user.email} is now an admin',
            'admin': admin.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Make admin error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to make user admin'
        }), 500

@admin_bp.route('/users/<user_id>/remove-admin', methods=['POST'])
@jwt_required()
@super_admin_required
def remove_admin(user_id):
    """Remove admin privileges from a user"""
    try:
        admin = Admin.query.filter_by(user_id=user_id).first()
        if not admin:
            return jsonify({
                'success': False,
                'message': 'User is not an admin'
            }), 404
        
        db.session.delete(admin)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Admin privileges removed'
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Remove admin error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to remove admin privileges'
        }), 500

@admin_bp.route('/admins', methods=['GET'])
@jwt_required()
@super_admin_required
def get_admins():
    """Get all admins"""
    try:
        admins = Admin.query.order_by(Admin.created_at.desc()).all()
        return jsonify({
            'success': True,
            'admins': [a.to_dict() for a in admins]
        }), 200
    except Exception as e:
        logger.error(f"Get admins error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load admins'
        }), 500

@admin_bp.route('/force-logout/<user_id>', methods=['POST'])
@jwt_required()
@admin_required
def force_logout(user_id):
    """Force logout all sessions for a user"""
    try:
        sessions = LoginSession.query.filter_by(
            user_id=user_id,
            logged_out_at=None
        ).all()
        
        count = 0
        for session in sessions:
            session.logged_out_at = datetime.now(timezone.utc)
            count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Force logged out {count} sessions',
            'count': count
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Force logout error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to force logout'
        }), 500

# ===== SESSION CLEANUP ENDPOINT =====
@admin_bp.route('/cleanup-sessions', methods=['POST'])
@jwt_required()
@admin_required
def cleanup_sessions():
    """Manually trigger session cleanup (admin only)"""
    try:
        from services.session_cleanup_service import SessionCleanupService
        
        cleanup_service = SessionCleanupService()
        results = cleanup_service.run_full_cleanup()
        
        # Log this admin action
        current_user_id = get_jwt_identity()
        admin = Admin.query.filter_by(user_id=current_user_id).first()
        
        if admin:
            action = AdminAction(
                admin_id=admin.admin_id,
                user_id=None,
                action_type='session_cleanup',
                notes=f"Manually cleaned up {results['total']} sessions (expired: {results['expired']}, inactive: {results['inactive']}, old: {results['old']})",
                ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
            )
            db.session.add(action)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f"Cleaned up {results['total']} sessions",
            'details': {
                'expired': results['expired'],
                'inactive': results['inactive'],
                'old': results['old'],
                'total': results['total']
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Session cleanup error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to clean up sessions',
            'error': str(e)
        }), 500

# ===== GET SESSION STATISTICS =====
@admin_bp.route('/session-stats', methods=['GET'])
@jwt_required()
@admin_required
def get_session_stats():
    """Get session statistics for admin dashboard"""
    try:
        from sqlalchemy import func
        
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        
        # Count active sessions
        active_sessions = LoginSession.query.filter(
            LoginSession.logged_out_at.is_(None),
            LoginSession.expires_at > now,
            LoginSession.face_verified == True
        ).count()
        
        # Count inactive sessions
        inactive_sessions = LoginSession.query.filter(
            LoginSession.logged_out_at.is_(None),
            LoginSession.last_activity < now - timedelta(minutes=60)
        ).count()
        
        # Count expired sessions
        expired_sessions = LoginSession.query.filter(
            LoginSession.expires_at <= now,
            LoginSession.logged_out_at.is_(None)
        ).count()
        
        # Count total sessions created this week
        new_sessions_week = LoginSession.query.filter(
            LoginSession.created_at >= week_ago
        ).count()
        
        # Average session duration (for completed sessions)
        avg_duration = db.session.query(
            func.avg(
                func.timestampdiff(func.minute, 
                    LoginSession.created_at, 
                    func.coalesce(LoginSession.logged_out_at, LoginSession.expires_at)
                )
            )
        ).filter(
            LoginSession.logged_out_at.isnot(None) | 
            (LoginSession.expires_at <= now)
        ).scalar() or 0
        
        return jsonify({
            'success': True,
            'stats': {
                'active_sessions': active_sessions,
                'inactive_sessions': inactive_sessions,
                'expired_sessions': expired_sessions,
                'new_sessions_week': new_sessions_week,
                'avg_duration_minutes': round(avg_duration, 1),
                'total_sessions': LoginSession.query.count()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Session stats error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get session statistics'
        }), 500

# ===== BULK REVOKE SESSIONS =====
@admin_bp.route('/bulk-revoke-sessions', methods=['POST'])
@jwt_required()
@admin_required
def bulk_revoke_sessions():
    """Bulk revoke sessions based on criteria"""
    try:
        data = request.get_json() or {}
        criteria = data.get('criteria', {})
        
        query = LoginSession.query.filter(
            LoginSession.logged_out_at.is_(None)
        )
        
        # Apply filters
        if criteria.get('device_type'):
            query = query.filter(LoginSession.device_type == criteria['device_type'])
        
        if criteria.get('older_than_days'):
            cutoff = datetime.now(timezone.utc) - timedelta(days=criteria['older_than_days'])
            query = query.filter(LoginSession.created_at <= cutoff)
        
        if criteria.get('inactive_minutes'):
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=criteria['inactive_minutes'])
            query = query.filter(LoginSession.last_activity <= cutoff)
        
        sessions = query.all()
        count = len(sessions)
        
        for session in sessions:
            session.logged_out_at = datetime.now(timezone.utc)
        
        db.session.commit()
        
        # Log this admin action
        current_user_id = get_jwt_identity()
        admin = Admin.query.filter_by(user_id=current_user_id).first()
        
        if admin:
            action = AdminAction(
                admin_id=admin.admin_id,
                user_id=None,
                action_type='bulk_revoke_sessions',
                notes=f"Bulk revoked {count} sessions based on criteria: {criteria}",
                ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
            )
            db.session.add(action)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully revoked {count} sessions',
            'revoked_count': count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Bulk revoke sessions error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to revoke sessions'
        }), 500

# ===== FAILED ATTEMPTS ANALYTICS ENDPOINT =====
@admin_bp.route('/failed-attempts', methods=['GET'])
@jwt_required()
@admin_required
def get_failed_attempts_analytics():
    """Get detailed failed attempts analytics with reasons"""
    try:
        days = request.args.get('days', default=7, type=int)
        
        # Validate days parameter (max 90 days)
        if days > 90:
            days = 90
        
        logger.info("=" * 60)
        logger.info("📊 FAILED ATTEMPTS API CALLED")
        logger.info(f"   Days parameter: {days}")
        logger.info(f"   Request time (UTC): {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Direct database query for debugging
        total_all = FailedLoginAttempt.query.count()
        logger.info(f"   Total attempts in DB: {total_all}")
        
        # Get all attempts for debugging
        all_attempts = FailedLoginAttempt.query.order_by(
            FailedLoginAttempt.attempted_at.desc()
        ).limit(10).all()
        
        logger.info(f"   Recent attempts in DB:")
        for attempt in all_attempts:
            logger.info(f"      - {attempt.email}: {attempt.reason} at {attempt.attempted_at}")
        
        service = FailedLoginService()
        
        # Get detailed breakdown
        breakdown = service.get_failed_attempts_breakdown(days=days)
        
        logger.info(f"   Breakdown result - total: {breakdown.get('total', 0)}")
        logger.info(f"   Reasons found: {list(breakdown.get('reasons', {}).keys())}")
        logger.info(f"   Daily breakdown: {breakdown.get('daily_breakdown', {})}")
        
        # Get failure rate analytics
        failure_analytics = service.get_failure_rate_analytics(days=days)
        
        # Combine the data
        response_data = {
            'success': True,
            'total': breakdown.get('total', 0),
            'reasons': breakdown.get('reasons', {}),
            'daily_breakdown': breakdown.get('daily_breakdown', {}),
            'recent_attempts': breakdown.get('recent_attempts', []),
            'trend': failure_analytics.get('trend', 'stable'),
            'trend_percentage': failure_analytics.get('trend_percentage', 0),
            'recent_7day_total': failure_analytics.get('recent_7day_total', 0),
            'previous_7day_total': failure_analytics.get('previous_7day_total', 0),
            'overall_failure_rate': failure_analytics.get('overall_failure_rate', 0),
            'top_failure_reasons': failure_analytics.get('top_failure_reasons', []),
            'date_range': breakdown.get('date_range', {})
        }
        
        logger.info(f"📊 Returning response with total: {response_data['total']}")
        logger.info("=" * 60)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Failed attempts analytics error: {str(e)}")
        logger.exception("Detailed traceback:")
        return jsonify({
            'success': False,
            'message': 'Failed to load failed attempts data',
            'error': str(e)
        }), 500

# ===== LOCATION DATA FIX ENDPOINTS =====

@admin_bp.route('/fix-location-data', methods=['POST'])
@jwt_required()
@admin_required
def fix_location_data():
    """Fix existing location data that was stored incorrectly"""
    try:
        sessions = LoginSession.query.all()
        fixed_count = 0
        
        for session in sessions:
            if session.location:
                # If location is a string, try to parse it
                if isinstance(session.location, str):
                    try:
                        loc_data = json.loads(session.location)
                    except:
                        loc_data = session.location
                else:
                    loc_data = session.location
                
                # Check if it's a dict and has nested structure
                if isinstance(loc_data, dict):
                    # If it has 'ip_address' key, it's the whole fingerprint
                    if 'ip_address' in loc_data:
                        # Extract the actual location from the nested structure
                        actual_location = loc_data.get('location', {})
                        if actual_location:
                            session.location = actual_location
                            fixed_count += 1
                            logger.info(f"Fixed location for session {session.session_id}")
                        else:
                            # Use default location based on IP
                            if session.ip_address == '127.0.0.1' or session.ip_address.startswith('192.168.'):
                                session.location = {
                                    'city': 'Nairobi',
                                    'country': 'Kenya',
                                    'country_code': 'KE',
                                    'latitude': -1.2864,
                                    'longitude': 36.8172,
                                    'timezone': 'Africa/Nairobi'
                                }
                                fixed_count += 1
                            else:
                                # Keep as is but log
                                logger.info(f"Session {session.session_id} has IP {session.ip_address} but no location")
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Fixed location data for {fixed_count} sessions',
            'fixed_count': fixed_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error fixing location data: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@admin_bp.route('/add-location-to-sessions', methods=['POST'])
@jwt_required()
@admin_required
def add_location_to_sessions():
    """Add location data to sessions that don't have it"""
    try:
        import random
        
        # Mock locations for testing
        mock_locations = [
            {'city': 'Nairobi', 'country': 'Kenya', 'country_code': 'KE', 'latitude': -1.2864, 'longitude': 36.8172, 'timezone': 'Africa/Nairobi'},
            {'city': 'Mombasa', 'country': 'Kenya', 'country_code': 'KE', 'latitude': -4.0435, 'longitude': 39.6682, 'timezone': 'Africa/Nairobi'},
            {'city': 'Kisumu', 'country': 'Kenya', 'country_code': 'KE', 'latitude': -0.0917, 'longitude': 34.7680, 'timezone': 'Africa/Nairobi'},
            {'city': 'Nakuru', 'country': 'Kenya', 'country_code': 'KE', 'latitude': -0.3031, 'longitude': 36.0800, 'timezone': 'Africa/Nairobi'},
            {'city': 'Eldoret', 'country': 'Kenya', 'country_code': 'KE', 'latitude': 0.5143, 'longitude': 35.2698, 'timezone': 'Africa/Nairobi'},
            {'city': 'New York', 'country': 'USA', 'country_code': 'US', 'latitude': 40.7128, 'longitude': -74.0060, 'timezone': 'America/New_York'},
            {'city': 'London', 'country': 'UK', 'country_code': 'GB', 'latitude': 51.5074, 'longitude': -0.1278, 'timezone': 'Europe/London'},
            {'city': 'Tokyo', 'country': 'Japan', 'country_code': 'JP', 'latitude': 35.6762, 'longitude': 139.6503, 'timezone': 'Asia/Tokyo'},
        ]
        
        sessions = LoginSession.query.filter(
            LoginSession.location.is_(None)
        ).all()
        
        updated = 0
        for i, session in enumerate(sessions):
            location = mock_locations[i % len(mock_locations)]
            session.location = location
            updated += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Added location data to {updated} sessions',
            'locations_added': updated,
            'example_locations': [loc['city'] for loc in mock_locations[:5]]
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding location data: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@admin_bp.route('/debug/locations', methods=['GET'])
@jwt_required()
@admin_required
def debug_locations():
    """Debug endpoint to check location data in database"""
    try:
        sessions_with_location = LoginSession.query.filter(
            LoginSession.location.isnot(None)
        ).all()
        
        location_data = []
        for session in sessions_with_location[:20]:  # Limit to 20 for performance
            location_data.append({
                'session_id': session.session_id,
                'email': session.user.email if session.user else None,
                'location': session.location,
                'ip_address': session.ip_address,
                'created_at': session.created_at.isoformat() if session.created_at else None
            })
        
        total_sessions = LoginSession.query.count()
        sessions_with_loc_count = len(sessions_with_location)
        
        return jsonify({
            'success': True,
            'total_sessions': total_sessions,
            'sessions_with_location': sessions_with_loc_count,
            'percentage': round((sessions_with_loc_count / total_sessions * 100), 2) if total_sessions > 0 else 0,
            'location_samples': location_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error debugging locations: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===== MESSAGE MANAGEMENT ENDPOINTS =====

@admin_bp.route('/messages/send', methods=['POST'])
@jwt_required()
@admin_required
def send_message():
    """Send a message to a specific user"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        admin = Admin.query.filter_by(user_id=current_user_id).first()
        if not admin:
            return jsonify({
                'success': False,
                'message': 'Admin not found'
            }), 403
        
        # Validate required fields
        required_fields = ['user_id', 'title', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Check if user exists
        user = User.query.get(data['user_id'])
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Parse expires_at if provided
        expires_at = None
        if data.get('expires_at'):
            try:
                expires_at = datetime.fromisoformat(data['expires_at'].replace('Z', '+00:00'))
            except:
                pass
        
        # Create message
        message = AdminMessage(
            user_id=data['user_id'],
            admin_id=admin.admin_id,
            title=data['title'],
            message=data['message'],
            message_type=data.get('message_type', 'security'),
            priority=data.get('priority', 'normal'),
            expires_at=expires_at,
            action_buttons=data.get('action_buttons', [])
        )
        
        db.session.add(message)
        db.session.commit()
        
        logger.info(f"✅ Admin {admin.admin_id} sent message to user {user.user_id}: {message.title}")
        
        # Log this admin action
        action = AdminAction(
            admin_id=admin.admin_id,
            user_id=user.user_id,
            action_type='send_message',
            notes=f"Sent message: {message.title}",
            ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
        )
        db.session.add(action)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Message sent successfully',
            'data': message.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Send message error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to send message: {str(e)}'
        }), 500


@admin_bp.route('/messages/bulk-send', methods=['POST'])
@jwt_required()
@admin_required
def bulk_send_messages():
    """Send messages to multiple users at once"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        admin = Admin.query.filter_by(user_id=current_user_id).first()
        if not admin:
            return jsonify({
                'success': False,
                'message': 'Admin not found'
            }), 403
        
        # Validate required fields
        if not data.get('user_ids') or not isinstance(data['user_ids'], list):
            return jsonify({
                'success': False,
                'message': 'user_ids array is required'
            }), 400
        
        if not data.get('title') or not data.get('message'):
            return jsonify({
                'success': False,
                'message': 'Title and message are required'
            }), 400
        
        # Filter criteria (optional)
        filter_criteria = data.get('filter_criteria', {})
        
        # Build user query based on filters
        query = User.query
        
        if filter_criteria.get('has_face') is not None:
            if filter_criteria['has_face']:
                query = query.join(FacialData).filter(FacialData.user_id == User.user_id)
            else:
                query = query.outerjoin(FacialData).filter(FacialData.user_id.is_(None))
        
        if filter_criteria.get('is_active') is not None:
            query = query.filter(User.is_active == filter_criteria['is_active'])
        
        if filter_criteria.get('has_no_face'):
            query = query.outerjoin(FacialData).filter(FacialData.user_id.is_(None))
        
        # Get users
        if data['user_ids'] == ['all']:
            users = query.all()
        else:
            users = User.query.filter(User.user_id.in_(data['user_ids'])).all()
        
        # Create messages
        messages_created = []
        expires_at = None
        if data.get('expires_at'):
            try:
                expires_at = datetime.fromisoformat(data['expires_at'].replace('Z', '+00:00'))
            except:
                pass
        
        for user in users:
            message = AdminMessage(
                user_id=user.user_id,
                admin_id=admin.admin_id,
                title=data['title'],
                message=data['message'],
                message_type=data.get('message_type', 'security'),
                priority=data.get('priority', 'normal'),
                expires_at=expires_at,
                action_buttons=data.get('action_buttons', [])
            )
            db.session.add(message)
            messages_created.append(message)
        
        db.session.commit()
        
        logger.info(f"✅ Admin {admin.admin_id} sent {len(messages_created)} bulk messages")
        
        # Log admin action
        action = AdminAction(
            admin_id=admin.admin_id,
            user_id=None,
            action_type='bulk_send_messages',
            notes=f"Sent {len(messages_created)} messages: {data['title']}",
            ip_address=request.headers.get('X-Forwarded-For', request.remote_addr)
        )
        db.session.add(action)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Messages sent to {len(messages_created)} users',
            'count': len(messages_created)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Bulk send messages error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to send messages: {str(e)}'
        }), 500


@admin_bp.route('/messages', methods=['GET'])
@jwt_required()
@admin_required
def get_all_messages():
    """Get all messages (admin view)"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        user_id = request.args.get('user_id')
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        query = AdminMessage.query
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        paginated = query.order_by(AdminMessage.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        messages = [msg.to_dict() for msg in paginated.items]
        
        return jsonify({
            'success': True,
            'messages': messages,
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        logger.error(f"Get all messages error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch messages'
        }), 500


@admin_bp.route('/stats/no-face-users', methods=['GET'])
@jwt_required()
@admin_required
def get_users_without_face():
    """Get list of users without face registered (for reminders)"""
    try:
        from models.facial_data import FacialData
        
        # Users without face data
        users_without_face = User.query.outerjoin(
            FacialData
        ).filter(
            FacialData.user_id.is_(None),
            User.is_active == True
        ).all()
        
        return jsonify({
            'success': True,
            'count': len(users_without_face),
            'users': [{
                'user_id': u.user_id,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'created_at': u.created_at.isoformat() if u.created_at else None
            } for u in users_without_face]
        }), 200
        
    except Exception as e:
        logger.error(f"Get users without face error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch users'
        }), 500