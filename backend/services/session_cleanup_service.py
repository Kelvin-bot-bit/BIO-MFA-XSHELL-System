# ./backend/services/session_cleanup_service.py
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from models import db
from models.login_session import LoginSession

logger = logging.getLogger(__name__)

class SessionCleanupService:
    """Service for automatic session cleanup and management"""
    
    def __init__(self, app=None):
        self.app = app
        # Configuration - can be moved to config.py
        self.inactive_timeout_minutes = 60  # 1 hour inactivity
        self.session_max_lifetime_days = 30  # 30 days max
        self.cleanup_interval_minutes = 15  # Run cleanup every 15 minutes
    
    def _ensure_timezone_aware(self, dt):
        """Ensure datetime is timezone-aware"""
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    
    def cleanup_expired_sessions(self):
        """Clean up all expired sessions"""
        try:
            now = datetime.now(timezone.utc)
            
            # Find expired sessions - use raw SQL comparison to avoid timezone issues
            # or convert in Python after fetching
            expired_sessions = LoginSession.query.filter(
                LoginSession.logged_out_at.is_(None)
            ).all()
            
            # Filter in Python to handle timezone conversion
            expired = []
            for session in expired_sessions:
                expires_at = self._ensure_timezone_aware(session.expires_at)
                if expires_at and expires_at <= now:
                    expired.append(session)
            
            expired_count = len(expired)
            
            # Mark them as logged out
            for session in expired:
                session.logged_out_at = now
                session.session_status = 'expired'
                logger.info(f"🕐 Auto-expired session {session.session_id} for user {session.user_id}")
            
            db.session.commit()
            
            if expired_count > 0:
                logger.info(f"✅ Auto-cleaned {expired_count} expired sessions")
            
            return expired_count
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error cleaning expired sessions: {e}")
            return 0
    
    def cleanup_inactive_sessions(self):
        """Clean up sessions that have been inactive for too long"""
        try:
            now = datetime.now(timezone.utc)
            inactive_threshold = now - timedelta(minutes=self.inactive_timeout_minutes)
            
            # Find inactive sessions
            inactive_sessions = LoginSession.query.filter(
                LoginSession.logged_out_at.is_(None)
            ).all()
            
            # Filter in Python to handle timezone conversion
            inactive = []
            for session in inactive_sessions:
                last_activity = self._ensure_timezone_aware(session.last_activity)
                expires_at = self._ensure_timezone_aware(session.expires_at)
                
                if (last_activity and last_activity <= inactive_threshold and 
                    expires_at and expires_at > now and
                    session.face_verified):
                    inactive.append(session)
            
            inactive_count = len(inactive)
            
            # Mark them as logged out
            for session in inactive:
                session.logged_out_at = now
                session.session_status = 'inactive'
                logger.info(f"💤 Auto-terminated inactive session {session.session_id} for user {session.user_id} "
                           f"(inactive for {session.get_inactivity_minutes()} minutes)")
            
            db.session.commit()
            
            if inactive_count > 0:
                logger.info(f"✅ Auto-cleaned {inactive_count} inactive sessions")
            
            return inactive_count
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error cleaning inactive sessions: {e}")
            return 0
    
    def cleanup_old_sessions(self):
        """Clean up sessions older than max lifetime"""
        try:
            now = datetime.now(timezone.utc)
            old_threshold = now - timedelta(days=self.session_max_lifetime_days)
            
            # Find sessions older than max lifetime
            old_sessions = LoginSession.query.filter(
                LoginSession.logged_out_at.is_(None)
            ).all()
            
            # Filter in Python
            old = []
            for session in old_sessions:
                created_at = self._ensure_timezone_aware(session.created_at)
                if created_at and created_at <= old_threshold:
                    old.append(session)
            
            old_count = len(old)
            
            # Mark them as logged out
            for session in old:
                session.logged_out_at = now
                session.session_status = 'expired'
                logger.info(f"📅 Auto-terminated old session {session.session_id} for user {session.user_id} "
                           f"(age: {session.get_session_age_minutes()} minutes)")
            
            db.session.commit()
            
            if old_count > 0:
                logger.info(f"✅ Auto-cleaned {old_count} old sessions")
            
            return old_count
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error cleaning old sessions: {e}")
            return 0
    
    def run_full_cleanup(self):
        """Run all cleanup operations"""
        logger.info("🧹 Starting session cleanup...")
        
        expired = self.cleanup_expired_sessions()
        inactive = self.cleanup_inactive_sessions()
        old = self.cleanup_old_sessions()
        
        total = expired + inactive + old
        
        if total > 0:
            logger.info(f"🧹 Session cleanup completed: {total} sessions cleaned "
                       f"(expired: {expired}, inactive: {inactive}, old: {old})")
        
        return {
            'expired': expired,
            'inactive': inactive,
            'old': old,
            'total': total
        }
    
    def get_user_active_sessions(self, user_id):
        """Get count of active sessions for a user"""
        now = datetime.now(timezone.utc)
        
        active_sessions = LoginSession.query.filter(
            LoginSession.user_id == user_id,
            LoginSession.logged_out_at.is_(None),
            LoginSession.face_verified == True  # Only fully verified sessions
        ).all()
        
        # Filter in Python for timezone comparison
        count = 0
        for session in active_sessions:
            expires_at = self._ensure_timezone_aware(session.expires_at)
            if expires_at and expires_at > now:
                count += 1
        
        return count
    
    def enforce_max_sessions_per_user(self, user_id, max_sessions=5):
        """Enforce maximum number of active sessions per user"""
        try:
            now = datetime.now(timezone.utc)
            
            # Get all active sessions for this user
            all_sessions = LoginSession.query.filter(
                LoginSession.user_id == user_id,
                LoginSession.logged_out_at.is_(None),
                LoginSession.face_verified == True
            ).order_by(LoginSession.last_activity.desc()).all()
            
            # Filter to only non-expired sessions
            active_sessions = []
            for session in all_sessions:
                expires_at = self._ensure_timezone_aware(session.expires_at)
                if expires_at and expires_at > now:
                    active_sessions.append(session)
            
            if len(active_sessions) > max_sessions:
                # Revoke the oldest sessions (keeping the most recent max_sessions)
                sessions_to_revoke = active_sessions[max_sessions:]
                revoke_count = len(sessions_to_revoke)
                
                for session in sessions_to_revoke:
                    session.logged_out_at = now
                    session.session_status = 'terminated'
                    logger.info(f"🔄 Auto-revoked session {session.session_id} for user {user_id} "
                               f"(max sessions limit: {max_sessions})")
                
                db.session.commit()
                return revoke_count
            
            return 0
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error enforcing max sessions: {e}")
            return 0
    
    def get_session_stats(self):
        """Get overall session statistics"""
        try:
            now = datetime.now(timezone.utc)
            
            all_sessions = LoginSession.query.all()
            
            total = len(all_sessions)
            active = 0
            expired = 0
            terminated = 0
            inactive = 0
            
            for session in all_sessions:
                expires_at = self._ensure_timezone_aware(session.expires_at)
                last_activity = self._ensure_timezone_aware(session.last_activity)
                
                if session.logged_out_at:
                    if session.session_status == 'expired':
                        expired += 1
                    else:
                        terminated += 1
                elif expires_at and expires_at <= now:
                    expired += 1
                elif last_activity and (now - last_activity).total_seconds() / 60 > self.inactive_timeout_minutes:
                    inactive += 1
                elif session.face_verified:
                    active += 1
                else:
                    # Incomplete MFA sessions
                    pass
            
            return {
                'total_sessions': total,
                'active_sessions': active,
                'expired_sessions': expired,
                'terminated_sessions': terminated,
                'inactive_sessions': inactive,
                'timestamp': now.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting session stats: {e}")
            return {
                'total_sessions': 0,
                'active_sessions': 0,
                'expired_sessions': 0,
                'terminated_sessions': 0,
                'inactive_sessions': 0,
                'error': str(e)
            }