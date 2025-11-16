"""
API endpoints for savings goals management
"""

from flask import jsonify, request, abort
from flask_login import login_required, current_user
from app.api import bp
from app.models import SavingsGoal, Wallet, Notification
from app import db
from app.security import (
    validate_amount, sanitize_string,
    validate_positive_integer, validate_date
)
from app.middleware import validate_json, log_slow_requests
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)


@bp.route('/goals', methods=['GET'])
@login_required
def get_goals():
    """Get all savings goals for current user"""
    try:
        goals = SavingsGoal.query.filter_by(
            user_id=current_user.id
        ).order_by(SavingsGoal.created_at.desc()).all()
        
        result = []
        for goal in goals:
            result.append({
                'id': goal.id,
                'name': sanitize_string(goal.name, max_length=100),
                'target_amount': float(goal.target_amount),
                'current_amount': float(goal.current_amount),
                'deadline': goal.deadline.isoformat() if goal.deadline else None,
                'description': sanitize_string(goal.description, max_length=500),
                'icon': goal.icon,
                'color': goal.color,
                'wallet_id': goal.wallet_id,
                'is_achieved': goal.is_achieved,
                'achieved_at': goal.achieved_at.isoformat() if goal.achieved_at else None,
                'progress_percentage': round(goal.get_progress_percentage(), 2),
                'remaining_amount': float(goal.get_remaining_amount()),
                'is_overdue': goal.is_overdue(),
                'created_at': goal.created_at.isoformat() if goal.created_at else None,
                'updated_at': goal.updated_at.isoformat() if goal.updated_at else None
            })
        
        return jsonify({
            'goals': result,
            'count': len(result)
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching goals: {e}")
        abort(500, description="Failed to fetch goals")
    except Exception as e:
        logger.exception(f"Error fetching goals: {e}")
        abort(500, description="An error occurred")


@bp.route('/goals', methods=['POST'])
@login_required
@validate_json
@log_slow_requests(threshold=2.0)
def create_goal():
    """Create a new savings goal"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            abort(400, description="Name is required")
        
        if not data.get('target_amount'):
            abort(400, description="Target amount is required")
        
        # Validate inputs
        name = sanitize_string(data['name'], max_length=100)
        target_amount = validate_amount(data['target_amount'])
        
        if target_amount is None or float(target_amount) <= 0:
            abort(400, description="Target amount must be greater than 0")
        
        # Optional fields
        description = sanitize_string(data.get('description', ''), max_length=500)
        deadline = None
        if data.get('deadline'):
            deadline = validate_date(data['deadline'])
            if deadline and deadline < date.today():
                abort(400, description="Deadline cannot be in the past")
        
        wallet_id = None
        if data.get('wallet_id'):
            wallet = Wallet.query.filter_by(
                id=data['wallet_id'],
                user_id=current_user.id
            ).first()
            if not wallet:
                abort(404, description="Wallet not found")
            wallet_id = wallet.id
        
        icon = data.get('icon', '🎯')
        color = data.get('color', 'blue')
        
        # Create new goal
        goal = SavingsGoal(
            user_id=current_user.id,
            name=name,
            target_amount=float(target_amount),
            current_amount=0.0,
            deadline=deadline,
            description=description,
            icon=icon,
            color=color,
            wallet_id=wallet_id
        )
        
        db.session.add(goal)
        db.session.commit()
        
        logger.info(f"User {current_user.id} created goal {goal.id}")
        
        return jsonify({
            'message': 'Goal created successfully',
            'goal': {
                'id': goal.id,
                'name': goal.name,
                'target_amount': float(goal.target_amount),
                'current_amount': float(goal.current_amount),
                'deadline': goal.deadline.isoformat() if goal.deadline else None,
                'description': goal.description,
                'icon': goal.icon,
                'color': goal.color,
                'wallet_id': goal.wallet_id,
                'progress_percentage': round(goal.get_progress_percentage(), 2),
                'remaining_amount': float(goal.get_remaining_amount())
            }
        }), 201
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error creating goal: {e}")
        abort(500, description="Failed to create goal")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error creating goal: {e}")
        abort(500, description="An error occurred")


@bp.route('/goals/<int:goal_id>', methods=['GET'])
@login_required
def get_goal(goal_id):
    """Get a specific savings goal"""
    try:
        goal = SavingsGoal.query.filter_by(
            id=goal_id,
            user_id=current_user.id
        ).first()
        
        if not goal:
            abort(404, description="Goal not found")
        
        return jsonify({
            'goal': {
                'id': goal.id,
                'name': sanitize_string(goal.name, max_length=100),
                'target_amount': float(goal.target_amount),
                'current_amount': float(goal.current_amount),
                'deadline': goal.deadline.isoformat() if goal.deadline else None,
                'description': sanitize_string(goal.description, max_length=500),
                'icon': goal.icon,
                'color': goal.color,
                'wallet_id': goal.wallet_id,
                'is_achieved': goal.is_achieved,
                'achieved_at': goal.achieved_at.isoformat() if goal.achieved_at else None,
                'progress_percentage': round(goal.get_progress_percentage(), 2),
                'remaining_amount': float(goal.get_remaining_amount()),
                'is_overdue': goal.is_overdue(),
                'created_at': goal.created_at.isoformat() if goal.created_at else None,
                'updated_at': goal.updated_at.isoformat() if goal.updated_at else None
            }
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching goal: {e}")
        abort(500, description="Failed to fetch goal")
    except Exception as e:
        logger.exception(f"Error fetching goal: {e}")
        abort(500, description="An error occurred")


@bp.route('/goals/<int:goal_id>', methods=['PUT', 'PATCH'])
@login_required
@validate_json
def update_goal(goal_id):
    """Update an existing savings goal"""
    try:
        goal = SavingsGoal.query.filter_by(
            id=goal_id,
            user_id=current_user.id
        ).first()
        
        if not goal:
            abort(404, description="Goal not found")
        
        data = request.get_json()
        
        # Update fields if provided
        if 'name' in data:
            goal.name = sanitize_string(data['name'], max_length=100)
        
        if 'target_amount' in data:
            new_amount = validate_amount(data['target_amount'])
            if new_amount is None or float(new_amount) <= 0:
                abort(400, description="Target amount must be greater than 0")
            goal.target_amount = float(new_amount)
        
        if 'current_amount' in data:
            new_current = validate_amount(data['current_amount'])
            if new_current is None or float(new_current) < 0:
                abort(400, description="Current amount cannot be negative")
            goal.current_amount = float(new_current)
            # Check if achieved
            if goal.current_amount >= goal.target_amount and not goal.is_achieved:
                goal.is_achieved = True
                goal.achieved_at = datetime.utcnow()
        
        if 'deadline' in data:
            if data['deadline'] is None:
                goal.deadline = None
            else:
                deadline = validate_date(data['deadline'])
                if deadline and deadline < date.today():
                    abort(400, description="Deadline cannot be in the past")
                goal.deadline = deadline
        
        if 'description' in data:
            goal.description = sanitize_string(data.get('description', ''), max_length=500)
        
        if 'icon' in data:
            goal.icon = data['icon']
        
        if 'color' in data:
            goal.color = data['color']
        
        if 'wallet_id' in data:
            if data['wallet_id'] is None:
                goal.wallet_id = None
            else:
                wallet = Wallet.query.filter_by(
                    id=data['wallet_id'],
                    user_id=current_user.id
                ).first()
                if not wallet:
                    abort(404, description="Wallet not found")
                goal.wallet_id = wallet.id
        
        goal.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"User {current_user.id} updated goal {goal_id}")
        
        return jsonify({
            'message': 'Goal updated successfully',
            'goal': {
                'id': goal.id,
                'name': goal.name,
                'target_amount': float(goal.target_amount),
                'current_amount': float(goal.current_amount),
                'deadline': goal.deadline.isoformat() if goal.deadline else None,
                'description': goal.description,
                'icon': goal.icon,
                'color': goal.color,
                'wallet_id': goal.wallet_id,
                'is_achieved': goal.is_achieved,
                'progress_percentage': round(goal.get_progress_percentage(), 2),
                'remaining_amount': float(goal.get_remaining_amount())
            }
        }), 200
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error updating goal: {e}")
        abort(500, description="Failed to update goal")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error updating goal: {e}")
        abort(500, description="An error occurred")


@bp.route('/goals/<int:goal_id>', methods=['DELETE'])
@login_required
def delete_goal(goal_id):
    """Delete a savings goal"""
    try:
        goal = SavingsGoal.query.filter_by(
            id=goal_id,
            user_id=current_user.id
        ).first()
        
        if not goal:
            abort(404, description="Goal not found")
        
        db.session.delete(goal)
        db.session.commit()
        
        logger.info(f"User {current_user.id} deleted goal {goal_id}")
        
        return jsonify({
            'message': 'Goal deleted successfully'
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error deleting goal: {e}")
        abort(500, description="Failed to delete goal")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error deleting goal: {e}")
        abort(500, description="An error occurred")


@bp.route('/goals/<int:goal_id>/add', methods=['POST'])
@login_required
@validate_json
def add_to_goal(goal_id):
    """Add amount to a savings goal"""
    try:
        goal = SavingsGoal.query.filter_by(
            id=goal_id,
            user_id=current_user.id
        ).first()
        
        if not goal:
            abort(404, description="Goal not found")
        
        if goal.is_achieved:
            abort(400, description="Goal has already been achieved")
        
        data = request.get_json()
        amount = validate_amount(data.get('amount', 0))
        
        if amount is None or float(amount) <= 0:
            abort(400, description="Amount must be greater than 0")
        
        # Check if wallet has enough balance (if linked)
        if goal.wallet_id:
            wallet = Wallet.query.get(goal.wallet_id)
            if wallet and wallet.balance < float(amount):
                abort(400, description="Insufficient wallet balance")
        
        # Add amount to goal
        was_achieved = goal.is_achieved
        goal.add_amount(float(amount))
        
        # Update wallet balance if linked
        if goal.wallet_id:
            wallet = Wallet.query.get(goal.wallet_id)
            if wallet:
                wallet.balance -= float(amount)
                db.session.commit()
        
        # Create notification if goal achieved
        if goal.is_achieved and not was_achieved:
            notification = Notification(
                user_id=current_user.id,
                type='goal_achieved',
                message=f'Chúc mừng! Bạn đã đạt được mục tiêu "{goal.name}"! 🎉'
            )
            db.session.add(notification)
            db.session.commit()
        
        logger.info(f"User {current_user.id} added {amount} to goal {goal_id}")
        
        return jsonify({
            'message': 'Amount added successfully',
            'goal': {
                'id': goal.id,
                'name': goal.name,
                'target_amount': float(goal.target_amount),
                'current_amount': float(goal.current_amount),
                'is_achieved': goal.is_achieved,
                'progress_percentage': round(goal.get_progress_percentage(), 2),
                'remaining_amount': float(goal.get_remaining_amount())
            }
        }), 200
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error adding to goal: {e}")
        abort(500, description="Failed to add amount to goal")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error adding to goal: {e}")
        abort(500, description="An error occurred")


@bp.route('/goals/<int:goal_id>/progress', methods=['GET'])
@login_required
def get_goal_progress(goal_id):
    """Get progress information for a savings goal"""
    try:
        goal = SavingsGoal.query.filter_by(
            id=goal_id,
            user_id=current_user.id
        ).first()
        
        if not goal:
            abort(404, description="Goal not found")
        
        # Calculate days remaining if deadline exists
        days_remaining = None
        if goal.deadline:
            days_remaining = (goal.deadline - date.today()).days
        
        # Calculate average daily savings needed
        daily_savings_needed = None
        if goal.deadline and days_remaining and days_remaining > 0:
            daily_savings_needed = goal.get_remaining_amount() / days_remaining
        
        return jsonify({
            'goal_id': goal.id,
            'name': goal.name,
            'target_amount': float(goal.target_amount),
            'current_amount': float(goal.current_amount),
            'remaining_amount': float(goal.get_remaining_amount()),
            'progress_percentage': round(goal.get_progress_percentage(), 2),
            'is_achieved': goal.is_achieved,
            'is_overdue': goal.is_overdue(),
            'deadline': goal.deadline.isoformat() if goal.deadline else None,
            'days_remaining': days_remaining,
            'daily_savings_needed': round(daily_savings_needed, 2) if daily_savings_needed else None
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching goal progress: {e}")
        abort(500, description="Failed to fetch goal progress")
    except Exception as e:
        logger.exception(f"Error fetching goal progress: {e}")
        abort(500, description="An error occurred")


@bp.route('/goals/active', methods=['GET'])
@login_required
def get_active_goals():
    """Get active (not achieved) savings goals"""
    try:
        goals = SavingsGoal.query.filter_by(
            user_id=current_user.id,
            is_achieved=False
        ).order_by(SavingsGoal.deadline.asc().nullslast(), SavingsGoal.created_at.desc()).all()
        
        result = []
        for goal in goals:
            result.append({
                'id': goal.id,
                'name': sanitize_string(goal.name, max_length=100),
                'target_amount': float(goal.target_amount),
                'current_amount': float(goal.current_amount),
                'deadline': goal.deadline.isoformat() if goal.deadline else None,
                'description': sanitize_string(goal.description, max_length=500),
                'icon': goal.icon,
                'color': goal.color,
                'wallet_id': goal.wallet_id,
                'progress_percentage': round(goal.get_progress_percentage(), 2),
                'remaining_amount': float(goal.get_remaining_amount()),
                'is_overdue': goal.is_overdue()
            })
        
        return jsonify({
            'goals': result,
            'count': len(result)
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching active goals: {e}")
        abort(500, description="Failed to fetch active goals")
    except Exception as e:
        logger.exception(f"Error fetching active goals: {e}")
        abort(500, description="An error occurred")

