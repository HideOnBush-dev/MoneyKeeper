# app/middleware.py
"""
Custom middleware for security and request handling
"""

from flask import request, jsonify, g
from functools import wraps
from flask_login import current_user
import logging
import time

logger = logging.getLogger(__name__)


def require_api_key(f):
    """Decorator to require API key for certain endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        
        # Implement your API key validation logic here
        # For now, we'll skip this for authenticated users
        if not current_user.is_authenticated and not api_key:
            return jsonify({'error': 'API key required'}), 401
        
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    """Decorator to require admin privileges"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        
        if not getattr(current_user, 'is_admin', False):
            return jsonify({'error': 'Admin access required'}), 403
        
        return f(*args, **kwargs)
    return decorated_function


def premium_required(f):
    """Decorator to require premium subscription"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        
        if not getattr(current_user, 'premium', False):
            return jsonify({
                'error': 'Premium subscription required',
                'upgrade_url': '/settings/upgrade'
            }), 403
        
        return f(*args, **kwargs)
    return decorated_function


def validate_json(f):
    """Decorator to validate JSON request"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method in ['POST', 'PUT', 'PATCH']:
            if not request.is_json:
                return jsonify({'error': 'Content-Type must be application/json'}), 400
            
            if not request.get_json():
                return jsonify({'error': 'Invalid JSON'}), 400
        
        return f(*args, **kwargs)
    return decorated_function


def log_slow_requests(threshold=1.0):
    """Decorator to log slow requests"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            start_time = time.time()
            result = f(*args, **kwargs)
            duration = time.time() - start_time
            
            if duration > threshold:
                logger.warning(
                    f"Slow request: {request.method} {request.path} "
                    f"took {duration:.2f}s"
                )
            
            return result
        return decorated_function
    return decorator


def track_request_metrics(f):
    """Decorator to track request metrics"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        g.request_start_time = time.time()
        g.request_method = request.method
        g.request_path = request.path
        
        try:
            result = f(*args, **kwargs)
            
            # Log successful request
            duration = time.time() - g.request_start_time
            logger.info(
                f"{g.request_method} {g.request_path} - "
                f"Status: 200 - Duration: {duration:.3f}s"
            )
            
            return result
            
        except Exception as e:
            # Log failed request
            duration = time.time() - g.request_start_time
            logger.error(
                f"{g.request_method} {g.request_path} - "
                f"Error: {str(e)} - Duration: {duration:.3f}s"
            )
            raise
            
    return decorated_function
