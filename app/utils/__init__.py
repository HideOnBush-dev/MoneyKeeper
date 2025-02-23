from datetime import datetime, timedelta, date
from typing import Tuple


def format_currency(amount: float) -> str:
    return f"{amount:,.0f}đ"


def get_date_range(range_type: str) -> Tuple[datetime, datetime]:
    today = date.today()

    if range_type == "week":
        start_date = today - timedelta(days=today.weekday())
        end_date = start_date + timedelta(days=6)
    elif range_type == "month":
        start_date = today.replace(day=1)
        if today.month == 12:
            end_date = today.replace(year=today.year + 1, month=1, day=1) - timedelta(
                days=1
            )
        else:
            end_date = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    elif range_type == "year":
        start_date = today.replace(month=1, day=1)
        end_date = today.replace(month=12, day=31)
    else:
        start_date = today - timedelta(days=30)
        end_date = today

    return datetime.combine(start_date, datetime.min.time()), datetime.combine(
        end_date, datetime.max.time()
    )


def calculate_statistics(
    expenses: list, start_date: datetime, end_date: datetime
) -> dict:
    filtered_expenses = [e for e in expenses if start_date <= e.date <= end_date]

    total = sum(e.amount for e in filtered_expenses)
    by_category = {}

    for expense in filtered_expenses:
        if expense.category not in by_category:
            by_category[expense.category] = 0
        by_category[expense.category] += expense.amount

    return {"total": total, "count": len(filtered_expenses), "by_category": by_category}
