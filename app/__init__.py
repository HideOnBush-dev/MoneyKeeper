# app/__init__.py

from flask import Flask
from config import Config
from app.database import db, login_manager, mail, moment, init_db  # Keep db here
from flask_migrate import Migrate
from flask_cors import CORS
import os
from flask_socketio import SocketIO
import logging
from app.utils import format_currency

from flask_babel import Babel, _


# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

socketio = SocketIO()
babel = Babel()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Enable CORS for development with React frontend
    CORS(app, resources={
        r"/api/*": {"origins": "http://localhost:3000"},
        r"/auth/*": {"origins": "http://localhost:3000"}
    }, supports_credentials=True)

    init_db(app)
    login_manager.init_app(app)
    mail.init_app(app)
    moment.init_app(app)
    migrate = Migrate(app, db)
    socketio.init_app(app, async_mode="threading")
    babel.init_app(app)

    login_manager.login_view = "auth.login"
    login_manager.login_message = "Vui lòng đăng nhập để truy cập trang này."
    login_manager.login_message_category = "info"

    from app.commands import init_db_command, create_tables_command

    app.cli.add_command(init_db_command)
    app.cli.add_command(create_tables_command)

    @app.context_processor
    def utility_processor():
        return dict(format_currency=format_currency)

    with app.app_context():
        from app.auth import bp as auth_bp
        from app.main import bp as main_bp
        from app.settings import bp as settings_bp
        from app.api import bp as api_bp

        app.register_blueprint(auth_bp)
        app.register_blueprint(main_bp)
        app.register_blueprint(settings_bp)
        app.register_blueprint(api_bp)

        from app.admin import configure_admin

        configure_admin(app)

        if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
            logger.info("Preloading AI models...")
            from app.ai_engine.core.model_manager import model_manager

            try:
                model_manager.preload_models()
                from app.ai_engine.features.chat import AIChat
                from app.ai_engine.features.analysis import ExpenseAnalyzer
                from app.ai_engine.features.predictor import ExpensePredictor
                from app.ai_engine.features.categorizer import ExpenseCategorizer

                app.expense_analyzer = ExpenseAnalyzer()
                app.expense_categorizer = ExpenseCategorizer()
                app.expense_predictor = ExpensePredictor()
                app.ai_chat = AIChat()
                logger.info("AI models preloaded.")
            except Exception as e:
                logger.error(f"Failed to load AI models: {e}")
                logger.warning("Application will run without AI features. Please set up Hugging Face authentication and download models.")
                # Set None to indicate AI features are not available
                app.expense_analyzer = None
                app.expense_categorizer = None
                app.expense_predictor = None
                app.ai_chat = None

    return app
