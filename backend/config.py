import os
from datetime import timedelta
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration for XShell MFA Application"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'xshell-dev-secret-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'xshell-jwt-secret-key-change-in-production'
    
    # Database configuration for XShell_db
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '')  # Empty string for no password
    MYSQL_DB = os.environ.get('MYSQL_DB', 'XShell_db')
    MYSQL_PORT = os.environ.get('MYSQL_PORT', '3306')
    
    # SQLAlchemy Database URI - Handle empty password correctly
    # For mysql-connector-python with empty password
    if MYSQL_PASSWORD:
        SQLALCHEMY_DATABASE_URI = f'mysql+mysqlconnector://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}'
    else:
        SQLALCHEMY_DATABASE_URI = f'mysql+mysqlconnector://{MYSQL_USER}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}'
    
    # Alternative: Use pymysql if mysql-connector has issues
    # if MYSQL_PASSWORD:
    #     SQLALCHEMY_DATABASE_URI = f'mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}'
    # else:
    #     SQLALCHEMY_DATABASE_URI = f'mysql+pymysql://{MYSQL_USER}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT Configuration
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # OTP Configuration
    OTP_EXPIRY_MINUTES = 10
    OTP_LENGTH = 6
    
    # =========================================================================
    # STRICT FACE RECOGNITION CONFIGURATION
    # =========================================================================
    
    # Face Recognition Configuration - STRICT MODE
    FACE_RECOGNITION_TOLERANCE = 0.4  # STRICT: Lower tolerance for better differentiation
    FACE_ENCODING_MODEL = 'large'     # Use large model for better accuracy
    FACE_DETECTION_MODEL = 'cnn'      # STRICT: Use CNN for better face detection
    
    # Strict Face Quality Requirements
    FACE_QUALITY_CHECKS = True
    MIN_FACE_SIZE_RATIO = 0.15        # Face must be at least 15% of image height
    MAX_FACE_ASPECT_RATIO = 1.3       # Maximum width/height ratio
    MIN_FACE_ASPECT_RATIO = 0.7       # Minimum width/height ratio
    MIN_BRIGHTNESS_LEVEL = 50         # Minimum image brightness
    MAX_BRIGHTNESS_LEVEL = 200        # Maximum image brightness
    MIN_CONTRAST_LEVEL = 20           # Minimum image contrast
    
    # Strict Face Verification Settings
    FACE_VERIFICATION_CONFIDENCE_THRESHOLD = 60.0  # Minimum 60% confidence required
    FACE_ENCODING_JITTERS = 5                      # More jitters for better encoding
    FACE_CROSS_USER_THRESHOLD = 0.5                # Stricter threshold for uniqueness checks
    
    # Email Configuration
    SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USERNAME = os.environ.get('SMTP_USERNAME')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
    
    # =========================================================================
    # XShell ADVANCED SECURITY FEATURES
    # =========================================================================
    
    # Device Fingerprinting Configuration
    ENABLE_DEVICE_FINGERPRINTING = True
    FINGERPRINT_SALT = os.environ.get('FINGERPRINT_SALT', 'xshell-fingerprint-salt-2024')
    
    # Risk-Based Authentication Configuration
    ENABLE_RISK_BASED_AUTH = True
    
    # Risk Assessment Weights (0-100 scale)
    RISK_WEIGHTS = {
        'unusual_location': 30,      # Login from new location
        'unusual_time': 20,          # Login at unusual hours
        'new_device': 25,            # First time on this device
        'suspicious_ip': 25,         # VPN/Tor/Proxy detected
        'foreign_location': 15,      # Login from different country
        'suspicious_hours': 10,      # Login between 2 AM - 5 AM
        'high_attempt_velocity': 15, # Multiple rapid login attempts
        'assessment_error': 5        # Error in risk assessment
    }
    
    # Risk Level Thresholds
    RISK_THRESHOLDS = {
        'low': 30,    # 0-29: Low risk
        'medium': 70, # 30-69: Medium risk  
        'high': 100   # 70-100: High risk
    }
    
    # Authentication Requirements by Risk Level
    AUTH_REQUIREMENTS = {
        'low': ['password'],                    # Password only
        'medium': ['password', 'otp'],          # Password + OTP
        'high': ['password', 'otp', 'face']     # Password + OTP + Face
    }
    
    # Device Trust Configuration
    ENABLE_DEVICE_TRUST = True
    AUTO_TRUST_DEVICES = True  # Automatically trust devices after successful auth
    DEVICE_TRUST_EXPIRY_DAYS = 90  # How long to remember trusted devices
    
    # Location Security Settings
    ENABLE_LOCATION_CHECK = True
    ALLOW_FOREIGN_LOGINS = True    # Allow logins from different countries
    REQUIRE_EXTRA_VERIFICATION_FOREIGN = True  # Extra verification for foreign logins
    
    # Time-based Security
    ENABLE_TIME_ANALYSIS = True
    SUSPICIOUS_HOURS_START = 2    # 2 AM
    SUSPICIOUS_HOURS_END = 5      # 5 AM
    
    # IP Reputation Settings
    ENABLE_IP_REPUTATION_CHECK = True
    # Add known VPN/Tor IP ranges (simplified - in production use threat intelligence APIs)
    SUSPICIOUS_IP_RANGES = [
        # Example ranges - replace with actual threat intelligence data
        '192.168.0.0/16',  # Internal networks
        '10.0.0.0/8',      # Internal networks
    ]
    
    # Login Velocity Protection
    ENABLE_LOGIN_VELOCITY_CHECK = True
    MAX_LOGIN_ATTEMPTS_PER_5MIN = 3
    MAX_LOGIN_ATTEMPTS_PER_HOUR = 10
    MAX_LOGIN_ATTEMPTS_PER_DAY = 30
    
    # Behavioral Analysis (Future Feature)
    ENABLE_BEHAVIORAL_ANALYSIS = False  # Phase 2 feature
    
    # Zero-Trust Mode (Future Feature)
    ENABLE_ZERO_TRUST = False  # Phase 3 feature - Never trust, always verify
    
    # Security Headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'"
    }
    
    # Logging Configuration for Security Events
    SECURITY_LOGGING = {
        'ENABLE_SECURITY_LOGS': True,
        'LOG_RISK_ASSESSMENTS': True,
        'LOG_DEVICE_FINGERPRINTS': True,
        'LOG_AUTH_ATTEMPTS': True,
        'LOG_SUSPICIOUS_ACTIVITY': True,
        'LOG_FACE_VERIFICATION_DETAILS': True  # STRICT: Log face verification metrics
    }
    
    # API Rate Limiting (Future Feature)
    ENABLE_RATE_LIMITING = False
    RATE_LIMIT_REQUESTS_PER_MINUTE = 60
    
    # Security Monitoring
    ENABLE_SECURITY_MONITORING = True
    ALERT_ON_HIGH_RISK_LOGINS = True
    ALERT_ON_NEW_DEVICE_LOGINS = True
    ALERT_ON_FOREIGN_LOGINS = True
    
    def __init__(self):
        """Log XShell configuration on initialization"""
        logger.info(f"🔧 XShell Configuration Loaded - Database: {self.MYSQL_DB}")
        logger.info(f"🔗 Database URI: {self.SQLALCHEMY_DATABASE_URI}")
        
        # STRICT: Log face recognition configuration
        logger.info(f"🎭 STRICT Face Recognition - Tolerance: {self.FACE_RECOGNITION_TOLERANCE}")
        logger.info(f"🎯 Face Confidence Threshold: {self.FACE_VERIFICATION_CONFIDENCE_THRESHOLD}%")
        logger.info(f"🔍 Face Detection Model: {self.FACE_DETECTION_MODEL}")
        
        if self.ENABLE_DEVICE_FINGERPRINTING:
            logger.info("🔒 Device Fingerprinting: ENABLED")
        if self.ENABLE_RISK_BASED_AUTH:
            logger.info("🎯 Risk-Based Authentication: ENABLED")
        if self.ENABLE_DEVICE_TRUST:
            logger.info("📱 Device Trust System: ENABLED")
        
        # Log risk configuration
        logger.info(f"⚖️ Risk Thresholds - Low: <{self.RISK_THRESHOLDS['low']}, "
                   f"Medium: {self.RISK_THRESHOLDS['low']}-{self.RISK_THRESHOLDS['medium']-1}, "
                   f"High: >={self.RISK_THRESHOLDS['medium']}")
        
        # Log authentication requirements
        for level, methods in self.AUTH_REQUIREMENTS.items():
            logger.info(f"🔐 {level.upper()} risk requires: {', '.join(methods)}")

