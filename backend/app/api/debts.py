"""
API endpoints for debt tracking management
"""

from flask import jsonify, request, abort
from flask_login import login_required, current_user
from app.api import bp
from app.models import Debt, DebtPayment, Wallet
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


@bp.route('/debts', methods=['GET'])
@login_required
def get_debts():
    """Get all debts for current user"""
    try:
        debts = Debt.query.filter_by(
            user_id=current_user.id
        ).order_by(Debt.created_at.desc()).all()
        
        result = []
        for debt in debts:
            result.append({
                'id': debt.id,
                'name': sanitize_string(debt.name, max_length=100),
                'creditor_name': sanitize_string(debt.creditor_name, max_length=100) if debt.creditor_name else None,
                'total_amount': float(debt.total_amount),
                'remaining_amount': float(debt.remaining_amount),
                'interest_rate': float(debt.interest_rate),
                'start_date': debt.start_date.isoformat() if debt.start_date else None,
                'due_date': debt.due_date.isoformat() if debt.due_date else None,
                'payment_frequency': debt.payment_frequency,
                'next_payment_date': debt.next_payment_date.isoformat() if debt.next_payment_date else None,
                'next_payment_amount': float(debt.next_payment_amount) if debt.next_payment_amount else None,
                'description': sanitize_string(debt.description, max_length=500) if debt.description else None,
                'is_paid': debt.is_paid,
                'is_lending': debt.is_lending,
                'wallet_id': debt.wallet_id,
                'progress_percentage': round(debt.get_progress_percentage(), 2),
                'is_overdue': debt.is_overdue(),
                'created_at': debt.created_at.isoformat() if debt.created_at else None,
                'updated_at': debt.updated_at.isoformat() if debt.updated_at else None
            })
        
        return jsonify({
            'debts': result,
            'count': len(result)
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching debts: {e}")
        abort(500, description="Failed to fetch debts")
    except Exception as e:
        logger.exception(f"Error fetching debts: {e}")
        abort(500, description="An error occurred")


@bp.route('/debts', methods=['POST'])
@login_required
@validate_json
@log_slow_requests(threshold=2.0)
def create_debt():
    """Create a new debt"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            abort(400, description="Name is required")
        
        if not data.get('total_amount'):
            abort(400, description="Total amount is required")
        
        if not data.get('start_date'):
            abort(400, description="Start date is required")
        
        # Validate inputs
        name = sanitize_string(data['name'], max_length=100)
        total_amount = validate_amount(data['total_amount'])
        
        if total_amount is None or float(total_amount) <= 0:
            abort(400, description="Total amount must be greater than 0")
        
        start_date = validate_date(data['start_date'])
        if not start_date:
            abort(400, description="Invalid start date format")
        
        # Optional fields
        creditor_name = sanitize_string(data.get('creditor_name', ''), max_length=100)
        description = sanitize_string(data.get('description', ''), max_length=500)
        interest_rate = validate_amount(data.get('interest_rate', 0))
        
        due_date = None
        if data.get('due_date'):
            due_date = validate_date(data['due_date'])
            if due_date and due_date < start_date:
                abort(400, description="Due date cannot be before start date")
        
        payment_frequency = data.get('payment_frequency')
        if payment_frequency and payment_frequency not in ['daily', 'weekly', 'monthly', 'yearly']:
            abort(400, description="Invalid payment frequency")
        
        next_payment_date = None
        if data.get('next_payment_date'):
            next_payment_date = validate_date(data['next_payment_date'])
        elif payment_frequency:
            # Auto-calculate next payment date from start_date
            next_payment_date = start_date
        
        next_payment_amount = None
        if data.get('next_payment_amount'):
            next_payment_amount = validate_amount(data['next_payment_amount'])
        
        wallet_id = None
        if data.get('wallet_id'):
            wallet = Wallet.query.filter_by(
                id=data['wallet_id'],
                user_id=current_user.id
            ).first()
            if not wallet:
                abort(404, description="Wallet not found")
            wallet_id = wallet.id
        
        is_lending = data.get('is_lending', False)
        
        # Create debt
        debt = Debt(
            user_id=current_user.id,
            name=name,
            creditor_name=creditor_name if creditor_name else None,
            total_amount=total_amount,
            remaining_amount=total_amount,  # Initially, remaining = total
            interest_rate=interest_rate,
            start_date=start_date,
            due_date=due_date,
            payment_frequency=payment_frequency,
            next_payment_date=next_payment_date,
            next_payment_amount=next_payment_amount,
            description=description if description else None,
            is_lending=is_lending,
            wallet_id=wallet_id
        )
        
        db.session.add(debt)
        db.session.commit()
        
        logger.info(f"User {current_user.id} created debt: {debt.id}")
        
        return jsonify({
            'message': 'Debt created successfully',
            'debt': {
                'id': debt.id,
                'name': debt.name,
                'total_amount': float(debt.total_amount),
                'remaining_amount': float(debt.remaining_amount),
                'start_date': debt.start_date.isoformat(),
                'created_at': debt.created_at.isoformat()
            }
        }), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error creating debt: {e}")
        abort(500, description="Failed to create debt")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error creating debt: {e}")
        abort(500, description="An error occurred")


@bp.route('/debts/<int:debt_id>', methods=['GET'])
@login_required
def get_debt(debt_id):
    """Get details of a specific debt"""
    try:
        debt = Debt.query.filter_by(
            id=debt_id,
            user_id=current_user.id
        ).first()
        
        if not debt:
            abort(404, description="Debt not found")
        
        return jsonify({
            'id': debt.id,
            'name': sanitize_string(debt.name, max_length=100),
            'creditor_name': sanitize_string(debt.creditor_name, max_length=100) if debt.creditor_name else None,
            'total_amount': float(debt.total_amount),
            'remaining_amount': float(debt.remaining_amount),
            'interest_rate': float(debt.interest_rate),
            'start_date': debt.start_date.isoformat(),
            'due_date': debt.due_date.isoformat() if debt.due_date else None,
            'payment_frequency': debt.payment_frequency,
            'next_payment_date': debt.next_payment_date.isoformat() if debt.next_payment_date else None,
            'next_payment_amount': float(debt.next_payment_amount) if debt.next_payment_amount else None,
            'description': sanitize_string(debt.description, max_length=500) if debt.description else None,
            'is_paid': debt.is_paid,
            'is_lending': debt.is_lending,
            'wallet_id': debt.wallet_id,
            'progress_percentage': round(debt.get_progress_percentage(), 2),
            'is_overdue': debt.is_overdue(),
            'created_at': debt.created_at.isoformat(),
            'updated_at': debt.updated_at.isoformat()
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching debt: {e}")
        abort(500, description="Failed to fetch debt")
    except Exception as e:
        logger.exception(f"Error fetching debt: {e}")
        abort(500, description="An error occurred")


@bp.route('/debts/<int:debt_id>', methods=['PUT'])
@login_required
@validate_json
def update_debt(debt_id):
    """Update a debt"""
    try:
        debt = Debt.query.filter_by(
            id=debt_id,
            user_id=current_user.id
        ).first()
        
        if not debt:
            abort(404, description="Debt not found")
        
        data = request.get_json()
        
        # Update fields if provided
        if 'name' in data:
            debt.name = sanitize_string(data['name'], max_length=100)
        
        if 'creditor_name' in data:
            debt.creditor_name = sanitize_string(data['creditor_name'], max_length=100)
        
        if 'total_amount' in data:
            total_amount = validate_amount(data['total_amount'])
            if total_amount is None or float(total_amount) <= 0:
                abort(400, description="Total amount must be greater than 0")
            debt.total_amount = total_amount
        
        if 'remaining_amount' in data:
            remaining_amount = validate_amount(data['remaining_amount'])
            if remaining_amount is not None:
                debt.remaining_amount = remaining_amount
                if debt.remaining_amount <= 0:
                    debt.is_paid = True
        
        if 'interest_rate' in data:
            debt.interest_rate = validate_amount(data['interest_rate'])
        
        if 'start_date' in data:
            start_date = validate_date(data['start_date'])
            if start_date:
                debt.start_date = start_date
        
        if 'due_date' in data:
            due_date = validate_date(data['due_date'])
            debt.due_date = due_date
        
        if 'payment_frequency' in data:
            payment_frequency = data['payment_frequency']
            if payment_frequency and payment_frequency not in ['daily', 'weekly', 'monthly', 'yearly', None]:
                abort(400, description="Invalid payment frequency")
            debt.payment_frequency = payment_frequency
        
        if 'next_payment_date' in data:
            next_payment_date = validate_date(data['next_payment_date'])
            debt.next_payment_date = next_payment_date
        
        if 'next_payment_amount' in data:
            next_payment_amount = validate_amount(data['next_payment_amount'])
            debt.next_payment_amount = next_payment_amount
        
        if 'description' in data:
            debt.description = sanitize_string(data['description'], max_length=500)
        
        if 'is_lending' in data:
            debt.is_lending = bool(data['is_lending'])
        
        if 'wallet_id' in data:
            if data['wallet_id']:
                wallet = Wallet.query.filter_by(
                    id=data['wallet_id'],
                    user_id=current_user.id
                ).first()
                if not wallet:
                    abort(404, description="Wallet not found")
                debt.wallet_id = wallet.id
            else:
                debt.wallet_id = None
        
        debt.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"User {current_user.id} updated debt: {debt.id}")
        
        return jsonify({
            'message': 'Debt updated successfully',
            'debt': {
                'id': debt.id,
                'name': debt.name,
                'total_amount': float(debt.total_amount),
                'remaining_amount': float(debt.remaining_amount),
                'updated_at': debt.updated_at.isoformat()
            }
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error updating debt: {e}")
        abort(500, description="Failed to update debt")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error updating debt: {e}")
        abort(500, description="An error occurred")


@bp.route('/debts/<int:debt_id>', methods=['DELETE'])
@login_required
def delete_debt(debt_id):
    """Delete a debt"""
    try:
        debt = Debt.query.filter_by(
            id=debt_id,
            user_id=current_user.id
        ).first()
        
        if not debt:
            abort(404, description="Debt not found")
        
        db.session.delete(debt)
        db.session.commit()
        
        logger.info(f"User {current_user.id} deleted debt: {debt_id}")
        
        return jsonify({'message': 'Debt deleted successfully'}), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error deleting debt: {e}")
        abort(500, description="Failed to delete debt")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error deleting debt: {e}")
        abort(500, description="An error occurred")


@bp.route('/debts/<int:debt_id>/pay', methods=['POST'])
@login_required
@validate_json
def record_payment(debt_id):
    """Record a payment towards a debt"""
    try:
        debt = Debt.query.filter_by(
            id=debt_id,
            user_id=current_user.id
        ).first()
        
        if not debt:
            abort(404, description="Debt not found")
        
        if debt.is_paid:
            abort(400, description="Debt is already fully paid")
        
        data = request.get_json()
        
        if not data.get('amount'):
            abort(400, description="Amount is required")
        
        amount = validate_amount(data['amount'])
        if amount is None or float(amount) <= 0:
            abort(400, description="Payment amount must be greater than 0")
        
        if float(amount) > debt.remaining_amount:
            abort(400, description="Payment amount cannot exceed remaining debt")
        
        payment_date = None
        if data.get('payment_date'):
            payment_date = validate_date(data['payment_date'])
        
        notes = sanitize_string(data.get('notes', ''), max_length=500)
        
        # Record payment using the model method
        payment = debt.add_payment(
            amount=amount,
            payment_date=payment_date,
            notes=notes if notes else None
        )
        
        logger.info(f"User {current_user.id} recorded payment for debt {debt_id}: {amount}")
        
        return jsonify({
            'message': 'Payment recorded successfully',
            'payment': {
                'id': payment.id,
                'amount': float(payment.amount),
                'payment_date': payment.payment_date.isoformat(),
                'notes': payment.notes
            },
            'debt': {
                'id': debt.id,
                'remaining_amount': float(debt.remaining_amount),
                'is_paid': debt.is_paid,
                'progress_percentage': round(debt.get_progress_percentage(), 2)
            }
        }), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error recording payment: {e}")
        abort(500, description="Failed to record payment")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error recording payment: {e}")
        abort(500, description="An error occurred")


@bp.route('/debts/<int:debt_id>/payments', methods=['GET'])
@login_required
def get_debt_payments(debt_id):
    """Get payment history for a debt"""
    try:
        debt = Debt.query.filter_by(
            id=debt_id,
            user_id=current_user.id
        ).first()
        
        if not debt:
            abort(404, description="Debt not found")
        
        payments = DebtPayment.query.filter_by(
            debt_id=debt_id
        ).order_by(DebtPayment.payment_date.desc()).all()
        
        result = []
        for payment in payments:
            result.append({
                'id': payment.id,
                'amount': float(payment.amount),
                'payment_date': payment.payment_date.isoformat(),
                'notes': sanitize_string(payment.notes, max_length=500) if payment.notes else None,
                'created_at': payment.created_at.isoformat()
            })
        
        return jsonify({
            'payments': result,
            'count': len(result),
            'debt': {
                'id': debt.id,
                'name': debt.name,
                'total_amount': float(debt.total_amount),
                'remaining_amount': float(debt.remaining_amount)
            }
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching payments: {e}")
        abort(500, description="Failed to fetch payments")
    except Exception as e:
        logger.exception(f"Error fetching payments: {e}")
        abort(500, description="An error occurred")


@bp.route('/debts/upcoming', methods=['GET'])
@login_required
def get_upcoming_debts():
    """Get debts with upcoming payments (within next 7 days)"""
    try:
        days = request.args.get('days', 7, type=int)
        if days < 1 or days > 365:
            days = 7
        
        today = date.today()
        upcoming_date = today + timedelta(days=days)
        
        debts = Debt.query.filter(
            Debt.user_id == current_user.id,
            Debt.is_paid == False,
            Debt.next_payment_date.isnot(None),
            Debt.next_payment_date <= upcoming_date
        ).order_by(Debt.next_payment_date.asc()).all()
        
        result = []
        for debt in debts:
            days_until = (debt.next_payment_date - today).days if debt.next_payment_date else None
            result.append({
                'id': debt.id,
                'name': sanitize_string(debt.name, max_length=100),
                'creditor_name': sanitize_string(debt.creditor_name, max_length=100) if debt.creditor_name else None,
                'remaining_amount': float(debt.remaining_amount),
                'next_payment_date': debt.next_payment_date.isoformat(),
                'next_payment_amount': float(debt.next_payment_amount) if debt.next_payment_amount else None,
                'days_until': days_until,
                'is_overdue': debt.is_overdue(),
                'is_lending': debt.is_lending
            })
        
        return jsonify({
            'debts': result,
            'count': len(result)
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching upcoming debts: {e}")
        abort(500, description="Failed to fetch upcoming debts")
    except Exception as e:
        logger.exception(f"Error fetching upcoming debts: {e}")
        abort(500, description="An error occurred")


@bp.route('/debts/statistics', methods=['GET'])
@login_required
def get_debt_statistics():
    """Get debt statistics for current user"""
    try:
        debts = Debt.query.filter_by(user_id=current_user.id).all()
        
        total_debt = 0  # Money you owe
        total_lending = 0  # Money owed to you
        total_paid = 0
        active_debts = 0
        overdue_debts = 0
        
        for debt in debts:
            if debt.is_lending:
                total_lending += debt.remaining_amount
            else:
                total_debt += debt.remaining_amount
            
            total_paid += (debt.total_amount - debt.remaining_amount)
            
            if not debt.is_paid:
                active_debts += 1
                if debt.is_overdue():
                    overdue_debts += 1
        
        return jsonify({
            'total_debt': float(total_debt),
            'total_lending': float(total_lending),
            'total_paid': float(total_paid),
            'active_debts': active_debts,
            'overdue_debts': overdue_debts,
            'net_position': float(total_lending - total_debt)  # Positive = you're owed more, Negative = you owe more
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching debt statistics: {e}")
        abort(500, description="Failed to fetch statistics")
    except Exception as e:
        logger.exception(f"Error fetching debt statistics: {e}")
        abort(500, description="An error occurred")

