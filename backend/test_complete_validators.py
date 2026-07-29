from utils.validators import Validators

def test_all_validators():
    print("🔍 Testing Complete Validators...")
    print("=" * 60)
    
    # Test emails
    print("\n📧 Email Validation Tests:")
    test_emails = [
        "test@example.com",
        "user@test.com",
        "invalid-email",
        "no@tld",
        "valid@domain.org",
        "test@sub.domain.com"
    ]
    
    for email in test_emails:
        is_valid, message = Validators.validate_email(email)
        status = "✅" if is_valid else "❌"
        print(f"  {status} {email}: {message}")
    
    # Test phones
    print("\n📞 Phone Validation Tests:")
    test_phones = [
        "+15551234567",
        "5551234567",
        "(555) 123-4567",
        "555-123-4567",
        "1234567890",
        "123",
        "invalid"
    ]
    
    for phone in test_phones:
        is_valid, message = Validators.validate_phone(phone)
        status = "✅" if is_valid else "❌"
        print(f"  {status} {phone}: {message}")
    
    # Test passwords
    print("\n🔐 Password Validation Tests:")
    test_passwords = [
        "Test123!",
        "short",
        "nouppercase123!",
        "NOLOWERCASE123!",
        "NoNumbers!",
        "NoSpecial123",
        "ValidPass123!"
    ]
    
    for pwd in test_passwords:
        is_valid, message = Validators.validate_password(pwd)
        status = "✅" if is_valid else "❌"
        print(f"  {status} {pwd}: {message}")
    
    # Test names
    print("\n👤 Name Validation Tests:")
    test_names = [
        "John Doe",
        "Mary-Jane",
        "O'Connor",
        "A",  # Too short
        "X" * 101,  # Too long
        "John123",  # Invalid chars
        "--John"  # Starts with special
    ]
    
    for name in test_names:
        is_valid, message = Validators.validate_name(name)
        status = "✅" if is_valid else "❌"
        print(f"  {status} '{name}': {message}")

if __name__ == "__main__":
    test_all_validators()