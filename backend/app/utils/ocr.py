# app/utils/ocr.py
import cv2
import numpy as np
import pytesseract
import re
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ReceiptOCR:
    def __init__(self):
        # Improved pattern to match various Vietnamese invoice formats
        # Matches: "TỔNG CỘNG TIỀN THANH TOÁN", "Tổng tiền", "Thanh toán", etc.
        self.amount_pattern = r"(?:tổng\s+cộng\s+tiền\s+thanh\s+toán|tổng\s+cộng|tổng\s+tiền|total|thanh\s+toán|phải\s+trả)[\s:]*([\d,\.\s]+)\s*(?:VND|₫|đ|vnđ)?"
        
        # Fee patterns (VAT, service fee, etc.)
        self.fee_patterns = [
            r"(?:tiền\s+thuế\s+gtgt|thuế\s+gtgt|vat|thuế\s+giá\s+trị\s+gia\s+tăng)[\s:]*([\d,\.\s]+)\s*(?:VND|₫|đ|vnđ)?",
            r"(?:phí\s+dịch\s+vụ|service\s+fee|phí\s+service)[\s:]*([\d,\.\s]+)\s*(?:VND|₫|đ|vnđ)?",
            r"(?:thuế\s+suất)[\s:]*(\d+(?:[.,]\d+)?)\s*%",
        ]
        
        # Note/description patterns (merchant name, invoice number, etc.)
        self.note_patterns = [
            r"(?:đơn\s+vị\s+bán|người\s+bán|merchant|seller)[\s:]*([^\n]+)",
            r"(?:mã\s+số\s+hóa\s+đơn|số\s+hóa\s+đơn|invoice\s+no|mã\s+hóa\s+đơn)[\s:]*([^\n]+)",
            r"(?:ghi\s+chú|note|mô\s+tả|description)[\s:]*([^\n]+)",
        ]
        # More robust date patterns (including time, and variations)
        self.date_patterns = [
            r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?)?",  # DD/MM/YYYY HH:MM:SS
            r"(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?)?",  # YYYY/MM/DD HH:MM:SS
            r"(\d{1,2})\s+(?:thg|tháng)\s+(\d{1,2})(?:\s+năm)?\s+(\d{2,4})\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?)?",  # DD thg MM năm YYYY or DD thg MM YYYY
            r"(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2,4})\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?)?",  # English date
        ]
        
        # Check if Tesseract is available
        try:
            pytesseract.get_tesseract_version()
            logger.info("Tesseract OCR is available")
        except Exception as e:
            logger.warning(f"Tesseract OCR check failed: {e}")

    def process_image(self, image_data):
        try:
            if not image_data or len(image_data) == 0:
                return {"error": "Image data is empty"}
            
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return {"error": "Failed to decode image. Please ensure the file is a valid image format (JPG, PNG)."}

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Adaptive thresholding is better for varying lighting
            thresh = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )

            # Try OCR with Vietnamese language
            try:
                text = pytesseract.image_to_string(thresh, lang="vie")
            except pytesseract.TesseractNotFoundError:
                logger.error("Tesseract OCR is not installed or not in PATH")
                import platform
                system = platform.system()
                if system == "Darwin":  # macOS
                    install_msg = "Install with: brew install tesseract tesseract-lang"
                elif system == "Linux":
                    install_msg = "Install with: sudo apt-get install tesseract-ocr tesseract-ocr-vie"
                elif system == "Windows":
                    install_msg = "Download from: https://github.com/UB-Mannheim/tesseract/wiki"
                else:
                    install_msg = "Please install Tesseract OCR from https://github.com/tesseract-ocr/tesseract"
                return {"error": f"Tesseract OCR not found. {install_msg}"}
            except pytesseract.TesseractError as e:
                logger.error(f"Tesseract OCR error: {e}")
                # Fallback to English if Vietnamese language pack is not available
                try:
                    text = pytesseract.image_to_string(thresh, lang="eng")
                    logger.warning("Vietnamese OCR failed, using English as fallback")
                except Exception as fallback_error:
                    logger.error(f"Fallback OCR also failed: {fallback_error}")
                    return {"error": f"OCR processing failed: {str(e)}"}
            except Exception as ocr_error:
                logger.error(f"OCR error: {ocr_error}")
                return {"error": f"OCR processing failed: {str(ocr_error)}"}

            if not text or not text.strip():
                return {"error": "Could not extract text from image. Please ensure the image is clear and readable."}

            amount = self._extract_amount(text)
            date = self._extract_date(text)
            fee = self._extract_fee(text)
            note = self._extract_note(text)

            return {"amount": amount, "date": date, "fee": fee, "note": note, "text": text}
        except ImportError as e:
            logger.exception(f"Missing required library: {e}")
            return {"error": f"Missing required library: {str(e)}"}
        except Exception as e:
            logger.exception(f"Error during OCR processing: {e}")
            return {"error": f"OCR processing failed: {str(e)}"}

    def _extract_amount(self, text):
        text = text.lower()
        matches = re.findall(self.amount_pattern, text, re.IGNORECASE)
        if matches:
            # Use the LAST match (usually the final total)
            amount_str = matches[-1].strip()
            # Remove all whitespace
            amount_str = amount_str.replace(" ", "")
            # For VND format: dots are thousand separators, commas are decimal
            # Remove dots (thousand separators) and keep commas (decimal if present)
            # But most VND amounts are whole numbers, so we'll remove both
            amount_str = amount_str.replace(".", "").replace(",", "")
            try:
                return float(amount_str)
            except ValueError:
                return None
        return None

    def _extract_date(self, text):
        for pattern in self.date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    # Handle different date formats
                    if len(match.groups()) >= 3:  # At least day, month, year
                        day, month, year = (
                            int(match.group(1)),
                            int(match.group(2)),
                            int(match.group(3)),
                        )

                        # Handle 2-digit years
                        if len(str(year)) == 2:
                            year = 2000 + year if year <= 99 else 1900 + year

                        # Handle time (if present)
                        time_str = match.group(4) if len(match.groups()) >= 4 else None
                        if time_str:
                            time_parts = [int(x) for x in time_str.split(":")]
                            hour, minute = time_parts[0], time_parts[1]
                            second = time_parts[2] if len(time_parts) == 3 else 0
                        else:
                            hour, minute, second = 0, 0, 0

                        return datetime(year, month, day, hour, minute, second)
                except ValueError:
                    continue  # Try the next pattern if this one fails
        return None

    def _extract_fee(self, text):
        """Extract fees (VAT, service fees, etc.) from text"""
        text_lower = text.lower()
        
        # Try to find VAT amount
        for pattern in self.fee_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            if matches:
                # Get the last match (usually the final fee amount)
                fee_str = matches[-1].strip()
                # Remove whitespace and separators
                fee_str = fee_str.replace(" ", "").replace(".", "").replace(",", "")
                
                # If it's a percentage, calculate from total amount
                if "%" in str(matches[-1]):
                    try:
                        percentage = float(fee_str.replace("%", ""))
                        # We'll need the total amount to calculate, but for now just return None
                        # The frontend can calculate this if needed
                        return None
                    except ValueError:
                        continue
                
                try:
                    return float(fee_str)
                except ValueError:
                    continue
        
        return None

    def _extract_note(self, text):
        """Extract notes/descriptions from invoice (merchant name, invoice number, etc.)"""
        notes = []
        text_lower = text.lower()
        
        # Extract merchant/seller name
        for pattern in self.note_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            if matches:
                # Get the first meaningful match
                note = matches[0].strip()
                if note and len(note) > 3:  # Filter out very short matches
                    notes.append(note)
        
        # Also try to extract invoice number from common patterns
        invoice_patterns = [
            r"(?:số|no|mã)[\s:]*(\d{6,})",  # Invoice number (usually 6+ digits)
            r"(?:hóa\s+đơn|invoice)[\s#:]*(\d+)",  # Invoice #123
        ]
        
        for pattern in invoice_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                invoice_no = match.group(1).strip()
                if invoice_no:
                    notes.append(f"Mã HĐ: {invoice_no}")
        
        # Combine notes
        if notes:
            return " | ".join(notes[:3])  # Limit to first 3 notes
        
        return None
