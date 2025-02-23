from typing import Dict, List, Optional
from app.ai_engine.core.model_manager import model_manager
import logging

logger = logging.getLogger(__name__)


class ExpensePredictor:
    def __init__(self, model_name: str = "meta-llama/Llama-3.2-3B-Instruct"):
        self.model_name = model_name
        self.tokenizer = model_manager.get_tokenizer(self.model_name)
        self.model = model_manager.get_model(self.model_name)
        self.pipeline = model_manager.get_pipeline()

    def predict_next_month(self, expenses: List[Dict]) -> Optional[Dict]:
        if not expenses:
            return None

        messages = [
            {
                "role": "system",
                "content": "You are a financial prediction AI. Respond concisely in Vietnamese, providing only the predicted amounts for each category.",
            },
            {"role": "user", "content": self._format_prediction_prompt(expenses)},
        ]

        try:
            outputs = self.pipeline(
                messages,
                max_new_tokens=128,
                do_sample=True,
                temperature=0.6,
                top_p=0.9,
                pad_token_id=self.tokenizer.eos_token_id,
            )
            predictions = self._parse_predictions(outputs[0]["generated_text"])
            return predictions

        except Exception as e:
            logger.exception(f"Prediction error: {e}")
            return None

    def _format_prediction_prompt(self, expenses: List[Dict]) -> str:
        prompt_lines = ["Dự đoán chi tiêu tháng tới dựa trên dữ liệu sau:"]
        for expense in expenses:
            prompt_lines.append(
                f"- {expense['date']}: {expense['category']} - {format_money(expense['amount'])}"
            )
        prompt_lines.append(
            "\nChỉ đưa ra các dự đoán số tiền cho mỗi danh mục, không giải thích."
        )
        return "\n".join(prompt_lines)

    def _parse_predictions(self, prediction_text: str) -> Dict:
        predictions = {}
        for line in prediction_text.split("\n"):
            parts = line.split(":")
            if len(parts) == 2:
                category = parts[0].strip()
                try:
                    amount = float(
                        parts[1]
                        .replace("₫", "")
                        .replace(".", "")
                        .replace(",", "")
                        .strip()
                    )
                    predictions[category] = amount
                except ValueError:
                    logger.warning(f"Could not parse prediction line: {line}")
        return predictions


def format_money(amount: float) -> str:
    return f"{amount:,.0f}₫"
