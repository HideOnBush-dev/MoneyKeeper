from app import db, login_manager
from flask_login import UserMixin
from datetime import datetime, date, timedelta

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


class Category(db.Model):
    """User-defined expense categories with custom icons and colors"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(50), nullable=False)  # Display name (e.g., "Ăn uống")
    slug = db.Column(db.String(50), nullable=False)  # URL-safe identifier (e.g., "food")
    icon = db.Column(db.String(10), default="📦")  # Emoji icon
    color = db.Column(db.String(50), default="gray")  # Tailwind gradient color
    is_default = db.Column(db.Boolean, default=False)  # System default categories
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    user = db.relationship("User", backref=db.backref("categories", lazy="dynamic"))
    
    # Unique constraint: user can't have duplicate slugs
    __table_args__ = (
        db.UniqueConstraint('user_id', 'slug', name='_user_category_slug_uc'),
    )


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

    def update_balance(self, amount, is_expense=True, commit=True):
        """Updates the wallet balance based on expense/income."""
        if is_expense:
            self.balance -= amount
        else:
            self.balance += amount
        if commit:
            db.session.commit()


class SavingsGoal(db.Model):
    """Savings goals for users to track their financial targets"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    target_amount = db.Column(db.Float, nullable=False)
    current_amount = db.Column(db.Float, default=0.0)
    deadline = db.Column(db.Date)
    description = db.Column(db.String(500))
    icon = db.Column(db.String(10), default="🎯")  # Emoji icon
    color = db.Column(db.String(50), default="blue")  # Tailwind gradient color
    wallet_id = db.Column(db.Integer, db.ForeignKey("wallet.id"), nullable=True)  # Optional link to wallet
    is_achieved = db.Column(db.Boolean, default=False)
    achieved_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship("User", backref=db.backref("savings_goals", lazy="dynamic"))
    wallet = db.relationship("Wallet", backref=db.backref("savings_goals", lazy="dynamic"))
    
    def get_progress_percentage(self):
        """Calculate progress percentage"""
        if self.target_amount <= 0:
            return 0
        return min(100, (self.current_amount / self.target_amount) * 100)
    
    def get_remaining_amount(self):
        """Calculate remaining amount to reach goal"""
        return max(0, self.target_amount - self.current_amount)
    
    def is_overdue(self):
        """Check if goal deadline has passed"""
        if not self.deadline:
            return False
        return date.today() > self.deadline and not self.is_achieved
    
    def add_amount(self, amount):
        """Add amount to current savings"""
        self.current_amount += amount
        if self.current_amount >= self.target_amount and not self.is_achieved:
            self.is_achieved = True
            self.achieved_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        db.session.commit()


