from flask_admin import Admin, AdminIndexView
from flask_admin.contrib.sqla import ModelView
from flask_login import current_user, login_required
from flask import redirect, url_for, request
from app import db
from app.models import (
    User,
    Expense,
    Budget,
    Notification,
    ChatSession,
    ChatMessage,
    Wallet,
)


# Create a custom admin index view to handle authentication
class MyAdminIndexView(AdminIndexView):
    @login_required
    def is_accessible(self):
        return current_user.is_authenticated and current_user.username == "admin"

    def inaccessible_callback(self, name, **kwargs):
        # Redirect to login page if not authorized.
        if not current_user.is_authenticated:
            return redirect(url_for("auth.login", next=request.url))
        return redirect(url_for("main.index"))


# Create a custom ModelView for User to allow editing of premium status
class UserAdminView(ModelView):
    column_list = (
        "id",
        "username",
        "email",
        "premium",
        "created_at",
        "chat_message_count",
        "last_message_count_reset",
    )
    
    # Update form configuration
    form_columns = [
        "username",
        "email",
        "premium",
        "chat_message_count",
        "last_message_count_reset"
    ]
    
    column_searchable_list = ["username", "email"]
    can_export = True
    
    # Add form widget overrides if needed
    form_widget_args = {
        'chat_message_count': {
            'type': 'number'
        }
    }

    def is_accessible(self):
        return current_user.is_authenticated and current_user.username == "admin"

    def inaccessible_callback(self, name, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for("auth.login", next=request.url))
        return redirect(url_for("main.index"))


class ReadOnlyModelView(ModelView):
    can_create = False
    can_edit = False
    can_delete = False

    def is_accessible(self):
        return current_user.is_authenticated and current_user.username == "admin"

    def inaccessible_callback(self, name, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for("auth.login", next=request.url))
        return redirect(url_for("main.index"))


def configure_admin(app):
    admin = Admin(
        app,
        name="MoneyKeeper Admin",
        template_mode="bootstrap4",
        index_view=MyAdminIndexView(),
    )

    admin.add_view(UserAdminView(User, db.session))
    admin.add_view(ReadOnlyModelView(Expense, db.session))
    admin.add_view(ReadOnlyModelView(Budget, db.session))
    admin.add_view(ReadOnlyModelView(Notification, db.session))
    admin.add_view(ReadOnlyModelView(ChatSession, db.session))
    admin.add_view(ReadOnlyModelView(ChatMessage, db.session))
    admin.add_view(ReadOnlyModelView(Wallet, db.session))

    return admin
