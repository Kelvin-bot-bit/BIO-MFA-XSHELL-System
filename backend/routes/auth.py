from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt, decode_token
from flask_jwt_extended.exceptions import JWTDecodeError
import logging
import json
import hashlib
from datetime import datetime, timedelta, timezone

# Import db and bcrypt directly
from models import db, bcrypt

# Import services
from services.encryption import EncryptionService
from services.otp_service import OTPService
from services.face_service import FaceService
from services.email_service import EmailService
from services.risk_service import RiskService
from services.failed_login_service import FailedLoginService
from services.session_cleanup_service import SessionCleanupService
from services.password_reset_service import PasswordResetService
from utils.validators import Validators
from utils.device_fingerprint import DeviceFingerprinter
from models.login_session import LoginSession
from models.failed_login_attempts import FailedLoginAttempt

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Helper function to check if user has face registered
def _has_face_registered(user_id):
    """Helper method to check if user has face registered"""
    from models.facial_data import FacialData
    return FacialData.query.filter_by(user_id=user_id).first() is not None

# Helper function to get current UTC time with timezone
def utc_now():
    """Return current UTC time with timezone info"""
    return datetime.now(timezone.utc)

# Helper function to safely record failed attempts (ensures immediate commit)
def safe_record_failed_attempt(email, ip_address, user_agent, reason, user_id=None):
    """Record a failed attempt in a separate, independent transaction"""
    try:
        from models import db as main_db
        from models.failed_login_attempts import FailedLoginAttempt
        
        # Create the attempt object
        attempt = FailedLoginAttempt(
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            reason=reason
        )
        
        # Add and commit immediately
        main_db.session.add(attempt)
        main_db.session.commit()
        
        logger.warning(f"✅ Failed attempt recorded: {reason} for {email} (ID: {attempt.attempt_id})")
        return True
    except Exception as e:
        logger.error(f"❌ Could not record failed attempt: {e}")
        return False

@auth_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'message': 'Secure-MFA Auth API is running',
        'status': 'healthy'
    })