class DevelopmentConfig(Config):
    """Development configuration with relaxed security for testing"""
    DEBUG = True
    TESTING = False
    
    # Development-specific security settings
    ENABLE_DEVICE_FINGERPRINTING = True
    ENABLE_RISK_BASED_AUTH = True
    AUTO_TRUST_DEVICES = True
    
    # STRICT: Even in development, use strict face recognition
    FACE_RECOGNITION_TOLERANCE = 0.45  # Slightly more lenient than production
    FACE_VERIFICATION_CONFIDENCE_THRESHOLD = 55.0  # Lower confidence threshold for testing
    
    # More permissive settings for development
    RISK_THRESHOLDS = {
        'low': 40,    # More lenient in development
        'medium': 80, 
        'high': 100
    }
    
    # Simplified authentication for testing
    AUTH_REQUIREMENTS = {
        'low': ['password'],
        'medium': ['password', 'otp'],
        'high': ['password', 'otp', 'face']
    }
    
    def __init__(self):
        super().__init__()
        logger.info("🚀 XShell Development Mode: STRICT face recognition with testing-friendly settings")

class ProductionConfig(Config):
    """Production configuration with maximum security"""
    DEBUG = False
    TESTING = False
    
    # Enhanced security for production
    ENABLE_DEVICE_FINGERPRINTING = True
    ENABLE_RISK_BASED_AUTH = True
    AUTO_TRUST_DEVICES = True
    
    # STRICT: Maximum strictness for production
    FACE_RECOGNITION_TOLERANCE = 0.4  # Very strict tolerance
    FACE_VERIFICATION_CONFIDENCE_THRESHOLD = 65.0  # Higher confidence required
    FACE_CROSS_USER_THRESHOLD = 0.45  # Even stricter for uniqueness checks
    
    # Stricter thresholds for production
    RISK_THRESHOLDS = {
        'low': 25,    # More sensitive in production
        'medium': 60, 
        'high': 100
    }
    
    # Enhanced authentication requirements
    AUTH_REQUIREMENTS = {
        'low': ['password', 'otp'],           # Always require OTP in production
        'medium': ['password', 'otp', 'face'], # Add face verification earlier
        'high': ['password', 'otp', 'face', 'device_verification']  # Full verification
    }
    
    # Additional production security
    ENABLE_RATE_LIMITING = True
    ENABLE_SECURITY_MONITORING = True
    ALERT_ON_HIGH_RISK_LOGINS = True
    
    def __init__(self):
        super().__init__()
        logger.info("🔒 XShell Production Mode: MAXIMUM STRICT security features enabled")

