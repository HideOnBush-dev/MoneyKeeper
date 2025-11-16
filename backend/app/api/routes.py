from flask import jsonify, request, abort
from flask_login import login_required, current_user
from app.api import bp
from app.models import Expense, Wallet, Budget, User
from app import db
from app.security import (
    validate_amount, validate_category, sanitize_string,
    validate_positive_integer, validate_date
)
from app.utils.ocr import ReceiptOCR
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

# Initialize OCR processor
receipt_ocr = ReceiptOCR()


@bp.route('/auth/me')
@login_required
def get_current_user():
    """Get current authenticated user"""
    try:
        return jsonify({
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email,
                'premium': getattr(current_user, 'premium', False)
            }
        }), 200
    except Exception as e:
        logger.exception(f"Error fetching user info: {e}")
        abort(500, description="Failed to fetch user information")


@bp.route('/dashboard')
@login_required
def get_dashboard():
    """Get dashboard statistics"""
    try:
        # Use aggregation for better performance
        from sqlalchemy import func
        from app.models import Wallet
        
        # Calculate total income (is_expense = False)
        total_income_result = db.session.query(
            func.sum(Expense.amount)
        ).filter(
            Expense.user_id == current_user.id,
            Expense.is_expense == False
        ).scalar()
        
        # Calculate total expenses (is_expense = True)
        total_expenses_result = db.session.query(
            func.sum(Expense.amount)
        ).filter(
            Expense.user_id == current_user.id,
            Expense.is_expense == True
        ).scalar()
        
        # Get total balance from all wallets
        total_balance_result = db.session.query(
            func.sum(Wallet.balance)
        ).filter(
            Wallet.user_id == current_user.id
        ).scalar()
        
        # Handle None values
        total_income = float(total_income_result) if total_income_result is not None else 0.0
        total_expenses = float(total_expenses_result) if total_expenses_result is not None else 0.0
        balance = float(total_balance_result) if total_balance_result is not None else 0.0
        
        # Get recent transactions (limit to 10)
        recent_expenses = Expense.query.filter_by(
            user_id=current_user.id
        ).order_by(Expense.date.desc()).limit(10).all()
        
        return jsonify({
            'totalIncome': total_income,
            'totalExpenses': total_expenses,
            'balance': balance,
            'recentTransactions': [{
                'id': e.id,
                'amount': float(e.amount),
                'category': e.category,
                'description': sanitize_string(e.description, max_length=200),
                'date': e.date.isoformat() if e.date else None
            } for e in recent_expenses]
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error in dashboard: {e}")
        abort(500, description="Failed to load dashboard data")
    except Exception as e:
        logger.exception(f"Error loading dashboard: {e}")
        abort(500, description="An error occurred")


@bp.route('/expenses')
@login_required
def get_expenses():
    """Get all expenses for current user with pagination"""
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)  # Max 100 per page
        
        # Validate pagination
        if page < 1 or per_page < 1:
            abort(400, description="Invalid pagination parameters")
        
        # Query with pagination
        pagination = Expense.query.filter_by(
            user_id=current_user.id
        ).order_by(Expense.date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'expenses': [{
                'id': e.id,
                'amount': float(e.amount),
                'category': e.category,
                'description': sanitize_string(e.description, max_length=500),
                'date': e.date.isoformat() if e.date else None,
                'wallet_id': e.wallet_id,
                'is_expense': getattr(e, 'is_expense', True)
            } for e in pagination.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching expenses: {e}")
        abort(500, description="Failed to fetch expenses")
    except Exception as e:
        logger.exception(f"Error fetching expenses: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets')
@login_required
def get_wallets():
    """Get all wallets for current user"""
    try:
        wallets = Wallet.query.filter_by(user_id=current_user.id).all()
        
        return jsonify({
            'wallets': [{
                'id': w.id,
                'name': sanitize_string(w.name, max_length=100),
                'balance': float(w.balance),
                'currency': getattr(w, 'currency', 'VND')
            } for w in wallets]
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching wallets: {e}")
        abort(500, description="Failed to fetch wallets")
    except Exception as e:
        logger.exception(f"Error fetching wallets: {e}")
        abort(500, description="An error occurred")


@bp.route('/budgets')
@login_required
def get_budgets():
    """Get all budgets for current user"""
    try:
        budgets = Budget.query.filter_by(user_id=current_user.id).all()
        
        return jsonify({
            'budgets': [{
                'id': b.id,
                'category': b.category,
                'amount': float(b.amount),
                'spent': float(getattr(b, 'spent', 0)),
                'period': getattr(b, 'period', 'monthly')
            } for b in budgets]
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching budgets: {e}")
        abort(500, description="Failed to fetch budgets")
    except Exception as e:
        logger.exception(f"Error fetching budgets: {e}")
        abort(500, description="An error occurred")


@bp.route('/process_receipt', methods=['POST'])
@login_required
def process_receipt():
    """Process receipt image using OCR (Google AI)"""
    try:
        if "receipt" not in request.files:
            abort(400, description="Không tìm thấy ảnh")
        
        file = request.files["receipt"]
        if not file or not file.filename:
            abort(400, description="File không hợp lệ")
        
        if not file.filename.lower().endswith((".jpg", ".jpeg", ".png")):
            abort(400, description="Chỉ hỗ trợ file ảnh (.jpg, .png)")
        
        # Process image with OCR
        result = receipt_ocr.process_image(file.read())
        
        # Check for OCR failures
        if result.get("error"):
            return jsonify({
                "success": False,
                "error": result["error"]
            }), 400
        
        return jsonify({
            "success": True,
            "amount": result.get("amount"),
            "date": result.get("date").isoformat() if result.get("date") else None,
            "text": result.get("text", ""),
        }), 200
        
    except ValueError as e:
        logger.exception(f"Validation error processing receipt: {e}")
        abort(400, description=str(e))
    except Exception as e:
        logger.exception(f"Error processing receipt: {e}")
        abort(500, description="Lỗi khi xử lý ảnh hóa đơn")
