from app import db
from app.models import Notification, Budget, Expense, User
from datetime import datetime
from app.utils.email import send_email
from flask import current_app
import logging

logger = logging.getLogger(__name__)


class NotificationManager:
    @staticmethod
    def check_budget_alerts(user_id):
        current_month = datetime.utcnow().month
        current_year = datetime.utcnow().year

        budgets = Budget.query.filter_by(
            user_id=user_id, month=current_month, year=current_year
        ).all()

        alerts = []
        for budget in budgets:
            expenses = (
                Expense.query.filter_by(user_id=user_id, category=budget.category)
                .filter(
                    db.extract("month", Expense.date) == current_month,
                    db.extract("year", Expense.date) == current_year,
                )
                .all()
            )

            total_spent = sum(e.amount for e in expenses)
            if budget.amount > 0:  # Prevent division by zero
                percentage = (total_spent / budget.amount) * 100
            else:
                percentage = 0

            if percentage >= 90:
                message = f"Cảnh báo: Chi tiêu danh mục {budget.category} đã đạt {percentage:.1f}% ngân sách"
                NotificationManager.create_notification(
                    user_id, "budget_alert", message
                )
                alerts.append(message)
                # Get user object for email
                user = User.query.get(user_id)
                if user:
                    NotificationManager.notify_budget_alert(
                        user, budget.category, percentage, total_spent, budget.amount
                    )

        return alerts

    @staticmethod
    def create_notification(user_id, type, message):
        notification = Notification(user_id=user_id, type=type, message=message)
        db.session.add(notification)
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.exception(
                f"Error creating notification: {e}"
            )  # Log the full traceback

    @staticmethod
    def mark_as_read(notification_id, user_id):
        notification = Notification.query.filter_by(
            id=notification_id, user_id=user_id
        ).first()

        if not notification:
            raise ValueError(
                f"Notification with id {notification_id} not found for user {user_id}"
            )

        notification.is_read = True
        db.session.commit()

    @staticmethod
    def notify_budget_alert(user, category, percentage, amount, budget_amount):
        message = (
            f"Cảnh báo: Chi tiêu danh mục {category} đã đạt {percentage:.1f}% ngân sách"
        )

        NotificationManager.create_notification(user.id, "budget_alert", message)

        if (
            current_app.config.get("NOTIFY_VIA_EMAIL")
            and hasattr(user, "email")
            and user.email
            and "mail" in current_app.extensions
        ):
            try:
                send_email(
                    subject="Cảnh báo ngân sách",
                    recipient=user.email,
                    template="budget_alert",
                    user=user,
                    category=category,
                    percentage=int(
                        round(percentage)
                    ),  # Use integer percentage in email
                    amount=amount,
                    budget_amount=budget_amount,
                )
            except Exception as e:
                logger.exception(f"Failed to send budget alert email: {e}")

    @staticmethod
    def notify_unusual_spending(user, category, amount, average):
        message = f"Chi tiêu bất thường: {amount:,.0f}₫ cho {category}"

        NotificationManager.create_notification(user.id, "unusual_spending", message)

        if current_app.config["NOTIFY_VIA_EMAIL"]:
            try:
                send_email(
                    subject="Chi tiêu bất thường",
                    recipient=user.email,
                    template="unusual_spending",
                    user=user,
                    category=category,
                    amount=amount,
                    average=average,
                )
            except Exception as e:
                logger.exception(f"Failed to send unusual spending email: {e}")
