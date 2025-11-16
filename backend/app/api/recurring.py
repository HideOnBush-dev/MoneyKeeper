"""
API endpoints for recurring transactions management
"""

from flask import jsonify, request, abort
from flask_login import login_required, current_user
from app.api import bp
from app.models import RecurringTransaction, Wallet, Expense
from app import db
from app.security import (
    validate_amount, sanitize_string,
    validate_positive_integer, validate_date
)
from app.middleware import validate_json, log_slow_requests
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, date, timedelta
import logging

logger = logging.getLogger(__name__)

FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly']


@bp.route('/recurring', methods=['GET'])
@login_required
def get_recurring_transactions():
    """Get all recurring transactions for current user"""
    try:
        transactions = RecurringTransaction.query.filter_by(
            user_id=current_user.id
        ).order_by(RecurringTransaction.next_due_date.asc()).all()
        
        result = []
        for trans in transactions:
            result.append({
                'id': trans.id,
                'name': sanitize_string(trans.name, max_length=100),
                'amount': float(trans.amount),
                'category': trans.category,
                'frequency': trans.frequency,
                'start_date': trans.start_date.isoformat() if trans.start_date else None,
                'end_date': trans.end_date.isoformat() if trans.end_date else None,
                'next_due_date': trans.next_due_date.isoformat() if trans.next_due_date else None,
                'wallet_id': trans.wallet_id,
                'description': sanitize_string(trans.description, max_length=500),
                'is_active': trans.is_active,
                'auto_create': trans.auto_create,
                'is_expense': trans.is_expense,
                'is_due': trans.is_due(),
                'can_execute': trans.can_execute(),
                'created_at': trans.created_at.isoformat() if trans.created_at else None,
                'updated_at': trans.updated_at.isoformat() if trans.updated_at else None
            })
        
        return jsonify({
            'transactions': result,
            'count': len(result)
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching recurring transactions: {e}")
        abort(500, description="Failed to fetch recurring transactions")
    except Exception as e:
        logger.exception(f"Error fetching recurring transactions: {e}")
        abort(500, description="An error occurred")


@bp.route('/recurring', methods=['POST'])
@login_required
@validate_json
@log_slow_requests(threshold=2.0)
def create_recurring_transaction():
    """Create a new recurring transaction"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            abort(400, description="Name is required")
        
        if not data.get('amount'):
            abort(400, description="Amount is required")
        
        if not data.get('frequency') or data.get('frequency') not in FREQUENCIES:
            abort(400, description=f"Frequency must be one of: {', '.join(FREQUENCIES)}")
        
        if not data.get('start_date'):
            abort(400, description="Start date is required")
        
        if not data.get('wallet_id'):
            abort(400, description="Wallet ID is required")
        
        # Validate inputs
        name = sanitize_string(data['name'], max_length=100)
        amount = validate_amount(data['amount'])
        
        if amount is None or float(amount) <= 0:
            abort(400, description="Amount must be greater than 0")
        
        frequency = data['frequency']
        start_date = validate_date(data['start_date'])
        if not start_date:
            abort(400, description="Invalid start date")
        
        end_date = None
        if data.get('end_date'):
            end_date = validate_date(data['end_date'])
            if end_date and end_date < start_date:
                abort(400, description="End date cannot be before start date")
        
        # Validate wallet
        wallet = Wallet.query.filter_by(
            id=data['wallet_id'],
            user_id=current_user.id
        ).first()
        if not wallet:
            abort(404, description="Wallet not found")
        
        # Calculate next due date
        temp_trans = RecurringTransaction(
            frequency=frequency,
            start_date=start_date
        )
        next_due_date = temp_trans.calculate_next_due_date(start_date)
        
        # Optional fields
        category = data.get('category', 'other')
        description = sanitize_string(data.get('description', ''), max_length=500)
        is_active = data.get('is_active', True)
        auto_create = data.get('auto_create', True)
        is_expense = data.get('is_expense', True)
        
        # Create new recurring transaction
        transaction = RecurringTransaction(
            user_id=current_user.id,
            name=name,
            amount=float(amount),
            category=category,
            frequency=frequency,
            start_date=start_date,
            end_date=end_date,
            next_due_date=next_due_date,
            wallet_id=wallet.id,
            description=description,
            is_active=is_active,
            auto_create=auto_create,
            is_expense=is_expense
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        logger.info(f"User {current_user.id} created recurring transaction {transaction.id}")
        
        return jsonify({
            'message': 'Recurring transaction created successfully',
            'transaction': {
                'id': transaction.id,
                'name': transaction.name,
                'amount': float(transaction.amount),
                'category': transaction.category,
                'frequency': transaction.frequency,
                'start_date': transaction.start_date.isoformat(),
                'end_date': transaction.end_date.isoformat() if transaction.end_date else None,
                'next_due_date': transaction.next_due_date.isoformat(),
                'wallet_id': transaction.wallet_id,
                'is_active': transaction.is_active,
                'auto_create': transaction.auto_create,
                'is_expense': transaction.is_expense
            }
        }), 201
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error creating recurring transaction: {e}")
        abort(500, description="Failed to create recurring transaction")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error creating recurring transaction: {e}")
        abort(500, description="An error occurred")


@bp.route('/recurring/<int:transaction_id>', methods=['GET'])
@login_required
def get_recurring_transaction(transaction_id):
    """Get a specific recurring transaction"""
    try:
        transaction = RecurringTransaction.query.filter_by(
            id=transaction_id,
            user_id=current_user.id
        ).first()
        
        if not transaction:
            abort(404, description="Recurring transaction not found")
        
        return jsonify({
            'transaction': {
                'id': transaction.id,
                'name': sanitize_string(transaction.name, max_length=100),
                'amount': float(transaction.amount),
                'category': transaction.category,
                'frequency': transaction.frequency,
                'start_date': transaction.start_date.isoformat() if transaction.start_date else None,
                'end_date': transaction.end_date.isoformat() if transaction.end_date else None,
                'next_due_date': transaction.next_due_date.isoformat() if transaction.next_due_date else None,
                'wallet_id': transaction.wallet_id,
                'description': sanitize_string(transaction.description, max_length=500),
                'is_active': transaction.is_active,
                'auto_create': transaction.auto_create,
                'is_expense': transaction.is_expense,
                'is_due': transaction.is_due(),
                'can_execute': transaction.can_execute(),
                'created_at': transaction.created_at.isoformat() if transaction.created_at else None,
                'updated_at': transaction.updated_at.isoformat() if transaction.updated_at else None
            }
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching recurring transaction: {e}")
        abort(500, description="Failed to fetch recurring transaction")
    except Exception as e:
        logger.exception(f"Error fetching recurring transaction: {e}")
        abort(500, description="An error occurred")


@bp.route('/recurring/<int:transaction_id>', methods=['PUT', 'PATCH'])
@login_required
@validate_json
def update_recurring_transaction(transaction_id):
    """Update an existing recurring transaction"""
    try:
        transaction = RecurringTransaction.query.filter_by(
            id=transaction_id,
            user_id=current_user.id
        ).first()
        
        if not transaction:
            abort(404, description="Recurring transaction not found")
        
        data = request.get_json()
        
        # Update fields if provided
        if 'name' in data:
            transaction.name = sanitize_string(data['name'], max_length=100)
        
        if 'amount' in data:
            new_amount = validate_amount(data['amount'])
            if new_amount is None or float(new_amount) <= 0:
                abort(400, description="Amount must be greater than 0")
            transaction.amount = float(new_amount)
        
        if 'category' in data:
            transaction.category = data['category']
        
        if 'frequency' in data:
            if data['frequency'] not in FREQUENCIES:
                abort(400, description=f"Frequency must be one of: {', '.join(FREQUENCIES)}")
            transaction.frequency = data['frequency']
            # Recalculate next due date if frequency changed
            transaction.next_due_date = transaction.calculate_next_due_date(transaction.next_due_date)
        
        if 'start_date' in data:
            start_date = validate_date(data['start_date'])
            if not start_date:
                abort(400, description="Invalid start date")
            transaction.start_date = start_date
        
        if 'end_date' in data:
            if data['end_date'] is None:
                transaction.end_date = None
            else:
                end_date = validate_date(data['end_date'])
                if end_date and transaction.start_date and end_date < transaction.start_date:
                    abort(400, description="End date cannot be before start date")
                transaction.end_date = end_date
        
        if 'description' in data:
            transaction.description = sanitize_string(data.get('description', ''), max_length=500)
        
        if 'is_active' in data:
            transaction.is_active = bool(data['is_active'])
        
        if 'auto_create' in data:
            transaction.auto_create = bool(data['auto_create'])
        
        if 'is_expense' in data:
            transaction.is_expense = bool(data['is_expense'])
        
        if 'wallet_id' in data:
            wallet = Wallet.query.filter_by(
                id=data['wallet_id'],
                user_id=current_user.id
            ).first()
            if not wallet:
                abort(404, description="Wallet not found")
            transaction.wallet_id = wallet.id
        
        transaction.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"User {current_user.id} updated recurring transaction {transaction_id}")
        
        return jsonify({
            'message': 'Recurring transaction updated successfully',
            'transaction': {
                'id': transaction.id,
                'name': transaction.name,
                'amount': float(transaction.amount),
                'category': transaction.category,
                'frequency': transaction.frequency,
                'start_date': transaction.start_date.isoformat(),
                'end_date': transaction.end_date.isoformat() if transaction.end_date else None,
                'next_due_date': transaction.next_due_date.isoformat(),
                'wallet_id': transaction.wallet_id,
                'is_active': transaction.is_active,
                'auto_create': transaction.auto_create,
                'is_expense': transaction.is_expense
            }
        }), 200
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error updating recurring transaction: {e}")
        abort(500, description="Failed to update recurring transaction")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error updating recurring transaction: {e}")
        abort(500, description="An error occurred")


@bp.route('/recurring/<int:transaction_id>', methods=['DELETE'])
@login_required
def delete_recurring_transaction(transaction_id):
    """Delete a recurring transaction"""
    try:
        transaction = RecurringTransaction.query.filter_by(
            id=transaction_id,
            user_id=current_user.id
        ).first()
        
        if not transaction:
            abort(404, description="Recurring transaction not found")
        
        db.session.delete(transaction)
        db.session.commit()
        
        logger.info(f"User {current_user.id} deleted recurring transaction {transaction_id}")
        
        return jsonify({
            'message': 'Recurring transaction deleted successfully'
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error deleting recurring transaction: {e}")
        abort(500, description="Failed to delete recurring transaction")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error deleting recurring transaction: {e}")
        abort(500, description="An error occurred")


@bp.route('/recurring/<int:transaction_id>/skip', methods=['POST'])
@login_required
def skip_recurring_transaction(transaction_id):
    """Skip the current due date and move to next"""
    try:
        transaction = RecurringTransaction.query.filter_by(
            id=transaction_id,
            user_id=current_user.id
        ).first()
        
        if not transaction:
            abort(404, description="Recurring transaction not found")
        
        if not transaction.can_execute():
            abort(400, description="Transaction cannot be executed (inactive or past end date)")
        
        # Move to next due date without creating expense
        transaction.next_due_date = transaction.calculate_next_due_date(transaction.next_due_date)
        transaction.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"User {current_user.id} skipped recurring transaction {transaction_id}")
        
        return jsonify({
            'message': 'Recurring transaction skipped successfully',
            'transaction': {
                'id': transaction.id,
                'next_due_date': transaction.next_due_date.isoformat()
            }
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error skipping recurring transaction: {e}")
        abort(500, description="Failed to skip recurring transaction")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error skipping recurring transaction: {e}")
        abort(500, description="An error occurred")


@bp.route('/recurring/<int:transaction_id>/execute', methods=['POST'])
@login_required
def execute_recurring_transaction(transaction_id):
    """Execute the recurring transaction immediately (create expense)"""
    try:
        transaction = RecurringTransaction.query.filter_by(
            id=transaction_id,
            user_id=current_user.id
        ).first()
        
        if not transaction:
            abort(404, description="Recurring transaction not found")
        
        if not transaction.can_execute():
            abort(400, description="Transaction cannot be executed (inactive or past end date)")
        
        # Execute transaction
        expense = transaction.execute()
        
        if not expense:
            abort(400, description="Failed to execute transaction")
        
        logger.info(f"User {current_user.id} executed recurring transaction {transaction_id}, created expense {expense.id}")
        
        return jsonify({
            'message': 'Recurring transaction executed successfully',
            'expense': {
                'id': expense.id,
                'amount': float(expense.amount),
                'category': expense.category,
                'description': expense.description,
                'date': expense.date.isoformat() if expense.date else None
            },
            'transaction': {
                'id': transaction.id,
                'next_due_date': transaction.next_due_date.isoformat()
            }
        }), 200
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error executing recurring transaction: {e}")
        abort(500, description="Failed to execute recurring transaction")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error executing recurring transaction: {e}")
        abort(500, description="An error occurred")


@bp.route('/recurring/upcoming', methods=['GET'])
@login_required
def get_upcoming_recurring():
    """Get upcoming recurring transactions (due in next 7 days)"""
    try:
        today = date.today()
        next_week = today + timedelta(days=7)
        
        transactions = RecurringTransaction.query.filter(
            RecurringTransaction.user_id == current_user.id,
            RecurringTransaction.is_active == True,
            RecurringTransaction.next_due_date >= today,
            RecurringTransaction.next_due_date <= next_week
        ).order_by(RecurringTransaction.next_due_date.asc()).all()
        
        result = []
        for trans in transactions:
            days_until = (trans.next_due_date - today).days
            result.append({
                'id': trans.id,
                'name': sanitize_string(trans.name, max_length=100),
                'amount': float(trans.amount),
                'category': trans.category,
                'frequency': trans.frequency,
                'next_due_date': trans.next_due_date.isoformat(),
                'days_until': days_until,
                'wallet_id': trans.wallet_id,
                'is_expense': trans.is_expense
            })
        
        return jsonify({
            'transactions': result,
            'count': len(result)
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching upcoming recurring: {e}")
        abort(500, description="Failed to fetch upcoming recurring transactions")
    except Exception as e:
        logger.exception(f"Error fetching upcoming recurring: {e}")
        abort(500, description="An error occurred")

