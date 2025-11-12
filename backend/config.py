import os
from datetime import timedelta


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, '..'))
INSTANCE_DIR = os.path.join(PROJECT_ROOT, 'instance')
os.makedirs(INSTANCE_DIR, exist_ok=True)
DB_FILE = os.path.join(INSTANCE_DIR, 'moneykeeper.db')


class Config:
    # Security
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-key-please-change-in-production"
    
    # Warn if using default key
    if SECRET_KEY == "dev-key-please-change-in-production" and os.environ.get("FLASK_ENV") == "production":
        raise ValueError("SECRET_KEY must be set in production environment")
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or f"sqlite:///{DB_FILE}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }
    
    # Session
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    # Persistent sessions / remember-me
    REMEMBER_COOKIE_DURATION = timedelta(days=3650)  # ~10 years
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SECURE = False  # Set to True in production with HTTPS
    REMEMBER_COOKIE_SAMESITE = "Lax"
    
    # Localization
    BABEL_DEFAULT_LOCALE = "vi"
    LANGUAGES = ["en", "vi"]
    
    # File upload
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf"}
    
    # Frontend configuration
    USE_REACT_FRONTEND = os.environ.get("USE_REACT_FRONTEND", "true").lower() == "true"
    
    # Email Configuration
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 587))
    MAIL_USE_TLS = os.environ.get("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.environ.get(
        "MAIL_DEFAULT_SENDER", "noreply@moneykeeper.com"
    )
    NOTIFY_VIA_EMAIL = os.environ.get("NOTIFY_VIA_EMAIL", "true").lower() == "true"

    # Google AI Configuration
    GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
    # Use gemini-flash-latest (stable) or gemini-2.5-flash for best performance
    # Other options: gemini-pro-latest, gemini-2.0-flash
    AI_MODEL_NAME = os.environ.get("AI_MODEL_NAME", "gemini-flash-latest")
    AI_REQUEST_TIMEOUT = int(os.environ.get("AI_REQUEST_TIMEOUT", 30))
    AI_MAX_RETRIES = int(os.environ.get("AI_MAX_RETRIES", 3))
    
    # Rate Limiting
    RATELIMIT_ENABLED = False
    RATELIMIT_STORAGE_URL = os.environ.get("REDIS_URL", "memory://")
    RATELIMIT_DEFAULT = "200 per day, 50 per hour"
    RATELIMIT_HEADERS_ENABLED = True


class DevelopmentConfig(Config):
    DEBUG = True
    SESSION_COOKIE_SECURE = False
    RATELIMIT_ENABLED = False  # Disable rate limiting in dev


class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    TESTING = False
    
    # Strict security settings
    SQLALCHEMY_ECHO = False
    
    # Force HTTPS in production
    PREFERRED_URL_SCHEME = "https"
    
    # Stricter rate limits for production
    RATELIMIT_DEFAULT = "100 per day, 30 per hour"


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}

