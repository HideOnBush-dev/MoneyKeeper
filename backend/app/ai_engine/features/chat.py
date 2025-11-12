import random
import logging
import re
import json
from flask_login import current_user
from typing import List, Generator, Dict, Optional, Tuple, Any

from app.ai_engine.core.model_manager import model_manager
from app.ai_engine.features.expense_handler import ExpenseHandler
from app.models import ChatMessage, Expense, Budget, Wallet
from app.utils import format_currency
from flask import current_app
from app import db
from sqlalchemy import func
from datetime import date, timedelta
from calendar import monthrange

logger = logging.getLogger(__name__)


class AIChat:
    def __init__(self, model_name: str = None):
        self.model_name = model_name or "gemini-1.5-flash"
        model_manager.initialize()

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

    def get_static_response(self, message: str, personality: str = "friendly") -> str:
        """Provides basic, rule-based responses for non-premium users."""
        persona = self.personalities.get(personality, self.personalities["friendly"])

        if any(word in message.lower() for word in ["tiết kiệm", "save"]):
            return f"{random.choice(persona['emojis'])} Bạn có thể thử đặt mục tiêu tiết kiệm hàng tháng, hoặc tìm cách giảm chi tiêu cho những khoản không cần thiết."
        elif any(word in message.lower() for word in ["ngân sách", "budget"]):
            return f"{random.choice(persona['emojis'])} Việc lập ngân sách rất quan trọng!  Hãy bắt đầu bằng cách liệt kê các khoản thu nhập và chi tiêu của bạn."
        elif any(word in message.lower() for word in ["xin chào", "chào"]):
            return random.choice(persona["responses"]["greeting"])
        else:
            return f"{random.choice(persona['emojis'])} Mình chưa hiểu ý bạn lắm. Bạn có thể nói rõ hơn được không?"

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
        category = None
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
            category,
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

                # Direct answers for well-defined app data queries (deterministic, no LLM)
                direct = self._maybe_direct_answer(message)
                if direct:
                    # Stream once
                    yield direct
                    # Save
                    ai_msg = ChatMessage(
                        session_id=int(session_id), is_user=False, content=direct
                    )
                    db.session.add(ai_msg)
                    db.session.commit()
                    return

                # Build context string
                context_parts = []
                if description and amount and category:
                    context_parts.append(
                        f"Người dùng vừa chi tiêu {format_currency(amount)} cho {description} (danh mục: {category})."
                    )

                # Augment context with app data relevant to the question
                app_context = self._build_app_context_snippet(message)
                if app_context:
                    context_parts.append(app_context)

                context_str = " ".join(context_parts)

                # Build conversation history for Gemini
                conversation_text = self._get_system_prompt(persona, context_str) + "\n\n"
                for msg in chat_history:
                    role = "Người dùng" if msg["role"] == "user" else "Trợ lý"
                    conversation_text += f"{role}: {msg['content']}\n"
                conversation_text += f"Người dùng: {message}\nTrợ lý:"

                # Generate response with streaming
                full_response = ""
                for chunk in model_manager.generate_content_stream(conversation_text):
                    full_response += chunk
                    yield chunk

                # Save to database
                ai_msg = ChatMessage(
                    session_id=int(session_id), is_user=False, content=full_response
                )
                db.session.add(ai_msg)
                db.session.commit()

        except Exception as e:
            logger.exception(f"Chat generation error: {e}")
            yield "Xin lỗi, đã có lỗi xảy ra khi xử lý tin nhắn của bạn."

    def _get_system_prompt(self, persona: dict, context_str: str = "") -> str:
        prompt = (
            f"Bạn là {persona['name']}, trợ lý quản lý tài chính cá nhân của ứng dụng MoneyKeeper được tạo bởi CatalizCS với phong cách {persona['style']}. "
            f"Khi được hỏi về nguồn gốc, bạn có thể trả l   ời: 'Mình được tạo ra bởi CatalizCS.' "
            f"Bạn giao tiếp bằng tiếng Việt, với phong cách {persona['style']}, giọng điệu {persona['tone']}, "
            f"và xưng hô với người dùng là {', '.join(persona['pronouns'])}. "
            f"Nhiệm vụ chính của bạn là cung cấp thông tin và lời khuyên hữu ích liên quan đến tài chính cá nhân.\n\n"
            f"Bạn được cung cấp dữ liệu ứng dụng của CHÍNH người dùng dưới dạng APP_CONTEXT bên dưới. "
            f"Khi câu hỏi liên quan đến số dư, ví, chi tiêu, ngân sách… HÃY sử dụng APP_CONTEXT để trả lời trực tiếp. "
            f"Không nói rằng bạn không có quyền truy cập dữ liệu người dùng nếu APP_CONTEXT đã có thông tin. "
            f"Chỉ từ chối nếu yêu cầu dữ liệu của người khác hoặc APP_CONTEXT không chứa dữ liệu liên quan; "
            f"khi đó hãy nói rõ không có dữ liệu phù hợp và hướng dẫn người dùng cung cấp thêm.\n\n"
            f"**Yêu cầu bắt buộc:**\n"
            f"- Trả lời ngắn gọn, chính xác, nêu số liệu rõ ràng (đơn vị VND khi phù hợp).\n"
            f"- Không cung cấp thông tin không liên quan hoặc lan man.\n"
            f"- Nếu không hiểu câu hỏi, hãy yêu cầu người dùng làm rõ.\n"
            f"- Không bịa đặt thông tin.\n"
            f"- Không tiết lộ dữ liệu cho bên thứ ba; chỉ báo cáo lại dữ liệu của chính người dùng trong APP_CONTEXT.\n"
            f'- Khi được hỏi bạn là ai, chỉ trả lời: "Tôi là {persona["name"]}, trợ lý quản lý tài chính cá nhân.".\n'
            f"- Sử dụng emoji: {', '.join(persona['emojis'])} khi phù hợp với ngữ cảnh, nhưng không lạm dụng.\n"
            f"**Ràng buộc:**\n"
            f"- Bạn không phải là một chuyên gia tài chính được cấp phép. Các lời khuyên chỉ mang tính tham khảo.\n"
            f"- Người dùng chịu trách nhiệm cuối cùng cho các quyết định tài chính của họ.\n\n"
            f"APP_CONTEXT: {context_str}"
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
        """Cleans up resources - minimal operation for API"""
        logger.info("AIChat resources cleaned up.")

    def _format_response(self, response_text, persona):
        """Formats the response"""
        return response_text.strip()

    # -------------------- App data context helpers --------------------
    def _format_vnd_text(self, amount: float) -> str:
        try:
            return f"{float(amount):,.0f} VND"
        except Exception:
            return f"{amount} VND"

    def _maybe_direct_answer(self, message: str) -> Optional[str]:
        """Return a fully formatted answer for specific requests without LLM."""
        try:
            msg = (message or "").lower()
            wants_balance = any(k in msg for k in ["tổng số dư", "số dư", "balance"]) or (" ví" in msg)
            if wants_balance:
                wallets = Wallet.query.filter_by(user_id=current_user.id).all()
                if not wallets:
                    return "**Hiện bạn chưa có ví nào.**"
                total = sum((w.balance or 0.0) for w in wallets)
                lines = []
                for w in wallets:
                    lines.append(f"-   **{w.name}:** {self._format_vnd_text(w.balance or 0)}")
                lines.append("")
                lines.append(f"**Tổng số dư hiện tại của bạn là {self._format_vnd_text(total)}.**")
                return "\n".join(lines)

            return None
        except Exception as e:
            logger.exception(f"Direct answer build failed: {e}")
            return None

    def _build_app_context_snippet(self, message: str) -> str:
        """
        Pulls small summaries from the user's data when the prompt suggests it.
        Keeps it short to fit in model context.
        """
        try:
            msg = (message or "").lower()
            wants_balance = any(k in msg for k in ["số dư", "ví", "balance", "tổng quan", "tiền còn lại"])
            wants_spending = any(k in msg for k in ["chi tiêu", "thống kê", "phân tích", "report"])
            wants_budgets = any(k in msg for k in ["ngân sách", "hạn mức", "budget", "vượt"])

            parts: list[str] = []

            if wants_balance:
                wallets = Wallet.query.filter_by(user_id=current_user.id).all()
                if wallets:
                    total = sum((w.balance or 0.0) for w in wallets)
                    wallet_lines = ", ".join(f"{w.name}: {format_currency(w.balance or 0)}" for w in wallets[:5])
                    if len(wallets) > 5:
                        wallet_lines += ", ..."
                    parts.append(f"Số dư ví: {wallet_lines}. Tổng: {format_currency(total)}.")

            if wants_spending:
                # last 30 days by category
                since = date.today() - timedelta(days=30)
                rows = db.session.query(Expense.category, func.sum(Expense.amount))\
                    .filter(Expense.user_id == current_user.id, Expense.is_expense == True, Expense.date >= since)\
                    .group_by(Expense.category).all()
                if rows:
                    cat_lines = ", ".join(f"{c}: {format_currency(float(a))}" for c, a in rows[:6])
                    parts.append(f"Chi tiêu 30 ngày gần đây theo danh mục: {cat_lines}.")

            if wants_budgets:
                today = date.today()
                y, m = today.year, today.month
                budgets = Budget.query.filter_by(user_id=current_user.id, year=y, month=m).all()
                if budgets:
                    _, last_day = monthrange(y, m)
                    start_date = date(y, m, 1)
                    end_date = date(y, m, last_day)
                    summaries = []
                    for b in budgets[:6]:
                        spent = db.session.query(func.sum(Expense.amount)).filter(
                            Expense.user_id == current_user.id,
                            Expense.category == b.category,
                            Expense.is_expense == True,
                            Expense.date >= start_date,
                            Expense.date <= end_date
                        ).scalar() or 0
                        pct = (float(spent) / float(b.amount) * 100) if b.amount else 0
                        summaries.append(f"{b.category}: {format_currency(spent)}/{format_currency(b.amount)} ({round(pct)}%)")
                    parts.append(f"Ngân sách tháng hiện tại: " + "; ".join(summaries) + ".")

            return " ".join(parts)
        except Exception as e:
            logger.exception(f"Failed to build app context: {e}")
            return ""
