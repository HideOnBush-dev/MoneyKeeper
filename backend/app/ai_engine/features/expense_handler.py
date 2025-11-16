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
            # Pattern for "tôi vừa chi 20k ăn sáng" or "chi 20k ăn sáng"
            r"(?:tôi\s+)?(?:vừa\s+)?(?:chi|tiêu|trả|mua|thanh\s+toán)\s+([\d\s.,]+)\s*(k|nghìn|ngàn|triệu|tr|đồng|d|đ|vnd|vnđ)?\s+(.*)",  # "chi 20k ăn sáng"
            # Pattern for "20k cho ăn sáng" or "20k ăn sáng"
            r"([\d\s.,]+)\s*(k|nghìn|ngàn|triệu|tr|đồng|d|đ|vnd|vnđ)?\s*(?:cho|về\s+việc|về|mua|trả|thanh\s+toán)?\s*(.*)",  # Amount first
            # Pattern for "20k với giá..." or "20k hết..."
            r"([\d\s.,]+)\s*(k|nghìn|ngàn|triệu|tr|đồng|d|đ|vnd|vnđ)?\s*(.*?)\s*(?:với\s+giá|hết|mất|tốn|là|giá|chi\s+phí|tổng\s+cộng|khoảng)",  # Amount first (variant)
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
        message_lower = message.lower().strip()
        logger.debug(f"Extracting expense from message: {message}")

        for i, pattern in enumerate(self.patterns):
            match = re.search(pattern, message_lower)
            if match:
                logger.debug(f"Pattern {i} matched: {pattern}")
                amount_str = self._extract_amount_string(match)
                if amount_str:  # Only proceed if we *actually* have a non-empty amount string
                    try:
                        # Find unit and description according to the matched group
                        unit = match.group(2) if len(match.groups()) > 1 else None
                        description = (
                            match.group(3) if len(match.groups()) > 2 else ""
                        )  # The rest

                        amount = convert_vietnamese_currency(amount_str, unit)
                        description = self._clean_description(description)
                        logger.info(f"Extracted expense: {description} - {amount} VND")
                        return description, amount
                    except ValueError as e:
                        logger.warning(f"Invalid amount format in message: {message}, error: {e}")
                        return None, None  # Return None, None for invalid amounts
        
        logger.debug(f"No expense pattern matched for message: {message}")
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
        """Save expense and update wallet balance"""
        from app.models import Wallet
        
        try:
            # Get wallet - use default wallet if not specified
            if wallet_id is None:
                wallet = Wallet.query.filter_by(
                    user_id=user_id,
                    is_default=True
                ).first()
                if not wallet:
                    # If no default wallet, get the first wallet
                    wallet = Wallet.query.filter_by(user_id=user_id).first()
                if wallet:
                    wallet_id = wallet.id
                    logger.debug(f"Using default wallet {wallet_id} for user {user_id}")
                else:
                    logger.error(f"No wallet found for user {user_id}")
                    raise ValueError("No wallet available. Please create a wallet first.")
            
            # Verify wallet ownership
            wallet = Wallet.query.filter_by(
                id=wallet_id,
                user_id=user_id
            ).first()
            
            if not wallet:
                raise ValueError(f"Wallet {wallet_id} not found or not owned by user {user_id}")
            
            # Create expense
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
            
            # Update wallet balance (don't commit yet, we'll commit after)
            wallet.update_balance(float(amount), is_expense=is_expense, commit=False)
            
            db.session.commit()
            logger.info(f"Saved expense {expense.id}: {amount} VND for {description} (category: {category}) in wallet {wallet_id}")
            return expense
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Error saving expense: {e}") 
            raise 
