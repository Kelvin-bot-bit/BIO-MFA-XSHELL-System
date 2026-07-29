# ./backend/middleware/session_middleware.py
import logging
from datetime import datetime, timezone
from flask import request, g
from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request
from models import db
from models.login_session import LoginSession

logger = logging.getLogger(__name__)

class SessionMiddleware:
    """Middleware to track session activity and enforce session limits"""
    
    def __init__(self, app=None):
        self.app = app
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize middleware with Flask app"""
        
        @app.before_request
        def track_session_activity():
            """Track last activity for the current session"""
            # Skip for non-authenticated routes
            if request.endpoint in ['auth.login', 'auth.register', 'auth.health', 
                                     'static', 'favicon']:
                return
            
            try:
                # Try to verify JWT token
                verify_jwt_in_request(optional=True)
                claims = get_jwt()
                session_id = claims.get('session_id')
                
                if session_id:
                    # Update session activity
                    session = LoginSession.query.get(session_id)
                    if session and session.is_active():
                        session.update_activity()
                        
                        # Store session in Flask g for later use
                        g.current_session = session
                        
            except Exception as e:
                # Log error but don't block request
                logger.debug(f"Session tracking error: {e}")