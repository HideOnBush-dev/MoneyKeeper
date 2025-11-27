from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_mail import Mail
from flask_moment import Moment
from sqlalchemy import event

# Initialize extensions
db = SQLAlchemy()
login_manager = LoginManager()
mail = Mail()
moment = Moment()


def init_db(app):
    """Initialize database with optimized settings"""

    # Configure database options
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_size": 10,
        "pool_recycle": 120,
        "pool_pre_ping": True,
        "connect_args": {
            "timeout": 30,
            "check_same_thread": False,  
        },
    }

    # Initialize database
    db.init_app(app)

    # Setup SQLite optimizations within app context
    with app.app_context():

        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute(
                "PRAGMA busy_timeout=10000"
            ) 
            cursor.close()

        # Register the event listener
        event.listen(db.engine, "connect", set_sqlite_pragma)
