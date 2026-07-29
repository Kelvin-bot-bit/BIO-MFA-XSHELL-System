# ./backend/utils/device_fingerprint.py
import hashlib
import json
import user_agents
import socket
import requests
from flask import request
import logging
import time
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class DeviceFingerprinter:
    """Generate and manage device fingerprints for session tracking"""
    
    def __init__(self, fingerprint_salt=None, enable_location=True):
        """Initialize with optional salt for additional security"""
        self.fingerprint_salt = fingerprint_salt or 'xshell-default-salt-change-in-production'
        self.enable_location = enable_location
        self.location_cache = {}  # Cache location data to avoid repeated API calls
        
    def generate_fingerprint(self, request_obj=None):
        """
        Generate a unique device fingerprint from request headers and properties
        
        Args:
            request_obj: Flask request object (uses current request if None)
            
        Returns:
            dict: Comprehensive device fingerprint data
        """
        if request_obj is None:
            request_obj = request
            
        # Collect fingerprint components
        fingerprint_data = self._collect_fingerprint_data(request_obj)
        
        # Generate hash for quick comparison
        fingerprint_hash = self._generate_hash(fingerprint_data)
        
        # Add hash to data
        fingerprint_data['fingerprint_hash'] = fingerprint_hash
        
        # Log fingerprint generation for debugging
        logger.debug(f"🔍 Generated fingerprint for IP: {fingerprint_data.get('ip_address')}")
        
        return fingerprint_data
    
    def _collect_fingerprint_data(self, request_obj):
        """Collect all relevant fingerprinting data points"""
        
        # Parse user agent
        user_agent_string = request_obj.headers.get('User-Agent', '')
        ua = user_agents.parse(user_agent_string)
        
        # Get IP address (handling proxies)
        ip_address = self._get_client_ip(request_obj)
        
        # Get location data from IP
        location_data = self._get_location_from_ip(ip_address)
        
        # Collect browser/device data
        fingerprint = {
            # Basic identifiers
            'ip_address': ip_address,
            'user_agent': user_agent_string,
            
            # Parsed user agent data
            'browser': {
                'family': ua.browser.family,
                'version': ua.browser.version_string,
                'is_mobile': ua.is_mobile,
                'is_tablet': ua.is_tablet,
                'is_pc': ua.is_pc,
                'is_bot': ua.is_bot,
            },
            'os': {
                'family': ua.os.family,
                'version': ua.os.version_string,
            },
            'device': {
                'family': ua.device.family,
                'brand': ua.device.brand,
                'model': ua.device.model,
            },
            
            # HTTP headers (for additional fingerprinting)
            'headers': {
                'accept_language': request_obj.headers.get('Accept-Language', ''),
                'accept_encoding': request_obj.headers.get('Accept-Encoding', ''),
                'connection': request_obj.headers.get('Connection', ''),
                'upgrade_insecure_requests': request_obj.headers.get('Upgrade-Insecure-Requests', ''),
                'dnt': request_obj.headers.get('DNT', ''),  # Do Not Track
                'sec_fetch_site': request_obj.headers.get('Sec-Fetch-Site', ''),
                'sec_fetch_mode': request_obj.headers.get('Sec-Fetch-Mode', ''),
                'sec_fetch_dest': request_obj.headers.get('Sec-Fetch-Dest', ''),
            },
            
            # Location data
            'location': location_data,
            
            # Request metadata
            'timestamp': self._get_timestamp(),
            'scheme': request_obj.scheme,
            'method': request_obj.method,
            'path': request_obj.path,
        }
        
        # Add client hints if available (modern browsers)
        if 'Sec-CH-UA' in request_obj.headers:
            fingerprint['client_hints'] = {
                'sec_ch_ua': request_obj.headers.get('Sec-CH-UA'),
                'sec_ch_ua_mobile': request_obj.headers.get('Sec-CH-UA-Mobile'),
                'sec_ch_ua_platform': request_obj.headers.get('Sec-CH-UA-Platform'),
                'sec_ch_ua_platform_version': request_obj.headers.get('Sec-CH-UA-Platform-Version', ''),
                'sec_ch_ua_model': request_obj.headers.get('Sec-CH-UA-Model', ''),
                'sec_ch_ua_full_version': request_obj.headers.get('Sec-CH-UA-Full-Version', ''),
            }
        
        return fingerprint
    
    def _get_client_ip(self, request_obj):
        """Get real client IP behind proxies with comprehensive header checking"""
        # List of proxy headers to check in order of preference
        proxy_headers = [
            'X-Forwarded-For',
            'X-Real-IP',
            'CF-Connecting-IP',  # Cloudflare
            'True-Client-IP',     # Akamai
            'X-Client-IP',
            'X-Forwarded',
            'Forwarded-For',
            'Forwarded'
        ]
        
        for header in proxy_headers:
            if header in request_obj.headers:
                value = request_obj.headers.get(header)
                if value:
                    # X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2)
                    if header == 'X-Forwarded-For' and ',' in value:
                        return value.split(',')[0].strip()
                    return value.strip()
        
        # Fall back to remote address
        return request_obj.remote_addr or '0.0.0.0'
    
    def _get_location_from_ip(self, ip_address):
        """Get geographic location from IP address with enhanced data"""
        import pytz
        
        # For localhost/development, return a default location (Nairobi, Kenya) for testing
        if self._is_private_ip(ip_address) or ip_address in ['127.0.0.1', 'localhost', '0.0.0.0']:
            location_data = {
                'city': 'Nairobi',
                'country': 'Kenya',
                'country_code': 'KE',
                'region': 'Nairobi County',
                'latitude': -1.2864,
                'longitude': 36.8172,
                'timezone': 'Africa/Nairobi',
                'isp': 'Local Network',
                'org': 'Development Environment',
                'as': 'Local',
                'is_proxy': False,
                'is_hosting': False,
                'is_mobile': False,
                'source': 'development_default'
            }
            logger.info(f"📍 Development mode: Using default location (Nairobi, Kenya) for {ip_address}")
            return location_data
        
        # Check cache first
        if ip_address in self.location_cache:
            cached = self.location_cache[ip_address]
            logger.info(f"📍 Using cached location for {ip_address}: {cached.get('city')}, {cached.get('country')}")
            return cached
        
        # Try multiple geolocation services with fallbacks
        location_data = self._try_ip_api(ip_address)
        
        # If ip-api fails, try fallback service
        if not location_data:
            location_data = self._try_ip_api_fallback(ip_address)
        
        # If all geolocation fails, return a default location
        if not location_data:
            logger.warning(f"⚠️ All geolocation services failed for {ip_address}, using default location")
            location_data = {
                'city': 'Nairobi',
                'country': 'Kenya',
                'country_code': 'KE',
                'region': 'Nairobi County',
                'latitude': -1.2864,
                'longitude': 36.8172,
                'timezone': 'Africa/Nairobi',
                'isp': 'Unknown',
                'org': 'Unknown',
                'as': 'Unknown',
                'is_proxy': False,
                'is_hosting': False,
                'is_mobile': False,
                'source': 'default'
            }
        
        # Cache the result
        self.location_cache[ip_address] = location_data
        
        return location_data
    
    def _try_ip_api(self, ip_address):
        """Try ip-api.com for geolocation"""
        try:
            # Use ip-api.com for free IP geolocation
            response = requests.get(
                f'http://ip-api.com/json/{ip_address}',
                params={'fields': 'status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting,mobile'},
                timeout=3
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'success':
                    location_data = {
                        'city': data.get('city', 'Unknown'),
                        'country': data.get('country', 'Unknown'),
                        'country_code': data.get('countryCode', ''),
                        'region': data.get('regionName', ''),
                        'region_code': data.get('region', ''),
                        'latitude': data.get('lat', 0),
                        'longitude': data.get('lon', 0),
                        'timezone': data.get('timezone', 'UTC'),
                        'isp': data.get('isp', ''),
                        'org': data.get('org', ''),
                        'as': data.get('as', ''),
                        'is_proxy': data.get('proxy', False),
                        'is_hosting': data.get('hosting', False),
                        'is_mobile': data.get('mobile', False),
                        'source': 'ip-api.com'
                    }
                    
                    # Log successful location detection
                    logger.info(f"📍 Location found for {ip_address}: {location_data['city']}, {location_data['country']} "
                               f"(ISP: {location_data['isp']})")
                    
                    return location_data
                else:
                    logger.warning(f"ip-api.com returned error for {ip_address}: {data.get('message', 'Unknown error')}")
            
        except requests.exceptions.Timeout:
            logger.warning(f"⏱️ ip-api.com timeout for {ip_address}")
        except requests.exceptions.ConnectionError:
            logger.warning(f"🔌 ip-api.com connection error for {ip_address}")
        except Exception as e:
            logger.warning(f"❌ ip-api.com error for {ip_address}: {str(e)}")
        
        return None
    
    def _try_ip_api_fallback(self, ip_address):
        """Fallback geolocation service"""
        try:
            # Try ipapi.co as fallback
            response = requests.get(
                f'https://ipapi.co/{ip_address}/json/',
                timeout=3,
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if not data.get('error'):
                    location_data = {
                        'city': data.get('city', 'Unknown'),
                        'country': data.get('country_name', 'Unknown'),
                        'country_code': data.get('country_code', ''),
                        'region': data.get('region', ''),
                        'latitude': data.get('latitude', 0),
                        'longitude': data.get('longitude', 0),
                        'timezone': data.get('timezone', 'UTC'),
                        'isp': data.get('org', ''),
                        'org': data.get('org', ''),
                        'source': 'ipapi.co'
                    }
                    
                    logger.info(f"📍 Fallback location found for {ip_address}: {location_data['city']}, {location_data['country']}")
                    return location_data
                    
        except Exception as e:
            logger.warning(f"❌ ipapi.co error for {ip_address}: {str(e)}")
        
        return None
    
    def _is_private_ip(self, ip_address):
        """Check if IP is private/internal with comprehensive detection"""
        # Handle IPv6
        if ip_address.startswith('::'):
            if ip_address in ['::1', '::']:
                return True
            if ip_address.startswith('fe80:'):  # Link-local
                return True
            if ip_address.startswith('fc00:') or ip_address.startswith('fd00:'):  # Unique local
                return True
        
        # IPv4 private ranges
        private_ranges = [
            '10.',        # Class A private
            '172.16.',    # Class B private range start
            '172.17.',    
            '172.18.',
            '172.19.',
            '172.20.',
            '172.21.',
            '172.22.',
            '172.23.',
            '172.24.',
            '172.25.',
            '172.26.',
            '172.27.',
            '172.28.',
            '172.29.',
            '172.30.',
            '172.31.',
            '192.168.',   # Class C private
            '127.',       # Localhost
            '169.254.',   # Link-local
            '0.',         # Invalid/unknown
        ]
        
        return any(ip_address.startswith(prefix) for prefix in private_ranges)
    
    def _generate_hash(self, fingerprint_data):
        """Generate a secure hash of fingerprint data for quick comparison"""
        # Create a deterministic string from key fingerprint components
        fingerprint_string = json.dumps({
            'user_agent': fingerprint_data['user_agent'],
            'accept_language': fingerprint_data['headers']['accept_language'],
            'accept_encoding': fingerprint_data['headers']['accept_encoding'],
            'browser_family': fingerprint_data['browser']['family'],
            'os_family': fingerprint_data['os']['family'],
            'screen_resolution': fingerprint_data.get('client_hints', {}).get('sec_ch_ua_model', ''),
        }, sort_keys=True)
        
        # Add salt and hash
        salted_string = fingerprint_string + self.fingerprint_salt
        return hashlib.sha256(salted_string.encode()).hexdigest()
    
    def _get_timestamp(self):
        """Get current timestamp in milliseconds"""
        return int(time.time() * 1000)
    
    def compare_fingerprints(self, fp1, fp2):
        """Compare two fingerprints for matching"""
        if not fp1 or not fp2:
            return False
        
        # Compare hashes first (fast)
        if fp1.get('fingerprint_hash') == fp2.get('fingerprint_hash'):
            return True
        
        # Fallback to component comparison
        return self._compare_fingerprint_components(fp1, fp2)
    
    def _compare_fingerprint_components(self, fp1, fp2):
        """Deep compare fingerprint components"""
        # Compare browser family
        if fp1.get('browser', {}).get('family') != fp2.get('browser', {}).get('family'):
            return False
        
        # Compare OS family
        if fp1.get('os', {}).get('family') != fp2.get('os', {}).get('family'):
            return False
        
        # Compare device family (for mobile)
        device1 = fp1.get('device', {}).get('family', '')
        device2 = fp2.get('device', {}).get('family', '')
        if device1 and device2 and device1 != device2:
            return False
        
        return True
    
    def get_device_display_name(self, fingerprint):
        """Generate a user-friendly device name from fingerprint"""
        if not fingerprint:
            return "Unknown Device"
        
        device_parts = []
        
        # Add device type/model
        if fingerprint.get('device', {}).get('family') and fingerprint['device']['family'] != 'Other':
            device_parts.append(fingerprint['device']['family'])
        elif fingerprint.get('browser', {}).get('is_mobile'):
            device_parts.append("Mobile Device")
        else:
            device_parts.append("Computer")
        
        # Add browser
        browser = fingerprint.get('browser', {})
        if browser.get('family'):
            device_parts.append(f"· {browser['family']}")
            if browser.get('version'):
                device_parts[-1] += f" {browser['version'].split('.')[0]}"
        
        # Add OS
        os_info = fingerprint.get('os', {})
        if os_info.get('family') and os_info['family'] != 'Other':
            device_parts.append(f"· {os_info['family']}")
        
        # Add location (if available and not Unknown)
        location = fingerprint.get('location', {})
        if location.get('city') and location['city'] != 'Unknown' and location['city'] != 'Local':
            if location.get('country') and location['country'] != 'Unknown':
                device_parts.append(f"· {location['city']}, {location['country']}")
            else:
                device_parts.append(f"· {location['city']}")
        elif location.get('country') and location['country'] != 'Unknown' and location['country'] != 'Local':
            device_parts.append(f"· {location['country']}")
        
        return ' '.join(device_parts)
    
    def get_location_summary(self, fingerprint):
        """Get a clean location summary string"""
        if not fingerprint:
            return "Unknown Location"
        
        location = fingerprint.get('location', {})
        
        # Build location string
        parts = []
        
        if location.get('city') and location['city'] != 'Unknown' and location['city'] != 'Local':
            parts.append(location['city'])
        
        if location.get('region') and location['region'] != 'Unknown' and location['region'] != 'Local':
            parts.append(location['region'])
        
        if location.get('country') and location['country'] != 'Unknown' and location['country'] != 'Local':
            parts.append(location['country'])
        
        if parts:
            return ', '.join(parts)
        
        # Fallback to IP if no location
        ip = fingerprint.get('ip_address', '')
        if ip and ip != '0.0.0.0':
            return f"IP: {ip}"
        
        return "Unknown Location"
    
    def clear_cache(self):
        """Clear the location cache"""
        self.location_cache.clear()
        logger.info("🧹 Location cache cleared")


class DeviceFingerprintMiddleware:
    """Middleware to add fingerprint to request context"""
    
    def __init__(self, app=None, fingerprint_salt=None):
        self.fingerprinter = DeviceFingerprinter(fingerprint_salt)
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        @app.before_request
        def add_fingerprint_to_request():
            # Store fingerprint in request context for later use
            if request.endpoint and 'auth' in request.endpoint:
                # For auth endpoints, we might want to generate fingerprint
                # but not store it in the request context yet
                pass
            else:
                # For protected routes, we might want to check fingerprint
                pass


# Example usage in routes
"""
from utils.device_fingerprint import DeviceFingerprinter

@auth_bp.route('/login', methods=['POST'])
def login():
    # ... password verification ...
    
    # Generate device fingerprint
    fingerprinter = DeviceFingerprinter(fingerprint_salt=app.config['FINGERPRINT_SALT'])
    fingerprint = fingerprinter.generate_fingerprint()
    
    # Log location for debugging
    location = fingerprinter.get_location_summary(fingerprint)
    logger.info(f"📍 User login from: {location}")
    
    # Create session with fingerprint data
    session = LoginSession(
        user_id=user.user_id,
        device_info=fingerprinter.get_device_display_name(fingerprint),
        ip_address=fingerprint['ip_address'],
        location=fingerprint['location'],  # Store full location data
        user_agent=json.dumps(fingerprint),
        # ... other fields ...
    )
    
    return jsonify({'session_fingerprint': fingerprint['fingerprint_hash']})
"""