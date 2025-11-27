from datetime import datetime
import re
from typing import List, Dict
import json
import logging

from app.ai_engine.features.predictor import format_money
from app.ai_engine.core.model_manager import model_manager


logger = logging.getLogger(__name__)


class ExpenseAnalyzer:
    def __init__(self, model_name: str = None):
        self.model_name = model_name or "gemini-1.5-flash"
        model_manager.initialize()

    def get_analysis_data(self, expense_data: List[Dict]) -> Dict:
        """
        Analyzes expense data and returns core statistics: daily average,
        total spending, most common categories, and the highest expense.
        """
        if not expense_data:
            return {
                "daily_average": 0,
                "total": 0,
                "common_categories": [],
                "highest_expense": {"amount": 0, "category": ""},
            }

        for expense in expense_data:
            if isinstance(expense["date"], str):
                expense["date"] = datetime.fromisoformat(expense["date"])

        total_spent = sum(expense["amount"] for expense in expense_data)
        num_days = (
            (expense_data[-1]["date"] - expense_data[0]["date"]).days + 1
            if expense_data
            else 1
        )
        daily_average = total_spent / num_days

        category_counts = {}
        for expense in expense_data:
            category = expense["category"]
            category_counts[category] = (
                category_counts.get(category, 0) + expense["amount"]
            )

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

    def get_recommendations(self, expense_data: List[Dict]) -> List[str]:
        """
        Generates recommendations based on expense data using Google AI.
        Expects and parses JSON output.
        """
        analysis_data = self.get_analysis_data(expense_data)

        if not expense_data:
            return ["Bắt đầu theo dõi chi tiêu của bạn để nhận phân tích."]

        prompt = self._format_recommendation_prompt(
            analysis_data["total"],
            analysis_data["common_categories"],
            analysis_data["highest_expense"],
        )

        try:
            response_text = model_manager.generate_content(prompt)
            return self._extract_recommendations(response_text)

        except Exception as e:
            logger.exception(f"Error generating recommendations with Google AI: {e}")
            return []

    def _format_recommendation_prompt(
        self, total_spent: float, sorted_categories: list, highest_expense: dict
    ) -> str:
        """Formats the prompt, instructing the LLM to return JSON."""

        prompt = f"""Dữ liệu chi tiêu:
- Tổng: {format_money(total_spent)}
- Danh mục nhiều nhất: {", ".join(f"{cat}: {format_money(amt)}" for cat, amt in sorted_categories)}
- Chi tiêu lớn nhất: {format_money(highest_expense['amount'])} ({highest_expense['category']})

Đưa ra 3 khuyến nghị (dưới dạng JSON):

```json
{{
  "recommendations": [
    "Khuyến nghị 1",
    "Khuyến nghị 2",
    "Khuyến nghị 3"
  ]
}}
```

KHÔNG GIẢI THÍCH. CHỈ JSON VÀ KHÔNG ĐỀ CẬP VẤN ĐỀ KHÁC."""
        return prompt

    def _extract_recommendations(self, analysis_text: str) -> List[str]:
        """
        Parses the LLM's response, expecting JSON, and extracts recommendations.
        Handles potential JSON decoding errors.
        """
        try:
            match = re.search(
                r"```json\s*({[\s\S]*?})\s*```", analysis_text, re.IGNORECASE
            )  # Added IGNORECASE flag
            if match:
                json_str = match.group(1)
                json_str = json_str.strip()
                data = json.loads(json_str)

                if "recommendations" in data and isinstance(
                    data["recommendations"], list
                ):
                    return data["recommendations"][:3]
                else:
                    logger.error(
                        f"Invalid JSON format: 'recommendations' key missing or not a list. Response: {analysis_text}"
                    )
                    return []
            else:
                logger.error(f"No JSON found in AI response: {analysis_text}")
                return []

        except json.JSONDecodeError as e:
            logger.exception(
                f"JSON decoding error: {e}.  Response text: {analysis_text}"
            )
            return []
        except Exception as e:
            logger.exception(f"An unexpected error occurred: {e}")
            return []
