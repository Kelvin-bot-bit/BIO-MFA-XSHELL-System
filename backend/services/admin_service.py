# ./backend/services/admin_service.py
import logging
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, and_, extract
from models import db
from models.user import User
from models.login_session import LoginSession
from models.failed_login_attempts import FailedLoginAttempt
from models.risk_assessment import RiskAssessment
from models.facial_data import FacialData

logger = logging.getLogger(__name__)

class AdminService:
    """Service for admin dashboard analytics"""
    
    def get_system_overview(self):
        """Get system overview statistics with timezone-aware datetime"""
        now = datetime.now(timezone.utc)
        today_start = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        return {
            'total_users': User.query.count(),
            'active_users_today': LoginSession.query.filter(
                LoginSession.last_activity >= today_start
            ).distinct(LoginSession.user_id).count(),
            'active_users_week': LoginSession.query.filter(
                LoginSession.last_activity >= week_ago
            ).distinct(LoginSession.user_id).count(),
            'active_users_month': LoginSession.query.filter(
                LoginSession.last_activity >= month_ago
            ).distinct(LoginSession.user_id).count(),
            'total_sessions': LoginSession.query.count(),
            'active_sessions': LoginSession.query.filter(
                LoginSession.logged_out_at.is_(None),
                LoginSession.expires_at > now
            ).count(),
            'failed_attempts_today': FailedLoginAttempt.query.filter(
                FailedLoginAttempt.attempted_at >= today_start
            ).count(),
            'failed_attempts_week': FailedLoginAttempt.query.filter(
                FailedLoginAttempt.attempted_at >= week_ago
            ).count(),
            'users_with_face': FacialData.query.distinct(FacialData.user_id).count(),
            'mfa_completion_rate': self._get_mfa_completion_rate(),
            'risk_distribution': self._get_risk_distribution()
        }
    
    def _get_mfa_completion_rate(self):
        """Calculate MFA completion rate"""
        total_sessions = LoginSession.query.count()
        if total_sessions == 0:
            return 0
        
        completed_mfa = LoginSession.query.filter(
            LoginSession.face_verified == True,
            LoginSession.otp_verified == True
        ).count()
        
        return round((completed_mfa / total_sessions) * 100, 2)
    
    def _get_risk_distribution(self):
        """Get distribution of risk levels"""
        risk_counts = db.session.query(
            RiskAssessment.risk_level,
            func.count(RiskAssessment.risk_level)
        ).group_by(RiskAssessment.risk_level).all()
        
        return {level: count for level, count in risk_counts}
    
    def get_user_growth_chart(self, days=30):
        """Get user growth data for charts"""
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        # Group by date
        results = db.session.query(
            func.date(User.created_at).label('date'),
            func.count(User.user_id).label('count')
        ).filter(
            User.created_at >= start_date
        ).group_by(
            func.date(User.created_at)
        ).order_by('date').all()
        
        # Fill in missing dates
        date_counts = {str(result.date): result.count for result in results}
        
        dates = []
        counts = []
        current = start_date
        
        while current <= end_date:
            date_str = current.strftime('%Y-%m-%d')
            dates.append(date_str)
            counts.append(date_counts.get(date_str, 0))
            current += timedelta(days=1)
        
        return {
            'labels': dates,
            'datasets': [{
                'label': 'New Users',
                'data': counts,
                'backgroundColor': 'rgba(54, 162, 235, 0.5)',
                'borderColor': 'rgb(54, 162, 235)'
            }]
        }
    
    def get_login_activity_chart(self, days=7):
        """Get login activity data for charts"""
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        # Successful logins by day
        successful = db.session.query(
            func.date(LoginSession.created_at).label('date'),
            func.count(LoginSession.session_id).label('count')
        ).filter(
            LoginSession.created_at >= start_date
        ).group_by(
            func.date(LoginSession.created_at)
        ).all()
        
        # Failed attempts by day
        failed = db.session.query(
            func.date(FailedLoginAttempt.attempted_at).label('date'),
            func.count(FailedLoginAttempt.attempt_id).label('count')
        ).filter(
            FailedLoginAttempt.attempted_at >= start_date
        ).group_by(
            func.date(FailedLoginAttempt.attempted_at)
        ).all()
        
        success_dict = {str(s.date): s.count for s in successful}
        failed_dict = {str(f.date): f.count for f in failed}
        
        dates = []
        success_data = []
        failed_data = []
        current = start_date
        
        while current <= end_date:
            date_str = current.strftime('%Y-%m-%d')
            dates.append(date_str)
            success_data.append(success_dict.get(date_str, 0))
            failed_data.append(failed_dict.get(date_str, 0))
            current += timedelta(days=1)
        
        return {
            'labels': dates,
            'datasets': [
                {
                    'label': 'Successful Logins',
                    'data': success_data,
                    'backgroundColor': 'rgba(75, 192, 192, 0.5)',
                    'borderColor': 'rgb(75, 192, 192)'
                },
                {
                    'label': 'Failed Attempts',
                    'data': failed_data,
                    'backgroundColor': 'rgba(255, 99, 132, 0.5)',
                    'borderColor': 'rgb(255, 99, 132)'
                }
            ]
        }
    
    def get_device_distribution(self):
        """Get device type distribution"""
        results = db.session.query(
            LoginSession.device_type,
            func.count(LoginSession.session_id).label('count')
        ).group_by(LoginSession.device_type).all()
        
        total = sum(r[1] for r in results) or 1  # Avoid division by zero
        
        return {
            'labels': [r[0] or 'Unknown' for r in results],
            'datasets': [{
                'data': [round((r[1] / total) * 100, 1) for r in results],
                'backgroundColor': [
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)'
                ]
            }]
        }
    
    def get_browser_distribution(self):
        """Get browser distribution"""
        results = db.session.query(
            LoginSession.browser,
            func.count(LoginSession.session_id).label('count')
        ).filter(
            LoginSession.browser.isnot(None)
        ).group_by(LoginSession.browser).order_by(func.count().desc()).limit(5).all()
        
        total = sum(r[1] for r in results) or 1
        
        return {
            'labels': [r[0] for r in results],
            'datasets': [{
                'data': [round((r[1] / total) * 100, 1) for r in results],
                'backgroundColor': [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)'
                ]
            }]
        }
    
    # ===== IMPROVED: Geographic distribution with city + country =====
    def get_geographic_distribution(self):
        """Get login locations distribution with city and country"""
        try:
            # Query to get country and city counts
            results = db.session.query(
                func.json_extract(LoginSession.location, '$.country').label('country'),
                func.json_extract(LoginSession.location, '$.city').label('city'),
                func.count(LoginSession.session_id).label('count')
            ).filter(
                LoginSession.location.isnot(None)
            ).group_by('country', 'city').order_by(func.count().desc()).limit(15).all()
            
            total = sum(r[2] for r in results) or 1
            
            # Format locations as "City, Country" or just "Country" if city missing
            labels = []
            data = []
            raw_data = []
            
            for country, city, count in results:
                # Skip completely unknown locations
                if (not country or country == 'Unknown' or country == 'Local') and \
                   (not city or city == 'Unknown' or city == 'Local'):
                    continue
                
                # Create formatted location string
                if city and city != 'Unknown' and city != 'Local':
                    location_label = f"{city}, {country}"
                elif country and country != 'Unknown' and country != 'Local':
                    location_label = country
                else:
                    continue  # Skip this entry
                
                percentage = round((count / total) * 100, 1)
                
                labels.append(location_label)
                data.append(percentage)
                raw_data.append({
                    'location': location_label,
                    'count': count,
                    'percentage': percentage
                })
            
            # If no results, provide empty data with helpful message
            if not labels:
                logger.info("No location data found in database")
                return {
                    'labels': ['No location data'],
                    'datasets': [{
                        'data': [100],
                        'backgroundColor': 'rgba(156, 163, 175, 0.5)'
                    }],
                    'raw_data': [],
                    'total_locations': 0,
                    'message': 'No location data available. Users need to log in to generate location data.'
                }
            
            # Limit to top 10 for display
            if len(labels) > 10:
                labels = labels[:10]
                data = data[:10]
                raw_data = raw_data[:10]
            
            logger.info(f"📍 Geographic distribution: {len(labels)} locations found")
            
            return {
                'labels': labels,
                'datasets': [{
                    'data': data,
                    'backgroundColor': 'rgba(54, 162, 235, 0.7)'
                }],
                'raw_data': raw_data,
                'total_locations': len(raw_data),
                'total_sessions': total
            }
            
        except Exception as e:
            logger.error(f"Error in geographic distribution: {str(e)}")
            logger.exception("Detailed traceback:")
            return {
                'labels': ['Error loading data'],
                'datasets': [{
                    'data': [100],
                    'backgroundColor': 'rgba(255, 99, 132, 0.5)'
                }],
                'raw_data': [],
                'total_locations': 0,
                'error': str(e)
            }
    
    # ===== NEW: Get detailed location statistics =====
    def get_location_details(self):
        """Get detailed location statistics for analytics"""
        try:
            # Query to get detailed location info
            results = db.session.query(
                func.json_extract(LoginSession.location, '$.country').label('country'),
                func.json_extract(LoginSession.location, '$.city').label('city'),
                func.json_extract(LoginSession.location, '$.region').label('region'),
                func.json_extract(LoginSession.location, '$.isp').label('isp'),
                func.count(LoginSession.session_id).label('count')
            ).filter(
                LoginSession.location.isnot(None)
            ).group_by('country', 'city', 'region', 'isp').order_by(func.count().desc()).limit(50).all()
            
            locations = []
            total = 0
            
            for country, city, region, isp, count in results:
                if country and country != 'Unknown' and country != 'Local':
                    total += count
                    locations.append({
                        'country': country,
                        'city': city if city and city != 'Unknown' and city != 'Local' else None,
                        'region': region if region and region != 'Unknown' else None,
                        'isp': isp if isp and isp != 'Unknown' else None,
                        'count': count,
                        'location_string': self._format_location_string(country, city, region)
                    })
            
            # Calculate percentages
            for loc in locations:
                loc['percentage'] = round((loc['count'] / total) * 100, 2) if total > 0 else 0
            
            return {
                'locations': locations,
                'total_locations': len(locations),
                'total_sessions': total
            }
            
        except Exception as e:
            logger.error(f"Error getting location details: {str(e)}")
            return {
                'locations': [],
                'total_locations': 0,
                'total_sessions': 0,
                'error': str(e)
            }
    
    # ===== NEW: Helper to format location string =====
    def _format_location_string(self, country, city=None, region=None):
        """Format location components into a readable string"""
        parts = []
        
        if city and city != 'Unknown' and city != 'Local':
            parts.append(city)
        
        if region and region != 'Unknown' and region != 'Local' and region != city:
            parts.append(region)
        
        if country and country != 'Unknown' and country != 'Local':
            parts.append(country)
        
        if parts:
            return ', '.join(parts)
        
        return 'Unknown Location'
    
    # ===== NEW: Get location map data =====
    def get_location_map_data(self):
        """Get location data formatted for map visualization"""
        try:
            results = db.session.query(
                func.json_extract(LoginSession.location, '$.country').label('country'),
                func.json_extract(LoginSession.location, '$.country_code').label('country_code'),
                func.json_extract(LoginSession.location, '$.city').label('city'),
                func.json_extract(LoginSession.location, '$.latitude').label('latitude'),
                func.json_extract(LoginSession.location, '$.longitude').label('longitude'),
                func.count(LoginSession.session_id).label('count')
            ).filter(
                LoginSession.location.isnot(None),
                func.json_extract(LoginSession.location, '$.latitude').isnot(None),
                func.json_extract(LoginSession.location, '$.longitude').isnot(None)
            ).group_by('country', 'country_code', 'city', 'latitude', 'longitude').order_by(func.count().desc()).limit(100).all()
            
            map_data = []
            
            for country, country_code, city, lat, lng, count in results:
                if lat and lng and lat != 0 and lng != 0:
                    map_data.append({
                        'country': country,
                        'country_code': country_code,
                        'city': city if city and city != 'Unknown' else None,
                        'latitude': float(lat),
                        'longitude': float(lng),
                        'count': count,
                        'location': self._format_location_string(country, city)
                    })
            
            return {
                'map_data': map_data,
                'total_points': len(map_data)
            }
            
        except Exception as e:
            logger.error(f"Error getting map data: {str(e)}")
            return {
                'map_data': [],
                'total_points': 0,
                'error': str(e)
            }
    
    def get_hourly_activity(self, days=7):
        """Get activity by hour of day - FIXED with better debugging"""
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        logger.info("=" * 50)
        logger.info("HOURLY ACTIVITY DEBUG")
        logger.info(f"Date range: {start_date} to {end_date}")
        
        try:
            # First, let's check if there are ANY login sessions at all
            total_sessions = LoginSession.query.count()
            logger.info(f"Total login sessions in database: {total_sessions}")
            
            if total_sessions == 0:
                logger.warning("No login sessions found in database!")
                # Return zeros but don't add sample data
                return {
                    'labels': [f'{h:02d}:00' for h in range(24)],
                    'datasets': [{
                        'label': 'Logins',
                        'data': [0] * 24,
                        'backgroundColor': 'rgba(153, 102, 255, 0.5)',
                        'borderColor': 'rgb(153, 102, 255)'
                    }]
                }
            
            # Check sessions in the date range
            sessions_in_range = LoginSession.query.filter(
                LoginSession.created_at >= start_date
            ).count()
            logger.info(f"Sessions in date range: {sessions_in_range}")
            
            if sessions_in_range == 0:
                logger.warning("No sessions in the selected date range!")
                # Show some recent sessions for debugging
                recent = LoginSession.query.order_by(
                    LoginSession.created_at.desc()
                ).limit(5).all()
                for s in recent:
                    logger.info(f"Recent session: {s.session_id} at {s.created_at}")
            
            # Now get hourly breakdown
            # Using EXTRACT(HOUR FROM created_at) which should work with MySQL
            results = db.session.query(
                func.extract('hour', LoginSession.created_at).label('hour'),
                func.count(LoginSession.session_id).label('count')
            ).filter(
                LoginSession.created_at >= start_date
            ).group_by(
                func.extract('hour', LoginSession.created_at)
            ).order_by('hour').all()
            
            logger.info(f"Hourly query returned {len(results)} results")
            
            # Initialize all hours with 0
            hour_counts = [0] * 24
            
            # Fill in the actual counts
            for row in results:
                hour = int(row[0])  # Extract hour
                count = row[1]       # Get count
                if 0 <= hour <= 23:
                    hour_counts[hour] = count
                    logger.info(f"Hour {hour:02d}:00 has {count} logins")
            
            # Log total logins in range
            total_logins = sum(hour_counts)
            logger.info(f"Total logins in range: {total_logins}")
            
            return {
                'labels': [f'{h:02d}:00' for h in range(24)],
                'datasets': [{
                    'label': 'Logins',
                    'data': hour_counts,
                    'backgroundColor': 'rgba(153, 102, 255, 0.5)',
                    'borderColor': 'rgb(153, 102, 255)',
                    'borderWidth': 2
                }]
            }
            
        except Exception as e:
            logger.error(f"Error in get_hourly_activity: {str(e)}")
            logger.exception("Full traceback:")
            
            # Return empty data structure on error
            return {
                'labels': [f'{h:02d}:00' for h in range(24)],
                'datasets': [{
                    'label': 'Logins',
                    'data': [0] * 24,
                    'backgroundColor': 'rgba(153, 102, 255, 0.5)',
                    'borderColor': 'rgb(153, 102, 255)'
                }]
            }
    
    def get_recent_activities(self, limit=50):
        """Get recent activities across the system with proper timezone handling"""
        activities = []
        
        # Helper function to format datetime with timezone
        def format_datetime(dt):
            if dt:
                if dt.tzinfo is None:
                    # If naive datetime, assume UTC
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.isoformat()
            return None
        
        # Helper function to extract location string
        def extract_location(location_data):
            if not location_data:
                return 'Unknown'
            
            try:
                if isinstance(location_data, dict):
                    city = location_data.get('city', '')
                    country = location_data.get('country', '')
                    
                    if city and city != 'Unknown' and city != 'Local':
                        if country and country != 'Unknown' and country != 'Local':
                            return f"{city}, {country}"
                        return city
                    elif country and country != 'Unknown' and country != 'Local':
                        return country
                elif isinstance(location_data, str):
                    try:
                        loc_dict = json.loads(location_data)
                        city = loc_dict.get('city', '')
                        country = loc_dict.get('country', '')
                        
                        if city and city != 'Unknown' and city != 'Local':
                            if country and country != 'Unknown' and country != 'Local':
                                return f"{city}, {country}"
                            return city
                        elif country and country != 'Unknown' and country != 'Local':
                            return country
                    except:
                        pass
            except Exception as e:
                logger.debug(f"Error extracting location: {e}")
            
            return 'Unknown'
        
        # Recent logins - eager load user to avoid N+1 queries
        logins = LoginSession.query.options(
            db.joinedload(LoginSession.user)
        ).order_by(
            LoginSession.created_at.desc()
        ).limit(limit).all()
        
        for login in logins:
            # Get user email safely
            user_email = login.user.email if login.user else 'Unknown'
            
            # Get location safely with better formatting
            location = extract_location(login.location)
            
            # Get device info
            device_info = login.device_info or 'Unknown device'
            
            activities.append({
                'id': login.session_id,
                'type': 'login',
                'user_id': login.user_id,
                'email': user_email,
                'details': f"Logged in from {device_info}",
                'location': location,
                'ip': login.ip_address or 'Unknown',
                'timestamp': format_datetime(login.created_at)
            })
        
        # Recent failed attempts
        failures = FailedLoginAttempt.query.order_by(
            FailedLoginAttempt.attempted_at.desc()
        ).limit(limit).all()
        
        for fail in failures:
            activities.append({
                'id': fail.attempt_id,
                'type': 'failed_login',
                'user_id': fail.user_id,
                'email': fail.email or 'Unknown',
                'details': f"Failed login: {fail.reason}",
                'location': 'Unknown',
                'ip': fail.ip_address or 'Unknown',
                'timestamp': format_datetime(fail.attempted_at)
            })
        
        # Sort by timestamp (most recent first) and return
        activities.sort(key=lambda x: x['timestamp'] or '', reverse=True)
        return activities[:limit]
    
    def get_user_details(self, user_id):
        """Get detailed information about a specific user"""
        user = User.query.get(user_id)
        if not user:
            return None
        
        sessions = LoginSession.query.filter_by(user_id=user_id).order_by(
            LoginSession.created_at.desc()
        ).all()
        
        failed = FailedLoginAttempt.query.filter_by(user_id=user_id).order_by(
            FailedLoginAttempt.attempted_at.desc()
        ).all()
        
        risks = RiskAssessment.query.filter_by(user_id=user_id).order_by(
            RiskAssessment.created_at.desc()
        ).limit(10).all()
        
        # Helper function to format datetime
        def format_dt(dt):
            if dt:
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.isoformat()
            return None
        
        # Helper function to format location
        def format_location(location_data):
            if not location_data:
                return 'Unknown'
            
            if isinstance(location_data, dict):
                city = location_data.get('city', '')
                country = location_data.get('country', '')
                
                if city and city != 'Unknown' and city != 'Local':
                    if country and country != 'Unknown' and country != 'Local':
                        return f"{city}, {country}"
                    return city
                elif country and country != 'Unknown' and country != 'Local':
                    return country
            return 'Unknown'
        
        return {
            'user': user.to_dict(),
            'has_face': FacialData.query.filter_by(user_id=user_id).first() is not None,
            'total_sessions': len(sessions),
            'active_sessions': sum(1 for s in sessions if s.is_active()),
            'failed_attempts': len(failed),
            'recent_sessions': [{
                'session_id': s.session_id,
                'created_at': format_dt(s.created_at),
                'device_info': s.device_info,
                'ip_address': s.ip_address,
                'location': format_location(s.location),
                'is_active': s.is_active()
            } for s in sessions[:5]],
            'recent_failures': [f.to_dict() for f in failed[:5]],
            'risk_history': [{
                'score': r.risk_score,
                'level': r.risk_level,
                'date': format_dt(r.created_at)
            } for r in risks]
        }