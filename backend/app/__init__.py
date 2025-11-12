# app/__init__.py

from flask import Flask, request, jsonify
from config import Config
from app.database import db, login_manager, mail, moment, init_db
from flask_migrate import Migrate
from flask_cors import CORS
from flask_talisman import Talisman
import os
from flask_socketio import SocketIO
import logging
from app.utils import format_currency
from flask_babel import Babel, _
from werkzeug.exceptions import HTTPException


# Configure logging
logging.basicConfig(
    level=logging.INFO if os.environ.get("FLASK_ENV") != "production" else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

socketio = SocketIO()
babel = Babel()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Enable HTTPS security headers in production
    if not app.debug:
        Talisman(app, 
                force_https=False,  # Set to True when using HTTPS
                strict_transport_security=True,
                content_security_policy={
                    'default-src': "'self'",
                    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                    'style-src': ["'self'", "'unsafe-inline'"],
                    'img-src': ["'self'", "data:", "https:"],
                    'font-src': ["'self'", "data:"],
                }
        )
    
    # Enable CORS for development with React frontend
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:8000",
    ]
    
    # Add production origins from environment
    prod_origin = os.environ.get("FRONTEND_URL")
    if prod_origin:
        allowed_origins.append(prod_origin)
    
    CORS(app, 
         resources={
             r"/api/*": {"origins": allowed_origins},
             r"/auth/*": {"origins": allowed_origins},
             r"/socket.io/*": {"origins": allowed_origins}
         }, 
         supports_credentials=True,
         expose_headers=["Content-Type", "X-CSRFToken"],
         allow_headers=["Content-Type", "Authorization", "X-CSRFToken"]
    )

    init_db(app)
    login_manager.init_app(app)
    mail.init_app(app)
    moment.init_app(app)
    migrate = Migrate(app, db)
    socketio.init_app(app, async_mode="threading", cors_allowed_origins=allowed_origins)
    babel.init_app(app)

    login_manager.login_view = "auth.login"
    login_manager.login_message = "Vui lòng đăng nhập để truy cập trang này."
    login_manager.login_message_category = "info"
    login_manager.session_protection = "strong"  # Protect against session hijacking

    from app.commands import init_db_command, create_tables_command

    app.cli.add_command(init_db_command)
    app.cli.add_command(create_tables_command)
    
    # Ensure all tables exist on startup
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            logger.warning(f"Could not create all tables on startup: {e}")

    @app.context_processor
    def utility_processor():
        return dict(format_currency=format_currency)
    
    # Global error handlers
    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        """Handle HTTP exceptions safely"""
        response = {
            "error": e.name,
            "message": e.description,
            "status": e.code
        }
        return jsonify(response), e.code
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Handle unexpected exceptions"""
        logger.exception(f"Unhandled exception: {e}")
        
        # Don't leak error details in production
        if app.debug:
            response = {
                "error": "Internal Server Error",
                "message": str(e),
                "type": type(e).__name__
            }
        else:
            response = {
                "error": "Internal Server Error",
                "message": "An unexpected error occurred. Please try again later."
            }
        
        return jsonify(response), 500
    
    @app.before_request
    def log_request_info():
        """Log request information"""
        if not request.path.startswith('/static'):
            # Prefer X-Forwarded-For when behind proxies; fallback to remote_addr
            client_ip = request.headers.get('X-Forwarded-For', request.remote_addr) or ""
            if ',' in client_ip:
                client_ip = client_ip.split(',')[0].strip()
            logger.info(f"{request.method} {request.path} - {client_ip}")
    
    @app.after_request
    def add_security_headers(response):
        """Add security headers to all responses"""
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Remove server header
        response.headers.pop('Server', None)
        
        return response

    with app.app_context():
        from app.auth import bp as auth_bp
        from app.main import bp as main_bp
        from app.settings import bp as settings_bp
        from app.api import bp as api_bp

        app.register_blueprint(auth_bp, url_prefix='/auth')
        app.register_blueprint(main_bp)
        app.register_blueprint(settings_bp, url_prefix='/settings')
        app.register_blueprint(api_bp, url_prefix='/api')

        from app.admin import configure_admin

        configure_admin(app)

        if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
            logger.info("Initializing Google AI...")
            from app.ai_engine.core.model_manager import model_manager

            try:
                model_manager.initialize()
                from app.ai_engine.features.chat import AIChat
                from app.ai_engine.features.analysis import ExpenseAnalyzer
                from app.ai_engine.features.predictor import ExpensePredictor
                from app.ai_engine.features.categorizer import ExpenseCategorizer

                app.expense_analyzer = ExpenseAnalyzer()
                app.expense_categorizer = ExpenseCategorizer()
                app.expense_predictor = ExpensePredictor()
                app.ai_chat = AIChat()
                logger.info("Google AI initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Google AI: {e}")
                logger.warning("Application will run without AI features. Please set GOOGLE_API_KEY environment variable.")
                # Set None to indicate AI features are not available
                app.expense_analyzer = None
                app.expense_categorizer = None
                app.expense_predictor = None
                app.ai_chat = None

    return app
