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
        self.amount_pattern = r"(?:tổng tiền|tổng cộng|total|thanh toán|phải trả)[\s:]*(?:VND|₫|đ)?\s*([\d,\.]+)"
        # More robust date patterns (including time, and variations)
        self.date_patterns = [
            r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?)?",  # DD/MM/YYYY HH:MM:SS
            r"(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?)?",  # YYYY/MM/DD HH:MM:SS
            r"(\d{1,2})\s+(thg|tháng)\s+(\d{1,2})\s+(\d{2,4})\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?)?",  # DD thg MM YYYY
            r"(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2,4})\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?)?",  # English date
        ]

    def process_image(self, image_data):
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return {"error": "Failed to decode image."}

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Adaptive thresholding is better for varying lighting
            thresh = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            # Try different preprocessing methods (combine for better results)
            # thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            # blur = cv2.GaussianBlur(gray, (3,3), 0)
            # thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

            text = pytesseract.image_to_string(thresh, lang="vie")  # Keep vietnamese

            amount = self._extract_amount(text)
            date = self._extract_date(text)

            return {"amount": amount, "date": date, "text": text}
        except Exception as e:
            logger.exception(f"Error during OCR processing: {e}")
            return {"error": "OCR processing failed."}

    def _extract_amount(self, text):
        text = text.lower()
        matches = re.findall(self.amount_pattern, text)
        if matches:
            amount_str = (
                matches[-1].replace(",", "").replace(".", "")
            )  # Use the LAST match
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