@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint with OPTIONAL face validation"""
    try:
        from models.user import User
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No JSON data provided'
            }), 400
        
        required_fields = ['email', 'phone', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        is_valid_email, email_msg = Validators.validate_email(data['email'])
        if not is_valid_email:
            return jsonify({
                'success': False,
                'message': f'Invalid email: {email_msg}'
            }), 400
        
        is_valid_phone, phone_msg = Validators.validate_phone(data['phone'])
        if not is_valid_phone:
            return jsonify({
                'success': False,
                'message': f'Invalid phone: {phone_msg}'
            }), 400
        
        is_valid_password, password_msg = Validators.validate_password(data['password'])
        if not is_valid_password:
            return jsonify({
                'success': False,
                'message': f'Weak password: {password_msg}'
            }), 400
        
        is_valid_first_name, first_name_msg = Validators.validate_name(data['first_name'])
        if not is_valid_first_name:
            return jsonify({
                'success': False,
                'message': f'Invalid first name: {first_name_msg}'
            }), 400
        
        is_valid_last_name, last_name_msg = Validators.validate_name(data['last_name'])
        if not is_valid_last_name:
            return jsonify({
                'success': False,
                'message': f'Invalid last name: {last_name_msg}'
            }), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({
                'success': False,
                'message': 'User with this email already exists'
            }), 409
        
        user = User(
            email=data['email'],
            phone=is_valid_phone,
            first_name=data['first_name'],
            last_name=data['last_name']
        )
        user.set_password(data['password'])

        db.session.add(user)
        db.session.flush()
        
        # ===== FACE REGISTRATION IS NOW OPTIONAL =====
        face_registered = False
        if 'face_image' in data and data['face_image']:
            try:
                is_valid_face, face_msg = Validators.validate_face_image(data['face_image'])
                if not is_valid_face:
                    db.session.rollback()
                    return jsonify({
                        'success': False,
                        'message': f'Invalid face image: {face_msg}'
                    }), 400
                
                face_service = FaceService(tolerance=0.5)  # More lenient for registration
                facial_encoding = face_service.encode_face_from_image(data['face_image'])
                
                is_unique, uniqueness_msg = face_service.validate_face_uniqueness(user.user_id, facial_encoding)
                if not is_unique:
                    db.session.rollback()
                    return jsonify({
                        'success': False,
                        'message': uniqueness_msg
                    }), 400
                
                face_service.save_facial_encoding(user.user_id, facial_encoding)
                face_registered = True
                logger.info(f"✅ Face registered for user: {user.email}")
                
            except Exception as e:
                db.session.rollback()
                logger.error(f"❌ Face registration failed for user {user.email}: {str(e)}")
                return jsonify({
                    'success': False,
                    'message': f'Face registration failed: {str(e)}'
                }), 400
        else:
            # No face provided - that's fine, user can add later
            logger.info(f"ℹ️ User {user.email} registered without face (optional)")
        
        db.session.commit()
        
        logger.info(f"✅ User registered successfully: {user.email}")
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'user': user.to_dict(),
            'has_face_registered': face_registered
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Registration error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Registration failed due to server error'
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Step 1: Password verification - Sends REAL OTP and creates session with risk assessment"""
    try:
        from models.user import User
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No JSON data provided'
            }), 400
            
        if 'email' not in data or 'password' not in data:
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        email = data['email']
        
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        
        user_agent = request.headers.get('User-Agent', '')
        timezone_val = request.headers.get('X-Timezone', 'UTC')
        
        failed_login_service = FailedLoginService(max_attempts=5, lockout_minutes=15)
        
        if failed_login_service.is_account_locked(email=email):
            remaining = failed_login_service.get_lockout_remaining_minutes(email=email)
            logger.warning(f"🔒 Locked login attempt for {email} from {ip_address}")
            return jsonify({
                'success': False,
                'message': f'Account temporarily locked. Too many failed attempts. Please try again in {remaining} minutes.',
                'locked': True,
                'remaining_minutes': remaining
            }), 429
        
        user = User.query.filter_by(email=email, is_active=True).first()
        
        if not user:
            failed_login_service.record_failed_attempt(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                reason='user_not_found'
            )
            logger.warning(f"❌ Login attempt for non-existent user: {email} from {ip_address}")
            return jsonify({
                'success': False,
                'message': 'Invalid credentials'
            }), 401
        
        if not user.check_password(data['password']):
            failed_login_service.record_failed_attempt(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                reason='invalid_password',
                user_id=user.user_id
            )
            logger.warning(f"❌ Invalid password attempt for user: {user.email} from {ip_address}")
            
            if failed_login_service.is_account_locked(user_id=user.user_id):
                remaining = failed_login_service.get_lockout_remaining_minutes(user_id=user.user_id)
                return jsonify({
                    'success': False,
                    'message': f'Account temporarily locked due to too many failed attempts. Please try again in {remaining} minutes.',
                    'locked': True,
                    'remaining_minutes': remaining
                }), 429
            
            return jsonify({
                'success': False,
                'message': 'Invalid credentials'
            }), 401

        cleared = failed_login_service.clear_failed_attempts(user.user_id)
        if cleared > 0:
            logger.info(f"✅ Cleared {cleared} failed attempts after successful login for {user.email}")

        fingerprinter = DeviceFingerprinter(fingerprint_salt=current_app.config.get('FINGERPRINT_SALT', 'xshell-default-salt'))
        fingerprint = fingerprinter.generate_fingerprint()
        
        # Extract ONLY the location data, not the entire fingerprint
        location_data = fingerprint.get('location', {})
        
        # Debug: Log what we're storing
        logger.info(f"📍 Storing location data: {location_data}")
        
        browser_info = fingerprint.get('browser', {})
        os_info = fingerprint.get('os', {})
        
        if browser_info.get('is_mobile'):
            device_type = 'mobile'
        elif browser_info.get('is_tablet'):
            device_type = 'tablet'
        else:
            device_type = 'desktop'
        
        risk_service = RiskService()
        
        # FIXED: Receive 6 values from assess_login_risk
        risk_score, risk_level, risk_factors, required_auth, face_recommended, face_required = risk_service.assess_login_risk(
            user_id=user.user_id,
            ip_address=fingerprint.get('ip_address', ''),
            user_agent=json.dumps(fingerprint),
            device_fingerprint=fingerprint.get('fingerprint_hash'),
            location_info=location_data  # Use extracted location data
        )
        
        risk_service.save_risk_assessment(
            user_id=user.user_id,
            risk_score=risk_score,
            risk_level=risk_level,
            risk_factors=risk_factors,
            required_auth=required_auth,
            ip_address=fingerprint.get('ip_address', ''),
            user_agent=json.dumps(fingerprint),
            device_fingerprint=fingerprint.get('fingerprint_hash'),
            location_info=location_data  # Use extracted location data
        )
        
        logger.info(f"📊 Risk assessment for {user.email}: {risk_level} risk ({risk_score})")
        logger.info(f"🔐 Required authentication: {required_auth}")
        logger.info(f"👤 Face recommended: {face_recommended}, Face required: {face_required}")
        
        # Use timezone-aware datetime for expires_at
        now_utc = utc_now()
        expires_at = now_utc + timedelta(days=30)
        
        session = LoginSession(
            user_id=user.user_id,
            device_info=fingerprinter.get_device_display_name(fingerprint),
            device_type=device_type,
            browser=browser_info.get('family', 'Unknown'),
            browser_version=browser_info.get('version', ''),
            os=os_info.get('family', 'Unknown'),
            ip_address=fingerprint.get('ip_address', ''),
            user_agent=json.dumps(fingerprint),  # Store full fingerprint in user_agent for debugging
            location=location_data,  # Store ONLY location data, not the whole fingerprint
            timezone=timezone_val,
            password_verified=True,
            otp_verified=False,
            face_verified=False,
            session_source='login',
            session_status='active',
            expires_at=expires_at
        )
        
        db.session.add(session)
        db.session.commit()
        
        logger.info(f"✅ Session created for user {user.email} - Session ID: {session.session_id}")
        logger.info(f"📍 Location stored: {location_data}")
        
        temp_token = create_access_token(
            identity=user.user_id,
            additional_claims={
                'mfa_verified': False,
                'session_id': session.session_id,
                'risk_level': risk_level,
                'risk_score': risk_score,
                'required_auth': required_auth,
                'face_recommended': face_recommended,
                'face_required': face_required,
                'token_type': 'temp'
            },
            expires_delta=timedelta(minutes=30)
        )
        
        logger.info(f"🚀 Sending REAL OTP to user: {user.email}")
        otp_service = OTPService()
        success, message = otp_service.send_otp_to_user(user, 'login')
        
        if not success:
            logger.error(f"❌ Failed to send REAL OTP to {user.email}: {message}")
            return jsonify({
                'success': False,
                'message': 'Failed to send OTP. Please try again.'
            }), 500
        
        logger.info(f"✅ REAL OTP sent successfully to {user.email}")
        
        return jsonify({
            'success': True,
            'message': 'Password verified. OTP sent to registered email.',
            'temp_token': temp_token,
            'next_step': 'otp_verification',
            'session_id': session.session_id,
            'risk_level': risk_level,
            'risk_score': risk_score,
            'required_auth': required_auth,
            'face_recommended': face_recommended,
            'face_required': face_required
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Login error: {str(e)}")
        logger.exception("Detailed traceback:")
        return jsonify({
            'success': False,
            'message': f'Login failed due to server error: {str(e)}'
        }), 500

@auth_bp.route('/verify-otp', methods=['POST'])
@jwt_required()
def verify_otp():
    """Step 2: OTP verification - Users with face must verify face, users without face get direct access"""
    try:
        from models.user import User
        from models.login_session import LoginSession
        
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        session_id = claims.get('session_id')
        risk_level = claims.get('risk_level', 'medium')
        risk_score = claims.get('risk_score', 0)
        
        logger.info(f"🔑 verify-otp - Token claims: {claims}")
        logger.info(f"👤 User ID from token: {current_user_id}")
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No JSON data provided'
            }), 400
            
        if 'otp' not in data:
            return jsonify({
                'success': False,
                'message': 'OTP is required'
            }), 400
        
        user = User.query.get(current_user_id)
        if not user:
            logger.error(f"❌ User not found for ID: {current_user_id}")
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        logger.info(f"🔍 Verifying OTP for user: {user.email} (ID: {user.user_id})")
        
        otp_service = OTPService()
        is_valid, message = otp_service.verify_otp(user.user_id, data['otp'], 'login')
        
        if not is_valid:
            logger.warning(f"❌ OTP verification failed for user {user.email}: {message}")
            
            # Record failed OTP attempt using safe function
            safe_record_failed_attempt(
                email=user.email,
                ip_address=request.headers.get('X-Forwarded-For', request.remote_addr),
                user_agent=request.headers.get('User-Agent', ''),
                reason='otp_invalid' if "Invalid" in message else 'otp_expired',
                user_id=user.user_id
            )
            
            return jsonify({
                'success': False,
                'message': message
            }), 401
        
        if session_id:
            session = LoginSession.query.get(session_id)
            if session:
                session.otp_verified = True
                session.update_activity()
                logger.info(f"✅ Session {session_id} updated - OTP verified")
        
        # Check if user has face registered
        from models.facial_data import FacialData
        has_face_registered = FacialData.query.filter_by(user_id=user.user_id).first() is not None
        logger.info(f"👤 User has face registered: {has_face_registered}")
        
        # ===== UPDATED LOGIC: Face required if user has face registered =====
        # Users WITH face registered MUST verify face
        # Users WITHOUT face registered get direct access after OTP
        
        if has_face_registered:
            # User has face registered - ALWAYS require face verification
            logger.info(f"🔐 User {user.email} has face registered - face verification REQUIRED")
            
            face_verification_token = create_access_token(
                identity=user.user_id,
                additional_claims={
                    'mfa_verified': False,
                    'otp_verified': True,
                    'session_id': session_id,
                    'risk_level': risk_level,
                    'risk_score': risk_score,
                    'token_type': 'face',
                    'face_required': True
                },
                expires_delta=timedelta(minutes=15)
            )
            
            return jsonify({
                'success': True,
                'message': 'OTP verified successfully',
                'face_verification_token': face_verification_token,
                'next_step': 'face_verification',
                'has_face_registered': True,
                'face_required': True,
                'face_optional': False,
                'risk_level': risk_level,
                'risk_score': risk_score
            }), 200
        
        else:
            # User has NO face registered - complete login immediately
            logger.info(f"✅ User {user.email} has no face - completing login without face")
            
            access_token = create_access_token(
                identity=user.user_id,
                additional_claims={
                    'mfa_verified': True,
                    'session_id': session_id,
                    'risk_level': risk_level,
                    'risk_score': risk_score
                }
            )
            refresh_token = create_refresh_token(
                identity=user.user_id,
                additional_claims={
                    'session_id': session_id
                }
            )
            
            if session_id:
                session = LoginSession.query.get(session_id)
                if session:
                    session.face_verified = False  # Not verified because no face registered
                    session.access_token_hash = hashlib.sha256(access_token.encode()).hexdigest()
                    session.refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
                    session.update_activity()
                    db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Authentication successful',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict(),
                'has_face_registered': False,
                'face_required': False,
                'face_optional': False,
                'risk_level': risk_level,
                'risk_score': risk_score
            }), 200
        
    except Exception as e:
        logger.error(f"❌ OTP verification error: {str(e)}")
        logger.exception("Detailed traceback:")
        return jsonify({
            'success': False,
            'message': 'OTP verification failed'
        }), 500

