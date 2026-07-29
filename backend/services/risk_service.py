import logging
from datetime import datetime, timedelta
from models import db
from models.risk_assessment import RiskAssessment
import json
import hashlib
import ipaddress

logger = logging.getLogger(__name__)

class RiskService:
    """Service for risk-based authentication analysis"""
    
    def __init__(self, app=None):
        self.app = app
        self.risk_weights = {
            'unusual_location': 30,
            'unusual_time': 20,
            'new_device': 25,
            'suspicious_ip': 25,
            'foreign_location': 15,
            'suspicious_hours': 10,
            'high_attempt_velocity': 15,
            'vpn_proxy_detected': 25,
            'assessment_error': 5
        }
        
        self.risk_thresholds = {
            'low': 30,
            'medium': 70,
            'high': 100
        }
        
        # Authentication requirements by risk level
        self.auth_requirements = {
            'low': ['password'],                    # Password only
            'medium': ['password', 'otp'],          # Password + OTP
            'high': ['password', 'otp']             # Password + OTP
        }
        
        # Face is ALWAYS required for users who have face registered
        # These thresholds are now only for RECOMMENDATION (not requirement)
        self.face_recommended_threshold = 60  # Recommend face if risk > 60
        self.face_required_threshold = 0      # Not used - face required if user has face
    
    def _parse_location_info(self, location_info):
        """Helper method to parse location info whether it's dict or string"""
        if location_info is None:
            return {}
        
        if isinstance(location_info, dict):
            return location_info
        elif isinstance(location_info, str):
            try:
                return json.loads(location_info)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse location_info string: {location_info[:100]}...")
                return {}
        else:
            return {}
    
    def _has_face_registered(self, user_id):
        """Check if user has face registered"""
        try:
            from models.facial_data import FacialData
            return FacialData.query.filter_by(user_id=user_id).first() is not None
        except Exception as e:
            logger.error(f"Error checking face registration: {e}")
            return False
    
    def assess_login_risk(self, user_id, ip_address, user_agent, device_fingerprint, location_info=None):
        """
        Assess risk level for a login attempt
        Returns: (risk_score, risk_level, risk_factors, required_auth, face_recommended, face_required)
        
        NOTE: face_required is determined SOLELY by whether the user has face registered.
        Users with face registered MUST verify face regardless of risk score.
        """
        risk_factors = {}
        total_risk = 0
        
        # Parse location info safely
        parsed_location = self._parse_location_info(location_info)
        
        # Check if user has face registered
        has_face = self._has_face_registered(user_id)
        
        # 1. Check for unusual location
        location_risk = self._assess_location_risk(user_id, parsed_location)
        if location_risk > 0:
            risk_factors['unusual_location'] = location_risk
            total_risk += location_risk
        
        # 2. Check for unusual time
        time_risk = self._assess_time_risk()
        if time_risk > 0:
            risk_factors['unusual_time'] = time_risk
            total_risk += time_risk
        
        # 3. Check for new device
        device_risk = self._assess_device_risk(user_id, device_fingerprint)
        if device_risk > 0:
            risk_factors['new_device'] = device_risk
            total_risk += device_risk
        
        # 4. Check for suspicious IP (VPN/Proxy)
        ip_risk = self._assess_ip_risk(ip_address)
        if ip_risk > 0:
            risk_factors['suspicious_ip'] = ip_risk
            total_risk += ip_risk
        
        # 5. Check for foreign location
        if parsed_location and parsed_location.get('country_code'):
            foreign_risk = self._assess_foreign_location_risk(user_id, parsed_location['country_code'])
            if foreign_risk > 0:
                risk_factors['foreign_location'] = foreign_risk
                total_risk += foreign_risk
        
        # 6. Check for suspicious hours
        hours_risk = self._assess_suspicious_hours()
        if hours_risk > 0:
            risk_factors['suspicious_hours'] = hours_risk
            total_risk += hours_risk
        
        # 7. Check login attempt velocity
        velocity_risk = self._assess_login_velocity(user_id)
        if velocity_risk > 0:
            risk_factors['high_attempt_velocity'] = velocity_risk
            total_risk += velocity_risk
        
        # Cap risk score at 100
        total_risk = min(total_risk, 100)
        
        # Determine risk level
        risk_level = self._determine_risk_level(total_risk)
        
        # Determine required authentication methods (without face)
        required_auth = self.auth_requirements.get(risk_level, ['password', 'otp'])
        
        # ===== FACE VERIFICATION DECISION =====
        # SIMPLIFIED: Face is REQUIRED if user has face registered
        # Face is RECOMMENDED for high-risk scenarios (but not required)
        face_recommended = False
        face_required = has_face  # ← KEY CHANGE: Face required if user has face registered
        
        # Also recommend face for high-risk scenarios even if user doesn't have face
        if not has_face and total_risk >= self.face_recommended_threshold:
            face_recommended = True
            logger.info(f"📢 Face recommended for user {user_id} due to high risk ({total_risk})")
        
        # If user has face, log accordingly
        if has_face:
            logger.info(f"🔐 User {user_id} has face registered - face verification REQUIRED")
            if total_risk >= self.face_recommended_threshold:
                logger.info(f"📊 High risk ({total_risk}) also makes face RECOMMENDED for this user")
        
        logger.info(f"Risk assessment for user {user_id}: score={total_risk}, level={risk_level}, "
                   f"has_face={has_face}, face_recommended={face_recommended}, face_required={face_required}")
        logger.debug(f"Risk factors: {risk_factors}")
        
        return total_risk, risk_level, risk_factors, required_auth, face_recommended, face_required
    
    def _assess_location_risk(self, user_id, current_location):
        """Check if login is from unusual location"""
        try:
            # Get user's last 5 successful logins
            recent_assessments = RiskAssessment.query.filter_by(
                user_id=user_id
            ).order_by(RiskAssessment.created_at.desc()).limit(5).all()
            
            if not recent_assessments:
                return 0  # First login, no baseline
            
            # Check if current location matches common locations
            common_locations = set()
            for assessment in recent_assessments:
                if assessment.location_info and assessment.risk_level == 'low':
                    # Parse location info if it's a string
                    loc_info = assessment.location_info
                    if isinstance(loc_info, str):
                        try:
                            loc_info = json.loads(loc_info)
                        except:
                            loc_info = {}
                    
                    if isinstance(loc_info, dict):
                        loc = loc_info.get('country_code')
                        if loc:
                            common_locations.add(loc)
            
            current_country = current_location.get('country_code') if isinstance(current_location, dict) else None
            
            if current_country and common_locations and current_country not in common_locations:
                logger.info(f"Unusual location detected: {current_country} not in {common_locations}")
                return self.risk_weights['unusual_location']
            
            return 0
            
        except Exception as e:
            logger.error(f"Error in location risk assessment: {e}")
            return 0
    
    def _assess_time_risk(self):
        """Check if login time is unusual for user"""
        current_hour = datetime.utcnow().hour
        
        # If between 2 AM and 5 AM, add some risk
        if 2 <= current_hour <= 5:
            return self.risk_weights['unusual_time'] // 2
        
        return 0
    
    def _assess_device_risk(self, user_id, device_fingerprint):
        """Check if this is a new device"""
        try:
            if not device_fingerprint:
                return self.risk_weights['new_device'] // 2  # Partial risk if no fingerprint
            
            # Check if this device has been used before
            existing = RiskAssessment.query.filter_by(
                user_id=user_id,
                device_fingerprint=device_fingerprint
            ).first()
            
            if not existing:
                logger.info(f"New device detected for user {user_id}")
                return self.risk_weights['new_device']
            
            return 0
            
        except Exception as e:
            logger.error(f"Error in device risk assessment: {e}")
            return 0
    
    def _assess_ip_risk(self, ip_address):
        """Check if IP is suspicious (VPN, proxy, etc.)"""
        try:
            # Check if IP is private
            ip = ipaddress.ip_address(ip_address)
            if ip.is_private:
                return 0
            
            # Here you would integrate with IP reputation services
            # For now, we'll just do basic checks
            
            # You can integrate with services like:
            # - ip-api.com (free)
            # - abuseipdb.com (API key required)
            # - virustotal.com (API key required)
            
            # For demo purposes, we'll return 0
            return 0
            
        except Exception as e:
            logger.error(f"IP risk assessment error: {e}")
            return 0
    
    def _assess_foreign_location_risk(self, user_id, country_code):
        """Check if login is from foreign country"""
        try:
            # Get user's typical country from profile or history
            recent = RiskAssessment.query.filter_by(
                user_id=user_id
            ).order_by(RiskAssessment.created_at.desc()).first()
            
            if recent and recent.location_info:
                # Parse location info if it's a string
                loc_info = recent.location_info
                if isinstance(loc_info, str):
                    try:
                        loc_info = json.loads(loc_info)
                    except:
                        loc_info = {}
                
                typical_country = loc_info.get('country_code') if isinstance(loc_info, dict) else None
                if typical_country and typical_country != country_code:
                    logger.info(f"Foreign location detected: {country_code} vs typical {typical_country}")
                    return self.risk_weights['foreign_location']
            
            return 0
            
        except Exception as e:
            logger.error(f"Error in foreign location risk assessment: {e}")
            return 0
    
    def _assess_suspicious_hours(self):
        """Check if login during suspicious hours"""
        current_hour = datetime.utcnow().hour
        
        # Suspicious hours: 2 AM - 5 AM
        if 2 <= current_hour <= 5:
            return self.risk_weights['suspicious_hours']
        
        return 0
    
    def _assess_login_velocity(self, user_id):
        """Check for multiple rapid login attempts"""
        try:
            five_min_ago = datetime.utcnow() - timedelta(minutes=5)
            
            recent_attempts = RiskAssessment.query.filter(
                RiskAssessment.user_id == user_id,
                RiskAssessment.created_at >= five_min_ago
            ).count()
            
            if recent_attempts > 3:
                logger.info(f"High login velocity detected for user {user_id}: {recent_attempts} attempts in 5min")
                return self.risk_weights['high_attempt_velocity']
            
            return 0
            
        except Exception as e:
            logger.error(f"Error in login velocity assessment: {e}")
            return 0
    
    def _determine_risk_level(self, risk_score):
        """Convert numerical risk score to level"""
        if risk_score < self.risk_thresholds['low']:
            return 'low'
        elif risk_score < self.risk_thresholds['medium']:
            return 'medium'
        else:
            return 'high'
    
    def save_risk_assessment(self, user_id, risk_score, risk_level, 
                            risk_factors, required_auth, ip_address, 
                            user_agent, device_fingerprint, location_info):
        """Save risk assessment to database"""
        try:
            # Convert dictionaries to JSON strings
            risk_factors_json = json.dumps(risk_factors) if isinstance(risk_factors, dict) else risk_factors
            required_auth_json = json.dumps(required_auth) if isinstance(required_auth, list) else required_auth
            
            # Handle location info
            if location_info and isinstance(location_info, dict):
                location_info_json = json.dumps(location_info)
            elif location_info and isinstance(location_info, str):
                # Already a JSON string, validate it
                try:
                    json.loads(location_info)  # Test if it's valid JSON
                    location_info_json = location_info
                except:
                    location_info_json = json.dumps({'raw': location_info})
            else:
                location_info_json = None
            
            assessment = RiskAssessment(
                user_id=user_id,
                risk_score=risk_score,
                risk_level=risk_level,
                risk_factors=risk_factors_json,
                required_auth=required_auth_json,
                ip_address=ip_address,
                user_agent=user_agent,
                device_fingerprint=device_fingerprint,
                location_info=location_info_json
            )
            
            db.session.add(assessment)
            db.session.commit()
            
            logger.info(f"✅ Risk assessment saved for user {user_id}: {risk_level} risk ({risk_score})")
            return assessment
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ Error saving risk assessment: {e}")
            return None
    
    def get_user_risk_profile(self, user_id):
        """Get risk profile summary for a user"""
        try:
            assessments = RiskAssessment.query.filter_by(
                user_id=user_id
            ).order_by(RiskAssessment.created_at.desc()).limit(10).all()
            
            if not assessments:
                return None
            
            avg_risk = sum(a.risk_score for a in assessments) / len(assessments)
            
            # Get risk level distribution
            risk_counts = {'low': 0, 'medium': 0, 'high': 0}
            for a in assessments:
                risk_counts[a.risk_level] = risk_counts.get(a.risk_level, 0) + 1
            
            # Check if user has face registered
            has_face = self._has_face_registered(user_id)
            
            return {
                'user_id': user_id,
                'average_risk_score': round(avg_risk, 2),
                'typical_risk_level': self._determine_risk_level(avg_risk),
                'total_assessments': len(assessments),
                'risk_distribution': risk_counts,
                'has_face_registered': has_face,
                'face_recommended': avg_risk >= self.face_recommended_threshold and has_face,
                'last_assessment': assessments[0].to_dict() if assessments else None
            }
            
        except Exception as e:
            logger.error(f"Error getting risk profile for user {user_id}: {e}")
            return None
    
    def get_risk_thresholds(self):
        """Get current risk thresholds"""
        return {
            'low': self.risk_thresholds['low'],
            'medium': self.risk_thresholds['medium'],
            'high': self.risk_thresholds['high'],
            'face_recommended': self.face_recommended_threshold,
            'face_required': self.face_required_threshold
        }
    
    def update_risk_thresholds(self, low=None, medium=None, high=None, 
                               face_recommended=None, face_required=None):
        """Update risk thresholds (admin only)"""
        if low is not None:
            self.risk_thresholds['low'] = low
        if medium is not None:
            self.risk_thresholds['medium'] = medium
        if high is not None:
            self.risk_thresholds['high'] = high
        if face_recommended is not None:
            self.face_recommended_threshold = face_recommended
        if face_required is not None:
            self.face_required_threshold = face_required
        
        logger.info(f"Risk thresholds updated: {self.risk_thresholds}, "
                   f"Face recommended: {self.face_recommended_threshold}, "
                   f"Face required: {self.face_required_threshold}")
        
        return self.get_risk_thresholds()