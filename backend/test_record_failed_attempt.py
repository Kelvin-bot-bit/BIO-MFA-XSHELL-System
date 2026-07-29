# test_record_failed_attempt.py
from app import create_app
from models import db
from models.failed_login_attempts import FailedLoginAttempt
from services.failed_login_service import FailedLoginService
from datetime import datetime, timezone

app = create_app('development')

with app.app_context():
    print("Testing failed attempt recording...")
    
    failed_login_service = FailedLoginService()
    
    # Record a test failed attempt
    result = failed_login_service.record_failed_attempt(
        email='test@example.com',
        ip_address='127.0.0.1',
        user_agent='Mozilla/5.0 (Test)',
        reason='test_failure'
    )
    
    if result:
        print("✅ Test failed attempt recorded successfully!")
        
        # Verify it was saved
        attempts = FailedLoginAttempt.query.all()
        print(f"\n📊 Total failed attempts in database: {len(attempts)}")
        
        for a in attempts:
            print(f"   - {a.email}: {a.reason} at {a.attempted_at}")
    else:
        print("❌ Failed to record test attempt")