class TestingConfig(Config):
    """Testing configuration with minimal security for fast tests"""
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # Disable most security features for testing
    ENABLE_DEVICE_FINGERPRINTING = False
    ENABLE_RISK_BASED_AUTH = False
    AUTO_TRUST_DEVICES = False
    
    # STRICT: But keep face recognition for testing
    FACE_RECOGNITION_TOLERANCE = 0.5  # Lenient for testing
    FACE_VERIFICATION_CONFIDENCE_THRESHOLD = 50.0  # Low threshold for tests
    FACE_QUALITY_CHECKS = False  # Disable quality checks for faster tests
    
    # Minimal authentication for testing
    AUTH_REQUIREMENTS = {
        'low': ['password'],
        'medium': ['password'],
        'high': ['password']
    }
    
    def __init__(self):
        super().__init__()
        logger.info("🧪 XShell Testing Mode: Basic face recognition for test performance")

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

# Helper functions for XShell security configuration
def get_risk_thresholds():
    """Get current risk thresholds based on environment"""
    env = os.environ.get('ENVIRONMENT', 'development')
    return config[env].RISK_THRESHOLDS

def get_auth_requirements():
    """Get authentication requirements based on environment"""
    env = os.environ.get('ENVIRONMENT', 'development')
    return config[env].AUTH_REQUIREMENTS

