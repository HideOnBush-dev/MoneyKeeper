# app/api/expenses.py
"""
API endpoints for expense management
"""

from flask import jsonify, request, abort, Response
from flask_login import login_required, current_user
from app.api import bp
from app.models import Expense, Wallet
from app import db, limiter
from app.security import (
    validate_amount, validate_category, sanitize_string,
    validate_positive_integer, validate_date
)
from app.middleware import validate_json, log_slow_requests
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
from decimal import Decimal
import csv
from io import StringIO
import logging

logger = logging.getLogger(__name__)


@bp.route('/expenses', methods=['POST'])
@login_required
@validate_json
@log_slow_requests(threshold=2.0)
def create_expense():
    """Create a new expense"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('amount'):
            abort(400, description="Amount is required")
        
        if not data.get('category'):
            abort(400, description="Category is required")
        
        if not data.get('wallet_id'):
            abort(400, description="Wallet ID is required")
        
        # Validate and sanitize inputs
        amount = validate_amount(data['amount'])
        category = validate_category(data['category'])
        description = sanitize_string(data.get('description', ''), max_length=500)
        wallet_id = validate_positive_integer(data['wallet_id'])
        
        # Validate date
        expense_date = datetime.utcnow()
        if data.get('date'):
            expense_date = validate_date(data['date'])
        
        # Check wallet ownership
        wallet = Wallet.query.filter_by(
            id=wallet_id,
            user_id=current_user.id
        ).first()
        
        if not wallet:
            abort(404, description="Wallet not found")
        
        # Check if wallet has sufficient balance for expense
        is_expense = data.get('is_expense', True)
        if is_expense and wallet.balance < float(amount):
            return jsonify({
                'error': 'Insufficient balance',
                'wallet_balance': float(wallet.balance),
                'required_amount': float(amount)
            }), 400
        
        # Create expense
        expense = Expense(
            amount=float(amount),
            category=category,
            description=description,
            date=expense_date,
            user_id=current_user.id,
            wallet_id=wallet_id,
            is_expense=is_expense
        )
        
        db.session.add(expense)
        
        # Update wallet balance
        wallet.update_balance(float(amount), is_expense=is_expense)
        
        db.session.commit()
        
        logger.info(f"User {current_user.id} created expense {expense.id}")
        
        return jsonify({
            'message': 'Expense created successfully',
            'expense': {
                'id': expense.id,
                'amount': float(expense.amount),
                'category': expense.category,
                'description': expense.description,
                'date': expense.date.isoformat(),
                'wallet_id': expense.wallet_id,
                'is_expense': expense.is_expense
            }
        }), 201
        
    except ValueError as e:
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error creating expense: {e}")
        abort(500, description="Failed to create expense")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error creating expense: {e}")
        abort(500, description="An error occurred")


@bp.route('/expenses/<int:expense_id>', methods=['GET'])
@login_required
def get_expense(expense_id):
    """Get a specific expense"""
    try:
        expense = Expense.query.filter_by(
            id=expense_id,
            user_id=current_user.id
        ).first()
        
        if not expense:
            abort(404, description="Expense not found")
        
        return jsonify({
            'expense': {
                'id': expense.id,
                'amount': float(expense.amount),
                'category': expense.category,
                'description': sanitize_string(expense.description, max_length=500),
                'date': expense.date.isoformat() if expense.date else None,
                'wallet_id': expense.wallet_id,
                'is_expense': expense.is_expense,
                'created_at': expense.date.isoformat() if expense.date else None
            }
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching expense: {e}")
        abort(500, description="Failed to fetch expense")
    except Exception as e:
        logger.exception(f"Error fetching expense: {e}")
        abort(500, description="An error occurred")


@bp.route('/expenses/<int:expense_id>', methods=['PUT', 'PATCH'])
@login_required
@validate_json
def update_expense(expense_id):
    """Update an existing expense"""
    try:
        expense = Expense.query.filter_by(
            id=expense_id,
            user_id=current_user.id
        ).first()
        
        if not expense:
            abort(404, description="Expense not found")
        
        data = request.get_json()
        old_amount = expense.amount
        old_wallet_id = expense.wallet_id
        old_is_expense = expense.is_expense
        
        # Update fields if provided
        if 'amount' in data:
            new_amount = validate_amount(data['amount'])
            expense.amount = float(new_amount)
        
        if 'category' in data:
            expense.category = validate_category(data['category'])
        
        if 'description' in data:
            expense.description = sanitize_string(data['description'], max_length=500)
        
        if 'date' in data:
            expense.date = validate_date(data['date'])
        
        if 'is_expense' in data:
            expense.is_expense = bool(data['is_expense'])
        
        # Handle wallet change
        if 'wallet_id' in data:
            new_wallet_id = validate_positive_integer(data['wallet_id'])
            
            # Verify new wallet ownership
            new_wallet = Wallet.query.filter_by(
                id=new_wallet_id,
                user_id=current_user.id
            ).first()
            
            if not new_wallet:
                abort(404, description="New wallet not found")
            
            # Revert old wallet balance
            old_wallet = Wallet.query.get(old_wallet_id)
            if old_wallet:
                old_wallet.update_balance(old_amount, is_expense=not old_is_expense)
            
            # Update new wallet balance
            new_wallet.update_balance(expense.amount, is_expense=expense.is_expense)
            
            expense.wallet_id = new_wallet_id
        else:
            # If amount or type changed, update wallet balance
            if expense.amount != old_amount or expense.is_expense != old_is_expense:
                wallet = Wallet.query.get(expense.wallet_id)
                if wallet:
                    # Revert old amount
                    wallet.update_balance(old_amount, is_expense=not old_is_expense)
                    # Apply new amount
                    wallet.update_balance(expense.amount, is_expense=expense.is_expense)
        
        db.session.commit()
        
        logger.info(f"User {current_user.id} updated expense {expense_id}")
        
        return jsonify({
            'message': 'Expense updated successfully',
            'expense': {
                'id': expense.id,
                'amount': float(expense.amount),
                'category': expense.category,
                'description': expense.description,
                'date': expense.date.isoformat(),
                'wallet_id': expense.wallet_id,
                'is_expense': expense.is_expense
            }
        }), 200
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error updating expense: {e}")
        abort(500, description="Failed to update expense")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error updating expense: {e}")
        abort(500, description="An error occurred")


@bp.route('/expenses/<int:expense_id>', methods=['DELETE'])
@login_required
def delete_expense(expense_id):
    """Delete an expense"""
    try:
        expense = Expense.query.filter_by(
            id=expense_id,
            user_id=current_user.id
        ).first()
        
        if not expense:
            abort(404, description="Expense not found")
        
        # Revert wallet balance
        wallet = Wallet.query.get(expense.wallet_id)
        if wallet:
            wallet.update_balance(expense.amount, is_expense=not expense.is_expense)
        
        db.session.delete(expense)
        db.session.commit()
        
        logger.info(f"User {current_user.id} deleted expense {expense_id}")
        
        return jsonify({
            'message': 'Expense deleted successfully'
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error deleting expense: {e}")
        abort(500, description="Failed to delete expense")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error deleting expense: {e}")
        abort(500, description="An error occurred")


@bp.route('/expenses/bulk-delete', methods=['POST'])
@login_required
@validate_json
def bulk_delete_expenses():
    """Delete multiple expenses at once"""
    try:
        data = request.get_json()
        
        if not data.get('expense_ids') or not isinstance(data['expense_ids'], list):
            abort(400, description="expense_ids array is required")
        
        if len(data['expense_ids']) > 100:
            abort(400, description="Cannot delete more than 100 expenses at once")
        
        # Validate all IDs
        expense_ids = [validate_positive_integer(id) for id in data['expense_ids']]
        
        # Fetch all expenses
        expenses = Expense.query.filter(
            Expense.id.in_(expense_ids),
            Expense.user_id == current_user.id
        ).all()
        
        if not expenses:
            abort(404, description="No expenses found")
        
        deleted_count = 0
        for expense in expenses:
            # Revert wallet balance
            wallet = Wallet.query.get(expense.wallet_id)
            if wallet:
                wallet.update_balance(expense.amount, is_expense=not expense.is_expense)
            
            db.session.delete(expense)
            deleted_count += 1
        
        db.session.commit()
        
        logger.info(f"User {current_user.id} deleted {deleted_count} expenses")
        
        return jsonify({
            'message': f'{deleted_count} expenses deleted successfully',
            'deleted_count': deleted_count
        }), 200
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error bulk deleting expenses: {e}")
        abort(500, description="Failed to delete expenses")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error bulk deleting expenses: {e}")
        abort(500, description="An error occurred")


@bp.route('/expenses/search', methods=['GET'])
@login_required
def search_expenses():
    """Search and filter expenses with advanced options"""
    try:
        # Build query
        query = Expense.query.filter_by(user_id=current_user.id)
        
        # Category filter
        category = request.args.get('category')
        if category:
            query = query.filter_by(category=validate_category(category))
        
        # Wallet filter
        wallet_id = request.args.get('wallet_id', type=int)
        if wallet_id:
            query = query.filter_by(wallet_id=wallet_id)
        
        # Type filter (expense or income)
        is_expense = request.args.get('is_expense')
        if is_expense is not None:
            query = query.filter_by(is_expense=is_expense.lower() == 'true')
        
        # Date range filter
        start_date = request.args.get('start_date')
        if start_date:
            query = query.filter(Expense.date >= validate_date(start_date))
        
        end_date = request.args.get('end_date')
        if end_date:
            end_dt = validate_date(end_date)
            # Include the entire end date
            from datetime import timedelta
            query = query.filter(Expense.date < end_dt + timedelta(days=1))
        
        # Amount range filter
        min_amount = request.args.get('min_amount', type=float)
        if min_amount is not None:
            query = query.filter(Expense.amount >= min_amount)
        
        max_amount = request.args.get('max_amount', type=float)
        if max_amount is not None:
            query = query.filter(Expense.amount <= max_amount)
        
        # Description search
        description = request.args.get('description')
        if description:
            query = query.filter(Expense.description.ilike(f'%{description}%'))
        
        # Sort options
        sort_by = request.args.get('sort_by', 'date')
        sort_order = request.args.get('sort_order', 'desc')
        
        if sort_by == 'amount':
            order_col = Expense.amount
        elif sort_by == 'category':
            order_col = Expense.category
        else:
            order_col = Expense.date
        
        if sort_order == 'asc':
            query = query.order_by(order_col.asc())
        else:
            query = query.order_by(order_col.desc())
        
        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'expenses': [{
                'id': e.id,
                'amount': float(e.amount),
                'category': e.category,
                'description': sanitize_string(e.description, max_length=500),
                'date': e.date.isoformat() if e.date else None,
                'wallet_id': e.wallet_id,
                'is_expense': e.is_expense
            } for e in pagination.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200
        
    except ValueError as e:
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        logger.exception(f"Database error searching expenses: {e}")
        abort(500, description="Failed to search expenses")
    except Exception as e:
        logger.exception(f"Error searching expenses: {e}")
        abort(500, description="An error occurred")


@bp.route('/expenses/statistics', methods=['GET'])
@login_required
def get_expense_statistics():
    """Get comprehensive expense statistics"""
    try:
        from sqlalchemy import func, extract
        
        # Get date range
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = Expense.query.filter_by(user_id=current_user.id)
        
        if start_date:
            query = query.filter(Expense.date >= validate_date(start_date))
        
        if end_date:
            end_dt = validate_date(end_date)
            from datetime import timedelta
            query = query.filter(Expense.date < end_dt + timedelta(days=1))
        
        # Total expenses and income
        total_expenses = query.filter_by(is_expense=True).with_entities(
            func.sum(Expense.amount)
        ).scalar() or 0
        
        total_income = query.filter_by(is_expense=False).with_entities(
            func.sum(Expense.amount)
        ).scalar() or 0
        
        # Count by type
        expense_count = query.filter_by(is_expense=True).count()
        income_count = query.filter_by(is_expense=False).count()
        
        # By category
        by_category = db.session.query(
            Expense.category,
            func.sum(Expense.amount).label('total'),
            func.count(Expense.id).label('count')
        ).filter(
            Expense.user_id == current_user.id,
            Expense.is_expense == True
        )
        
        if start_date:
            by_category = by_category.filter(Expense.date >= validate_date(start_date))
        if end_date:
            end_dt = validate_date(end_date)
            from datetime import timedelta
            by_category = by_category.filter(Expense.date < end_dt + timedelta(days=1))
        
        by_category = by_category.group_by(Expense.category).all()
        
        # By wallet
        by_wallet = db.session.query(
            Expense.wallet_id,
            Wallet.name,
            func.sum(Expense.amount).label('total'),
            func.count(Expense.id).label('count')
        ).join(Wallet).filter(
            Expense.user_id == current_user.id,
            Expense.is_expense == True
        )
        
        if start_date:
            by_wallet = by_wallet.filter(Expense.date >= validate_date(start_date))
        if end_date:
            end_dt = validate_date(end_date)
            from datetime import timedelta
            by_wallet = by_wallet.filter(Expense.date < end_dt + timedelta(days=1))
        
        by_wallet = by_wallet.group_by(Expense.wallet_id, Wallet.name).all()
        
        # Average daily spending
        days_query = query.filter_by(is_expense=True)
        if days_query.count() > 0:
            dates = [e.date.date() for e in days_query.all()]
            unique_days = len(set(dates))
            average_daily = float(total_expenses) / unique_days if unique_days > 0 else 0
        else:
            average_daily = 0
        
        return jsonify({
            'summary': {
                'total_expenses': float(total_expenses),
                'total_income': float(total_income),
                'net_balance': float(total_income) - float(total_expenses),
                'expense_count': expense_count,
                'income_count': income_count,
                'average_daily_spending': round(average_daily, 2)
            },
            'by_category': [{
                'category': cat,
                'total': float(total),
                'count': count
            } for cat, total, count in by_category],
            'by_wallet': [{
                'wallet_id': wallet_id,
                'wallet_name': name,
                'total': float(total),
                'count': count
            } for wallet_id, name, total, count in by_wallet]
        }), 200
        
    except ValueError as e:
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching statistics: {e}")
        abort(500, description="Failed to fetch statistics")
    except Exception as e:
        logger.exception(f"Error fetching statistics: {e}")
        abort(500, description="An error occurred")


@bp.route('/expenses/trends', methods=['GET'])
@login_required
def get_expense_trends():
    """Get expense trends over time"""
    try:
        from sqlalchemy import func, extract, case
        
        # Get grouping type (daily, weekly, monthly)
        group_by = request.args.get('group_by', 'monthly')
        
        if group_by not in ['daily', 'weekly', 'monthly']:
            abort(400, description="group_by must be daily, weekly, or monthly")
        
        # Get date range
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = Expense.query.filter_by(user_id=current_user.id)
        
        if start_date:
            query = query.filter(Expense.date >= validate_date(start_date))
        
        if end_date:
            end_dt = validate_date(end_date)
            from datetime import timedelta
            query = query.filter(Expense.date < end_dt + timedelta(days=1))
        
        if group_by == 'monthly':
            # Group by year and month
            trends = db.session.query(
                extract('year', Expense.date).label('year'),
                extract('month', Expense.date).label('month'),
                func.sum(case((Expense.is_expense == True, Expense.amount), else_=0)).label('expenses'),
                func.sum(case((Expense.is_expense == False, Expense.amount), else_=0)).label('income'),
                func.count(Expense.id).label('count')
            ).filter(Expense.user_id == current_user.id)
            
            if start_date:
                trends = trends.filter(Expense.date >= validate_date(start_date))
            if end_date:
                end_dt = validate_date(end_date)
                from datetime import timedelta
                trends = trends.filter(Expense.date < end_dt + timedelta(days=1))
            
            trends = trends.group_by('year', 'month').order_by('year', 'month').all()
            
            result = [{
                'year': int(year),
                'month': int(month),
                'expenses': float(expenses),
                'income': float(income),
                'net': float(income) - float(expenses),
                'count': count
            } for year, month, expenses, income, count in trends]
        
        elif group_by == 'daily':
            # Group by date
            trends = db.session.query(
                func.date(Expense.date).label('date'),
                    func.sum(case((Expense.is_expense == True, Expense.amount), else_=0)).label('expenses'),
                func.sum(case((Expense.is_expense == False, Expense.amount), else_=0)).label('income'),
                func.count(Expense.id).label('count')
            ).filter(Expense.user_id == current_user.id)
            
            if start_date:
                trends = trends.filter(Expense.date >= validate_date(start_date))
            if end_date:
                end_dt = validate_date(end_date)
                from datetime import timedelta
                trends = trends.filter(Expense.date < end_dt + timedelta(days=1))
            
            trends = trends.group_by('date').order_by('date').all()
            
            result = [{
                'date': (date.isoformat() if hasattr(date, 'isoformat') else str(date)) if date is not None else None,
                'expenses': float(expenses),
                'income': float(income),
                'net': float(income) - float(expenses),
                'count': count
            } for date, expenses, income, count in trends]
        
        else:  # weekly
            # Group by year and week
            trends = db.session.query(
                extract('year', Expense.date).label('year'),
                extract('week', Expense.date).label('week'),
                func.sum(case((Expense.is_expense == True, Expense.amount), else_=0)).label('expenses'),
                func.sum(case((Expense.is_expense == False, Expense.amount), else_=0)).label('income'),
                func.count(Expense.id).label('count')
            ).filter(Expense.user_id == current_user.id)
            
            if start_date:
                trends = trends.filter(Expense.date >= validate_date(start_date))
            if end_date:
                end_dt = validate_date(end_date)
                from datetime import timedelta
                trends = trends.filter(Expense.date < end_dt + timedelta(days=1))
            
            trends = trends.group_by('year', 'week').order_by('year', 'week').all()
            
            result = [{
                'year': int(year),
                'week': int(week),
                'expenses': float(expenses),
                'income': float(income),
                'net': float(income) - float(expenses),
                'count': count
            } for year, week, expenses, income, count in trends]
        
        return jsonify({
            'trends': result,
            'group_by': group_by
        }), 200
        
    except ValueError as e:
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching trends: {e}")
        abort(500, description="Failed to fetch trends")
    except Exception as e:
        logger.exception(f"Error fetching trends: {e}")
        abort(500, description="An error occurred")


@bp.route('/expenses/export', methods=['GET'])
@login_required
def export_expenses_csv():
    """Export expenses based on filters as CSV"""
    try:
        # Build query (reuse filters from search_expenses)
        query = Expense.query.filter_by(user_id=current_user.id)

        category = request.args.get('category')
        if category:
            query = query.filter_by(category=validate_category(category))

        wallet_id = request.args.get('wallet_id', type=int)
        if wallet_id:
            query = query.filter_by(wallet_id=wallet_id)

        is_expense = request.args.get('is_expense')
        if is_expense is not None:
            query = query.filter_by(is_expense=is_expense.lower() == 'true')

        start_date = request.args.get('start_date')
        if start_date:
            query = query.filter(Expense.date >= validate_date(start_date))

        end_date = request.args.get('end_date')
        if end_date:
            end_dt = validate_date(end_date)
            from datetime import timedelta
            query = query.filter(Expense.date < end_dt + timedelta(days=1))

        min_amount = request.args.get('min_amount', type=float)
        if min_amount is not None:
            query = query.filter(Expense.amount >= min_amount)

        max_amount = request.args.get('max_amount', type=float)
        if max_amount is not None:
            query = query.filter(Expense.amount <= max_amount)

        description = request.args.get('description')
        if description:
            query = query.filter(Expense.description.ilike(f'%{description}%'))

        sort_by = request.args.get('sort_by', 'date')
        sort_order = request.args.get('sort_order', 'desc')

        if sort_by == 'amount':
            order_col = Expense.amount
        elif sort_by == 'category':
            order_col = Expense.category
        else:
            order_col = Expense.date

        if sort_order == 'asc':
            query = query.order_by(order_col.asc())
        else:
            query = query.order_by(order_col.desc())

        rows = query.all()

        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(['id', 'amount', 'is_expense', 'category', 'description', 'date', 'wallet_id'])
        for e in rows:
            writer.writerow([
                e.id,
                float(e.amount),
                'true' if e.is_expense else 'false',
                e.category,
                sanitize_string(e.description, max_length=500) if e.description else '',
                e.date.isoformat() if e.date else '',
                e.wallet_id,
            ])

        csv_data = output.getvalue()
        filename = f"expenses_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        return Response(
            csv_data,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename={filename}'
            }
        )
    except SQLAlchemyError as e:
        logger.exception(f"Database error exporting expenses: {e}")
        abort(500, description="Failed to export expenses")
    except Exception as e:
        logger.exception(f"Error exporting expenses: {e}")
        abort(500, description="An error occurred")


@bp.route('/expenses/import', methods=['POST'])
@login_required
def import_expenses_csv():
    """Import expenses from a CSV file. Headers: amount,is_expense,category,description,date,wallet_id"""
    try:
        if 'file' not in request.files:
            abort(400, description="No file part")
        file = request.files['file']
        if file.filename == '':
            abort(400, description="No selected file")

        try:
            text = file.read().decode('utf-8-sig')
        except Exception:
            abort(400, description="Unsupported file encoding. Please use UTF-8.")

        reader = csv.DictReader(StringIO(text))
        required_headers = {'amount', 'category', 'date', 'wallet_id'}
        if not reader.fieldnames or not required_headers.issubset(set(reader.fieldnames)):
            missing = required_headers.difference(set(reader.fieldnames or []))
            abort(400, description=f"Missing required headers: {', '.join(missing)}")

        created = 0
        errors = []

        for idx, row in enumerate(reader, start=2):
            try:
                amount = validate_amount(row.get('amount'))
                category = validate_category(row.get('category'))
                description = sanitize_string(row.get('description', ''), max_length=500)
                expense_date = validate_date(row.get('date'))
                wallet_id = validate_positive_integer(row.get('wallet_id'))
                is_expense_val = str(row.get('is_expense', 'true')).strip().lower()
                is_expense = is_expense_val in ['true', '1', 'yes', 'y']

                # Check wallet ownership
                wallet = Wallet.query.filter_by(id=wallet_id, user_id=current_user.id).first()
                if not wallet:
                    raise ValueError("Wallet not found or not owned by user")

                if is_expense and wallet.balance < float(amount):
                    raise ValueError("Insufficient wallet balance for this expense")

                expense = Expense(
                    amount=float(amount),
                    category=category,
                    description=description,
                    date=expense_date,
                    user_id=current_user.id,
                    wallet_id=wallet_id,
                    is_expense=is_expense
                )
                db.session.add(expense)
                wallet.update_balance(float(amount), is_expense=is_expense)
                created += 1
            except Exception as e:
                db.session.rollback()
                errors.append({'row': idx, 'error': str(e)})
                continue

        try:
            db.session.commit()
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(f"Database error committing imported expenses: {e}")
            abort(500, description="Failed to save imported expenses")

        return jsonify({
            'message': 'Import completed',
            'created': created,
            'errors': errors
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error importing expenses: {e}")
        abort(500, description="Failed to import expenses")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error importing expenses: {e}")
        abort(400, description=str(e))