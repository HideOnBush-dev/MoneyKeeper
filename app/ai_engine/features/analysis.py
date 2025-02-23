from datetime import datetime
import re
from typing import List, Dict
import json
import logging

from app.ai_engine.features.predictor import format_money
from app.ai_engine.core.model_manager import model_manager


logger = logging.getLogger(__name__)


class ExpenseAnalyzer:
    def __init__(self, model_name: str = "meta-llama/Llama-3.2-3B-Instruct"):
        self.model_name = model_name
        self.tokenizer = model_manager.get_tokenizer(self.model_name)
        self.model = model_manager.get_model(self.model_name)
        self.pipeline = model_manager.get_pipeline()

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
            "common_categories": sorted_categories[:3],  # Top 3 categories
            "highest_expense": highest_expense,
        }

    def get_recommendations(self, expense_data: List[Dict]) -> List[str]:
        """
        Generates recommendations based on expense data using the LLM.
        Now expects and parses JSON output.
        """
        analysis_data = self.get_analysis_data(
            expense_data
        )  # calculate or get analysis data

        if not expense_data:
            return ["Bắt đầu theo dõi chi tiêu của bạn để nhận phân tích."]

        prompt = self._format_recommendation_prompt(
            analysis_data["total"],
            analysis_data["common_categories"],
            analysis_data["highest_expense"],
        )

        try:
            outputs = self.pipeline(
                prompt,
                max_new_tokens=512,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                pad_token_id=self.tokenizer.eos_token_id,
            )
            generated_text = outputs[0]["generated_text"]

            # Remove the prompt from the generated text
            response_text = generated_text.replace(prompt, "").strip()
            print(response_text)

            return self._extract_recommendations(response_text)

        except Exception as e:
            logger.exception(f"Error generating recommendations with LLM: {e}")
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
            # More robust JSON extraction, handles extra text before/after
            match = re.search(
                r"```json\s*({[\s\S]*?})\s*```", analysis_text, re.IGNORECASE
            )  # Added IGNORECASE flag
            if match:
                json_str = match.group(1)
                json_str = json_str.strip()  # important to remove extra spaces.
                data = json.loads(json_str)

                if "recommendations" in data and isinstance(
                    data["recommendations"], list
                ):
                    return data["recommendations"][:3]  # Limit to 3 recommendations
                else:
                    logger.error(
                        f"Invalid JSON format: 'recommendations' key missing or not a list. Response: {analysis_text}"
                    )
                    return []  # Return empty list if invalid
            else:
                logger.error(f"No JSON found in AI response: {analysis_text}")
                return []

        except json.JSONDecodeError as e:
            logger.exception(
                f"JSON decoding error: {e}.  Response text: {analysis_text}"
            )  # Log the exception AND the problematic text
            return []
        except Exception as e:  # General exception handling
            logger.exception(f"An unexpected error occurred: {e}")
            return []
