# app/security.py
"""
Security utilities for input validation and sanitization
"""

import re
import bleach
from typing import Any, Optional
from decimal import Decimal, InvalidOperation
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


# Allowed HTML tags and attributes for sanitization
ALLOWED_TAGS = []  # No HTML allowed in our app
ALLOWED_ATTRIBUTES = {}


def sanitize_html(text: str) -> str:
    """Remove all HTML tags from text"""
    if not text:
        return ""
    return bleach.clean(text, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True)


def sanitize_string(text: str, max_length: int = 500) -> str:
    """Sanitize and validate string input"""
    if not text:
        return ""
    
    # Remove HTML
    text = sanitize_html(str(text))
    
    # Trim whitespace
    text = text.strip()
    
    # Limit length
    if len(text) > max_length:
        logger.warning(f"String truncated from {len(text)} to {max_length} chars")
        text = text[:max_length]
    
    return text


def validate_amount(amount: Any) -> Optional[Decimal]:
    """Validate and convert amount to Decimal"""
    if amount is None:
        return None
    
    try:
        # Convert to Decimal for precise currency handling
        decimal_amount = Decimal(str(amount))
        
        # Check for reasonable limits
        if decimal_amount < 0:
            raise ValueError("Amount cannot be negative")
        
        if decimal_amount > Decimal("999999999999.99"):
            raise ValueError("Amount exceeds maximum limit")
        
        # Round to 2 decimal places
        return decimal_amount.quantize(Decimal("0.01"))
        
    except (InvalidOperation, ValueError) as e:
        logger.error(f"Invalid amount: {amount} - {e}")
        raise ValueError(f"Invalid amount: {amount}")


def validate_category(category: str) -> str:
    """Validate expense category"""
    valid_categories = {
        "di chuyển", "ăn uống", "mua sắm", "giải trí",
        "hóa đơn", "sức khỏe", "giáo dục", "công việc", "khác"
    }
    
    category = sanitize_string(category, max_length=50).lower()
    
    if category not in valid_categories:
        logger.warning(f"Invalid category: {category}, defaulting to 'khác'")
        return "khác"
    
    return category


def validate_email(email: str) -> str:
    """Validate email format"""
    email = sanitize_string(email, max_length=255).lower()
    
    # Basic email regex
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(email_pattern, email):
        raise ValueError("Invalid email format")
    
    return email


def validate_username(username: str) -> str:
    """Validate username"""
    username = sanitize_string(username, max_length=50)
    
    # Username can only contain alphanumeric, underscore, and hyphen
    if not re.match(r'^[a-zA-Z0-9_-]{3,50}$', username):
        raise ValueError(
            "Username must be 3-50 characters and contain only "
            "letters, numbers, underscores, and hyphens"
        )
    
    return username


def validate_date(date_string: str) -> datetime:
    """Validate and parse date string"""
    if not date_string:
        raise ValueError("Date is required")
    
    # Try common date formats
    formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f"
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_string, fmt)
        except ValueError:
            continue
    
    raise ValueError(f"Invalid date format: {date_string}")


def validate_wallet_name(name: str) -> str:
    """Validate wallet name"""
    name = sanitize_string(name, max_length=100)
    
    if len(name) < 1:
        raise ValueError("Wallet name is required")
    
    if len(name) > 100:
        raise ValueError("Wallet name too long")
    
    return name


def validate_budget_period(period: str) -> str:
    """Validate budget period"""
    valid_periods = {"daily", "weekly", "monthly", "yearly"}
    
    period = sanitize_string(period, max_length=20).lower()
    
    if period not in valid_periods:
        raise ValueError(f"Invalid period: {period}")
    
    return period


def validate_positive_integer(value: Any, max_value: int = 1000000) -> int:
    """Validate positive integer"""
    try:
        int_value = int(value)
        
        if int_value < 1:
            raise ValueError("Value must be positive")
        
        if int_value > max_value:
            raise ValueError(f"Value exceeds maximum: {max_value}")
        
        return int_value
        
    except (ValueError, TypeError) as e:
        logger.error(f"Invalid integer: {value} - {e}")
        raise ValueError(f"Invalid integer: {value}")


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal"""
    if not filename:
        raise ValueError("Filename is required")
    
    # Remove directory separators
    filename = filename.replace("/", "").replace("\\", "").replace("..", "")
    
    # Remove special characters
    filename = re.sub(r'[^\w\s.-]', '', filename)
    
    # Limit length
    if len(filename) > 255:
        name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
        filename = name[:250] + ("." + ext if ext else "")
    
    return filename


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    if len(password) > 128:
        return False, "Password too long"
    
    # Check for at least one uppercase, lowercase, digit
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    return True, "Password is strong"


def rate_limit_key(user_id: Optional[int] = None) -> str:
    """Generate rate limit key for user or IP"""
    from flask import request
    from flask_limiter.util import get_remote_address
    
    if user_id:
        return f"user:{user_id}"
    
    return f"ip:{get_remote_address()}"
