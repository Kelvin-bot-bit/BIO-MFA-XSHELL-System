#!/usr/bin/env python3
import os
import sys
import logging
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def test_email_service():
    """Test the email service with different scenarios"""
    print("📧 Testing XShell Email Service...")
    print("=" * 50)
    
    # Check if email configuration exists
    smtp_username = os.environ.get('SMTP_USERNAME')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    
    if not smtp_username or not smtp_password:
        print("❌ Email configuration missing in .env file")
        print("💡 Add these to your .env file:")
        print("   SMTP_USERNAME=your-email@gmail.com")
        print("   SMTP_PASSWORD=your-app-password")
        return False
    
    print(f"📨 SMTP Username: {smtp_username}")
    print(f"🔑 SMTP Password: {'*' * len(smtp_password)}")
    print(f"🏠 SMTP Server: {os.environ.get('SMTP_SERVER', 'smtp.gmail.com')}")
    print(f"🚪 SMTP Port: {os.environ.get('SMTP_PORT', '587')}")
    
    try:
        # Import the email service
        sys.path.append(os.path.join(os.path.dirname(__file__), '.backend'))
        from services.email_service import EmailService
        
        # Initialize email service
        email_service = EmailService()
        
        print("\n🧪 Test 1: Sending OTP Email...")
        
        # Test data
        test_recipient = smtp_username  # Send to yourself for testing
        test_user_name = "XShell Tester"
        test_otp = "123456"
        test_purpose = "login"
        
        print(f"   To: {test_recipient}")
        print(f"   User: {test_user_name}")
        print(f"   OTP: {test_otp}")
        print(f"   Purpose: {test_purpose}")
        
        # Send test email
        success = email_service.send_otp_email(
            to_email=test_recipient,
            user_name=test_user_name,
            otp_code=test_otp,
            purpose=test_purpose
        )
        
        if success:
            print("✅ OTP Email sent successfully!")
            print("📬 Check your inbox (and spam folder)")
        else:
            print("❌ Failed to send OTP email")
            print("💡 Common issues:")
            print("   - Gmail App Password not set up")
            print("   - SMTP credentials incorrect")
            print("   - Network connectivity issues")
            return False
        
        print("\n🧪 Test 2: Sending Custom Email...")
        
        custom_subject = "XShell Email Service Test"
        custom_body = """
Hello XShell Tester,

This is a test email from your XShell MFA system.

If you're receiving this, your email service is working correctly!

Best regards,
XShell Security Team
        """
        
        success = email_service.send_email(
            to_email=test_recipient,
            subject=custom_subject,
            body=custom_body
        )
        
        if success:
            print("✅ Custom Email sent successfully!")
        else:
            print("❌ Failed to send custom email")
            return False
        
        print("\n🎉 All email tests completed successfully!")
        return True
        
    except ImportError as e:
        print(f"❌ Cannot import email service: {e}")
        print("💡 Make sure your project structure is correct:")
        print("   .backend/services/email_service.py should exist")
        return False
    except Exception as e:
        print(f"❌ Email test failed: {e}")
        return False

def test_gmail_app_password():
    """Guide for setting up Gmail App Password"""
    print("\n🔧 Gmail App Password Setup Guide:")
    print("=" * 50)
    print("1. Go to: https://myaccount.google.com/security")
    print("2. Enable 2-Factor Authentication (if not already)")
    print("3. Go to 'App passwords'")
    print("4. Select 'Mail' as the app")
    print("5. Select 'Other' as the device and name it 'XShell'")
    print("6. Copy the 16-character app password")
    print("7. Add it to your .env file as SMTP_PASSWORD")
    print("8. Use your Gmail address as SMTP_USERNAME")
    print("\nExample .env entries:")
    print("SMTP_USERNAME=yourname@gmail.com")
    print("SMTP_PASSWORD=abcd efgh ijkl mnop")  # 16-char app password

def check_email_config():
    """Check current email configuration"""
    print("\n🔍 Current Email Configuration:")
    print("=" * 50)
    
    config = {
        'SMTP_USERNAME': os.environ.get('SMTP_USERNAME', '❌ Not set'),
        'SMTP_PASSWORD': '✅ Set' if os.environ.get('SMTP_PASSWORD') else '❌ Not set',
        'SMTP_SERVER': os.environ.get('SMTP_SERVER', 'smtp.gmail.com'),
        'SMTP_PORT': os.environ.get('SMTP_PORT', '587')
    }
    
    for key, value in config.items():
        print(f"   {key}: {value}")

if __name__ == "__main__":
    print("🚀 XShell Email Service Tester")
    print("=" * 50)
    
    # Check current configuration
    check_email_config()
    
    # Check if email is configured
    if not os.environ.get('SMTP_USERNAME') or not os.environ.get('SMTP_PASSWORD'):
        print("\n❌ Email not configured!")
        test_gmail_app_password()
        sys.exit(1)
    
    # Run the tests
    success = test_email_service()
    
    if not success:
        print("\n💡 Troubleshooting Tips:")
        print("1. Make sure you're using Gmail App Password, not your regular password")
        print("2. Check that 2-Factor Authentication is enabled on your Gmail")
        print("3. Verify your .env file has correct SMTP settings")
        print("4. Check your internet connection")
        print("5. Try allowing less secure apps (not recommended)")
        
        test_gmail_app_password()
    
    sys.exit(0 if success else 1)