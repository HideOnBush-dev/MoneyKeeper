from app import db, login_manager
from flask_login import UserMixin
from datetime import datetime, date

from werkzeug.security import (
    generate_password_hash,
    check_password_hash,
)


@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    password_hash = db.Column(db.String(128))
    email = db.Column(db.String(120), unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_permanently_logged_in = db.Column(db.Boolean, default=False)
    budgets = db.relationship("Budget", back_populates="user")
    wallets = db.relationship("Wallet", backref="user", lazy="dynamic")
    chat_sessions = db.relationship("ChatSession", backref="user", lazy="dynamic")

    premium = db.Column(db.Boolean, default=False)  # Premium status
    chat_message_count = db.Column(db.Integer, default=0)  # Daily message count
    last_message_count_reset = db.Column(
        db.Date, default=date.today
    )  # Track reset date

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def set_permanent_login(self, status):
        self.is_permanently_logged_in = status
        db.session.commit()

    def get_default_wallet(self):
        default_wallet = self.wallets.filter_by(is_default=True).first()
        if not default_wallet:
            # If no wallets, create a default one
            default_wallet = Wallet(
                name="Ví chính", balance=0, is_default=True, user_id=self.id
            )
            db.session.add(default_wallet)
            db.session.commit()
        return default_wallet

    def reset_chat_message_count(self):
        """Resets the daily chat message count if needed."""
        today = date.today()
        if self.last_message_count_reset != today:
            self.chat_message_count = 0
            self.last_message_count_reset = today
            db.session.commit()

    def can_send_chat_message(self):
        """Checks if the user can send a chat message based on premium status and limits."""
        self.reset_chat_message_count()  # Reset if it's a new day
        if self.premium:
            return True  # No limit for premium users
        return self.chat_message_count < 200  # Limit for non premium user

    def increment_chat_message_count(self):
        """Increments the chat message count and commits to the database."""
        if not self.premium:
            self.chat_message_count += 1
        db.session.commit()


class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(200))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    wallet_id = db.Column(db.Integer, db.ForeignKey("wallet.id"), nullable=False)
    is_expense = db.Column(
        db.Boolean, default=True
    )  # True for expense, False for income


class Budget(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    month = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    user = db.relationship("User", back_populates="budgets")


class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    type = db.Column(
        db.String(50), nullable=False
    )  # e.g., 'budget_alert', 'unusual_spending'
    message = db.Column(db.String(500), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ChatSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    personality = db.Column(db.String(50), default="friendly")  # Default personality
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("chat_session.id"), nullable=False)
    is_user = db.Column(db.Boolean, default=True)  # True if user, False if AI
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Wallet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)
    balance = db.Column(db.Float, default=0.0)
    currency = db.Column(db.String(3), default="VND")
    description = db.Column(db.String(200))
    is_default = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    expenses = db.relationship("Expense", backref="wallet", lazy="dynamic")

    def update_balance(self, amount, is_expense=True):
        """Updates the wallet balance based on expense/income."""
        if is_expense:
            self.balance -= amount
        else:
            self.balance += amount
        db.session.commit()
