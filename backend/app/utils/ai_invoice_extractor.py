# app/utils/ai_invoice_extractor.py
"""
AI-powered invoice extraction using Google Gemini Vision API
Extracts structured data from invoice images with high accuracy
"""
import base64
import json
import logging
from datetime import datetime
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Map Vietnamese category names to English slugs used in frontend
CATEGORY_MAPPING = {
    "ăn uống": "food",
    "di chuyển": "transport",
    "mua sắm": "shopping",
    "giải trí": "entertainment",
    "sức khỏe": "health",
    "giáo dục": "education",
    "hóa đơn": "utilities",
    "công việc": "other",
    "khác": "other",
}


class AIInvoiceExtractor:
    """Extract invoice data using Google Gemini Vision API"""
    
    def __init__(self):
        self.model_manager = None
        self._initialized = False
    
    def _initialize(self):
        """Lazy initialization of model manager"""
        if self._initialized:
            return
        
        try:
            from app.ai_engine.core.model_manager import model_manager
            self.model_manager = model_manager
            self._initialized = True
            logger.info("AI Invoice Extractor initialized")
        except Exception as e:
            logger.error(f"Failed to initialize AI Invoice Extractor: {e}")
            raise
    
    def extract_from_image(self, image_data: bytes) -> Dict:
        """
        Extract invoice data from image using Gemini Vision API
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Dict with extracted data: amount, date, fee, note, merchant, etc.
        """
        try:
            self._initialize()
            
            # Convert image to base64
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # Determine image MIME type from magic bytes
            mime_type = "image/jpeg"  # Default
            if image_data.startswith(b'\x89PNG\r\n\x1a\n'):
                mime_type = "image/png"
            elif image_data.startswith(b'\xff\xd8\xff'):
                mime_type = "image/jpeg"
            elif image_data.startswith(b'GIF'):
                mime_type = "image/gif"
            elif image_data.startswith(b'WEBP'):
                mime_type = "image/webp"
            
            # Create the prompt for structured extraction
            prompt = """Bạn là chuyên gia trích xuất thông tin từ hóa đơn tiếng Việt. 
Hãy phân tích hình ảnh hóa đơn và trích xuất các thông tin sau đây dưới dạng JSON:

{
  "amount": số tiền tổng cộng (chỉ số, không có dấu phẩy hoặc chấm),
  "date": ngày hóa đơn (định dạng YYYY-MM-DD),
  "fee": phí VAT hoặc phí dịch vụ nếu có (chỉ số, null nếu không có),
  "note": ghi chú hoặc mô tả (tên cửa hàng, mã hóa đơn, hoặc thông tin quan trọng khác),
  "merchant": tên đơn vị bán hàng/cửa hàng,
  "invoice_number": mã số hóa đơn nếu có,
  "items": danh sách các mặt hàng nếu có (mảng các object với "name" và "amount")
}

Lưu ý:
- Nếu không tìm thấy thông tin nào, hãy để null
- Số tiền phải là số nguyên (không có dấu phẩy, chấm)
- Ngày phải đúng định dạng YYYY-MM-DD
- Chỉ trả về JSON hợp lệ, không có text thêm

Trả về chỉ JSON, không có markdown hoặc text khác."""

            # Get the model
            model = self.model_manager.get_model()
            
            # Prepare the content with image
            import google.generativeai as genai
            
            # Create the content parts
            image_part = {
                "mime_type": mime_type,
                "data": image_base64
            }
            
            # Generate content with vision
            response = model.generate_content(
                [prompt, image_part],
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,  # Low temperature for more accurate extraction
                    top_p=0.8,
                    top_k=20,
                    max_output_tokens=2048,
                )
            )
            
            if not response or not response.text:
                logger.warning("Empty response from AI model")
                return self._fallback_extraction()
            
            # Parse JSON response
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            elif response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            try:
                extracted_data = json.loads(response_text)
                result = self._normalize_data(extracted_data)
                # Suggest category based on extracted data
                result["suggested_category"] = self._suggest_category(result)
                return result
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {e}")
                logger.debug(f"Response text: {response_text}")
                return self._fallback_extraction()
                
        except Exception as e:
            logger.exception(f"Error in AI invoice extraction: {e}")
            return self._fallback_extraction()
    
    def _normalize_data(self, data: Dict) -> Dict:
        """Normalize extracted data to standard format"""
        result = {
            "amount": None,
            "date": None,
            "fee": None,
            "note": None,
            "merchant": None,
            "invoice_number": None,
            "text": ""  # AI doesn't provide raw text, but we include for compatibility
        }
        
        # Extract amount
        if "amount" in data and data["amount"] is not None:
            try:
                # Handle string numbers with separators
                amount_str = str(data["amount"]).replace(".", "").replace(",", "").replace(" ", "")
                result["amount"] = float(amount_str)
            except (ValueError, TypeError):
                pass
        
        # Extract date
        if "date" in data and data["date"]:
            try:
                # Try to parse the date
                date_str = str(data["date"])
                # Handle various date formats
                if len(date_str) == 10 and date_str.count("-") == 2:
                    # Already in YYYY-MM-DD format
                    datetime.strptime(date_str, "%Y-%m-%d")
                    result["date"] = date_str
                else:
                    # Try to parse other formats
                    for fmt in ["%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y", "%Y-%m-%d"]:
                        try:
                            dt = datetime.strptime(date_str, fmt)
                            result["date"] = dt.strftime("%Y-%m-%d")
                            break
                        except ValueError:
                            continue
            except (ValueError, TypeError):
                pass
        
        # Extract fee
        if "fee" in data and data["fee"] is not None:
            try:
                fee_str = str(data["fee"]).replace(".", "").replace(",", "").replace(" ", "")
                result["fee"] = float(fee_str)
            except (ValueError, TypeError):
                pass
        
        # Extract merchant
        if "merchant" in data and data["merchant"]:
            result["merchant"] = str(data["merchant"])
        
        # Extract invoice number
        if "invoice_number" in data and data["invoice_number"]:
            result["invoice_number"] = str(data["invoice_number"])
        
        # Extract note (combine merchant and invoice number if available)
        note_parts = []
        if result.get("merchant"):
            note_parts.append(result["merchant"])
        if result.get("invoice_number"):
            note_parts.append(f"Mã HĐ: {result['invoice_number']}")
        if "note" in data and data["note"]:
            note_parts.append(str(data["note"]))
        
        if note_parts:
            result["note"] = " | ".join(note_parts)
        elif result.get("merchant"):
            result["note"] = result["merchant"]
        
        return result
    
    def _suggest_category(self, data: Dict) -> Optional[str]:
        """Suggest category based on extracted invoice data"""
        try:
            from app.ai_engine.features.categorizer import ExpenseCategorizer
            
            categorizer = ExpenseCategorizer()
            
            # Build description from available data for categorization
            description_parts = []
            if data.get("merchant"):
                description_parts.append(data["merchant"])
            if data.get("note"):
                description_parts.append(data["note"])
            if data.get("invoice_number"):
                description_parts.append(f"hóa đơn {data['invoice_number']}")
            
            description = " ".join(description_parts) if description_parts else ""
            
            if not description:
                return None
            
            # Get Vietnamese category name from categorizer
            vi_category = categorizer.predict_category(description)
            
            # Map to English slug for frontend
            return CATEGORY_MAPPING.get(vi_category, "other")
            
        except Exception as e:
            logger.warning(f"Failed to suggest category: {e}")
            return None
    
    def _fallback_extraction(self) -> Dict:
        """Return empty extraction result as fallback"""
        return {
            "amount": None,
            "date": None,
            "fee": None,
            "note": None,
            "merchant": None,
            "invoice_number": None,
            "suggested_category": None,
            "text": "AI extraction failed"
        }


# Global instance
ai_invoice_extractor = AIInvoiceExtractor()

