from typing import List, Dict
from app.utils import format_currency
from datetime import datetime


def get_static_analysis_data(expense_data: List[Dict]) -> Dict:
    """
    Provides a basic, static analysis of expense data.  This is a simplified
    version of what the AI would do, suitable for non-premium users.
    """
    if not expense_data:
        return {
            "daily_average": 0,
            "total": 0,
            "common_categories": [],
            "highest_expense": {"amount": 0, "category": ""},
        }

    total_spent = sum(expense["amount"] for expense in expense_data)

    # Convert string dates to datetime objects and calculate date range
    try:
        start_date = datetime.strptime(expense_data[0]["date"], "%Y-%m-%d")
        end_date = datetime.strptime(expense_data[-1]["date"], "%Y-%m-%d")
        num_days = (end_date - start_date).days + 1
    except (ValueError, KeyError):
        num_days = 1  # Fallback if dates are invalid

    daily_average = total_spent / max(num_days, 1)  # Avoid division by zero

    category_counts = {}
    for expense in expense_data:
        category = expense["category"]
        category_counts[category] = category_counts.get(category, 0) + expense["amount"]

    sorted_categories = sorted(
        category_counts.items(), key=lambda item: item[1], reverse=True
    )

    highest_expense = max(
        expense_data,
        key=lambda x: x["amount"],
        default={"amount": 0, "category": ""},
    )

    return {
        "daily_average": daily_average,
        "total": total_spent,
        "common_categories": sorted_categories[:3],
        "highest_expense": highest_expense,
    }


def get_static_recommendations(expense_data: List[Dict]) -> List[str]:
    """Provides generic, static recommendations."""

    analysis_data = get_static_analysis_data(expense_data)

    if not expense_data:
        return ["Bắt đầu theo dõi chi tiêu của bạn để nhận phân tích."]

    recommendations = []

    if analysis_data["common_categories"]:
        top_category = analysis_data["common_categories"][0][0]
        recommendations.append(
            f"Bạn có vẻ chi tiêu nhiều cho {top_category}.  Hãy xem xét cắt giảm nếu có thể."
        )

    if analysis_data["highest_expense"]["amount"] > analysis_data["daily_average"] * 5:
        recommendations.append(
            f"Chi tiêu lớn nhất của bạn là cho {analysis_data['highest_expense']['category']}. Xem xét lại nếu khoản chi này có thể giảm được."
        )

    if analysis_data["total"] > 1000000:
        recommendations.append(
            "Bạn đã chi tiêu khá nhiều trong khoảng thời gian này. Cần lên kế hoạch chi tiêu hợp lý hơn."
        )

    return recommendations[:3]
