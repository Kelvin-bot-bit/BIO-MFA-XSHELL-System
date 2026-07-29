#./backend/utils/validators.py
import re

class Validators:
    """Input validation utilities for SecureSphere"""
    
    @staticmethod
    def validate_email(email):
        """
        Validate email format - simple check for development
        Accepts: user@domain.tld format
        """
        try:
            # Basic email format check
            if not email or len(email.strip()) == 0:
                return False, "Email is required"
            
            email = email.strip()
            
            # Check for @ and . in the right places
            if '@' not in email:
                return False, "Email must contain @ symbol"
            
            parts = email.split('@')
            if len(parts) != 2:
                return False, "Invalid email format"
            
            local_part, domain = parts
            
            if len(local_part) == 0:
                return False, "Email local part cannot be empty"
            
            if '.' not in domain:
                return False, "Email domain must contain a dot"
            
            if len(domain.split('.')[-1]) < 2:
                return False, "Email domain must have a valid TLD"
            
            # Basic length checks
            if len(email) < 6:
                return False, "Email is too short"
            
            if len(email) > 255:
                return False, "Email is too long"
            
            return True, email
            
        except Exception as e:
            return False, f"Email validation error: {str(e)}"
    
    @staticmethod
    def validate_phone(phone, country='US'):
        """
        Validate phone number - lenient validation for development
        Accepts: +1234567890, 1234567890, (123) 456-7890 formats
        """
        try:
            if not phone or len(phone.strip()) == 0:
                return False, "Phone number is required"
            
            phone = phone.strip()
            
            # Remove all non-digit characters except +
            cleaned_phone = re.sub(r'[^\d+]', '', phone)
            
            # Check if it's international format (starts with +)
            if cleaned_phone.startswith('+'):
                if len(cleaned_phone) < 8:  # +1234567 (minimum)
                    return False, "International phone number too short"
                if len(cleaned_phone) > 15:  # +123456789012345 (maximum)
                    return False, "International phone number too long"
                return True, cleaned_phone
            
            # Check if it's national format (digits only)
            elif cleaned_phone.isdigit():
                if len(cleaned_phone) < 10:  # 1234567890 (US standard)
                    return False, "Phone number must have at least 10 digits"
                if len(cleaned_phone) > 15:
                    return False, "Phone number too long"
                # Convert to international format for consistency
                return True, f"+1{cleaned_phone}"  # Assume US number
            
            else:
                return False, "Invalid phone number format"
                
        except Exception as e:
            return False, f"Phone validation error: {str(e)}"
    
    @staticmethod
    def validate_password(password):
        """
        Validate password strength
        Requirements: at least 8 characters, with mixed case, numbers, and special chars
        """
        try:
            if not password or len(password.strip()) == 0:
                return False, "Password is required"
            
            password = password.strip()
            
            # Length check
            if len(password) < 8:
                return False, "Password must be at least 8 characters long"
            
            if len(password) > 128:
                return False, "Password is too long (max 128 characters)"
            
            # Character variety checks
            errors = []
            
            if not re.search(r"[A-Z]", password):
                errors.append("at least one uppercase letter")
            
            if not re.search(r"[a-z]", password):
                errors.append("at least one lowercase letter")
            
            if not re.search(r"\d", password):
                errors.append("at least one digit")
            
            if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
                errors.append("at least one special character")
            
            if errors:
                return False, f"Password must contain {', '.join(errors)}"
            
            return True, "Password is strong"
            
        except Exception as e:
            return False, f"Password validation error: {str(e)}"
    
    @staticmethod
    def validate_name(name):
        """
        Validate person name
        Requirements: at least 2 characters, letters, spaces, hyphens, apostrophes only
        """
        try:
            if not name or len(name.strip()) == 0:
                return False, "Name is required"
            
            name = name.strip()
            
            # Length check
            if len(name) < 2:
                return False, "Name must be at least 2 characters long"
            
            if len(name) > 100:
                return False, "Name is too long (max 100 characters)"
            
            # Character check - allow letters, spaces, hyphens, apostrophes
            if not re.match(r"^[a-zA-Z\s\-'.]+$", name):
                return False, "Name can only contain letters, spaces, hyphens, and apostrophes"
            
            # Check for consecutive special characters
            if re.search(r"[\-']{2,}", name):
                return False, "Name cannot have consecutive special characters"
            
            # Check if name starts/ends with special characters
            if name[0] in "-' " or name[-1] in "-' ":
                return False, "Name cannot start or end with special characters or spaces"
            
            return True, "Name is valid"
            
        except Exception as e:
            return False, f"Name validation error: {str(e)}"
    
    @staticmethod
    def validate_face_image(image_data):
        """
        Validate face image data
        Basic check for data URL format or base64 data
        """
        try:
            if not image_data or len(image_data.strip()) == 0:
                return False, "Face image is required"
            
            image_data = image_data.strip()
            
            # Check if it's a data URL
            if image_data.startswith('data:image'):
                # Basic data URL format check
                if ';base64,' not in image_data:
                    return False, "Invalid image data URL format"
                
                # Extract base64 part
                base64_data = image_data.split(';base64,')[1]
                
                # Check if it's valid base64
                if len(base64_data) == 0:
                    return False, "Empty base64 image data"
                
                # Check reasonable size (max 5MB for base64)
                if len(base64_data) > 7 * 1024 * 1024:  # ~5MB in base64
                    return False, "Image is too large (max 5MB)"
                
                return True, "Face image is valid"
            
            # If it's direct base64 (without data URL)
            elif len(image_data) > 100:  # Reasonable minimum for an image
                # Basic base64 check (ends with = and has valid chars)
                if re.match(r'^[A-Za-z0-9+/]*={0,2}$', image_data):
                    return True, "Face image is valid"
                else:
                    return False, "Invalid base64 image data"
            
            else:
                return False, "Image data is too short or invalid"
                
        except Exception as e:
            return False, f"Image validation error: {str(e)}"