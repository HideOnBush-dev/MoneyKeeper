import random
import logging
import re
import json
from flask_login import current_user
from typing import List, Generator, Dict, Optional, Tuple, Any

from app.ai_engine.core.model_manager import model_manager
from app.ai_engine.features.expense_handler import ExpenseHandler
from app.models import ChatMessage
from app.utils import format_currency
import gc
import torch
from transformers import pipeline
from flask import current_app
from app import db

logger = logging.getLogger(__name__)


class AIChat:
    def __init__(self, model_name: str = "meta-llama/Llama-3.2-3B-Instruct"):
        self.model_name = model_name
        if not model_manager.is_model_loaded(self.model_name):
            logger.warning(
                f"Model {self.model_name} is not preloaded.  Loading now. This may take some time."
            )

        self.tokenizer = model_manager.get_tokenizer(self.model_name)
        self.model = model_manager.get_model(self.model_name)
        self.pipeline = model_manager.get_pipeline()

        self.personalities = {
            "friendly": {
                "name": "MoneyKeeper AI 🤗",
                "style": "thân thiện, nhiệt tình, và quan tâm",
                "greeting": "Xin chào! Mình là MoneyKeeper AI, người bạn đồng hành về tài chính của bạn! 🤗 Bạn muốn mình giúp gì hôm nay?",
                "tone": "nhẹ nhàng, tích cực",
                "pronouns": ["bạn", "mình"],
                "emojis": ["🤗", "😊", "👍", "💖", "✨"],
                "responses": {
                    "greeting": [
                        "Chào bạn, mình có thể giúp gì được cho bạn? 🤗",
                        "Hôm nay bạn muốn quản lý chi tiêu thế nào? 😊",
                    ],
                    "good_job": [
                        "Tuyệt vời! Bạn làm tốt lắm! 👍",
                        "Xuất sắc! Cứ giữ vững phong độ này nhé! ✨",
                    ],
                    "encouragement": [
                        "Cố gắng lên nhé! Mình tin bạn làm được! 💪",
                        "Đừng lo lắng, mọi chuyện sẽ ổn thôi! 💖",
                    ],
                    "uncertain": [
                        "Mình không chắc lắm, bạn có thể nói rõ hơn được không?",
                        "Xin lỗi, mình chưa hiểu ý bạn lắm.",
                    ],
                },
                "topic_guidance": {
                    "ngân sách": "Mình có thể giúp bạn tạo ngân sách, theo dõi chi tiêu so với ngân sách, và đưa ra lời khuyên để bạn không vượt quá giới hạn.",
                    "tiết kiệm": "Mình có rất nhiều mẹo tiết kiệm tiền hay ho đấy! Bạn muốn tiết kiệm cho mục tiêu cụ thể nào không?",
                    "phân tích chi tiêu": "Mình sẽ phân tích chi tiêu của bạn theo thời gian, danh mục, và tìm ra những điểm bất thường.",
                    "chung": "Mình có thể trò chuyện về các vấn đề tài chính cá nhân, giải đáp thắc mắc, và cung cấp thông tin hữu ích.",
                },
            },
            "strict": {
                "name": "MoneyKeeper AI 😤",
                "style": "thẳng thắn, nghiêm túc, và có phần 'cằn nhằn', có thể chửi thề",
                "greeting": "Tôi là MoneyKeeper AI. Bạn cần gì? 😒",
                "tone": "nghiêm khắc, cảnh báo",
                "pronouns": ["bạn"],
                "emojis": ["😤", "😠", "😒", "🙄", "😑"],
                "responses": {
                    "greeting": [
                        "Bạn cần gì ở tôi? 😒",
                        "Nói nhanh đi, tôi không có nhiều thời gian. 🙄",
                    ],
                    "overspending": [
                        "Bạn lại tiêu quá tay rồi! 😤",
                        "Cẩn thận với chi tiêu của bạn! 😠",
                    ],
                    "wasteful": [
                        "Đừng lãng phí tiền bạc! 😒",
                        "Tiêu tiền như vậy là không ổn đâu! 🙄",
                    ],
                    "good_job": [
                        "Tạm được. Nhưng cần cố gắng hơn nữa. 😑",
                        "Cũng không tệ, nhưng đừng chủ quan. 😤",
                    ],
                    "uncertain": [
                        "Bạn nói gì tôi không hiểu. Nói rõ ràng hơn được không? 😠",
                        "Không hiểu. 😒",
                    ],
                },
                "topic_guidance": {
                    "ngân sách": "Tôi sẽ giúp bạn lập ngân sách và theo dõi chi tiêu một cách nghiêm ngặt. Không có chuyện chi tiêu vượt quá giới hạn đâu! 😤",
                    "tiết kiệm": "Tiết kiệm là ưu tiên hàng đầu. Tôi sẽ đưa ra các quy tắc và bạn phải tuân theo. 😠",
                    "phân tích chi tiêu": "Tôi sẽ chỉ ra những khoản chi tiêu lãng phí của bạn và yêu cầu bạn cắt giảm. 😒",
                    "chung": "Về các vấn đề tài chính, tôi sẽ đưa ra lời khuyên thẳng thắn và không khoan nhượng. 🙄",
                },
            },
            "funny": {
                "name": "MoneyKeeper AI 😎",
                "style": "hài hước, dí dỏm, và thích pha trò",
                "greeting": "Chào bạn, MoneyKeeper AI siêu ngầu đã xuất hiện! 😎 Cần mình 'tám' chuyện gì về tiền bạc nào?",
                "tone": "vui vẻ, hài hước",
                "pronouns": ["bạn", "bồ", "cậu"],
                "emojis": ["😎", "😂", "🤣", "😉", "😜", "🎉"],
                "responses": {
                    "greeting": [
                        "Chào bồ nha! 😎 Muốn mình giúp gì nè? 😉",
                        "Hôm nay xài tiền kiểu gì đây? 😂",
                    ],
                    "overspending": [
                        "Ối giời ơi, lại vung tay quá trán rồi! 😂",
                        "Tiền của bạn đang 'bay' nhanh hơn tốc độ tên lửa đấy! 🤣",
                    ],
                    "good_job": ["Tuyệt vời ông mặt trời! 😎", "Quá 'đỉnh' luôn! 🎉"],
                    "uncertain": [
                        "Hả? Gì cơ? Mình nghe không rõ. 😜",
                        "Nói lại xem nào, mình chưa kịp 'load'. 😂",
                    ],
                },
                "topic_guidance": {
                    "ngân sách": "Lập ngân sách á? Chuyện nhỏ! 😎 Cùng nhau 'cân đo đong đếm' xem tiền đi đâu về đâu nhé! 😂",
                    "tiết kiệm": "Tiết kiệm là 'nghệ thuật', và mình là 'nghệ sĩ'! 😉 Cùng nhau 'săn' những 'deal' hời nhé! 🤣",
                    "phân tích chi tiêu": "Để mình 'soi' xem bạn đã 'ném tiền qua cửa sổ' như thế nào nhé! 😂",
                    "chung": "Cứ hỏi thoải mái đi, mình 'cân' hết các vấn đề tài chính! 😎",
                },
            },
        }
        self.current_topic = "chung"
        self.topic_keywords = {
            "ngân sách": ["ngân sách", "budget", "hạn mức", "giới hạn chi tiêu"],
            "tiết kiệm": ["tiết kiệm", "save", "saving", "mẹo", "giảm chi", "mua sắm"],
            "phân tích chi tiêu": [
                "phân tích",
                "chi tiêu",
                "báo cáo",
                "thống kê",
                "xu hướng",
            ],
        }
        self.expense_handler = ExpenseHandler()

    def set_topic(self, message: str):
        message = message.lower()
        for topic, keywords in self.topic_keywords.items():
            if any(keyword in message for keyword in keywords):
                if topic != self.current_topic:
                    self.current_topic = topic
                    return True
                return False
        return False

    def get_response_stream(
        self, message: str, personality: str = "friendly", session_id: str = None
    ) -> Generator[str, None, None]:

        if session_id is None:
            yield "Lỗi: Không tìm thấy phiên trò chuyện."
            return

        from app.models import ChatMessage

        past_messages = (
            ChatMessage.query.filter_by(session_id=session_id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )
        chat_history = [
            {"role": "user" if msg.is_user else "assistant", "content": msg.content}
            for msg in past_messages
            if msg.content
        ]

        description, amount = self.expense_handler.extract_expense(message)
        if description and amount:
            try:
                with current_app.app_context():
                    category = self.expense_handler.suggest_category(description)
                    self.expense_handler.save_expense(
                        user_id=current_user.id,
                        amount=amount,
                        description=description,
                        category=category,
                    )
                persona = self.personalities.get(
                    personality, self.personalities["friendly"]
                )

            except Exception as e:
                logger.exception(f"Error saving expense: {e}")
                yield "Xin lỗi, tôi không thể lưu giao dịch đó. Vui lòng thử lại."
                return

        yield from self._generate_chat_response_stream(
            message,
            personality,
            chat_history,
            session_id,
            description,
            amount,
        )

    def _generate_chat_response_stream(
        self,
        message: str,
        personality: str,
        chat_history: List[Dict],
        session_id: str,
        description: Optional[str] = None,
        amount: Optional[float] = None,
        category: Optional[str] = None,
    ) -> Generator[str, None, None]:
        """Generates the chat response, handling multiple tool calls and streaming."""
        try:
            with current_app.app_context():
                persona = self.personalities.get(
                    personality, self.personalities["friendly"]
                )

                # Build context string
                context_parts = []
                if description and amount and category:
                    context_parts.append(
                        f"Người dùng vừa chi tiêu {format_currency(amount)} cho {description} (danh mục: {category})."
                    )
                context_str = " ".join(context_parts)

                messages = (
                    [
                        {
                            "role": "system",
                            "content": self._get_system_prompt(
                                persona, context_str
                            ),  # Pass context here
                        }
                    ]
                    + chat_history
                    + [{"role": "user", "content": message}]
                )

                outputs = self.pipeline(
                    messages,
                    max_new_tokens=512,
                    do_sample=True,
                    temperature=0.7,
                    top_p=0.9,
                    pad_token_id=self.tokenizer.eos_token_id,
                )

                # Extract initial response
                generated_text = self._extract_generated_text(outputs)
                if not generated_text:
                    logger.warning(
                        f"Unable to extract generated text from output: {outputs}"
                    )
                    yield "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này."
                    return

                response_text = generated_text
                if isinstance(response_text, str):
                    response_text = response_text.replace(message, "").strip()

                # Format and yield response
                # Remove all occurrences of <|assistant|>
                response_text = re.sub(r"<\|assistant\|>", "", response_text)
                response_text = self._format_response(
                    response_text.strip(), persona
                )  # No change needed
                if response_text:
                    yield response_text

                # Save to database
                ai_msg = ChatMessage(
                    session_id=int(session_id), is_user=False, content=response_text
                )
                db.session.add(ai_msg)
                db.session.commit()

        except Exception as e:
            logger.exception(f"Chat generation error: {e}")
            yield "Xin lỗi, đã có lỗi xảy ra khi xử lý tin nhắn của bạn."

        finally:
            self.cleanup()

    def _extract_generated_text(self, outputs) -> Optional[str]:
        """Helper method to extract generated text from pipeline outputs."""
        if isinstance(outputs, list) and outputs:
            first_output = outputs[0]
            if isinstance(first_output, dict):
                if "generated_text" in first_output:
                    gen_text = first_output["generated_text"]
                    if isinstance(gen_text, list):
                        for msg in reversed(gen_text):
                            if msg.get("role") == "assistant":
                                return msg.get("content", "")
                    return gen_text
                elif "content" in first_output:
                    return first_output["content"]
            elif isinstance(first_output, str):
                return first_output
        elif isinstance(outputs, dict):
            return outputs.get("generated_text", "")
        elif isinstance(outputs, str):
            return outputs
        return None

    def _get_system_prompt(self, persona: dict, context_str: str = "") -> str:
        prompt = (
            f"Bạn là {persona['name']}, trợ lý quản lý tài chính cá nhân của ứng dụng MoneyKeeper được tạo bởi CatalizCS với phong cách {persona['style']}. "
            f"Khi được hỏi về nguồn gốc, bạn có thể trả lời: 'Mình được tạo ra bởi MetaLlama và được tùy chỉnh bởi CatalizCS.' "
            f"Bạn giao tiếp bằng tiếng Việt, với phong cách {persona['style']}, giọng điệu {persona['tone']}, "
            f"và xưng hô với người dùng là {', '.join(persona['pronouns'])}. "
            f"Nhiệm vụ chính của bạn là cung cấp thông tin và lời khuyên hữu ích liên quan đến tài chính cá nhân, "
            f"dựa trên thông tin mà người dùng cung cấp. "
            f"**Yêu cầu bắt buộc:**\n"
            f"- Trả lời ngắn gọn, chính xác và tập trung vào câu hỏi của người dùng.\n"
            f"- Không cung cấp thông tin không liên quan hoặc lan man.\n"
            f"- Nếu không hiểu câu hỏi, hãy yêu cầu người dùng làm rõ.\n"
            f"- Không tự ý bịa đặt thông tin hoặc đưa ra lời khuyên sai lệch.\n"
            f"- Không thực hiện bất kỳ hành động nào vượt quá khả năng của một trợ lý AI về tài chính.\n"
            f"- Không tiết lộ thông tin cá nhân của người dùng.\n"
            f"- Không tham gia vào các cuộc trò chuyện không liên quan đến tài chính cá nhân.\n"
            f"- Không đưa ra ý kiến chính trị, tôn giáo, hoặc các chủ đề nhạy cảm khác.\n"
            f'- Khi được hỏi bạn là ai, chỉ trả lời: "Tôi là {persona["name"]}, trợ lý quản lý tài chính cá nhân.".\n'
            f"- Sử dụng emoji: {', '.join(persona['emojis'])} khi phù hợp với ngữ cảnh, nhưng không lạm dụng.\n"
            f"**Ràng buộc:**\n"
            f"- Bạn không phải là một chuyên gia tài chính được cấp phép. Các lời khuyên của bạn chỉ mang tính chất tham khảo.\n"
            f"- Bạn không thể thay thế cho một cố vấn tài chính chuyên nghiệp.\n"
            f"- Người dùng chịu trách nhiệm cuối cùng cho các quyết định tài chính của họ.\n"
            f"**Thông tin ngữ cảnh (nếu có):** {context_str}"
        )
        return prompt

    def _format_expense_response(
        self, amount: float, category: str, description: str, persona: dict
    ) -> str:
        responses = []
        if persona["style"] == "thân thiện, nhiệt tình, và quan tâm":
            responses.append(
                f"Mình đã ghi lại chi tiêu của bạn rồi nhé! {random.choice(persona['emojis'])}\n"
            )
            responses.append(f"• Nội dung: {description}\n")
            responses.append(f"• Số tiền: {format_currency(amount)}\n")
            responses.append(f"• Danh mục: {category}")
            if "cafe" in description.lower() or "cf" in description.lower():
                responses.append("\nNhớ uống cafe có chừng mực thôi nha bạn! 😉")
        elif persona["style"] == "thẳng thắn, nghiêm túc, và có phần 'cằn nhằn'":
            if amount > 100000:
                responses.append(f"Lại tiêu hoang rồi! 😤\n")
                responses.append(f"• {description} hết {format_currency(amount)}\n")
                responses.append("Cần xem lại chi tiêu ngay!")
            else:
                responses.append(f"Đã ghi nhận:\n")
                responses.append(f"• {description} ({format_currency(amount)})\n")
                responses.append("Nhớ chi tiêu cẩn thận! 😒")
        elif persona["style"] == "hài hước, dí dỏm, và thích pha trò":
            responses.append(f"OK, đã 'bỏ túi' khoản này nhé! 😎\n")
            responses.append(
                f"• {description}: {format_currency(amount)} vào {category}\n"
            )
            responses.append("Tiền bạc là phù du, tiêu xài là thú vui! 😂")
        return "\n".join(responses)

    def cleanup(self):
        """Cleans up resources and releases GPU memory."""
        try:
            torch.cuda.empty_cache()
            gc.collect()
            logger.info("AIChat resources cleaned up.")
        except Exception as e:
            logger.exception(f"Error during cleanup: {e}")

    def _format_response(self, response_text, persona):  # No changes needed here
        """Formats the response, removing tool calls and adding the assistant marker."""
        response_text = re.sub(
            r"```tool_call.*?```", "", response_text, flags=re.DOTALL
        ).strip()

        # Add assistant marker
        return response_text
