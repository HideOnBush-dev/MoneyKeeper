from flask.cli import FlaskGroup
from app import create_app, db
from app.models import User, Expense, Budget, Notification  # Import all your models!

app = create_app()
cli = FlaskGroup(app)


# Removed init_db, we'll use Flask-Migrate now
# @cli.command("init_db")
# def init_db():
#     """Initialize the database."""
#     db.drop_all()
#     db.create_all()
#     print("Initialized the database.")


@cli.command() # NEW COMMAND TO CREATE FIRST USER (ADMIN)
def create_admin():
    """Creates an admin user."""
    admin = User(username='admin', pin='2011') # SET DEFAULT ADMIN USER
    admin.set_password('SkyLine@@2025') # SET DEFAULT ADMIN PASSWORD
    db.session.add(admin)
    db.session.commit()
    print("Admin user created.")
if __name__ == "__main__":
    cli()