@auth_bp.route('/verify-face', methods=['POST'])
@jwt_required()
def verify_face():
    """Step 3: Face verification - REQUIRED for users with face registered"""
    try:
        logger.info("=" * 60)
        logger.info("FACE VERIFICATION ENDPOINT CALLED")
        
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        logger.info(f"👤 Current user ID from token: {current_user_id}")
        logger.info(f"📋 All JWT claims: {claims}")
        
        session_id = claims.get('session_id')
        risk_level = claims.get('risk_level', 'medium')
        risk_score = claims.get('risk_score', 0)
        face_required = claims.get('face_required', True)  # Default to True for users with face
        
        logger.info(f"🔑 Session ID from token: {session_id}")
        logger.info(f"📊 Risk level from token: {risk_level}")
        logger.info(f"📊 Risk score: {risk_score}")
        logger.info(f"🔐 Face required: {face_required}")
        
        if not session_id:
            logger.error("❌ No session_id in token claims!")
            return jsonify({
                'success': False,
                'message': 'Invalid token: missing session ID'
            }), 401
        
        data = request.get_json()
        
        if not data:
            logger.error("❌ No JSON data provided")
            return jsonify({
                'success': False,
                'message': 'No JSON data provided'
            }), 400
            
        if 'face_image' not in data:
            logger.error("❌ Face image missing from request")
            return jsonify({
                'success': False,
                'message': 'Face image is required'
            }), 400
        
        from models.user import User
        from models.login_session import LoginSession
        from models.facial_data import FacialData
        
        user = User.query.get(current_user_id)
        if not user:
            logger.error(f"❌ User not found for ID: {current_user_id}")
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        logger.info(f"✅ User found: {user.email}")
        
        # Get IP address for logging
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        user_agent = request.headers.get('User-Agent', '')
        
        has_face = FacialData.query.filter_by(user_id=user.user_id).first()
        if not has_face:
            logger.error(f"❌ No face registered for user: {user.email}")
            
            safe_record_failed_attempt(
                email=user.email,
                ip_address=ip_address,
                user_agent=user_agent,
                reason='face_not_registered',
                user_id=user.user_id
            )
            
            return jsonify({
                'success': False,
                'message': 'No face registered for this user. Please register your face first.'
            }), 400
        
        logger.info("✅ User has face registered")
        
        is_valid_face, face_msg = Validators.validate_face_image(data['face_image'])
        if not is_valid_face:
            logger.error(f"❌ Invalid face image: {face_msg}")
            
            safe_record_failed_attempt(
                email=user.email,
                ip_address=ip_address,
                user_agent=user_agent,
                reason='face_quality_failed',
                user_id=user.user_id
            )
            
            return jsonify({
                'success': False,
                'message': f'Invalid face image: {face_msg}'
            }), 400
        
        logger.info("✅ Face image validation passed")
        
        # Face verification is required for users who reach this endpoint
        tolerance = 0.48  # Standard tolerance for required face verification
        confidence_threshold = 45.0  # Minimum 50% confidence required
        
        face_service = FaceService(tolerance=tolerance)
        logger.info(f"🔧 Using face service with tolerance: {tolerance}, confidence_threshold: {confidence_threshold}%")
        
        logger.info(f"🔍 Verifying face for user: {user.email}")
        is_match, confidence, message = face_service.verify_face(user.user_id, data['face_image'])
        
        logger.info(f"📊 Verification result - Match: {is_match}, Confidence: {confidence:.1f}%, Required: {confidence_threshold}%")
        
        if not is_match or confidence < confidence_threshold:
            logger.warning(f"❌ Face verification failed for user {user.email}: {message} (Confidence: {confidence:.1f}%)")
            
            # Record failed face verification attempt
            safe_record_failed_attempt(
                email=user.email,
                ip_address=ip_address,
                user_agent=user_agent,
                reason='face_verification_failed',
                user_id=user.user_id
            )
            
            return jsonify({
                'success': False,
                'message': f'Face verification failed (confidence: {confidence:.1f}%). Please try again.',
                'confidence': f"{confidence:.1f}%",
                'face_required': True
            }), 401
        
        logger.info(f"✅ Face match found with confidence: {confidence:.1f}%")
        
        # Enforce max sessions limit before creating new token
        cleanup_service = SessionCleanupService()
        revoked_count = cleanup_service.enforce_max_sessions_per_user(user.user_id, max_sessions=5)
        if revoked_count > 0:
            logger.info(f"🔄 Auto-revoked {revoked_count} old sessions for user {user.user_id}")
        
        access_token = create_access_token(
            identity=user.user_id,
            additional_claims={
                'mfa_verified': True,
                'session_id': session_id,
                'risk_level': risk_level,
                'risk_score': risk_score
            }
        )
        refresh_token = create_refresh_token(
            identity=user.user_id,
            additional_claims={
                'session_id': session_id
            }
        )
        
        logger.info(f"✅ Access token generated for user {user.email}")
        
        if session_id:
            session = LoginSession.query.get(session_id)
            if session:
                session.face_verified = True
                session.session_status = 'active'
                session.access_token_hash = hashlib.sha256(access_token.encode()).hexdigest()
                session.refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
                session.update_activity()
                db.session.commit()
                logger.info(f"✅ Session {session_id} fully verified and active")
            else:
                logger.warning(f"⚠️ Session {session_id} not found in database")
        
        logger.info(f"✅ Face verification successful for user: {user.email} - {message}")
        logger.info("=" * 60)
        
        return jsonify({
            'success': True,
            'message': f'Authentication successful - {message}',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'confidence': f"{confidence:.1f}%",
            'user': user.to_dict(),
            'risk_level': risk_level,
            'risk_score': risk_score
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Face verification error: {str(e)}")
        logger.exception("Detailed traceback:")
        
        # Try to record the exception as a failed attempt using safe function
        try:
            current_user_id = get_jwt_identity()
            from models.user import User
            user = User.query.get(current_user_id)
            if user:
                ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
                if ip_address and ',' in ip_address:
                    ip_address = ip_address.split(',')[0].strip()
                user_agent = request.headers.get('User-Agent', '')
                safe_record_failed_attempt(
                    email=user.email,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    reason='face_verification_error',
                    user_id=user.user_id
                )
        except Exception as record_error:
            logger.error(f"Could not record exception as failed attempt: {record_error}")
        
        return jsonify({
            'success': False,
            'message': f'Face verification failed: {str(e)}'
        }), 500

@auth_bp.route('/skip-face', methods=['POST'])
@jwt_required()
def skip_face():
    """Skip face verification - This should only be called by users WITHOUT face registered"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        session_id = claims.get('session_id')
        risk_level = claims.get('risk_level', 'low')
        risk_score = claims.get('risk_score', 0)
        
        from models.user import User
        from models.login_session import LoginSession
        from models.facial_data import FacialData
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        has_face_registered = FacialData.query.filter_by(user_id=user.user_id).first() is not None
        
        # If user has face registered, they cannot skip face verification
        if has_face_registered:
            logger.warning(f"⚠️ User {user.email} has face registered but attempted to skip - denying request")
            return jsonify({
                'success': False,
                'message': 'Face verification is required for your account. Please complete face verification.'
            }), 403
        
        # Create access token without face verification
        access_token = create_access_token(
            identity=user.user_id,
            additional_claims={
                'mfa_verified': True,
                'session_id': session_id,
                'risk_level': risk_level,
                'risk_score': risk_score,
                'face_skipped': True
            }
        )
        refresh_token = create_refresh_token(
            identity=user.user_id,
            additional_claims={
                'session_id': session_id
            }
        )
        
        if session_id:
            session = LoginSession.query.get(session_id)
            if session:
                session.face_verified = False
                session.access_token_hash = hashlib.sha256(access_token.encode()).hexdigest()
                session.refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
                session.update_activity()
                db.session.commit()
        
        logger.info(f"✅ User {user.email} (no face registered) completed login")
        
        return jsonify({
            'success': True,
            'message': 'Login successful.',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict(),
            'face_skipped': True,
            'has_face_registered': has_face_registered
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Skip face error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to complete login'
        }), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """Refresh access token - IMPROVED WITH BETTER ERROR HANDLING"""
    try:
        from models.user import User
        from models.login_session import LoginSession
        
        logger.info("🔄 Refresh token endpoint called")
        
        # Get current user identity from the refresh token
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        session_id = claims.get('session_id')
        
        logger.info(f"👤 Refresh token user ID: {current_user_id}")
        logger.info(f"🔑 Session ID from refresh token: {session_id}")
        
        # Verify user exists and is active
        user = User.query.get(current_user_id)
        
        if not user:
            logger.error(f"❌ Refresh failed: User not found for ID: {current_user_id}")
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 401
        
        if not user.is_active:
            logger.error(f"❌ Refresh failed: User is inactive: {user.email}")
            return jsonify({
                'success': False,
                'message': 'Account is deactivated'
            }), 401
        
        # Create new access token
        access_token = create_access_token(
            identity=current_user_id,
            additional_claims={
                'mfa_verified': True,  # Refresh token implies MFA was already verified
                'session_id': session_id
            }
        )
        
        # Update session activity if session exists
        if session_id:
            session = LoginSession.query.get(session_id)
            if session and session.user_id == current_user_id:
                if session.is_active():
                    session.last_activity = utc_now()
                    db.session.commit()
                    logger.info(f"✅ Session {session_id} activity updated during refresh")
                else:
                    logger.warning(f"⚠️ Session {session_id} is not active (expired/logged out)")
            else:
                logger.warning(f"⚠️ Session {session_id} not found or doesn't belong to user")
        
        logger.info(f"✅ Token refresh successful for user: {user.email}")
        
        return jsonify({
            'success': True,
            'access_token': access_token,
            'message': 'Token refreshed successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Token refresh error: {str(e)}")
        logger.exception("Detailed traceback:")
        return jsonify({
            'success': False,
            'message': 'Token refresh failed'
        }), 401

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout - mark session as logged out"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        session_id = claims.get('session_id')
        
        from models.login_session import LoginSession
        
        if session_id:
            session = LoginSession.query.get(session_id)
            if session and session.user_id == current_user_id:
                session.mark_logged_out()
                logger.info(f"✅ Session {session_id} marked as logged out")
            else:
                logger.warning(f"⚠️ Session {session_id} not found or doesn't belong to user {current_user_id}")
        else:
            logger.warning(f"⚠️ No session_id in JWT claims for user {current_user_id}")
        
        logger.info(f"✅ User {current_user_id} logged out successfully")
        
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Logout error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Logout failed'
        }), 500

@auth_bp.route('/timezone', methods=['POST'])
@jwt_required()
def set_timezone():
    """Set user's timezone preference"""
    try:
        data = request.get_json()
        timezone_val = data.get('timezone')
        current_user_id = get_jwt_identity()
        
        if not timezone_val:
            return jsonify({
                'success': False,
                'message': 'Timezone is required'
            }), 400
        
        # Update the current session with timezone
        claims = get_jwt()
        session_id = claims.get('session_id')
        
        if session_id:
            from models.login_session import LoginSession
            session = LoginSession.query.get(session_id)
            if session:
                session.timezone = timezone_val
                db.session.commit()
                logger.info(f"✅ Timezone updated for session {session_id}: {timezone_val}")
        
        return jsonify({
            'success': True,
            'message': 'Timezone updated successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error setting timezone: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to set timezone'
        }), 500

@auth_bp.route('/resend-otp', methods=['POST'])
@jwt_required()
def resend_otp():
    """Resend OTP to user"""
    try:
        from models.user import User
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        logger.info(f"🔄 Resending REAL OTP to user: {user.email}")
        otp_service = OTPService()
        success, message = otp_service.send_otp_to_user(user, 'login')
        
        if not success:
            logger.error(f"❌ Failed to resend OTP to {user.email}: {message}")
            return jsonify({
                'success': False,
                'message': 'Failed to resend OTP. Please try again.'
            }), 500
        
        logger.info(f"✅ REAL OTP resent successfully to {user.email}")
        
        return jsonify({
            'success': True,
            'message': 'OTP resent successfully'
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Resend OTP error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to resend OTP'
        }), 500

@auth_bp.route('/check-token', methods=['GET'])
@jwt_required()
def check_token():
    """Debug endpoint to check if token is valid and get claims"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        return jsonify({
            'success': True,
            'user_id': current_user_id,
            'claims': claims,
            'mfa_verified': claims.get('mfa_verified', False),
            'session_id': claims.get('session_id'),
            'token_type': claims.get('token_type', 'access')
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 401

@auth_bp.route('/register-face', methods=['POST'])
@jwt_required()
def register_face():
    """Endpoint to register face after initial account creation"""
    try:
        from models.user import User
        
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'face_image' not in data:
            return jsonify({
                'success': False,
                'message': 'Face image is required'
            }), 400
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        from models.facial_data import FacialData
        existing_face = FacialData.query.filter_by(user_id=user.user_id).first()
        if existing_face:
            return jsonify({
                'success': False,
                'message': 'Face already registered for this user'
            }), 409
        
        is_valid_face, face_msg = Validators.validate_face_image(data['face_image'])
        if not is_valid_face:
            return jsonify({
                'success': False,
                'message': f'Invalid face image: {face_msg}'
            }), 400
        
        face_service = FaceService(tolerance=0.5)
        
        try:
            facial_encoding = face_service.encode_face_from_image(data['face_image'])
            
            is_unique, uniqueness_msg = face_service.validate_face_uniqueness(user.user_id, facial_encoding)
            if not is_unique:
                return jsonify({
                    'success': False,
                    'message': uniqueness_msg
                }), 400
            
            face_service.save_facial_encoding(user.user_id, facial_encoding)
            
            logger.info(f"✅ Face added to existing account for user: {user.email}")
            
            return jsonify({
                'success': True,
                'message': 'Face registered successfully with strict validation',
                'user': user.to_dict()
            }), 201
            
        except Exception as e:
            logger.error(f"❌ Face registration failed for user {user.email}: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Face registration failed: {str(e)}'
            }), 400
        
    except Exception as e:
        logger.error(f"❌ Face registration endpoint error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Face registration failed due to server error'
        }), 500

@auth_bp.route('/add-face', methods=['POST'])
@jwt_required()
def add_face():
    """Add face verification to existing account (optional)"""
    try:
        from models.user import User
        
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'face_image' not in data:
            return jsonify({
                'success': False,
                'message': 'Face image is required'
            }), 400
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        from models.facial_data import FacialData
        existing_face = FacialData.query.filter_by(user_id=user.user_id).first()
        if existing_face:
            return jsonify({
                'success': False,
                'message': 'Face already registered for this user'
            }), 409
        
        is_valid_face, face_msg = Validators.validate_face_image(data['face_image'])
        if not is_valid_face:
            return jsonify({
                'success': False,
                'message': f'Invalid face image: {face_msg}'
            }), 400
        
        face_service = FaceService(tolerance=0.5)
        facial_encoding = face_service.encode_face_from_image(data['face_image'])
        
        is_unique, uniqueness_msg = face_service.validate_face_uniqueness(user.user_id, facial_encoding)
        if not is_unique:
            return jsonify({
                'success': False,
                'message': uniqueness_msg
            }), 400
        
        face_service.save_facial_encoding(user.user_id, facial_encoding)
        
        logger.info(f"✅ Face added to existing account for user: {user.email}")
        
        return jsonify({
            'success': True,
            'message': 'Face verification added successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Add face error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to add face verification'
        }), 500

# ===== PASSWORD RESET ROUTES =====

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset - sends email with reset link"""
    try:
        from models.user import User
        from services.password_reset_service import PasswordResetService
        
        data = request.get_json()
        
        if not data or 'email' not in data:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400
        
        email = data['email'].strip().lower()
        
        # Find user
        user = User.query.filter_by(email=email, is_active=True).first()
        
        # For security, always return success even if user not found
        # This prevents email enumeration attacks
        if not user:
            logger.info(f"Password reset requested for non-existent email: {email}")
            return jsonify({
                'success': True,
                'message': 'If an account exists with that email, you will receive a password reset link.'
            }), 200
        
        # Create reset token
        reset_service = PasswordResetService()
        raw_token, _ = reset_service.create_reset_token(user.user_id)
        
        # Send email
        email_sent = reset_service.send_reset_email(user, raw_token)
        
        if email_sent:
            return jsonify({
                'success': True,
                'message': 'Password reset link has been sent to your email address.'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to send reset email. Please try again later.'
            }), 500
        
    except Exception as e:
        logger.error(f"❌ Forgot password error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to process request. Please try again.'
        }), 500


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using valid token"""
    try:
        from services.password_reset_service import PasswordResetService
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        token = data.get('token')
        new_password = data.get('new_password')
        
        if not token:
            return jsonify({
                'success': False,
                'message': 'Reset token is required'
            }), 400
        
        if not new_password:
            return jsonify({
                'success': False,
                'message': 'New password is required'
            }), 400
        
        # Validate password strength
        from utils.validators import Validators
        is_valid, password_msg = Validators.validate_password(new_password)
        if not is_valid:
            return jsonify({
                'success': False,
                'message': password_msg
            }), 400
        
        # Reset password
        reset_service = PasswordResetService()
        success, message = reset_service.reset_password(token, new_password)
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 400
        
    except Exception as e:
        logger.error(f"❌ Reset password error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to reset password. Please try again.'
        }), 500


@auth_bp.route('/verify-reset-token', methods=['POST'])
def verify_reset_token():
    """Verify if a reset token is valid"""
    try:
        from services.password_reset_service import PasswordResetService
        
        data = request.get_json()
        
        if not data or 'token' not in data:
            return jsonify({
                'success': False,
                'message': 'Token is required'
            }), 400
        
        token = data.get('token')
        
        reset_service = PasswordResetService()
        user, error = reset_service.verify_reset_token(token)
        
        if user:
            return jsonify({
                'success': True,
                'message': 'Token is valid',
                'email': user.email
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': error
            }), 400
        
    except Exception as e:
        logger.error(f"❌ Verify token error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to verify token'
        }), 500

# ===== SESSION MANAGEMENT ROUTES =====

@auth_bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_sessions():
    """Get all active sessions for current user"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_session_id = claims.get('session_id')
        
        from models.login_session import LoginSession
        
        now = utc_now()
        
        # Get all active sessions for user (not logged out and not expired)
        sessions = LoginSession.query.filter(
            LoginSession.user_id == current_user_id,
            LoginSession.logged_out_at.is_(None),
            LoginSession.expires_at > now
        ).order_by(LoginSession.last_activity.desc()).all()
        
        logger.info(f"✅ Found {len(sessions)} active sessions for user {current_user_id}")
        
        return jsonify({
            'success': True,
            'current_session_id': current_session_id,
            'sessions': [session.to_dict() for session in sessions]
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Get sessions error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch sessions'
        }), 500

@auth_bp.route('/sessions/<session_id>', methods=['DELETE'])
@jwt_required()
def revoke_session(session_id):
    """Revoke a specific session"""
    try:
        current_user_id = get_jwt_identity()
        from models.login_session import LoginSession
        
        session = LoginSession.query.filter_by(
            session_id=session_id,
            user_id=current_user_id
        ).first()
        
        if not session:
            return jsonify({
                'success': False,
                'message': 'Session not found'
            }), 404
        
        session.mark_logged_out()
        
        logger.info(f"✅ Session {session_id} revoked for user {current_user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Session revoked successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Revoke session error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to revoke session'
        }), 500

@auth_bp.route('/sessions/revoke-all', methods=['POST'])
@jwt_required()
def revoke_all_sessions():
    """Revoke all sessions except current"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_session_id = claims.get('session_id')
        
        from models.login_session import LoginSession
        
        now = utc_now()
        
        # Revoke all other active sessions
        sessions = LoginSession.query.filter(
            LoginSession.user_id == current_user_id,
            LoginSession.session_id != current_session_id,
            LoginSession.logged_out_at.is_(None),
            LoginSession.expires_at > now
        ).all()
        
        count = len(sessions)
        for session in sessions:
            session.mark_logged_out()
        
        db.session.commit()
        
        logger.info(f"✅ Revoked {count} sessions for user {current_user_id}")
        
        return jsonify({
            'success': True,
            'message': f'Revoked {count} sessions',
            'revoked_count': count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Revoke all sessions error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to revoke sessions'
        }), 500