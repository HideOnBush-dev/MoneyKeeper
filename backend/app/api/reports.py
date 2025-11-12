"""
API endpoints for reports and analytics
"""

from flask import jsonify, request, abort
from flask_login import login_required, current_user
from app.api import bp
from app.models import Expense, Wallet, Budget
from app import db, limiter
from app.security import sanitize_string
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func, extract
from datetime import datetime, date, timedelta
from calendar import monthrange
import logging

logger = logging.getLogger(__name__)


@bp.route('/reports/monthly', methods=['GET'])
@login_required
def get_monthly_report():
    """Get comprehensive monthly report"""
    try:
        # Get month and year from query params
        month = request.args.get('month', datetime.now().month, type=int)
        year = request.args.get('year', datetime.now().year, type=int)
        
        # Validate
        if month < 1 or month > 12:
            abort(400, description="Month must be between 1 and 12")
        
        if year < 2000 or year > 2100:
            abort(400, description="Year must be between 2000 and 2100")
        
        # Date range for the month
        start_date = date(year, month, 1)
        _, last_day = monthrange(year, month)
        end_date = date(year, month, last_day)
        
        # Get all expenses for the month
        expenses_query = Expense.query.filter(
            Expense.user_id == current_user.id,
            Expense.date >= start_date,
            Expense.date <= end_date
        )
        
        # Calculate totals
        total_expenses = expenses_query.filter_by(is_expense=True).with_entities(
            func.sum(Expense.amount)
        ).scalar() or 0
        
        total_income = expenses_query.filter_by(is_expense=False).with_entities(
            func.sum(Expense.amount)
        ).scalar() or 0
        
        # By category
        by_category = db.session.query(
            Expense.category,
            func.sum(Expense.amount).label('total'),
            func.count(Expense.id).label('count')
        ).filter(
            Expense.user_id == current_user.id,
            Expense.is_expense == True,
            Expense.date >= start_date,
            Expense.date <= end_date
        ).group_by(Expense.category).all()
        
        # Top expenses
        top_expenses = Expense.query.filter(
            Expense.user_id == current_user.id,
            Expense.is_expense == True,
            Expense.date >= start_date,
            Expense.date <= end_date
        ).order_by(Expense.amount.desc()).limit(10).all()
        
        # Budget comparison
        budgets = Budget.query.filter_by(
            user_id=current_user.id,
            month=month,
            year=year
        ).all()
        
        budget_comparison = []
        for budget in budgets:
            spent = db.session.query(func.sum(Expense.amount)).filter(
                Expense.user_id == current_user.id,
                Expense.category == budget.category,
                Expense.is_expense == True,
                Expense.date >= start_date,
                Expense.date <= end_date
            ).scalar() or 0
            
            budget_comparison.append({
                'category': budget.category,
                'budget': float(budget.amount),
                'spent': float(spent),
                'remaining': float(budget.amount) - float(spent),
                'percentage': round((float(spent) / float(budget.amount) * 100), 2) if budget.amount > 0 else 0
            })
        
        # Daily breakdown
        daily_breakdown = db.session.query(
            func.date(Expense.date).label('date'),
            func.sum(func.case((Expense.is_expense == True, Expense.amount), else_=0)).label('expenses'),
            func.sum(func.case((Expense.is_expense == False, Expense.amount), else_=0)).label('income')
        ).filter(
            Expense.user_id == current_user.id,
            Expense.date >= start_date,
            Expense.date <= end_date
        ).group_by('date').order_by('date').all()
        
        return jsonify({
            'period': {
                'month': month,
                'year': year,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'summary': {
                'total_expenses': float(total_expenses),
                'total_income': float(total_income),
                'net_balance': float(total_income) - float(total_expenses),
                'transaction_count': expenses_query.count()
            },
            'by_category': [{
                'category': cat,
                'total': float(total),
                'count': count
            } for cat, total, count in by_category],
            'top_expenses': [{
                'id': e.id,
                'amount': float(e.amount),
                'category': e.category,
                'description': sanitize_string(e.description, max_length=200),
                'date': e.date.isoformat()
            } for e in top_expenses],
            'budget_comparison': budget_comparison,
            'daily_breakdown': [{
                'date': d.isoformat() if d else None,
                'expenses': float(expenses),
                'income': float(income),
                'net': float(income) - float(expenses)
            } for d, expenses, income in daily_breakdown]
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching monthly report: {e}")
        abort(500, description="Failed to fetch monthly report")
    except Exception as e:
        logger.exception(f"Error fetching monthly report: {e}")
        abort(500, description="An error occurred")


@bp.route('/reports/comparison', methods=['GET'])
@login_required
def get_comparison_report():
    """Compare spending across multiple months"""
    try:
        # Get months to compare
        months_param = request.args.get('months', '3')
        try:
            months_count = int(months_param)
        except ValueError:
            abort(400, description="Invalid months parameter")
        
        if months_count < 2 or months_count > 12:
            abort(400, description="Months must be between 2 and 12")
        
        current_date = datetime.now()
        comparison_data = []
        
        for i in range(months_count):
            # Calculate month and year
            target_month = current_date.month - i
            target_year = current_date.year
            
            while target_month < 1:
                target_month += 12
                target_year -= 1
            
            # Date range
            start_date = date(target_year, target_month, 1)
            _, last_day = monthrange(target_year, target_month)
            end_date = date(target_year, target_month, last_day)
            
            # Get expenses for this month
            total_expenses = db.session.query(func.sum(Expense.amount)).filter(
                Expense.user_id == current_user.id,
                Expense.is_expense == True,
                Expense.date >= start_date,
                Expense.date <= end_date
            ).scalar() or 0
            
            total_income = db.session.query(func.sum(Expense.amount)).filter(
                Expense.user_id == current_user.id,
                Expense.is_expense == False,
                Expense.date >= start_date,
                Expense.date <= end_date
            ).scalar() or 0
            
            # By category
            by_category = db.session.query(
                Expense.category,
                func.sum(Expense.amount).label('total')
            ).filter(
                Expense.user_id == current_user.id,
                Expense.is_expense == True,
                Expense.date >= start_date,
                Expense.date <= end_date
            ).group_by(Expense.category).all()
            
            comparison_data.append({
                'month': target_month,
                'year': target_year,
                'total_expenses': float(total_expenses),
                'total_income': float(total_income),
                'net_balance': float(total_income) - float(total_expenses),
                'by_category': {cat: float(total) for cat, total in by_category}
            })
        
        # Reverse to show oldest first
        comparison_data.reverse()
        
        # Calculate trends
        if len(comparison_data) >= 2:
            first_month = comparison_data[0]
            last_month = comparison_data[-1]
            
            expense_change = last_month['total_expenses'] - first_month['total_expenses']
            expense_change_pct = (expense_change / first_month['total_expenses'] * 100) if first_month['total_expenses'] > 0 else 0
            
            income_change = last_month['total_income'] - first_month['total_income']
            income_change_pct = (income_change / first_month['total_income'] * 100) if first_month['total_income'] > 0 else 0
            
            trends = {
                'expense_change': round(expense_change, 2),
                'expense_change_percentage': round(expense_change_pct, 2),
                'income_change': round(income_change, 2),
                'income_change_percentage': round(income_change_pct, 2)
            }
        else:
            trends = None
        
        return jsonify({
            'comparison': comparison_data,
            'trends': trends
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching comparison report: {e}")
        abort(500, description="Failed to fetch comparison report")
    except Exception as e:
        logger.exception(f"Error fetching comparison report: {e}")
        abort(500, description="An error occurred")


@bp.route('/reports/yearly', methods=['GET'])
@login_required
def get_yearly_report():
    """Get comprehensive yearly report"""
    try:
        year = request.args.get('year', datetime.now().year, type=int)
        
        if year < 2000 or year > 2100:
            abort(400, description="Year must be between 2000 and 2100")
        
        # Date range for the year
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        
        # Calculate totals
        total_expenses = db.session.query(func.sum(Expense.amount)).filter(
            Expense.user_id == current_user.id,
            Expense.is_expense == True,
            Expense.date >= start_date,
            Expense.date <= end_date
        ).scalar() or 0
        
        total_income = db.session.query(func.sum(Expense.amount)).filter(
            Expense.user_id == current_user.id,
            Expense.is_expense == False,
            Expense.date >= start_date,
            Expense.date <= end_date
        ).scalar() or 0
        
        # Monthly breakdown
        monthly_breakdown = db.session.query(
            extract('month', Expense.date).label('month'),
            func.sum(func.case((Expense.is_expense == True, Expense.amount), else_=0)).label('expenses'),
            func.sum(func.case((Expense.is_expense == False, Expense.amount), else_=0)).label('income')
        ).filter(
            Expense.user_id == current_user.id,
            Expense.date >= start_date,
            Expense.date <= end_date
        ).group_by('month').order_by('month').all()
        
        # By category
        by_category = db.session.query(
            Expense.category,
            func.sum(Expense.amount).label('total'),
            func.count(Expense.id).label('count')
        ).filter(
            Expense.user_id == current_user.id,
            Expense.is_expense == True,
            Expense.date >= start_date,
            Expense.date <= end_date
        ).group_by(Expense.category).order_by(func.sum(Expense.amount).desc()).all()
        
        # Highest spending month
        if monthly_breakdown:
            highest_month = max(monthly_breakdown, key=lambda x: x.expenses)
            lowest_month = min(monthly_breakdown, key=lambda x: x.expenses)
        else:
            highest_month = None
            lowest_month = None
        
        return jsonify({
            'year': year,
            'summary': {
                'total_expenses': float(total_expenses),
                'total_income': float(total_income),
                'net_balance': float(total_income) - float(total_expenses),
                'average_monthly_expenses': float(total_expenses) / 12,
                'average_monthly_income': float(total_income) / 12
            },
            'monthly_breakdown': [{
                'month': int(month),
                'expenses': float(expenses),
                'income': float(income),
                'net': float(income) - float(expenses)
            } for month, expenses, income in monthly_breakdown],
            'by_category': [{
                'category': cat,
                'total': float(total),
                'count': count,
                'percentage': round((float(total) / float(total_expenses) * 100), 2) if total_expenses > 0 else 0
            } for cat, total, count in by_category],
            'insights': {
                'highest_spending_month': {
                    'month': int(highest_month.month),
                    'amount': float(highest_month.expenses)
                } if highest_month else None,
                'lowest_spending_month': {
                    'month': int(lowest_month.month),
                    'amount': float(lowest_month.expenses)
                } if lowest_month else None
            }
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching yearly report: {e}")
        abort(500, description="Failed to fetch yearly report")
    except Exception as e:
        logger.exception(f"Error fetching yearly report: {e}")
        abort(500, description="An error occurred")


@bp.route('/reports/category/<category>', methods=['GET'])
@login_required
def get_category_report(category):
    """Get detailed report for a specific category"""
    try:
        from app.security import validate_category
        
        # Validate category
        category = validate_category(category)
        
        # Get date range
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = Expense.query.filter(
            Expense.user_id == current_user.id,
            Expense.category == category,
            Expense.is_expense == True
        )
        
        if start_date:
            from app.security import validate_date
            query = query.filter(Expense.date >= validate_date(start_date))
        
        if end_date:
            from app.security import validate_date
            end_dt = validate_date(end_date)
            query = query.filter(Expense.date < end_dt + timedelta(days=1))
        
        # Calculate statistics
        total = query.with_entities(func.sum(Expense.amount)).scalar() or 0
        count = query.count()
        average = float(total) / count if count > 0 else 0
        
        # Get all expenses
        expenses = query.order_by(Expense.date.desc()).all()
        
        # Monthly trend
        monthly_trend = db.session.query(
            extract('year', Expense.date).label('year'),
            extract('month', Expense.date).label('month'),
            func.sum(Expense.amount).label('total')
        ).filter(
            Expense.user_id == current_user.id,
            Expense.category == category,
            Expense.is_expense == True
        )
        
        if start_date:
            from app.security import validate_date
            monthly_trend = monthly_trend.filter(Expense.date >= validate_date(start_date))
        
        if end_date:
            from app.security import validate_date
            end_dt = validate_date(end_date)
            monthly_trend = monthly_trend.filter(Expense.date < end_dt + timedelta(days=1))
        
        monthly_trend = monthly_trend.group_by('year', 'month').order_by('year', 'month').all()
        
        return jsonify({
            'category': category,
            'summary': {
                'total': float(total),
                'count': count,
                'average': round(average, 2)
            },
            'monthly_trend': [{
                'year': int(year),
                'month': int(month),
                'total': float(total)
            } for year, month, total in monthly_trend],
            'recent_expenses': [{
                'id': e.id,
                'amount': float(e.amount),
                'description': sanitize_string(e.description, max_length=200),
                'date': e.date.isoformat(),
                'wallet_id': e.wallet_id
            } for e in expenses[:20]]  # Limit to 20 most recent
        }), 200
        
    except ValueError as e:
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching category report: {e}")
        abort(500, description="Failed to fetch category report")
    except Exception as e:
        logger.exception(f"Error fetching category report: {e}")
        abort(500, description="An error occurred")
