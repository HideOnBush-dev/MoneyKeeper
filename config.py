import os
from datetime import timedelta


class Config:
    SECRET_KEY = (
        os.environ.get("SECRET_KEY")
        or "dev-key-please-change-in-production-or-your-balls-will-explore-in-5-4-3-2-1"
    )
    SQLALCHEMY_DATABASE_URI = "sqlite:///moneykeeper.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=99999)
    BABEL_DEFAULT_LOCALE = "vi"
    LANGUAGES = ["en", "vi"]
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # Session cookie configuration for CORS
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    MAIL_SERVER = "smtp.example.com"  # UPDATE WITH YOUR MAIL SERVER
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.environ.get(
        "MAIL_DEFAULT_SENDER", "noreply@moneykeeper.com"
    )
    NOTIFY_VIA_EMAIL = True

    AI_MODEL_NAME = "meta-llama/Llama-3.2-3B-Instruct"  # Updated model name


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
