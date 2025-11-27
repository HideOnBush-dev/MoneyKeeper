"""
Tests for security utilities
"""

import pytest
from decimal import Decimal
from app.security import (
    sanitize_string,
    sanitize_html,
    validate_amount,
    validate_email,
    validate_username,
    validate_positive_integer,
    validate_password_strength,
)


class TestSanitization:
    """Test input sanitization functions"""
    
    def test_sanitize_html_removes_tags(self):
        """Test that HTML tags are removed"""
        dirty = "<script>alert('xss')</script>Hello"
        clean = sanitize_html(dirty)
        assert "<script>" not in clean
        assert "Hello" in clean
    
    def test_sanitize_string_trims_whitespace(self):
        """Test that whitespace is trimmed"""
        text = "  Hello World  "
        result = sanitize_string(text)
        assert result == "Hello World"
    
    def test_sanitize_string_enforces_max_length(self):
        """Test that max length is enforced"""
        long_text = "a" * 1000
        result = sanitize_string(long_text, max_length=100)
        assert len(result) == 100


class TestValidation:
    """Test validation functions"""
    
    def test_validate_amount_positive(self):
        """Test amount validation with positive numbers"""
        assert validate_amount(100) == Decimal("100.00")
        assert validate_amount("123.45") == Decimal("123.45")
        assert validate_amount(0) == Decimal("0.00")
    
    def test_validate_amount_negative_raises(self):
        """Test that negative amounts raise error"""
        with pytest.raises(ValueError):
            validate_amount(-100)
    
    def test_validate_amount_too_large_raises(self):
        """Test that too large amounts raise error"""
        with pytest.raises(ValueError):
            validate_amount("9999999999999")
    
    def test_validate_email_valid(self):
        """Test email validation with valid emails"""
        assert validate_email("test@example.com") == "test@example.com"
        assert validate_email("user.name+tag@domain.co.uk") == "user.name+tag@domain.co.uk"
    
    def test_validate_email_invalid_raises(self):
        """Test that invalid emails raise error"""
        with pytest.raises(ValueError):
            validate_email("not-an-email")
        with pytest.raises(ValueError):
            validate_email("@example.com")
    
    def test_validate_username_valid(self):
        """Test username validation"""
        assert validate_username("user123") == "user123"
        assert validate_username("test_user") == "test_user"
        assert validate_username("user-name") == "user-name"
    
    def test_validate_username_invalid_raises(self):
        """Test that invalid usernames raise error"""
        with pytest.raises(ValueError):
            validate_username("ab")  # Too short
        with pytest.raises(ValueError):
            validate_username("user@name")  # Invalid char
    
    def test_validate_positive_integer(self):
        """Test positive integer validation"""
        assert validate_positive_integer(5) == 5
        assert validate_positive_integer("10") == 10
    
    def test_validate_positive_integer_invalid_raises(self):
        """Test that non-positive integers raise error"""
        with pytest.raises(ValueError):
            validate_positive_integer(0)
        with pytest.raises(ValueError):
            validate_positive_integer(-5)
    
    def test_password_strength(self):
        """Test password strength validation"""
        # Weak passwords
        is_strong, msg = validate_password_strength("short")
        assert not is_strong
        
        is_strong, msg = validate_password_strength("nouppercase1")
        assert not is_strong
        
        is_strong, msg = validate_password_strength("NOLOWERCASE1")
        assert not is_strong
        
        is_strong, msg = validate_password_strength("NoDigits")
        assert not is_strong
        
        # Strong password
        is_strong, msg = validate_password_strength("StrongPass123")
        assert is_strong
        assert msg == "Password is strong"

