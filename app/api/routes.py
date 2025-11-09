from flask import jsonify, request
from flask_login import login_required, current_user
from app.api import bp
from app.models import Expense, Wallet, Budget, User
from app import db


@bp.route('/auth/me')
@login_required
def get_current_user():
    """Get current authenticated user"""
    return jsonify({
        'user': {
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
            'premium': getattr(current_user, 'premium', False)
        }
    })


@bp.route('/dashboard')
@login_required
def get_dashboard():
    """Get dashboard statistics"""
    # Calculate total income and expenses
    total_income = 0
    total_expenses = 0
    
    expenses = Expense.query.filter_by(user_id=current_user.id).all()
    for expense in expenses:
        if expense.amount > 0:
            total_income += expense.amount
        else:
            total_expenses += abs(expense.amount)
    
    balance = total_income - total_expenses
    
    return jsonify({
        'totalIncome': total_income,
        'totalExpenses': total_expenses,
        'balance': balance,
        'recentTransactions': []
    })


@bp.route('/expenses')
@login_required
def get_expenses():
    """Get all expenses for current user"""
    expenses = Expense.query.filter_by(user_id=current_user.id).order_by(Expense.date.desc()).all()
    
    return jsonify({
        'expenses': [{
            'id': e.id,
            'amount': e.amount,
            'category': e.category,
            'description': e.description,
            'date': e.date.isoformat() if e.date else None,
            'wallet_id': e.wallet_id
        } for e in expenses]
    })


@bp.route('/wallets')
@login_required
def get_wallets():
    """Get all wallets for current user"""
    wallets = Wallet.query.filter_by(user_id=current_user.id).all()
    
    return jsonify({
        'wallets': [{
            'id': w.id,
            'name': w.name,
            'balance': w.balance,
            'currency': getattr(w, 'currency', 'VND')
        } for w in wallets]
    })


@bp.route('/budgets')
@login_required
def get_budgets():
    """Get all budgets for current user"""
    budgets = Budget.query.filter_by(user_id=current_user.id).all()
    
    return jsonify({
        'budgets': [{
            'id': b.id,
            'category': b.category,
            'amount': b.amount,
            'spent': getattr(b, 'spent', 0),
            'period': getattr(b, 'period', 'monthly')
        } for b in budgets]
    })
