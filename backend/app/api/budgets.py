"""
API endpoints for budget management
"""

from flask import jsonify, request, abort
from flask_login import login_required, current_user
from app.api import bp
from app.models import Budget, Expense
from app import db
from app.security import (
    validate_amount, validate_category, sanitize_string,
    validate_positive_integer
)
from app.middleware import validate_json, log_slow_requests
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func
from datetime import datetime, date
from calendar import monthrange
import logging

logger = logging.getLogger(__name__)


@bp.route('/budgets', methods=['POST'])
@login_required
@validate_json
@log_slow_requests(threshold=2.0)
def create_budget():
    """Create a new budget"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('category'):
            abort(400, description="Category is required")
        
        if not data.get('amount'):
            abort(400, description="Amount is required")
        
        # Validate inputs
        category = validate_category(data['category'])
        amount = validate_amount(data['amount'])
        month = validate_positive_integer(data.get('month', datetime.now().month))
        year = validate_positive_integer(data.get('year', datetime.now().year))
        
        # Validate month and year
        if month < 1 or month > 12:
            abort(400, description="Month must be between 1 and 12")
        
        if year < 2000 or year > 2100:
            abort(400, description="Year must be between 2000 and 2100")
        
        # Check if budget already exists for this category, month, and year
        existing_budget = Budget.query.filter_by(
            user_id=current_user.id,
            category=category,
            month=month,
            year=year
        ).first()
        
        if existing_budget:
            # Update existing budget
            existing_budget.amount = float(amount)
            db.session.commit()
            
            logger.info(f"User {current_user.id} updated budget {existing_budget.id}")
            
            return jsonify({
                'message': 'Budget updated successfully',
                'budget': {
                    'id': existing_budget.id,
                    'category': existing_budget.category,
                    'amount': float(existing_budget.amount),
                    'month': existing_budget.month,
                    'year': existing_budget.year
                }
            }), 200
        
        # Create new budget
        budget = Budget(
            category=category,
            amount=float(amount),
            month=month,
            year=year,
            user_id=current_user.id
        )
        
        db.session.add(budget)
        db.session.commit()
        
        logger.info(f"User {current_user.id} created budget {budget.id}")
        
        return jsonify({
            'message': 'Budget created successfully',
            'budget': {
                'id': budget.id,
                'category': budget.category,
                'amount': float(budget.amount),
                'month': budget.month,
                'year': budget.year
            }
        }), 201
        
    except ValueError as e:
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error creating budget: {e}")
        abort(500, description="Failed to create budget")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error creating budget: {e}")
        abort(500, description="An error occurred")


@bp.route('/budgets/<int:budget_id>', methods=['GET'])
@login_required
def get_budget(budget_id):
    """Get a specific budget with spending information"""
    try:
        budget = Budget.query.filter_by(
            id=budget_id,
            user_id=current_user.id
        ).first()
        
        if not budget:
            abort(404, description="Budget not found")
        
        # Calculate spent amount for this budget period
        start_date = date(budget.year, budget.month, 1)
        _, last_day = monthrange(budget.year, budget.month)
        end_date = date(budget.year, budget.month, last_day)
        
        spent = db.session.query(func.sum(Expense.amount)).filter(
            Expense.user_id == current_user.id,
            Expense.category == budget.category,
            Expense.is_expense == True,
            Expense.date >= start_date,
            Expense.date <= end_date
        ).scalar() or 0
        
        percentage = (float(spent) / float(budget.amount) * 100) if budget.amount > 0 else 0
        remaining = float(budget.amount) - float(spent)
        
        return jsonify({
            'budget': {
                'id': budget.id,
                'category': budget.category,
                'amount': float(budget.amount),
                'month': budget.month,
                'year': budget.year,
                'spent': float(spent),
                'remaining': remaining,
                'percentage': round(percentage, 2),
                'status': 'exceeded' if spent > budget.amount else 'on_track'
            }
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching budget: {e}")
        abort(500, description="Failed to fetch budget")
    except Exception as e:
        logger.exception(f"Error fetching budget: {e}")
        abort(500, description="An error occurred")


@bp.route('/budgets/<int:budget_id>', methods=['PUT', 'PATCH'])
@login_required
@validate_json
def update_budget(budget_id):
    """Update an existing budget"""
    try:
        budget = Budget.query.filter_by(
            id=budget_id,
            user_id=current_user.id
        ).first()
        
        if not budget:
            abort(404, description="Budget not found")
        
        data = request.get_json()
        
        # Update fields if provided
        if 'category' in data:
            budget.category = validate_category(data['category'])
        
        if 'amount' in data:
            new_amount = validate_amount(data['amount'])
            budget.amount = float(new_amount)
        
        if 'month' in data:
            month = validate_positive_integer(data['month'])
            if month < 1 or month > 12:
                abort(400, description="Month must be between 1 and 12")
            budget.month = month
        
        if 'year' in data:
            year = validate_positive_integer(data['year'])
            if year < 2000 or year > 2100:
                abort(400, description="Year must be between 2000 and 2100")
            budget.year = year
        
        db.session.commit()
        
        logger.info(f"User {current_user.id} updated budget {budget_id}")
        
        return jsonify({
            'message': 'Budget updated successfully',
            'budget': {
                'id': budget.id,
                'category': budget.category,
                'amount': float(budget.amount),
                'month': budget.month,
                'year': budget.year
            }
        }), 200
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error updating budget: {e}")
        abort(500, description="Failed to update budget")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error updating budget: {e}")
        abort(500, description="An error occurred")


@bp.route('/budgets/<int:budget_id>', methods=['DELETE'])
@login_required
def delete_budget(budget_id):
    """Delete a budget"""
    try:
        budget = Budget.query.filter_by(
            id=budget_id,
            user_id=current_user.id
        ).first()
        
        if not budget:
            abort(404, description="Budget not found")
        
        db.session.delete(budget)
        db.session.commit()
        
        logger.info(f"User {current_user.id} deleted budget {budget_id}")
        
        return jsonify({
            'message': 'Budget deleted successfully'
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error deleting budget: {e}")
        abort(500, description="Failed to delete budget")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error deleting budget: {e}")
        abort(500, description="An error occurred")


@bp.route('/budgets/current', methods=['GET'])
@login_required
def get_current_budgets():
    """Get all budgets for current month with spending information"""
    try:
        # Get month and year from query params or use current
        month = request.args.get('month', datetime.now().month, type=int)
        year = request.args.get('year', datetime.now().year, type=int)
        
        # Validate
        if month < 1 or month > 12:
            abort(400, description="Month must be between 1 and 12")
        
        if year < 2000 or year > 2100:
            abort(400, description="Year must be between 2000 and 2100")
        
        # Get all budgets for this period
        budgets = Budget.query.filter_by(
            user_id=current_user.id,
            month=month,
            year=year
        ).all()
        
        # Calculate spent amounts
        start_date = date(year, month, 1)
        _, last_day = monthrange(year, month)
        end_date = date(year, month, last_day)
        
        result = []
        for budget in budgets:
            spent = db.session.query(func.sum(Expense.amount)).filter(
                Expense.user_id == current_user.id,
                Expense.category == budget.category,
                Expense.is_expense == True,
                Expense.date >= start_date,
                Expense.date <= end_date
            ).scalar() or 0
            
            percentage = (float(spent) / float(budget.amount) * 100) if budget.amount > 0 else 0
            remaining = float(budget.amount) - float(spent)
            
            result.append({
                'id': budget.id,
                'category': budget.category,
                'amount': float(budget.amount),
                'month': budget.month,
                'year': budget.year,
                'spent': float(spent),
                'remaining': remaining,
                'percentage': round(percentage, 2),
                'status': 'exceeded' if spent > budget.amount else 'on_track'
            })
        
        return jsonify({
            'budgets': result,
            'period': {
                'month': month,
                'year': year
            }
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching budgets: {e}")
        abort(500, description="Failed to fetch budgets")
    except Exception as e:
        logger.exception(f"Error fetching budgets: {e}")
        abort(500, description="An error occurred")


@bp.route('/budgets/alerts', methods=['GET'])
@login_required
def get_budget_alerts():
    """Get budgets that are near or over limit"""
    try:
        # Get threshold from query params (default 80%)
        threshold = request.args.get('threshold', 80, type=int)
        
        if threshold < 0 or threshold > 100:
            abort(400, description="Threshold must be between 0 and 100")
        
        # Get current month's budgets
        month = datetime.now().month
        year = datetime.now().year
        
        budgets = Budget.query.filter_by(
            user_id=current_user.id,
            month=month,
            year=year
        ).all()
        
        # Calculate spent and check alerts
        start_date = date(year, month, 1)
        _, last_day = monthrange(year, month)
        end_date = date(year, month, last_day)
        
        alerts = []
        for budget in budgets:
            spent = db.session.query(func.sum(Expense.amount)).filter(
                Expense.user_id == current_user.id,
                Expense.category == budget.category,
                Expense.is_expense == True,
                Expense.date >= start_date,
                Expense.date <= end_date
            ).scalar() or 0
            
            percentage = (float(spent) / float(budget.amount) * 100) if budget.amount > 0 else 0
            
            # Check if over threshold
            if percentage >= threshold:
                alerts.append({
                    'id': budget.id,
                    'category': budget.category,
                    'amount': float(budget.amount),
                    'spent': float(spent),
                    'percentage': round(percentage, 2),
                    'status': 'exceeded' if spent > budget.amount else 'warning',
                    'message': f"Budget for {budget.category} is at {round(percentage, 2)}%"
                })
        
        return jsonify({
            'alerts': alerts,
            'count': len(alerts)
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching budget alerts: {e}")
        abort(500, description="Failed to fetch budget alerts")
    except Exception as e:
        logger.exception(f"Error fetching budget alerts: {e}")
        abort(500, description="An error occurred")


@bp.route('/budgets/statistics', methods=['GET'])
@login_required
def get_budget_statistics():
    """Get budget statistics and trends"""
    try:
        # Get time range
        months = request.args.get('months', 6, type=int)  # Default last 6 months
        
        if months < 1 or months > 24:
            abort(400, description="Months must be between 1 and 24")
        
        current_date = datetime.now()
        
        # Collect data for each month
        monthly_data = []
        for i in range(months):
            # Calculate month and year
            month_offset = i
            target_month = current_date.month - month_offset
            target_year = current_date.year
            
            while target_month < 1:
                target_month += 12
                target_year -= 1
            
            # Get budgets for this month
            budgets = Budget.query.filter_by(
                user_id=current_user.id,
                month=target_month,
                year=target_year
            ).all()
            
            # Calculate totals
            start_date = date(target_year, target_month, 1)
            _, last_day = monthrange(target_year, target_month)
            end_date = date(target_year, target_month, last_day)
            
            total_budget = sum(b.amount for b in budgets)
            
            total_spent = db.session.query(func.sum(Expense.amount)).filter(
                Expense.user_id == current_user.id,
                Expense.is_expense == True,
                Expense.date >= start_date,
                Expense.date <= end_date
            ).scalar() or 0
            
            monthly_data.append({
                'month': target_month,
                'year': target_year,
                'total_budget': float(total_budget),
                'total_spent': float(total_spent),
                'difference': float(total_budget) - float(total_spent),
                'budget_count': len(budgets)
            })
        
        # Reverse to show oldest first
        monthly_data.reverse()
        
        return jsonify({
            'statistics': monthly_data,
            'summary': {
                'months_analyzed': months,
                'average_budget': sum(m['total_budget'] for m in monthly_data) / len(monthly_data) if monthly_data else 0,
                'average_spent': sum(m['total_spent'] for m in monthly_data) / len(monthly_data) if monthly_data else 0
            }
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching budget statistics: {e}")
        abort(500, description="Failed to fetch budget statistics")
    except Exception as e:
        logger.exception(f"Error fetching budget statistics: {e}")
        abort(500, description="An error occurred")