class RecurringTransaction(db.Model):
    """Recurring transactions (subscriptions, bills, etc.)"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    frequency = db.Column(db.String(20), nullable=False)  # daily, weekly, monthly, yearly
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)  # Optional end date
    next_due_date = db.Column(db.Date, nullable=False)
    wallet_id = db.Column(db.Integer, db.ForeignKey("wallet.id"), nullable=False)
    description = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)
    auto_create = db.Column(db.Boolean, default=True)  # Auto create expense when due
    is_expense = db.Column(db.Boolean, default=True)  # True for expense, False for income
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship("User", backref=db.backref("recurring_transactions", lazy="dynamic"))
    wallet = db.relationship("Wallet", backref=db.backref("recurring_transactions", lazy="dynamic"))
    
    def calculate_next_due_date(self, from_date=None):
        """Calculate next due date based on frequency"""
        if from_date is None:
            from_date = date.today()
        
        if self.frequency == 'daily':
            return from_date + timedelta(days=1)
        elif self.frequency == 'weekly':
            return from_date + timedelta(weeks=1)
        elif self.frequency == 'monthly':
            # Add one month
            if from_date.month == 12:
                return date(from_date.year + 1, 1, from_date.day)
            else:
                return date(from_date.year, from_date.month + 1, from_date.day)
        elif self.frequency == 'yearly':
            return date(from_date.year + 1, from_date.month, from_date.day)
        else:
            return from_date
    
    def is_due(self):
        """Check if transaction is due today or overdue"""
        return self.next_due_date <= date.today()
    
    def can_execute(self):
        """Check if transaction can be executed (active, not past end date)"""
        if not self.is_active:
            return False
        if self.end_date and self.end_date < date.today():
            return False
        return True
    
    def execute(self):
        """Execute the recurring transaction by creating an expense"""
        if not self.can_execute():
            return None
        
        from app.models import Expense
        
        # Create expense
        expense = Expense(
            user_id=self.user_id,
            amount=self.amount,
            category=self.category,
            description=self.description or f"{self.name} (Tự động từ giao dịch định kỳ)",
            date=datetime.combine(self.next_due_date, datetime.min.time()),
            wallet_id=self.wallet_id,
            is_expense=self.is_expense
        )
        
        db.session.add(expense)
        
        # Update wallet balance
        wallet = Wallet.query.get(self.wallet_id)
        if wallet:
            wallet.update_balance(self.amount, is_expense=self.is_expense, commit=False)
        
        # Update next due date
        self.next_due_date = self.calculate_next_due_date(self.next_due_date)
        self.updated_at = datetime.utcnow()
        
        db.session.commit()
        return expense


class Debt(db.Model):
    """Track debts - money you owe or money owed to you"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)  # e.g., "Loan from John", "Credit card debt"
    creditor_name = db.Column(db.String(100))  # Name of person/institution
    total_amount = db.Column(db.Float, nullable=False)  # Original debt amount
    remaining_amount = db.Column(db.Float, nullable=False)  # Current remaining amount
    interest_rate = db.Column(db.Float, default=0.0)  # Annual interest rate in percentage
    start_date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date, nullable=True)  # Final due date
    payment_frequency = db.Column(db.String(20), nullable=True)  # daily, weekly, monthly, yearly
    next_payment_date = db.Column(db.Date, nullable=True)
    next_payment_amount = db.Column(db.Float, nullable=True)
    description = db.Column(db.String(500))
    is_paid = db.Column(db.Boolean, default=False)
    is_lending = db.Column(db.Boolean, default=False)  # False = you owe money, True = someone owes you
    wallet_id = db.Column(db.Integer, db.ForeignKey("wallet.id"), nullable=True)  # Optional link to wallet
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship("User", backref=db.backref("debts", lazy="dynamic"))
    wallet = db.relationship("Wallet", backref=db.backref("debts", lazy="dynamic"))
    payments = db.relationship("DebtPayment", backref="debt", lazy="dynamic", cascade="all, delete-orphan")
    
    def get_progress_percentage(self):
        """Calculate how much of the debt has been paid"""
        if self.total_amount <= 0:
            return 0
        paid_amount = self.total_amount - self.remaining_amount
        return min(100, (paid_amount / self.total_amount) * 100)
    
    def is_overdue(self):
        """Check if debt payment is overdue"""
        if not self.next_payment_date or self.is_paid:
            return False
        return date.today() > self.next_payment_date
    
    def calculate_next_payment_date(self, from_date=None):
        """Calculate next payment date based on frequency"""
        if from_date is None:
            from_date = date.today()
        
        if not self.payment_frequency:
            return None
            
        if self.payment_frequency == 'daily':
            return from_date + timedelta(days=1)
        elif self.payment_frequency == 'weekly':
            return from_date + timedelta(weeks=1)
        elif self.payment_frequency == 'monthly':
            # Add one month
            if from_date.month == 12:
                return date(from_date.year + 1, 1, from_date.day)
            else:
                return date(from_date.year, from_date.month + 1, from_date.day)
        elif self.payment_frequency == 'yearly':
            return date(from_date.year + 1, from_date.month, from_date.day)
        else:
            return None
    
    def add_payment(self, amount, payment_date=None, notes=None):
        """Record a payment towards this debt"""
        if payment_date is None:
            payment_date = date.today()
        
        # Create payment record
        payment = DebtPayment(
            debt_id=self.id,
            amount=amount,
            payment_date=payment_date,
            notes=notes
        )
        db.session.add(payment)
        
        # Update remaining amount
        self.remaining_amount -= amount
        if self.remaining_amount <= 0:
            self.remaining_amount = 0
            self.is_paid = True
        
        # Update next payment date
        if self.payment_frequency and not self.is_paid:
            self.next_payment_date = self.calculate_next_payment_date(payment_date)
        
        self.updated_at = datetime.utcnow()
        db.session.commit()
        return payment


class DebtPayment(db.Model):
    """Track individual payments made towards a debt"""
    id = db.Column(db.Integer, primary_key=True)
    debt_id = db.Column(db.Integer, db.ForeignKey("debt.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.Date, nullable=False, default=date.today)
    notes = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)