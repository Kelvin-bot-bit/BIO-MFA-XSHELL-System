import logging
from datetime import datetime, timedelta
from models import db
from models.user import User
from models.facial_data import FacialData
from models.login_session import LoginSession
from models.failed_login_attempts import FailedLoginAttempt
from models.risk_assessment import RiskAssessment

logger = logging.getLogger(__name__)

class SecurityScoreService:
    """Service to calculate user's security score based on various factors"""
    
    def __init__(self):
        # Weight distribution for different security factors
        self.weights = {
            'face_registered': 25,      # Face registration is a major security feature
            'mfa_enabled': 20,          # MFA enabled (face counts as MFA)
            'password_strength': 15,     # Password complexity
            'session_management': 10,    # Active sessions (too many = risk)
            'login_activity': 10,        # Suspicious login patterns
            'risk_assessment': 10,       # Risk score from previous assessments
            'account_age': 5,            # Older accounts with good history
            'failed_attempts': 5         # Failed login attempts penalty
        }
    
    def calculate_security_score(self, user_id):
        """Calculate comprehensive security score for a user"""
        try:
            user = User.query.get(user_id)
            if not user:
                return {
                    'score': 0,
                    'grade': 'F',
                    'factors': {},
                    'recommendations': ['User not found']
                }
            
            scores = {}
            recommendations = []
            
            # 1. Face Registration Score (25 points)
            face_data = FacialData.query.filter_by(user_id=user_id).first()
            face_score = 25 if face_data else 0
            scores['face_registered'] = face_score
            if not face_data:
                recommendations.append('🎭 Enable facial recognition for maximum security')
            else:
                recommendations.append('✅ Facial recognition enabled - Great!')
            
            # 2. MFA Enabled Score (20 points)
            # Face counts as MFA, so if face registered, full points
            mfa_score = 20 if face_data else 0
            scores['mfa_enabled'] = mfa_score
            if not face_data:
                recommendations.append('🔐 Enable MFA (face recognition) to secure your account')
            
            # 3. Password Strength Score (15 points)
            password_score = self._calculate_password_strength(user)
            scores['password_strength'] = password_score
            if password_score < 10:
                recommendations.append('🔑 Use a stronger password (mix of letters, numbers, symbols)')
            elif password_score < 15:
                recommendations.append('📈 Consider strengthening your password for better security')
            else:
                recommendations.append('✅ Password strength is excellent')
            
            # 4. Session Management Score (10 points)
            session_score = self._calculate_session_score(user_id)
            scores['session_management'] = session_score
            if session_score < 5:
                recommendations.append('🖥️ You have multiple active sessions - review and revoke unused ones')
            elif session_score < 8:
                recommendations.append('📱 Consider reviewing your active sessions')
            
            # 5. Login Activity Score (10 points)
            activity_score = self._calculate_login_activity_score(user_id)
            scores['login_activity'] = activity_score
            if activity_score < 6:
                recommendations.append('📍 Unusual login locations detected - review your activity')
            
            # 6. Risk Assessment Score (10 points)
            risk_score = self._calculate_risk_assessment_score(user_id)
            scores['risk_assessment'] = risk_score
            if risk_score < 6:
                recommendations.append('⚠️ Multiple high-risk login attempts detected')
            
            # 7. Account Age Score (5 points)
            age_score = self._calculate_account_age_score(user)
            scores['account_age'] = age_score
            
            # 8. Failed Attempts Penalty (5 points, but subtractive)
            failed_attempts_penalty = self._calculate_failed_attempts_penalty(user_id)
            scores['failed_attempts'] = failed_attempts_penalty
            
            # Calculate total score
            total_score = sum(scores.values())
            
            # Cap at 100
            total_score = min(100, max(0, total_score))
            
            # Determine grade
            if total_score >= 90:
                grade = 'A+'
                grade_message = 'Excellent Security'
            elif total_score >= 80:
                grade = 'A'
                grade_message = 'Very Strong Security'
            elif total_score >= 70:
                grade = 'B'
                grade_message = 'Good Security'
            elif total_score >= 60:
                grade = 'C'
                grade_message = 'Fair Security'
            elif total_score >= 50:
                grade = 'D'
                grade_message = 'Needs Improvement'
            else:
                grade = 'F'
                grade_message = 'Poor Security - Immediate Action Required'
            
            return {
                'score': total_score,
                'grade': grade,
                'grade_message': grade_message,
                'factors': scores,
                'recommendations': recommendations[:5],  # Top 5 recommendations
                'max_score': 100
            }
            
        except Exception as e:
            logger.error(f"Error calculating security score: {e}")
            return {
                'score': 0,
                'grade': 'F',
                'grade_message': 'Unable to calculate score',
                'factors': {},
                'recommendations': ['Please try again later'],
                'max_score': 100
            }
    
    def _calculate_password_strength(self, user):
        """Calculate password strength score based on complexity"""
        # This would require storing password complexity metadata
        # For now, we'll check based on user's password hash age or return default
        # In production, you'd store password complexity at registration/change time
        
        # For demonstration, return a default score
        # You can enhance this by checking password age or stored complexity
        return 12  # Default moderate score
    
    def _calculate_session_score(self, user_id):
        """Score based on number of active sessions"""
        try:
            active_sessions = LoginSession.query.filter(
                LoginSession.user_id == user_id,
                LoginSession.logged_out_at.is_(None),
                LoginSession.expires_at > datetime.utcnow()
            ).count()
            
            # Score decreases with more active sessions
            if active_sessions == 0:
                return 10
            elif active_sessions == 1:
                return 10
            elif active_sessions == 2:
                return 8
            elif active_sessions == 3:
                return 6
            elif active_sessions == 4:
                return 4
            else:
                return 2
                
        except Exception as e:
            logger.error(f"Error calculating session score: {e}")
            return 5
    
    def _calculate_login_activity_score(self, user_id):
        """Score based on login patterns (unusual locations, etc.)"""
        try:
            # Check recent risk assessments for suspicious activity
            recent_risks = RiskAssessment.query.filter(
                RiskAssessment.user_id == user_id,
                RiskAssessment.risk_level == 'high'
            ).count()
            
            if recent_risks == 0:
                return 10
            elif recent_risks <= 2:
                return 7
            elif recent_risks <= 5:
                return 4
            else:
                return 2
                
        except Exception as e:
            logger.error(f"Error calculating login activity score: {e}")
            return 7
    
    def _calculate_risk_assessment_score(self, user_id):
        """Score based on average risk score from recent assessments"""
        try:
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            recent_assessments = RiskAssessment.query.filter(
                RiskAssessment.user_id == user_id,
                RiskAssessment.created_at >= thirty_days_ago
            ).all()
            
            if not recent_assessments:
                return 8  # Default good score
            
            # Average risk score
            avg_risk = sum(a.risk_score for a in recent_assessments) / len(recent_assessments)
            
            # Convert risk score (0-100) to security score (100-0)
            # Lower risk = higher security score
            security_score = 10 - (avg_risk / 10)
            return max(0, min(10, security_score))
            
        except Exception as e:
            logger.error(f"Error calculating risk assessment score: {e}")
            return 7
    
    def _calculate_account_age_score(self, user):
        """Score based on account age (older accounts with good history get bonus)"""
        try:
            if not user.created_at:
                return 5
            
            days_old = (datetime.utcnow() - user.created_at).days
            
            if days_old >= 365:
                return 5
            elif days_old >= 180:
                return 4
            elif days_old >= 90:
                return 3
            elif days_old >= 30:
                return 2
            else:
                return 1
                
        except Exception as e:
            logger.error(f"Error calculating account age score: {e}")
            return 3
    
    def _calculate_failed_attempts_penalty(self, user_id):
        """Penalty score based on recent failed login attempts"""
        try:
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            failed_attempts = FailedLoginAttempt.query.filter(
                FailedLoginAttempt.user_id == user_id,
                FailedLoginAttempt.attempted_at >= thirty_days_ago
            ).count()
            
            # Start with full points, subtract for each failed attempt
            penalty = 5
            if failed_attempts > 20:
                penalty = 0
            elif failed_attempts > 10:
                penalty = 1
            elif failed_attempts > 5:
                penalty = 2
            elif failed_attempts > 2:
                penalty = 3
            elif failed_attempts > 0:
                penalty = 4
            
            return penalty
            
        except Exception as e:
            logger.error(f"Error calculating failed attempts penalty: {e}")
            return 3