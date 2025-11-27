# app/utils/google_vision_ocr.py
"""
Google Cloud Vision API OCR implementation as a fallback for Tesseract OCR
Uses the same Google API key configured for Gemini
"""
import base64
import json
import logging
import re
from datetime import datetime
from typing import Dict, Optional
import os

logger = logging.getLogger(__name__)


class GoogleVisionOCR:
    """OCR using Google Cloud Vision API"""
    
    def __init__(self):
        # Improved pattern to match various Vietnamese invoice formats
        self.amount_pattern = r"(?:tổng\s+cộng\s+tiền\s+thanh\s+toán|tổng\s+cộng|tổng\s+tiền|total|thanh\s+toán|phải\s+trả)[\s:]*([\d,\.\s]+)\s*(?:VND|₫|đ|vnđ)?"
        
        # Fee patterns (VAT, service fee, etc.)
        self.fee_patterns = [
            r"(?:tiền\s+thuế\s+gtgt|thuế\s+gtgt|vat|thuế\s+giá\s+trị\s+gia\s+tăng)[\s:]*([\d,\.\s]+)\s*(?:VND|₫|đ|vnđ)?",
            r"(?:phí\s+dịch\s+vụ|service\s+fee|phí\s+service)[\s:]*([\d,\.\s]+)\s*(?:VND|₫|đ|vnđ)?",
            r"(?:thuế\s+suất)[\s:]*(\d+(?:[.,]\d+)?)\s*%",
        ]
        
        # Note/description patterns
        self.note_patterns = [
            r"(?:đơn\s+vị\s+bán|người\s+bán|merchant|seller)[\s:]*([^\n]+)",
            r"(?:mã\s+số\s+hóa\s+đơn|số\s+hóa\s+đơn|invoice\s+no|mã\s+hóa\s+đơn)[\s:]*([^\n]+)",
            r"(?:ghi\s+chú|note|mô\s+tả|description)[\s:]*([^\n]+)",
        ]
        
        # Date patterns
        self.date_patterns = [
            r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?)?",
            r"(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?)?",
            r"(\d{1,2})\s+(?:thg|tháng)\s+(\d{1,2})(?:\s+năm)?\s+(\d{2,4})\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?)?",
            r"(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2,4})\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?)?",
        ]
    
    def process_image(self, image_data: bytes) -> Dict:
        """
        Process image using Google Cloud Vision API
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Dict with extracted data or error message
        """
        try:
            if not image_data or len(image_data) == 0:
                return {"error": "Image data is empty"}
            
            # Get the Google API key from environment
            api_key = os.getenv('GOOGLE_API_KEY')
            if not api_key:
                logger.error("GOOGLE_API_KEY not found in environment")
                return {"error": "Google API key not configured"}
            
            # Convert image to base64
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # Prepare the Vision API request
            import requests
            
            url = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
            
            payload = {
                "requests": [
                    {
                        "image": {
                            "content": image_base64
                        },
                        "features": [
                            {
                                "type": "TEXT_DETECTION",
                                "maxResults": 50
                            }
                        ],
                        "imageContext": {
                            "languageHints": ["vi", "en"]
                        }
                    }
                ]
            }
            
            headers = {
                "Content-Type": "application/json"
            }
            
            # Make the API request
            response = requests.post(url, headers=headers, json=payload)
            
            if response.status_code != 200:
                logger.error(f"Vision API request failed with status {response.status_code}: {response.text}")
                return {"error": f"Vision API request failed: {response.status_code}"}
            
            result = response.json()
            
            # Check for API errors
            if "error" in result:
                logger.error(f"Vision API error: {result['error']}")
                return {"error": f"Vision API error: {result['error'].get('message', 'Unknown error')}"}
            
            # Extract text from response
            responses = result.get("responses", [])
            if not responses or not responses[0]:
                return {"error": "No text detected in image"}
            
            response_data = responses[0]
            if "error" in response_data:
                logger.error(f"Vision API response error: {response_data['error']}")
                return {"error": f"Vision API error: {response_data['error'].get('message', 'Unknown error')}"}
            
            # Get the full text annotation
            text_annotations = response_data.get("textAnnotations", [])
            if not text_annotations:
                return {"error": "No text found in image"}
            
            # The first annotation contains the full detected text
            full_text = text_annotations[0].get("description", "")
            
            if not full_text or not full_text.strip():
                return {"error": "Could not extract readable text from image"}
            
            logger.info("Google Vision OCR extracted text successfully")
            
            # Parse the extracted text for invoice information
            amount = self._extract_amount(full_text)
            date = self._extract_date(full_text)
            fee = self._extract_fee(full_text)
            note = self._extract_note(full_text)
            
            return {
                "amount": amount,
                "date": date,
                "fee": fee,
                "note": note,
                "text": full_text
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error calling Vision API: {e}")
            return {"error": f"Network error: {str(e)}"}
        except Exception as e:
            logger.exception(f"Error in Google Vision OCR: {e}")
            return {"error": f"OCR processing failed: {str(e)}"}
    
    def _extract_amount(self, text: str) -> Optional[float]:
        """Extract total amount from OCR text"""
        text_clean = text.lower().replace('\n', ' ')
        
        match = re.search(self.amount_pattern, text_clean, re.IGNORECASE | re.MULTILINE)
        if match:
            amount_str = match.group(1).replace(' ', '').replace(',', '').replace('.', '')
            try:
                return float(amount_str)
            except ValueError:
                pass
        return None
    
    def _extract_fee(self, text: str) -> Optional[float]:
        """Extract fee/VAT from OCR text"""
        text_clean = text.lower().replace('\n', ' ')
        
        for pattern in self.fee_patterns:
            match = re.search(pattern, text_clean, re.IGNORECASE | re.MULTILINE)
            if match:
                fee_str = match.group(1).replace(' ', '').replace(',', '').replace('.', '')
                try:
                    # Handle percentage
                    if '%' in pattern:
                        return float(fee_str)
                    else:
                        return float(fee_str)
                except ValueError:
                    continue
        return None
    
    def _extract_note(self, text: str) -> Optional[str]:
        """Extract note/merchant info from OCR text"""
        notes = []
        
        for pattern in self.note_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                note = match.group(1).strip()
                if note and len(note) > 2:
                    notes.append(note)
        
        return " | ".join(notes) if notes else None
    
    def _extract_date(self, text: str) -> Optional[datetime]:
        """Extract date from OCR text"""
        for pattern in self.date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    if len(match.groups()) >= 3:
                        day, month, year = match.group(1), match.group(2), match.group(3)
                        
                        # Handle different date formats
                        if len(year) == 2:
                            year = f"20{year}"
                        elif len(day) == 4:  # YYYY/MM/DD format
                            year, month, day = day, month, year
                        
                        # Convert month names
                        month_map = {
                            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
                            'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
                            'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
                        }
                        if month.lower() in month_map:
                            month = month_map[month.lower()]
                        
                        # Create date
                        date_obj = datetime(int(year), int(month), int(day))
                        return date_obj
                except (ValueError, IndexError):
                    continue
        return None


# Global instance
google_vision_ocr = GoogleVisionOCR()