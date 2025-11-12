import click
from flask.cli import with_appcontext
from app import db


@click.command("init-db")
@with_appcontext
def init_db_command():
    """Clear existing data and create new tables."""
    db.drop_all()
    db.create_all()
    click.echo("Database initialized.")


@click.command("create-tables")
@with_appcontext
def create_tables_command():
    """Create new tables without dropping existing ones."""
    db.create_all()
    click.echo("Tables created.")
