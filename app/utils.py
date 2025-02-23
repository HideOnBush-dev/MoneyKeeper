from datetime import datetime, timedelta

def format_currency(amount):
    """Format amount to VND currency"""
    return f"{amount:,.0f} ₫"

def get_date_range(range_type='month'):
    """Get date range for statistics"""
    today = datetime.utcnow()
    if range_type == 'week':
        start_date = today - timedelta(days=today.weekday())
    elif range_type == 'month':
        start_date = today.replace(day=1)
    elif range_type == 'year':
        start_date = today.replace(month=1, day=1)
    else:
        start_date = today
    
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    return start_date, today

def calculate_statistics(expenses, start_date, end_date):
    """Calculate expense statistics for a date range"""
    filtered_expenses = [e for e in expenses if start_date <= e.date <= end_date]
    
    total = sum(e.amount for e in filtered_expenses)
    by_category = {}
    
    for expense in filtered_expenses:
        if expense.category in by_category:
            by_category[expense.category] += expense.amount
        else:
            by_category[expense.category] = expense.amount
    
    return {
        'total': total,
        'by_category': by_category,
        'count': len(filtered_expenses)
    }