def is_security_feature_enabled(feature_name):
    """Check if a specific security feature is enabled"""
    env = os.environ.get('ENVIRONMENT', 'development')
    config_obj = config[env]
    
    feature_map = {
        'device_fingerprinting': config_obj.ENABLE_DEVICE_FINGERPRINTING,
        'risk_based_auth': config_obj.ENABLE_RISK_BASED_AUTH,
        'device_trust': config_obj.ENABLE_DEVICE_TRUST,
        'location_check': config_obj.ENABLE_LOCATION_CHECK,
        'ip_reputation': config_obj.ENABLE_IP_REPUTATION_CHECK,
        'login_velocity': config_obj.ENABLE_LOGIN_VELOCITY_CHECK,
        'face_quality_checks': config_obj.FACE_QUALITY_CHECKS  # STRICT: Added face quality checks
    }
    
    return feature_map.get(feature_name, False)

def get_face_recognition_config():
    """STRICT: Get face recognition configuration"""
    env = os.environ.get('ENVIRONMENT', 'development')
    config_obj = config[env]
    
    return {
        'tolerance': config_obj.FACE_RECOGNITION_TOLERANCE,
        'confidence_threshold': config_obj.FACE_VERIFICATION_CONFIDENCE_THRESHOLD,
        'detection_model': config_obj.FACE_DETECTION_MODEL,
        'encoding_model': config_obj.FACE_ENCODING_MODEL,
        'quality_checks_enabled': config_obj.FACE_QUALITY_CHECKS,
        'cross_user_threshold': config_obj.FACE_CROSS_USER_THRESHOLD
    }

def get_xshell_config_summary():
    """Get a summary of XShell configuration for logging"""
    env = os.environ.get('ENVIRONMENT', 'development')
    config_obj = config[env]
    
    summary = {
        'environment': env,
        'database': config_obj.MYSQL_DB,
        'device_fingerprinting': config_obj.ENABLE_DEVICE_FINGERPRINTING,
        'risk_based_auth': config_obj.ENABLE_RISK_BASED_AUTH,
        'device_trust': config_obj.ENABLE_DEVICE_TRUST,
        'risk_thresholds': config_obj.RISK_THRESHOLDS,
        'auth_requirements': config_obj.AUTH_REQUIREMENTS,
        'face_recognition': {  # STRICT: Added face recognition summary
            'tolerance': config_obj.FACE_RECOGNITION_TOLERANCE,
            'confidence_threshold': config_obj.FACE_VERIFICATION_CONFIDENCE_THRESHOLD,
            'quality_checks': config_obj.FACE_QUALITY_CHECKS
        }
    }
    
    return summary

def get_database_info():
    """Get database connection information"""
    env = os.environ.get('ENVIRONMENT', 'development')
    config_obj = config[env]
    
    return {
        'database': config_obj.MYSQL_DB,
        'host': config_obj.MYSQL_HOST,
        'port': config_obj.MYSQL_PORT,
        'user': config_obj.MYSQL_USER
    }

# Initialize configuration logging when module is imported
if __name__ != "__main__":
    env = os.environ.get('ENVIRONMENT', 'development')
    config_obj = config[env]()
    logger.info(f"🎯 XShell MFA System Initialized - Environment: {env.upper()}")
    logger.info(f"📊 Database: {config_obj.MYSQL_DB} on {config_obj.MYSQL_HOST}:{config_obj.MYSQL_PORT}")
    
    # STRICT: Log face recognition configuration
    face_config = get_face_recognition_config()
    logger.info(f"🎭 STRICT Face Recognition Configuration:")
    logger.info(f"   • Tolerance: {face_config['tolerance']}")
    logger.info(f"   • Confidence Threshold: {face_config['confidence_threshold']}%")
    logger.info(f"   • Detection Model: {face_config['detection_model']}")
    logger.info(f"   • Quality Checks: {'ENABLED' if face_config['quality_checks_enabled'] else 'DISABLED'}")