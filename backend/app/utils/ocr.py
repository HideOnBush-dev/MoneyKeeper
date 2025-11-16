# app/utils/ocr.py
import base64
import json
import re
from datetime import datetime
from typing import Optional, Dict
import logging
from flask import current_app

logger = logging.getLogger(__name__)


class ReceiptOCR:
    def __init__(self):
        """Initialize ReceiptOCR with Google AI support"""
        self.use_google_ai = True
        try:
            from app.ai_engine.core.model_manager import ModelManager
            self.model_manager = ModelManager()
        except Exception as e:
            logger.warning(f"Could not initialize Google AI for OCR: {e}")
            self.use_google_ai = False
            self.model_manager = None

    def process_image(self, image_data: bytes) -> Dict:
        """
        Process receipt image using Google AI (Gemini) or fallback to regex parsing.
        
        Args:
            image_data: Binary image data
            
        Returns:
            Dict with 'amount', 'date', 'text', and optionally 'error'
        """
        if self.use_google_ai and self.model_manager:
            try:
                return self._process_with_google_ai(image_data)
            except Exception as e:
                logger.warning(f"Google AI OCR failed, falling back to basic parsing: {e}")
                # Fallback to basic extraction if Google AI fails
                return self._extract_basic_info(image_data)
        else:
            # Fallback if Google AI is not available
            return self._extract_basic_info(image_data)

    def _process_with_google_ai(self, image_data: bytes) -> Dict:
        """Process receipt using Google Gemini API"""
        try:
            import google.generativeai as genai
            from PIL import Image
            import io
            
            # Initialize model if needed
            self.model_manager.initialize()
            model = self.model_manager.get_model()
            
            # Convert image data to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Create prompt for receipt parsing
            prompt = """Bạn là một chuyên gia phân tích hóa đơn. Hãy đọc và trích xuất thông tin từ hóa đơn này.

Yêu cầu:
1. Tìm số tiền tổng cộng (tổng tiền, tổng cộng, total, thanh toán, phải trả, tổng thanh toán) - chỉ lấy số thuần túy, không có ký tự VND, ₫, đ, dấu phẩy, dấu chấm
2. Tìm ngày tháng (date, ngày, ngày in) - trả về định dạng YYYY-MM-DD hoặc null nếu không tìm thấy
3. Trích xuất toàn bộ văn bản từ hóa đơn

QUAN TRỌNG: Chỉ trả về JSON, không có text giải thích, không có markdown code block.

Format JSON:
{
  "amount": 123456.0,
  "date": "2025-11-12" hoặc null,
  "text": "toàn bộ văn bản từ hóa đơn"
}

Ví dụ: {"amount": 100000, "date": "2025-11-12", "text": "..."}"""

            # Generate content with image
            response = model.generate_content(
                [prompt, image],
                generation_config={
                    "temperature": 0.1,  # Low temperature for more deterministic results
                    "max_output_tokens": 1024,
                }
            )
            
            if not response or not response.text:
                raise ValueError("Empty response from Google AI")
            
            # Parse JSON response
            response_text = response.text.strip()
            
            # Try to extract JSON from response (in case there's extra text)
            # Handle cases where response might have markdown code blocks
            if '```json' in response_text:
                json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
                if json_match:
                    response_text = json_match.group(1)
            elif '```' in response_text:
                json_match = re.search(r'```\s*(\{.*?\})\s*```', response_text, re.DOTALL)
                if json_match:
                    response_text = json_match.group(1)
            else:
                # Find the first complete JSON object (handles nested objects)
                start_idx = response_text.find('{')
                if start_idx != -1:
                    brace_count = 0
                    end_idx = start_idx
                    for i in range(start_idx, len(response_text)):
                        if response_text[i] == '{':
                            brace_count += 1
                        elif response_text[i] == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                end_idx = i + 1
                                break
                    if brace_count == 0:
                        response_text = response_text[start_idx:end_idx]
            
            data = json.loads(response_text)
            
            # Parse amount
            amount = None
            if data.get("amount"):
                try:
                    # Remove any non-numeric characters except decimal point
                    amount_str = re.sub(r'[^\d.]', '', str(data["amount"]))
                    amount = float(amount_str)
                except (ValueError, TypeError):
                    amount = None
            
            # Parse date
            date = None
            if data.get("date"):
                try:
                    date_str = data["date"]
                    # Handle different date formats
                    if isinstance(date_str, str):
                        # Try parsing ISO format
                        try:
                            date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                        except:
                            # Try other formats
                            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d', '%d-%m-%Y']:
                                try:
                                    date = datetime.strptime(date_str, fmt)
                                    break
                                except:
                                    continue
                except (ValueError, TypeError):
                    date = None
            
            return {
                "amount": amount,
                "date": date,
                "text": data.get("text", ""),
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Google AI response: {e}")
            logger.debug(f"Response text: {response_text if 'response_text' in locals() else 'N/A'}")
            raise ValueError("Invalid JSON response from Google AI")
        except Exception as e:
            logger.exception(f"Error processing with Google AI: {e}")
            raise

    def _extract_basic_info(self, image_data: bytes) -> Dict:
        """Fallback method: basic extraction without AI"""
        # This is a minimal fallback - you could add pytesseract here if needed
        return {
            "amount": None,
            "date": None,
            "text": "",
            "error": "Google AI không khả dụng. Vui lòng cấu hình GOOGLE_API_KEY."
        }
