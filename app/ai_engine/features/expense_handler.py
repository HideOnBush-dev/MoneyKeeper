import re
from typing import Optional, Tuple
from app.models import Expense
from app.database import db
from datetime import datetime

from app.utils.currency import convert_vietnamese_currency
from app.ai_engine.features.categorizer import ExpenseCategorizer
import logging

logger = logging.getLogger(__name__)


class ExpenseHandler:
    def __init__(self):
        self.patterns = [
            # Amount MUST be the first capturing group.
            r"([\d\s.,]+)\s*(k|nghìn|ngàn|triệu|tr|đồng|d|đ|vnd|vnđ)?\s*(?:cho|về việc|về|mua|trả|thanh toán)?\s*(.*)",  # Amount first
            r"([\d\s.,]+)\s*(k|nghìn|ngàn|triệu|tr|đồng|d|đ|vnd|vnđ)?\s*(.*?)\s*(?:với giá|hết|mất|tốn|là|giá|chi phí|tổng cộng|khoảng)?",  # Amount first (variant)
        ]
        self.categorizer = ExpenseCategorizer()

    def _extract_amount_string(self, match: re.Match) -> Optional[str]:
        """Helper function to safely extract the amount string."""
        if not match:
            return None

        # Try the first group (common case)
        amount_str = match.group(1)
        if amount_str and amount_str.strip():
            return amount_str.strip()

        return None  # No amount found

    def extract_expense(self, message: str) -> Tuple[Optional[str], Optional[float]]:
        """
        Extracts expense information (description and amount) from a text message.
        Returns a tuple: (description, amount). Returns (None, None) if no expense is found.
        """
        message = message.lower().strip()

        for pattern in self.patterns:
            match = re.search(pattern, message)
            amount_str = self._extract_amount_string(match)
            if (
                amount_str
            ):  # Only proceed if we *actually* have a non-empty amount string
                try:
                    # Find unit and description according to the matched group
                    unit = match.group(2) if len(match.groups()) > 1 else None
                    description = (
                        match.group(3) if len(match.groups()) > 2 else ""
                    )  # The rest

                    amount = convert_vietnamese_currency(amount_str, unit)
                    description = self._clean_description(description)
                    return description, amount
                except ValueError:
                    logger.warning(f"Invalid amount format in message: {message}")
                    return None, None  # Return None, None for invalid amounts
        return None, None

    def _clean_description(self, description: str) -> str:
        if not description:
            return "Chi tiêu"

        stop_words = ["chi", "tiêu", "trả", "mua", "thanh toán", "cho", "về việc", "về"]
        words = description.split()
        filtered_words = [word for word in words if word not in stop_words]
        return " ".join(filtered_words).strip() or "Chi tiêu"

    def suggest_category(self, description: str) -> str:
        return self.categorizer.predict_category(description)

    def save_expense(
        self,
        user_id: int,
        amount: float,
        description: str,
        category: str,
        wallet_id: int = None,
        is_expense: bool = True,
    ) -> Expense:

        try:
            expense = Expense(
                amount=amount,
                category=category,
                description=description,
                date=datetime.now(),
                user_id=user_id,
                wallet_id=wallet_id,
                is_expense=is_expense,
            )
            db.session.add(expense)
            db.session.commit()
            return expense
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Error saving expense: {e}")  # Added logging
            raise  # Re-raise exception to be handled by caller
