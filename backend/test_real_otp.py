#!/usr/bin/env python3
import os
import sys
import logging
import secrets
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class RealOTPTester:
    def __init__(self):
        self.setup_imports()
        
    def setup_imports(self):
        """Setup proper Python imports"""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.join(current_dir, '.backend')
        
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        if current_dir not in sys.path:
            sys.path.insert(0, current_dir)
        
        print(f"📁 Working from: {current_dir}")
        
    def generate_real_otp(self, length=6):
        """Generate cryptographically secure REAL OTP"""
        return ''.join(secrets.choice('0123456789') for _ in range(length))
    
    def test_email_service_directly(self):
        """Test email service by sending REAL OTPs"""
        print("🚀 Testing XShell OTP Delivery System...")
        print("=" * 50)
        
        try:
            # Import email service directly
            from services.email_service import EmailService
            
            # Initialize email service
            email_service = EmailService()
            
            # Check if email is configured
            if not email_service.smtp_username or not email_service.smtp_password:
                print("❌ Email not configured in .env file")
                print("💡 Make sure you have:")
                print("   SMTP_USERNAME=your-email@gmail.com")
                print("   SMTP_PASSWORD=your-app-password")
                return False
            
            print(f"✅ XShell Email service loaded")
            print(f"📧 From: XShell Authentication <{email_service.smtp_username}>")
            print(f"🏠 Server: {email_service.smtp_server}:{email_service.smtp_port}")
            
            return email_service
            
        except ImportError as e:
            print(f"❌ Cannot import email service: {e}")
            print("💡 Check that .backend/services/email_service.py exists")
            return None
        except Exception as e:
            print(f"❌ Email service error: {e}")
            return None
    
    def send_single_real_otp(self, email_service):
        """Send a single REAL OTP email"""
        print("\n" + "🔐" * 20)
        print("🚀 SENDING XShell REAL OTP...")
        print("🔐" * 20)
        
        # Generate REAL cryptographically secure OTP
        real_otp = self.generate_real_otp()
        
        print(f"🎯 Generated XShell OTP: {real_otp}")
        print(f"📧 Sending to: {email_service.smtp_username}")
        
        # Send the REAL OTP
        success = email_service.send_otp_email(
            to_email=email_service.smtp_username,
            user_name="XShell Tester",
            otp_code=real_otp,
            purpose="real_otp_test"
        )
        
        if success:
            print("✅ XShell OTP EMAIL SENT SUCCESSFULLY!")
            print(f"📬 Check your inbox for OTP: {real_otp}")
            print("💡 Also check spam folder if you don't see it")
            print("\n📧 You should see:")
            print("   From: XShell Authentication")
            print("   Subject: Your XShell Verification Code - [OTP]")
            return True
        else:
            print("❌ FAILED to send XShell OTP email")
            return False
    
    def send_multiple_real_otps(self, email_service, count=3):
        """Send multiple REAL OTPs to test randomness"""
        print(f"\n🔄 Sending {count} XShell OTPs to test randomness...")
        
        otps_sent = []
        for i in range(count):
            print(f"\n📧 OTP {i+1}/{count}:")
            
            real_otp = self.generate_real_otp()
            print(f"   Generated: {real_otp}")
            
            success = email_service.send_otp_email(
                to_email=email_service.smtp_username,
                user_name=f"XShell Test User {i+1}",
                otp_code=real_otp,
                purpose=f"randomness_test_{i+1}"
            )
            
            if success:
                print("   ✅ Sent successfully")
                otps_sent.append(real_otp)
            else:
                print("   ❌ Failed to send")
                return False
            
            # Small delay between emails
            import time
            if i < count - 1:
                time.sleep(2)
        
        # Check randomness
        unique_otps = len(set(otps_sent))
        print(f"\n📊 Randomness Check:")
        print(f"   Sent {len(otps_sent)} XShell OTPs")
        print(f"   Unique OTPs: {unique_otps}")
        
        if unique_otps == count:
            print("   ✅ Excellent randomness!")
        else:
            print("   ⚠️  Some OTPs were duplicated")
        
        return True
    
    def run_complete_test(self):
        """Run complete REAL OTP test"""
        print("🎯 XShell REAL OTP Delivery Test")
        print("=" * 60)
        
        # Test email service
        email_service = self.test_email_service_directly()
        if not email_service:
            return False
        
        # Send single REAL OTP
        print("\n" + "=" * 60)
        single_success = self.send_single_real_otp(email_service)
        
        if single_success:
            # Ask user if they want to test multiple OTPs
            print("\n" + "=" * 60)
            response = input("🎲 Send multiple XShell OTPs to test randomness? (y/n): ").strip().lower()
            
            if response in ['y', 'yes']:
                multiple_success = self.send_multiple_real_otps(email_service, count=3)
                if multiple_success:
                    print("\n🎉 MULTIPLE XShell OTPs SENT SUCCESSFULLY!")
                else:
                    print("\n⚠️  Multiple OTP test had some issues")
            
            print("\n" + "🎯" * 20)
            print("✅ XShell OTP SYSTEM WORKING!")
            print("🎯" * 20)
            print("\n📋 What happened:")
            print("   1. Generated cryptographically secure OTPs")
            print("   2. Sent REAL emails from 'XShell Authentication'")
            print("   3. OTPs should arrive in your inbox")
            print("\n🔍 Check your email now for XShell authentication emails!")
            return True
        else:
            print("\n❌ XShell OTP TEST FAILED")
            return False

def check_smtp_credentials():
    """Check if SMTP credentials are properly set"""
    print("🔍 Checking XShell SMTP Configuration...")
    
    smtp_username = os.environ.get('SMTP_USERNAME')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    
    if not smtp_username or not smtp_password:
        print("❌ SMTP credentials missing in .env file")
        print("💡 Add these lines to your .env file:")
        print("SMTP_USERNAME=your-email@gmail.com")
        print("SMTP_PASSWORD=your-16-character-app-password")
        return False
    
    print(f"✅ SMTP Username: {smtp_username}")
    print(f"✅ SMTP Password: {'*' * len(smtp_password)}")
    
    return True

if __name__ == "__main__":
    print("🔥 XShell REAL OTP Delivery Tester")
    print("=" * 60)
    
    # Check SMTP credentials first
    if not check_smtp_credentials():
        sys.exit(1)
    
    # Run the test
    tester = RealOTPTester()
    success = tester.run_complete_test()
    
    if not success:
        print("\n💡 TROUBLESHOOTING HELP:")
        print("1. Gmail App Password Setup:")
        print("   - Go to: https://myaccount.google.com/security")
        print("   - Enable 2-Factor Authentication")
        print("   - Generate 16-character 'App Password' for 'Mail'")
        print("   - Use that password in .env as SMTP_PASSWORD")
    
    sys.exit(0 if success else 1)