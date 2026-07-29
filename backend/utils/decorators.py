# ./backend/utils/decorators.py
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from models.user import User

def auth_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            
            # Check if user exists and is active
            user = User.query.get(current_user_id)
            if not user or not user.is_active:
                return jsonify({
                    'success': False,
                    'message': 'User not found or inactive'
                }), 401
            
            # Add user to kwargs for route function
            kwargs['current_user'] = user
            return f(*args, **kwargs)
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': 'Invalid or expired token'
            }), 401
    
    return decorated_function

def mfa_required(f):
    """Decorator to require MFA verification in JWT claims"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            claims = get_jwt()
            
            if not claims.get('mfa_verified', False):
                return jsonify({
                    'success': False,
                    'message': 'MFA verification required'
                }), 403
            
            current_user_id = get_jwt_identity()
            
            # Check if user exists and is active
            user = User.query.get(current_user_id)
            
            if not user or not user.is_active:
                return jsonify({
                    'success': False,
                    'message': 'User not found or inactive'
                }), 401
            
            kwargs['current_user'] = user
            return f(*args, **kwargs)
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
    
    return decorated_function