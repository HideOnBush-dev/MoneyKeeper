"""
API endpoints for wallet management
"""

from flask import jsonify, request, abort
from flask_login import login_required, current_user
from app.api import bp
from app.models import Wallet, Expense
from app import db, limiter
from app.security import (
    validate_amount, sanitize_string,
    validate_positive_integer
)
from app.middleware import validate_json, log_slow_requests
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@bp.route('/wallets', methods=['POST'])
@login_required
@validate_json
@log_slow_requests(threshold=2.0)
def create_wallet():
    """Create a new wallet"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            abort(400, description="Wallet name is required")
        
        # Validate and sanitize inputs
        name = sanitize_string(data['name'], max_length=100)
        balance = validate_amount(data.get('balance', 0))
        description = sanitize_string(data.get('description', ''), max_length=500)
        currency = sanitize_string(data.get('currency', 'VND'), max_length=3)
        is_default = bool(data.get('is_default', False))
        
        # If setting as default, unset other defaults
        if is_default:
            Wallet.query.filter_by(
                user_id=current_user.id,
                is_default=True
            ).update({'is_default': False})
        
        # Create wallet
        wallet = Wallet(
            name=name,
            balance=float(balance),
            description=description,
            currency=currency,
            is_default=is_default,
            user_id=current_user.id
        )
        
        db.session.add(wallet)
        db.session.commit()
        
        logger.info(f"User {current_user.id} created wallet {wallet.id}")
        
        return jsonify({
            'message': 'Wallet created successfully',
            'wallet': {
                'id': wallet.id,
                'name': wallet.name,
                'balance': float(wallet.balance),
                'currency': wallet.currency,
                'description': wallet.description,
                'is_default': wallet.is_default,
                'created_at': wallet.created_at.isoformat()
            }
        }), 201
        
    except ValueError as e:
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error creating wallet: {e}")
        abort(500, description="Failed to create wallet")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error creating wallet: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/<int:wallet_id>', methods=['GET'])
@login_required
def get_wallet(wallet_id):
    """Get a specific wallet with statistics"""
    try:
        wallet = Wallet.query.filter_by(
            id=wallet_id,
            user_id=current_user.id
        ).first()
        
        if not wallet:
            abort(404, description="Wallet not found")
        
        # Calculate statistics
        expenses = Expense.query.filter_by(wallet_id=wallet_id, is_expense=True)
        income = Expense.query.filter_by(wallet_id=wallet_id, is_expense=False)
        
        total_expenses = db.session.query(func.sum(Expense.amount)).filter(
            Expense.wallet_id == wallet_id,
            Expense.is_expense == True
        ).scalar() or 0
        
        total_income = db.session.query(func.sum(Expense.amount)).filter(
            Expense.wallet_id == wallet_id,
            Expense.is_expense == False
        ).scalar() or 0
        
        transaction_count = Expense.query.filter_by(wallet_id=wallet_id).count()
        
        return jsonify({
            'wallet': {
                'id': wallet.id,
                'name': wallet.name,
                'balance': float(wallet.balance),
                'currency': wallet.currency,
                'description': wallet.description,
                'is_default': wallet.is_default,
                'created_at': wallet.created_at.isoformat(),
                'statistics': {
                    'total_expenses': float(total_expenses),
                    'total_income': float(total_income),
                    'transaction_count': transaction_count
                }
            }
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching wallet: {e}")
        abort(500, description="Failed to fetch wallet")
    except Exception as e:
        logger.exception(f"Error fetching wallet: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/<int:wallet_id>', methods=['PUT', 'PATCH'])
@login_required
@validate_json
def update_wallet(wallet_id):
    """Update an existing wallet"""
    try:
        wallet = Wallet.query.filter_by(
            id=wallet_id,
            user_id=current_user.id
        ).first()
        
        if not wallet:
            abort(404, description="Wallet not found")
        
        data = request.get_json()
        
        # Update fields if provided
        if 'name' in data:
            wallet.name = sanitize_string(data['name'], max_length=100)
        
        if 'balance' in data:
            new_balance = validate_amount(data['balance'])
            wallet.balance = float(new_balance)
        
        if 'description' in data:
            wallet.description = sanitize_string(data['description'], max_length=500)
        
        if 'currency' in data:
            wallet.currency = sanitize_string(data['currency'], max_length=3)
        
        if 'is_default' in data:
            is_default = bool(data['is_default'])
            if is_default and not wallet.is_default:
                # Unset other defaults
                Wallet.query.filter_by(
                    user_id=current_user.id,
                    is_default=True
                ).update({'is_default': False})
            wallet.is_default = is_default
        
        db.session.commit()
        
        logger.info(f"User {current_user.id} updated wallet {wallet_id}")
        
        return jsonify({
            'message': 'Wallet updated successfully',
            'wallet': {
                'id': wallet.id,
                'name': wallet.name,
                'balance': float(wallet.balance),
                'currency': wallet.currency,
                'description': wallet.description,
                'is_default': wallet.is_default
            }
        }), 200
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error updating wallet: {e}")
        abort(500, description="Failed to update wallet")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error updating wallet: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/<int:wallet_id>', methods=['DELETE'])
@login_required
def delete_wallet(wallet_id):
    """Delete a wallet"""
    try:
        wallet = Wallet.query.filter_by(
            id=wallet_id,
            user_id=current_user.id
        ).first()
        
        if not wallet:
            abort(404, description="Wallet not found")
        
        # Check if it's the default wallet
        if wallet.is_default:
            abort(400, description="Cannot delete default wallet")
        
        # Check if wallet has transactions
        transaction_count = Expense.query.filter_by(wallet_id=wallet_id).count()
        if transaction_count > 0:
            abort(400, description="Cannot delete wallet with existing transactions")
        
        db.session.delete(wallet)
        db.session.commit()
        
        logger.info(f"User {current_user.id} deleted wallet {wallet_id}")
        
        return jsonify({
            'message': 'Wallet deleted successfully'
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error deleting wallet: {e}")
        abort(500, description="Failed to delete wallet")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error deleting wallet: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/<int:wallet_id>/transactions', methods=['GET'])
@login_required
def get_wallet_transactions(wallet_id):
    """Get all transactions for a specific wallet"""
    try:
        # Verify wallet ownership
        wallet = Wallet.query.filter_by(
            id=wallet_id,
            user_id=current_user.id
        ).first()
        
        if not wallet:
            abort(404, description="Wallet not found")
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        
        # Query transactions
        pagination = Expense.query.filter_by(
            wallet_id=wallet_id
        ).order_by(Expense.date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'transactions': [{
                'id': e.id,
                'amount': float(e.amount),
                'category': e.category,
                'description': sanitize_string(e.description, max_length=500),
                'date': e.date.isoformat() if e.date else None,
                'is_expense': e.is_expense
            } for e in pagination.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching wallet transactions: {e}")
        abort(500, description="Failed to fetch transactions")
    except Exception as e:
        logger.exception(f"Error fetching wallet transactions: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/transfer', methods=['POST'])
@login_required
@validate_json
def transfer_between_wallets():
    """Transfer money between wallets"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('from_wallet_id'):
            abort(400, description="Source wallet ID is required")
        
        if not data.get('to_wallet_id'):
            abort(400, description="Destination wallet ID is required")
        
        if not data.get('amount'):
            abort(400, description="Amount is required")
        
        # Validate inputs
        from_wallet_id = validate_positive_integer(data['from_wallet_id'])
        to_wallet_id = validate_positive_integer(data['to_wallet_id'])
        amount = validate_amount(data['amount'])
        description = sanitize_string(
            data.get('description', 'Transfer between wallets'),
            max_length=500
        )
        
        # Check if wallets are different
        if from_wallet_id == to_wallet_id:
            abort(400, description="Cannot transfer to the same wallet")
        
        # Verify wallet ownership
        from_wallet = Wallet.query.filter_by(
            id=from_wallet_id,
            user_id=current_user.id
        ).first()
        
        to_wallet = Wallet.query.filter_by(
            id=to_wallet_id,
            user_id=current_user.id
        ).first()
        
        if not from_wallet:
            abort(404, description="Source wallet not found")
        
        if not to_wallet:
            abort(404, description="Destination wallet not found")
        
        # Check sufficient balance
        if from_wallet.balance < float(amount):
            return jsonify({
                'error': 'Insufficient balance',
                'wallet_balance': float(from_wallet.balance),
                'required_amount': float(amount)
            }), 400
        
        # Create transfer transactions
        # Debit from source wallet
        expense_out = Expense(
            amount=float(amount),
            category='transfer',
            description=f"{description} (to {to_wallet.name})",
            date=datetime.utcnow(),
            user_id=current_user.id,
            wallet_id=from_wallet_id,
            is_expense=True
        )
        
        # Credit to destination wallet
        expense_in = Expense(
            amount=float(amount),
            category='transfer',
            description=f"{description} (from {from_wallet.name})",
            date=datetime.utcnow(),
            user_id=current_user.id,
            wallet_id=to_wallet_id,
            is_expense=False
        )
        
        db.session.add(expense_out)
        db.session.add(expense_in)
        
        # Update wallet balances
        from_wallet.update_balance(float(amount), is_expense=True)
        to_wallet.update_balance(float(amount), is_expense=False)
        
        db.session.commit()
        
        logger.info(f"User {current_user.id} transferred {amount} from wallet {from_wallet_id} to {to_wallet_id}")
        
        return jsonify({
            'message': 'Transfer completed successfully',
            'transfer': {
                'from_wallet': {
                    'id': from_wallet.id,
                    'name': from_wallet.name,
                    'new_balance': float(from_wallet.balance)
                },
                'to_wallet': {
                    'id': to_wallet.id,
                    'name': to_wallet.name,
                    'new_balance': float(to_wallet.balance)
                },
                'amount': float(amount),
                'description': description
            }
        }), 201
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error transferring between wallets: {e}")
        abort(500, description="Failed to complete transfer")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error transferring between wallets: {e}")
        abort(500, description="An error occurred")
