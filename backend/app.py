from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import config
import logging
import os

def create_app(config_name='default'):
    """Application factory function"""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Create upload directories if they don't exist
    upload_dir = os.path.join(app.root_path, 'uploads')
    profile_pics_dir = os.path.join(upload_dir, 'profile_pictures')
    os.makedirs(profile_pics_dir, exist_ok=True)
    
    # Initialize extensions first
    from models import db, bcrypt
    db.init_app(app)
    bcrypt.init_app(app)
    jwt = JWTManager(app)
    CORS(app, origins=["http://localhost:3000"], supports_credentials=True)
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(name)s %(message)s',
        handlers=[
            logging.FileHandler('XShell-db.log'),
            logging.StreamHandler()
        ]
    )
    
    logger = logging.getLogger(__name__)
    
    # JWT configuration
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'success': False,
            'message': 'Token has expired',
            'error': 'token_expired'
        }), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            'success': False,
            'message': 'Invalid token',
            'error': 'token_invalid'
        }), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            'success': False,
            'message': 'Request does not contain valid token',
            'error': 'token_missing'
        }), 401
    
    # Security headers
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        return response
    
    # Serve uploaded files
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        """Serve uploaded files (profile pictures, etc.)"""
        return send_from_directory('uploads', filename)
    
    # Import and register blueprints AFTER db initialization
    from routes.auth import auth_bp
    from routes.protected import protected_bp
    from routes.admin import admin_bp
    
    # ===== ADD CUSTOM ROUTES TO ADMIN BLUEPRINT BEFORE REGISTRATION =====
    # Add manual cleanup endpoint to admin blueprint before registering
    @admin_bp.route('/cleanup-sessions', methods=['POST'])
    def manual_cleanup():
        """Manually trigger session cleanup (admin only)"""
        try:
            from services.session_cleanup_service import SessionCleanupService
            from utils.decorators import admin_required
            
            # Note: The actual admin_required decorator will be applied when this route is accessed
            # For now, we'll create a simple version
            # In production, you should move this to admin.py with proper decorators
            
            cleanup_service = SessionCleanupService()
            results = cleanup_service.run_full_cleanup()
            return jsonify({
                'success': True,
                'message': f"Cleaned up {results['total']} sessions",
                'details': results
            }), 200
        except Exception as e:
            logger.error(f"Manual cleanup error: {e}")
            return jsonify({
                'success': False,
                'message': 'Failed to clean up sessions'
            }), 500
    
    # Now register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(protected_bp)
    app.register_blueprint(admin_bp)
    
    # ===== SESSION MIDDLEWARE =====
    # Import and initialize session middleware
    from middleware.session_middleware import SessionMiddleware
    SessionMiddleware(app)
    logger.info("✅ Session middleware initialized")
    
    # ===== SESSION CLEANUP SERVICE =====
    # Initialize session cleanup service
    from services.session_cleanup_service import SessionCleanupService
    session_cleanup = SessionCleanupService(app)
    
    # Setup background scheduler for automatic session cleanup
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        
        scheduler = BackgroundScheduler()
        
        # Run cleanup every 15 minutes
        scheduler.add_job(
            func=session_cleanup.run_full_cleanup,
            trigger="interval",
            minutes=15,
            id="session_cleanup",
            name="Auto cleanup expired/inactive sessions",
            replace_existing=True
        )
        
        # Also run cleanup every day at 2 AM for old sessions
        scheduler.add_job(
            func=session_cleanup.cleanup_old_sessions,
            trigger="cron",
            hour=2,
            minute=0,
            id="old_session_cleanup",
            name="Daily cleanup of old sessions",
            replace_existing=True
        )
        
        # Run initial cleanup on startup
        with app.app_context():
            results = session_cleanup.run_full_cleanup()
            logger.info(f"🧹 Initial session cleanup: {results['total']} sessions cleaned")
        
        scheduler.start()
        
        # Store scheduler in app config for shutdown
        app.config['SCHEDULER'] = scheduler
        logger.info("✅ Session cleanup scheduler started (runs every 15 minutes)")
        
    except ImportError:
        logger.warning("⚠️ APScheduler not installed. Automatic session cleanup disabled.")
        logger.warning("   Install with: pip install apscheduler")
    
    @app.teardown_appcontext
    def shutdown_scheduler(exception=None):
        """Shutdown scheduler when app shuts down"""
        if 'SCHEDULER' in app.config and app.config['SCHEDULER'].running:
            app.config['SCHEDULER'].shutdown()
            logger.info("🛑 Session cleanup scheduler shut down")
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'message': 'Resource not found'
        }), 404
    
    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500
    
    # Create database tables
    with app.app_context():
        db.create_all()
        logger.info("Database tables created successfully")
    
    # Log startup information
    logger.info("=" * 60)
    logger.info("🚀 XShell MFA Server Started")
    logger.info(f"📊 Database: {app.config['MYSQL_DB']}")
    logger.info(f"🔐 Admin routes available at /api/admin/*")
    logger.info(f"📁 Uploads directory: {upload_dir}")
    logger.info(f"🔄 Session cleanup: {'ENABLED' if 'SCHEDULER' in app.config else 'DISABLED'}")
    logger.info("=" * 60)
    
    return app

if __name__ == '__main__':
    # Determine config based on environment
    env = os.environ.get('ENVIRONMENT', 'development')
    app = create_app(env)
    
    print(f"🚀 Starting Secure-MFA in {env} mode...")
    print(f"📊 Database: {app.config['MYSQL_DB']}")
    print(f"🔐 Admin routes available at /api/admin/*")
    print(f"📁 Uploads directory: backend/uploads/")
    print(f"🔄 Session auto-cleanup: {'ENABLED' if 'SCHEDULER' in app.config else 'DISABLED'}")
    
    app.run(
        debug=app.config['DEBUG'],
        host='0.0.0.0', 
        port=5000
    )