# ./backend/services/failed_login_service.py

import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, and_
from models import db
from models.failed_login_attempts import FailedLoginAttempt
from models.user import User
import pytz

logger = logging.getLogger(__name__)

# Make sure the class name is exactly "FailedLoginService" (capital F, L, S)
class FailedLoginService:
    """Service for tracking and managing failed login attempts"""
    
    def __init__(self, max_attempts=5, lockout_minutes=15):
        """
        Initialize with configurable limits
        - max_attempts: Number of failed attempts before lockout
        - lockout_minutes: How long to lock the account
        """
        self.max_attempts = max_attempts
        self.lockout_minutes = lockout_minutes
        # Set default timezone to Africa/Nairobi
        self.local_tz = pytz.timezone('Africa/Nairobi')
    
    def _ensure_timezone(self, dt):
        """Ensure datetime is timezone-aware"""
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    
    def _to_local_time(self, utc_dt):
        """Convert UTC datetime to local timezone (Africa/Nairobi)"""
        if utc_dt is None:
            return None
        # Ensure it's timezone-aware
        if utc_dt.tzinfo is None:
            utc_dt = utc_dt.replace(tzinfo=timezone.utc)
        # Convert to local timezone
        return utc_dt.astimezone(self.local_tz)
    
    def _get_local_now(self):
        """Get current time in local timezone"""
        return datetime.now(self.local_tz)
    
    def record_failed_attempt(self, email, ip_address, user_agent, reason, user_id=None):
        """Record a failed login attempt - WITH IMMEDIATE COMMIT"""
        import traceback
        
        try:
            # Create the attempt object
            attempt = FailedLoginAttempt(
                user_id=user_id,
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                reason=reason
            )
            
            # Add and commit immediately
            db.session.add(attempt)
            db.session.commit()
            
            # Log in local time for readability
            local_time = self._to_local_time(attempt.attempted_at)
            logger.warning(f"✅ Failed login attempt RECORDED for {email}: {reason} (ID: {attempt.attempt_id}) at {local_time.strftime('%Y-%m-%d %H:%M:%S %Z')}")
            
            # Check if this attempt triggers a lockout
            if user_id and self.is_account_locked(user_id=user_id):
                remaining = self.get_lockout_remaining_minutes(user_id=user_id)
                logger.warning(f"🔒 Account {email} is now locked for {remaining} minutes")
            
            return attempt
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ Error recording failed attempt for {email}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None
    
    def get_recent_failed_attempts(self, email=None, user_id=None, minutes=None, limit=None):
        """Get recent failed attempts for a user or email"""
        if minutes is None:
            minutes = self.lockout_minutes
            
        time_threshold = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        
        query = FailedLoginAttempt.query.filter(FailedLoginAttempt.attempted_at >= time_threshold)
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        elif email:
            query = query.filter_by(email=email)
        
        query = query.order_by(FailedLoginAttempt.attempted_at.desc())
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    def count_recent_failures(self, email=None, user_id=None, minutes=None):
        """Count recent failed attempts"""
        attempts = self.get_recent_failed_attempts(email=email, user_id=user_id, minutes=minutes)
        return len(attempts)
    
    def is_account_locked(self, email=None, user_id=None):
        """Check if an account should be locked due to too many failed attempts"""
        if not email and not user_id:
            return False
            
        recent_count = self.count_recent_failures(email=email, user_id=user_id)
        return recent_count >= self.max_attempts
    
    def get_lockout_remaining_minutes(self, email=None, user_id=None):
        """Get remaining lockout time in minutes"""
        if not self.is_account_locked(email=email, user_id=user_id):
            return 0
        
        recent_attempts = self.get_recent_failed_attempts(email=email, user_id=user_id)
        
        if not recent_attempts:
            return 0
        
        # The lockout will expire when the oldest attempt in the window is older than lockout_minutes
        oldest_attempt = recent_attempts[-1]  # Oldest is last in descending order
        oldest_attempt_time = self._ensure_timezone(oldest_attempt.attempted_at)
        now = datetime.now(timezone.utc)
        time_elapsed = (now - oldest_attempt_time).total_seconds() / 60
        remaining = max(0, self.lockout_minutes - time_elapsed)
        
        return round(remaining, 1)
    
    def clear_failed_attempts(self, user_id):
        """Clear failed attempts after successful login"""
        try:
            deleted = FailedLoginAttempt.query.filter_by(user_id=user_id).delete()
            db.session.commit()
            if deleted > 0:
                logger.info(f"✅ Cleared {deleted} failed attempts for user {user_id}")
            return deleted
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error clearing failed attempts: {e}")
            return 0
    
    def get_failed_attempts_summary(self, email=None, user_id=None, hours=24):
        """Get summary of failed attempts for monitoring"""
        time_threshold = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        query = FailedLoginAttempt.query.filter(FailedLoginAttempt.attempted_at >= time_threshold)
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        elif email:
            query = query.filter_by(email=email)
        
        attempts = query.all()
        
        # Group by reason
        reasons = {}
        for attempt in attempts:
            reasons[attempt.reason] = reasons.get(attempt.reason, 0) + 1
        
        # Group by IP
        ips = {}
        for attempt in attempts:
            ips[attempt.ip_address] = ips.get(attempt.ip_address, 0) + 1
        
        return {
            'total_attempts': len(attempts),
            'unique_ips': len(ips),
            'reasons': reasons,
            'ips': ips,
            'is_locked': self.is_account_locked(email=email, user_id=user_id) if (email or user_id) else False,
            'lockout_remaining': self.get_lockout_remaining_minutes(email=email, user_id=user_id) if (email or user_id) else 0
        }
    
    # ===== METHODS FOR ADMIN DASHBOARD =====
    
    def get_dashboard_summary(self):
        """Get summary statistics for admin dashboard"""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)
        
        # Count today's failed attempts
        today_count = FailedLoginAttempt.query.filter(
            FailedLoginAttempt.attempted_at >= today_start
        ).count()
        
        # Count this week's failed attempts
        week_count = FailedLoginAttempt.query.filter(
            FailedLoginAttempt.attempted_at >= week_ago
        ).count()
        
        # Get top failure reasons this week
        top_reasons = db.session.query(
            FailedLoginAttempt.reason,
            func.count(FailedLoginAttempt.reason).label('count')
        ).filter(
            FailedLoginAttempt.attempted_at >= week_ago
        ).group_by(
            FailedLoginAttempt.reason
        ).order_by(
            func.count().desc()
        ).limit(5).all()
        
        return {
            'today': today_count,
            'this_week': week_count,
            'top_reasons': [{'reason': r[0], 'count': r[1]} for r in top_reasons]
        }
    
    def get_failed_attempts_breakdown(self, days=7):
        """Get detailed breakdown of failed attempts with reasons (FIXED - uses UTC for filtering)"""
        # Get current time in UTC
        now_utc = datetime.now(timezone.utc)
        start_date_utc = now_utc - timedelta(days=days)
        
        # Get local time for logging only
        now_local = self._to_local_time(now_utc)
        
        logger.info("=" * 60)
        logger.info("🔍 FAILED ATTEMPTS BREAKDOWN")
        logger.info(f"   UTC Now: {now_utc.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"   Local Now: {now_local.strftime('%Y-%m-%d %H:%M:%S %Z')}")
        logger.info(f"   Days: {days}")
        logger.info(f"   Start Date UTC: {start_date_utc.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Get ALL failed attempts from database
        all_attempts = FailedLoginAttempt.query.order_by(
            FailedLoginAttempt.attempted_at.desc()
        ).all()
        
        logger.info(f"   Total attempts in DB: {len(all_attempts)}")
        
        # Filter attempts by UTC date range
        filtered_attempts = []
        for attempt in all_attempts:
            # Ensure attempt time is timezone-aware
            attempt_time = attempt.attempted_at
            if attempt_time.tzinfo is None:
                attempt_time = attempt_time.replace(tzinfo=timezone.utc)
            
            # Compare in UTC
            if attempt_time >= start_date_utc:
                filtered_attempts.append(attempt)
                logger.debug(f"   Including: {attempt.email} - {attempt.reason} at {attempt_time.strftime('%Y-%m-%d %H:%M:%S')} UTC")
            else:
                logger.debug(f"   Excluding: {attempt.email} - {attempt.reason} at {attempt_time.strftime('%Y-%m-%d %H:%M:%S')} UTC (before {start_date_utc.strftime('%Y-%m-%d %H:%M:%S')})")
        
        logger.info(f"   Filtered attempts in last {days} days (UTC): {len(filtered_attempts)}")
        
        # Group by reason with attempt details
        reasons = {}
        for attempt in filtered_attempts:
            reason = attempt.reason
            if reason not in reasons:
                reasons[reason] = {
                    'count': 0,
                    'attempts': [],
                    'description': self._get_reason_description(reason)
                }
            reasons[reason]['count'] += 1
            
            # Store attempt with UTC time (frontend will convert)
            reasons[reason]['attempts'].append({
                'attempt_id': attempt.attempt_id,
                'email': attempt.email,
                'user_id': attempt.user_id,
                'ip_address': attempt.ip_address,
                'user_agent': attempt.user_agent[:150] if attempt.user_agent else None,
                'attempted_at': attempt.attempted_at.isoformat() if attempt.attempted_at else None
            })
        
        # Calculate daily breakdown using UTC dates
        daily_breakdown = {}
        current = start_date_utc
        while current <= now_utc:
            date_str = current.strftime('%Y-%m-%d')
            daily_breakdown[date_str] = 0
            current += timedelta(days=1)
        
        for attempt in filtered_attempts:
            attempt_time = attempt.attempted_at
            if attempt_time.tzinfo is None:
                attempt_time = attempt_time.replace(tzinfo=timezone.utc)
            date_str = attempt_time.strftime('%Y-%m-%d')
            if date_str in daily_breakdown:
                daily_breakdown[date_str] += 1
        
        logger.info(f"📊 Daily breakdown (UTC dates): {daily_breakdown}")
        
        # Get recent attempts (last 50) - keep in UTC, frontend will convert
        recent_attempts = []
        for attempt in filtered_attempts[:50]:
            recent_attempts.append({
                'attempt_id': attempt.attempt_id,
                'email': attempt.email,
                'user_id': attempt.user_id,
                'reason': attempt.reason,
                'reason_description': self._get_reason_description(attempt.reason),
                'ip_address': attempt.ip_address,
                'user_agent': attempt.user_agent[:150] if attempt.user_agent else None,
                'attempted_at': attempt.attempted_at.isoformat() if attempt.attempted_at else None
            })
        
        logger.info(f"📊 Total filtered: {len(filtered_attempts)}")
        logger.info("=" * 60)
        
        return {
            'total': len(filtered_attempts),
            'reasons': reasons,
            'daily_breakdown': daily_breakdown,
            'recent_attempts': recent_attempts,
            'date_range': {
                'start': start_date_utc.isoformat(),
                'end': now_utc.isoformat(),
                'days': days
            }
        }
    
    def _get_reason_description(self, reason):
        """Get human-readable description for failure reasons"""
        descriptions = {
            # Authentication failures
            'invalid_password': 'Wrong password entered',
            'user_not_found': 'Email address not found in system',
            'account_locked': 'Account is temporarily locked',
            'account_inactive': 'Account is deactivated',
            'too_many_attempts': 'Rate limit exceeded - too many attempts',
            
            # OTP failures
            'otp_invalid': 'Invalid or expired OTP code entered',
            'otp_expired': 'OTP code has expired (5 minute window)',
            
            # Face verification failures
            'face_verification_failed': 'Face verification failed - does not match registered face',
            'face_not_registered': 'No face registered for this user',
            'face_quality_failed': 'Face image quality too low (blurry, dark, or poor lighting)',
            'face_detection_failed': 'No face detected in the image',
            'multiple_faces_detected': 'Multiple faces detected - please provide single face',
            'face_too_small': 'Face is too small in the image - please move closer',
            'face_at_angle': 'Face is at an extreme angle - please look directly at camera',
            'image_too_dark': 'Image is too dark - please ensure good lighting',
            'image_too_bright': 'Image is too bright - please adjust lighting',
            'low_contrast': 'Low image contrast - ensure good lighting conditions',
            'face_verification_error': 'Face verification error occurred',
            
            # Session/token failures
            'session_expired': 'Session has expired - please login again',
            'token_invalid': 'Invalid authentication token',
            'token_expired': 'Authentication token has expired',
            
            # Device/network failures
            'device_not_trusted': 'Device not trusted - requires verification',
            'suspicious_ip': 'Suspicious IP address detected',
            'location_mismatch': 'Login from unusual location',
            'vpn_proxy_detected': 'VPN or proxy detected',
            
            # Test failures
            'test_failure': 'Test failure (for testing purposes)',
        }
        
        # If reason not found in descriptions, format it nicely
        if reason not in descriptions:
            formatted = reason.replace('_', ' ').replace('-', ' ').title()
            return formatted
        
        return descriptions.get(reason, reason.replace('_', ' ').title())
    
    def get_failed_attempts_by_ip(self, ip_address, hours=24):
        """Get all failed attempts from a specific IP address"""
        time_threshold = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        attempts = FailedLoginAttempt.query.filter(
            and_(
                FailedLoginAttempt.ip_address == ip_address,
                FailedLoginAttempt.attempted_at >= time_threshold
            )
        ).order_by(FailedLoginAttempt.attempted_at.desc()).all()
        
        return {
            'ip_address': ip_address,
            'total_attempts': len(attempts),
            'unique_emails': len(set(a.email for a in attempts)),
            'attempts': [
                {
                    'email': a.email,
                    'reason': a.reason,
                    'reason_description': self._get_reason_description(a.reason),
                    'attempted_at': a.attempted_at.isoformat() if a.attempted_at else None
                }
                for a in attempts
            ]
        }
    
    def get_failed_attempts_by_email(self, email, hours=168):
        """Get all failed attempts for a specific email"""
        time_threshold = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        attempts = FailedLoginAttempt.query.filter(
            and_(
                FailedLoginAttempt.email == email,
                FailedLoginAttempt.attempted_at >= time_threshold
            )
        ).order_by(FailedLoginAttempt.attempted_at.desc()).all()
        
        # Group by reason
        reasons = {}
        for attempt in attempts:
            reasons[attempt.reason] = reasons.get(attempt.reason, 0) + 1
        
        # Group by IP
        ips = {}
        for attempt in attempts:
            ips[attempt.ip_address] = ips.get(attempt.ip_address, 0) + 1
        
        # Calculate lockout status
        is_locked = self.is_account_locked(email=email)
        lockout_remaining = self.get_lockout_remaining_minutes(email=email) if is_locked else 0
        
        return {
            'email': email,
            'total_attempts': len(attempts),
            'unique_ips': len(ips),
            'reasons': reasons,
            'reasons_with_descriptions': {
                r: {
                    'count': c,
                    'description': self._get_reason_description(r)
                }
                for r, c in reasons.items()
            },
            'ips': ips,
            'is_locked': is_locked,
            'lockout_remaining_minutes': lockout_remaining,
            'attempts': [
                {
                    'attempt_id': a.attempt_id,
                    'ip_address': a.ip_address,
                    'reason': a.reason,
                    'reason_description': self._get_reason_description(a.reason),
                    'user_agent': a.user_agent[:100] if a.user_agent else None,
                    'attempted_at': a.attempted_at.isoformat() if a.attempted_at else None
                }
                for a in attempts
            ]
        }
    
    def get_failure_rate_analytics(self, days=30):
        """Get failure rate analytics over time"""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)
        
        # Get daily counts for failed attempts
        daily_results = db.session.query(
            func.date(FailedLoginAttempt.attempted_at).label('date'),
            func.count(FailedLoginAttempt.attempt_id).label('count'),
            FailedLoginAttempt.reason
        ).filter(
            FailedLoginAttempt.attempted_at >= start_date
        ).group_by(
            func.date(FailedLoginAttempt.attempted_at),
            FailedLoginAttempt.reason
        ).order_by('date').all()
        
        # Get daily counts for successful logins (from LoginSession)
        from models.login_session import LoginSession
        success_results = db.session.query(
            func.date(LoginSession.created_at).label('date'),
            func.count(LoginSession.session_id).label('count')
        ).filter(
            LoginSession.created_at >= start_date
        ).group_by(
            func.date(LoginSession.created_at)
        ).all()
        
        # Organize data by date
        daily_data = {}
        current = start_date
        while current <= now:
            date_str = current.strftime('%Y-%m-%d')
            daily_data[date_str] = {
                'total': 0,
                'by_reason': {},
                'successful_logins': 0,
                'failure_rate': 0
            }
            current += timedelta(days=1)
        
        # Fill failed attempts
        for result in daily_results:
            date_str = result.date.strftime('%Y-%m-%d')
            if date_str in daily_data:
                daily_data[date_str]['total'] += result.count
                daily_data[date_str]['by_reason'][result.reason] = result.count
        
        # Fill successful logins
        for result in success_results:
            date_str = result.date.strftime('%Y-%m-%d')
            if date_str in daily_data:
                daily_data[date_str]['successful_logins'] = result.count
                total_attempts = daily_data[date_str]['total'] + result.count
                if total_attempts > 0:
                    daily_data[date_str]['failure_rate'] = round(
                        (daily_data[date_str]['total'] / total_attempts) * 100, 2
                    )
        
        # Calculate trends
        recent_days = list(daily_data.keys())[-7:] if len(daily_data) >= 7 else list(daily_data.keys())
        previous_days = list(daily_data.keys())[-14:-7] if len(daily_data) >= 14 else []
        
        recent_total = sum(daily_data[d]['total'] for d in recent_days)
        previous_total = sum(daily_data[d]['total'] for d in previous_days) if previous_days else 0
        
        trend = 'up' if recent_total > previous_total else 'down' if recent_total < previous_total else 'stable'
        trend_percentage = round(abs(recent_total - previous_total) / max(previous_total, 1) * 100, 1) if previous_total > 0 else 0
        
        # Get most common failure reasons overall
        all_reasons = db.session.query(
            FailedLoginAttempt.reason,
            func.count(FailedLoginAttempt.reason).label('count')
        ).filter(
            FailedLoginAttempt.attempted_at >= start_date
        ).group_by(
            FailedLoginAttempt.reason
        ).order_by(
            func.count().desc()
        ).all()
        
        total_failures = sum(d['total'] for d in daily_data.values())
        total_successful = sum(d['successful_logins'] for d in daily_data.values())
        
        return {
            'daily_data': daily_data,
            'trend': trend,
            'trend_percentage': trend_percentage,
            'recent_7day_total': recent_total,
            'previous_7day_total': previous_total,
            'total_failures': total_failures,
            'total_successful_logins': total_successful,
            'overall_failure_rate': round(
                (total_failures / max(total_failures + total_successful, 1)) * 100, 2
            ),
            'top_failure_reasons': [
                {'reason': r[0], 'count': r[1], 'description': self._get_reason_description(r[0])}
                for r in all_reasons[:10]
            ],
            'date_range': {
                'start': start_date.isoformat(),
                'end': now.isoformat(),
                'days': days
            }
        }