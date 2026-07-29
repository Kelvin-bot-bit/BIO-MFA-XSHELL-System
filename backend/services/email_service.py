# .backend/services/email_service.py
import logging
import os
import smtplib
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails (production version with real email sending)"""
    
    def __init__(self):
        self.smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.environ.get('SMTP_PORT', 587))
        self.smtp_username = os.environ.get('SMTP_USERNAME')
        self.smtp_password = os.environ.get('SMTP_PASSWORD')
        
        # Validate configuration
        if not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP credentials not configured. Emails will not be sent.")
    
    def send_email(self, to_email, subject, body, is_html=False):
        """Send actual email to recipient"""
        try:
            # Check if SMTP is configured
            if not self.smtp_username or not self.smtp_password:
                logger.error("SMTP not configured. Cannot send email.")
                return False
            
            # Extract OTP from body for logging
            otp_match = re.search(r'verification code is:\s*(\d+)', body)
            otp = otp_match.group(1) if otp_match else "Not found"
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = formataddr(('XShell Authentication', self.smtp_username))  # CHANGED HERE
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add body to email
            if is_html:
                msg.attach(MIMEText(body, 'html'))
            else:
                msg.attach(MIMEText(body, 'plain'))
            
            # Create SMTP session
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()  # Enable security
                server.login(self.smtp_username, self.smtp_password)
                
                # Send email
                text = msg.as_string()
                server.sendmail(self.smtp_username, to_email, text)
            
            logger.info(f"✅ Email sent successfully to: {to_email}")
            logger.info(f"📧 Subject: {subject}")
            logger.info(f"🔑 OTP: {otp}")
            return True
            
        except smtplib.SMTPAuthenticationError:
            logger.error("❌ SMTP Authentication failed. Check your email credentials and app password.")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"❌ SMTP error occurred: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"❌ Error sending email: {str(e)}")
            return False

    def send_otp_email(self, to_email, user_name, otp_code, purpose="login"):
        """Convenience method for sending OTP emails with formatted template"""
        try:
            subject = f"Your XShell Verification Code - {otp_code}"  # CHANGED HERE
            
            body = f"""
Hello {user_name},

Your XShell verification code is: {otp_code}  # CHANGED HERE

This code will expire in 10 minutes.

Purpose: {purpose.replace('_', ' ').title()}

If you didn't request this code, please ignore this email or contact our support team.

Stay secure,
The XShell Team  # CHANGED HERE

---
This is an automated message. Please do not reply to this email.
            """
            
            return self.send_email(to_email, subject, body)
            
        except Exception as e:
            logger.error(f"Error preparing OTP email: {str(e)}")
            return False