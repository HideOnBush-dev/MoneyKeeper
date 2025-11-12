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


def validate_category(category: str, user_id: Optional[int] = None) -> str:
    """Validate expense category against user's custom categories
    
    Args:
        category: Category slug to validate
        user_id: User ID to check against (if None, uses current_user)
    
    Returns:
        Valid category slug, or 'other' if not found
    """
    # Import here to avoid circular imports
    from flask_login import current_user
    from app.models import Category
    
    category = sanitize_string(category, max_length=50).lower()
    
    # Determine user
    uid = user_id if user_id else (current_user.id if current_user and current_user.is_authenticated else None)
    
    if not uid:
        # No user context, use default fallback
        logger.warning(f"No user context for category validation: {category}")
        return "other"
    
    # Check if category table exists, create if not
    try:
        # Try to query - if table doesn't exist, this will raise an exception
        cat = Category.query.filter_by(user_id=uid, slug=category).first()
    except Exception as e:
        # Table might not exist, try to create it
        logger.warning(f"Category table query failed: {e}, attempting to create table")
        try:
            from app import db
            Category.__table__.create(db.engine, checkfirst=True)
            logger.info("Category table created successfully")
            cat = None  # Will fall through to initialization
        except Exception as create_error:
            logger.error(f"Failed to create category table: {create_error}")
            return "other"  # Fallback to default
    
    if not cat:
        # Category doesn't exist, try to find 'other' category
        other_cat = Category.query.filter_by(user_id=uid, slug='other').first()
        if other_cat:
            logger.warning(f"Invalid category: {category}, defaulting to 'other'")
            return "other"
        else:
            # 'other' doesn't exist either, initialize default categories
            from app.api.categories import init_default_categories
            init_default_categories(uid)
            logger.info(f"Initialized default categories for user {uid}")
            return "other"
    
    return cat.slug


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
    
    if user_id:
        return f"user:{user_id}"
    
    # Derive client IP without Flask-Limiter
    ip = request.headers.get("X-Forwarded-For", request.remote_addr) or ""
    if "," in ip:
        ip = ip.split(",")[0].strip()
    return f"ip:{ip}"
