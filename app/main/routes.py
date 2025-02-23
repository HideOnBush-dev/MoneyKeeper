import threading
import logging
from flask import (
    render_template,
    flash,
    redirect,
    url_for,
    request,
    jsonify,
    send_file,
    current_app,
)
from flask_login import login_required, current_user
from app import db, socketio
from app.ai_engine.features.analysis import ExpenseAnalyzer
from app.ai_engine.features.categorizer import ExpenseCategorizer
from app.main import bp
from app.main.forms import (
    ExpenseForm,
    ExpenseEditForm,
    BudgetForm,
    ExpenseFilterForm,
    WalletForm,
)
from app.models import Expense, Budget, Notification, ChatSession, ChatMessage, Wallet
from app.utils import format_currency, get_date_range, calculate_statistics
from app.utils.export import export_expenses_to_excel
from app.utils.notifications import NotificationManager
from app.utils.ocr import ReceiptOCR
import json
from datetime import datetime, timedelta
import pandas as pd
from io import BytesIO
import uuid
import base64
from pathlib import Path
from app.constants import CATEGORY_ICONS
from flask_socketio import emit, join_room, leave_room
from sqlalchemy.exc import SQLAlchemyError


logger = logging.getLogger(__name__)

receipt_ocr = ReceiptOCR()


@bp.context_processor
def utility_processor():
    def get_unread_notifications_count():
        if current_user.is_authenticated:
            return Notification.query.filter_by(
                user_id=current_user.id, is_read=False
            ).count()
        return 0

    return {"unread_notifications_count": get_unread_notifications_count()}


@bp.route("/")
def landing():
    if current_user.is_authenticated:
        return redirect(url_for("main.index"))
    return render_template(
        "landing.html", title="Money Keeper - Quản lý tài chính thông minh"
    )


@bp.route("/index")
@login_required
def index():
    start_date, end_date = get_date_range("month")

    expenses = Expense.query.filter_by(user_id=current_user.id).all()

    stats = calculate_statistics(expenses, start_date, end_date)
    total_month = sum(e.amount for e in expenses if start_date <= e.date <= end_date)

    recent_expenses = (
        Expense.query.filter_by(user_id=current_user.id)
        .order_by(Expense.date.desc())
        .limit(5)
        .all()
    )
    chart_data = {"labels": [], "values": []}

    if stats["by_category"]:
        sorted_categories = sorted(
            stats["by_category"].items(), key=lambda x: x[1], reverse=True
        )[:6]

        chart_data["labels"] = [cat for cat, _ in sorted_categories]
        chart_data["values"] = [amount for _, amount in sorted_categories]

    return render_template(
        "main/index.html",
        title="Trang chủ",
        stats=stats,
        recent_expenses=recent_expenses,
        chart_data=json.dumps(chart_data),
        total_month=total_month,
    )


@bp.route("/add_expense", methods=["GET", "POST"])
@login_required
def add_expense():
    form = ExpenseForm()
    # The choices are now set in the form's __init__ method
    # form.wallet_id.choices = [(w.id, w.name) for w in current_user.wallets]

    if form.validate_on_submit():
        wallet = Wallet.query.get(form.wallet_id.data)
        if wallet.user_id != current_user.id:
            flash("Không có quyền sử dụng ví này!", "error")
            return redirect(url_for("main.expenses"))

        try:
            expense = Expense(
                amount=form.amount.data,
                category=form.category.data,
                description=form.description.data,
                wallet_id=wallet.id,
                is_expense=form.is_expense.data,
                user_id=current_user.id,
            )
            wallet.update_balance(form.amount.data, form.is_expense.data)

            db.session.add(expense)
            db.session.commit()
            flash("Đã ghi lại giao dịch!", "success")
            return redirect(url_for("main.expenses"))
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(f"Database error adding expense: {e}")
            flash("Lỗi cơ sở dữ liệu khi thêm chi tiêu. Vui lòng thử lại.", "error")
            return redirect(
                url_for("main.add_expense")
            )  # Redirect to the form to keep data

    default_wallet = current_user.get_default_wallet()
    form.wallet_id.data = default_wallet.id  # Set the default in GET *and* failed POST

    return render_template(
        "main/add_expense.html",
        title="Thêm giao dịch",
        form=form,
        category_icons=CATEGORY_ICONS,
    )


@bp.route("/delete_expense/<int:id>", methods=["POST"])
@login_required
def delete_expense(id):
    expense = Expense.query.get_or_404(id)
    if expense.user_id != current_user.id:
        return (
            jsonify({"success": False, "message": "Không có quyền xóa chi tiêu này"}),
            403,
        )
    try:
        db.session.delete(expense)
        db.session.commit()
        flash("Chi tiêu đã được xóa!", "success")
        return jsonify({"success": True})
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error deleting expense: {e}")  # Log full traceback
        return (
            jsonify(
                {"success": False, "message": "Lỗi cơ sở dữ liệu khi xóa chi tiêu."}
            ),
            500,
        )


@bp.route("/stats/<range_type>")
@login_required
def get_stats(range_type):
    start_date, end_date = get_date_range(range_type)
    expenses = Expense.query.filter_by(user_id=current_user.id).all()
    stats = calculate_statistics(expenses, start_date, end_date)
    return jsonify(
        {
            "total": format_currency(stats["total"]),
            "by_category": {
                k: format_currency(v) for k, v in stats["by_category"].items()
            },
            "count": stats["count"],
        }
    )


@bp.route("/expenses")
@login_required
def expenses():
    page = request.args.get("page", 1, type=int)
    filter_form = ExpenseFilterForm()

    query = Expense.query.filter_by(user_id=current_user.id)

    category = request.args.get("category")
    if category:
        query = query.filter_by(category=category)
    # Add date range filter
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")

    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
            query = query.filter(Expense.date >= start_date)
        except ValueError:
            flash("Ngày bắt đầu không hợp lệ.", "error")
            # Optionally redirect or handle the error

    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
            # Include the entire end_date by adding one day
            query = query.filter(Expense.date < end_date + timedelta(days=1))
        except ValueError:
            flash("Ngày kết thúc không hợp lệ.", "error")

    pagination = query.order_by(Expense.date.desc()).paginate(
        page=page, per_page=10, error_out=False
    )

    return render_template(
        "main/expenses.html",
        title="Lịch sử chi tiêu",
        expenses=pagination.items,
        pagination=pagination,
        filter_form=filter_form,
        kwargs=(
            {
                "category": category,
                "start_date": start_date_str,
                "end_date": end_date_str,
            }
            if category or start_date_str or end_date_str
            else {}
        ),
        format_currency=format_currency,
    )


@bp.route("/process_receipt", methods=["POST"])
@login_required
def process_receipt():
    if "receipt" not in request.files:
        return jsonify({"error": "Không tìm thấy ảnh"}), 400

    file = request.files["receipt"]
    if not file.filename.endswith((".jpg", ".jpeg", ".png")):
        return jsonify({"error": "Chỉ hỗ trợ file ảnh (.jpg, .png)"}), 400

    try:
        result = receipt_ocr.process_image(file.read())
        # Check for OCR failures
        if result.get("error"):
            return jsonify({"success": False, "error": result["error"]}), 400

        return jsonify(
            {
                "success": True,
                "amount": result.get("amount"),
                "date": result.get("date").isoformat() if result.get("date") else None,
                "text": result.get("text"),
            }
        )
    except Exception as e:
        logger.exception(f"Error processing receipt: {e}")  # Log the full traceback
        return jsonify({"error": str(e)}), 500


@bp.route("/edit_expense/<int:id>", methods=["GET", "POST"])
@login_required
def edit_expense(id):
    expense = Expense.query.get_or_404(id)
    if expense.user_id != current_user.id:
        flash("Không có quyền chỉnh sửa khoản chi tiêu này!")
        return redirect(url_for("main.expenses"))

    form = ExpenseEditForm(obj=expense)
    if form.validate_on_submit():
        old_amount = expense.amount
        old_is_expense = expense.is_expense

        expense.amount = form.amount.data
        expense.category = form.category.data
        expense.description = form.description.data
        expense.is_expense = form.is_expense.data

        wallet = expense.wallet
        # Correctly update the wallet balance
        if old_is_expense:
            wallet.balance += old_amount
        else:
            wallet.balance -= old_amount

        if expense.is_expense:
            wallet.balance -= expense.amount
        else:
            wallet.balance += expense.amount
        try:
            db.session.commit()
            flash("Cập nhật giao dịch thành công!")
            return redirect(url_for("main.expenses"))
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(f"Error updating expense: {e}")
            flash("Lỗi cơ sở dữ liệu khi cập nhật chi tiêu.", "error")
            return redirect(
                url_for("main.edit_expense", id=id)
            )  # Redirect back with form data

    return render_template(
        "main/edit_expense.html",
        form=form,
        expense=expense,
        category_icons=CATEGORY_ICONS,
    )


@bp.route("/budgets", methods=["GET", "POST"])
@login_required
def budgets():
    form = BudgetForm()
    if form.validate_on_submit():
        existing_budget = Budget.query.filter_by(
            user_id=current_user.id,
            category=form.category.data,
            month=form.month.data,
            year=form.year.data,
        ).first()

        if existing_budget:
            existing_budget.amount = form.amount.data
            flash("Ngân sách đã được cập nhật!")
        else:
            budget = Budget(
                category=form.category.data,
                amount=form.amount.data,
                month=form.month.data,
                year=form.year.data,
                user_id=current_user.id,
            )
            db.session.add(budget)
            flash("Ngân sách đã được thiết lập!")

        try:
            db.session.commit()
            return redirect(url_for("main.budgets"))
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(f"Error creating/updating budget: {e}")
            flash("Lỗi cơ sở dữ liệu khi cập nhật ngân sách.", "error")
            return redirect(url_for("main.budgets"))  # Stay on the same page

    current_budgets = (
        Budget.query.filter_by(user_id=current_user.id)
        .order_by(Budget.year.desc(), Budget.month.desc())
        .all()
    )

    return render_template(
        "main/budgets.html",
        form=form,
        budgets=current_budgets,
        title="Quản lý ngân sách",
    )


@bp.route("/export_expenses")
@login_required
def export_expenses():
    expenses = (
        Expense.query.filter_by(user_id=current_user.id)
        .order_by(Expense.date.desc())
        .all()
    )
    output = export_expenses_to_excel(expenses)
    return send_file(
        output,
        download_name=f'chi-tieu-{datetime.now().strftime("%Y%m%d")}.xlsx',
        as_attachment=True,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@bp.route("/chat")
@login_required
def chat():
    if not current_user.is_authenticated:
        return redirect(url_for("auth.login"))

    session = (
        ChatSession.query.filter_by(user_id=current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .first()
    )

    if not session:
        session = ChatSession(user_id=current_user.id)
        db.session.add(session)
        db.session.commit()

    all_sessions = (
        ChatSession.query.filter_by(user_id=current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )

    messages = (
        ChatMessage.query.filter_by(session_id=session.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    # calculate total_month *within* the chat view function.
    start_date, end_date = get_date_range("month")
    expenses = Expense.query.filter_by(user_id=current_user.id).all()
    total_month = sum(e.amount for e in expenses if start_date <= e.date <= end_date)

    return render_template(
        "main/chat.html",
        title="Trò chuyện với AI",
        session=session,
        messages=messages,
        all_sessions=all_sessions,
        total_month=total_month,
    )


@socketio.on("connect", namespace="/chat")
def handle_connect():
    logger.debug(f"Client connected: {request.sid}")
    join_room(str(current_user.id))


@socketio.on("disconnect", namespace="/chat")
def handle_disconnect():
    logger.debug(f"Client disconnected: {request.sid}")
    leave_room(str(current_user.id))


@socketio.on("message", namespace="/chat")
def handle_message(data):
    logger.debug(f"Received message: {data} from {request.sid}")

    if not current_user.is_authenticated:
        emit("error", {"data": "Unauthorized"}, room=request.sid)
        return

    message = data.get("message", "")
    if not message.strip():
        return
    message = message.replace("<", "<").replace(">", ">")  # Basic XSS prevention

    try:
        session = (
            ChatSession.query.filter_by(user_id=current_user.id)
            .order_by(ChatSession.updated_at.desc())
            .first()
        )

        if not session:
            session = ChatSession(
                user_id=current_user.id, personality=data.get("personality", "friendly")
            )
            db.session.add(session)
        else:
            session.personality = data.get("personality", session.personality)

        user_msg = ChatMessage(session_id=session.id, is_user=True, content=message)
        db.session.add(user_msg)
        db.session.commit()

        emit("message", {"data": message, "user": True}, room=str(current_user.id))

        try:
            response_chunks = current_app.ai_chat.get_response_stream(
                message, session.personality, str(session.id)
            )
            full_response = ""  # Accumulate the full response here
            for chunk in response_chunks:
                full_response += chunk
                # Build up the full response.
            # After yielding all chunks, send to client
            socketio.emit(
                "response",
                {"data": full_response, "user": False, "done": True},
                room=str(current_user.id),
                namespace="/chat",
            )
        except Exception as e:
            logger.exception(f"Error handling message: {e}")  # Log the full traceback.
            emit("error", {"data": "Đã xảy ra lỗi."}, room=str(current_user.id))
    finally:
        current_app.ai_chat.cleanup()


@bp.route("/api/chat/sessions", methods=["POST"])
@login_required
def manage_chat_sessions():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request: No JSON data provided."}), 400

    action = data.get("action")
    if not action:
        return jsonify({"error": "Invalid request: 'action' field required."}), 400

    if action == "new":
        session = ChatSession(
            user_id=current_user.id, personality=data.get("personality", "friendly")
        )
        db.session.add(session)
        try:
            db.session.commit()
            return jsonify({"session_id": session.id})
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(f"Database error creating chat session: {e}")
            return jsonify({"error": "Database error creating session"}), 500

    elif action == "delete":
        session_id = data.get("session_id")
        if not session_id:
            return jsonify({"error": "Missing session_id"}), 400
        session = ChatSession.query.get(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404  # More specific error
        if session.user_id != current_user.id:
            return jsonify({"error": "Unauthorized"}), 403
        try:
            ChatMessage.query.filter_by(session_id=session.id).delete()
            db.session.delete(session)
            db.session.commit()
            return jsonify({"success": True})
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(
                f"Database error deleting chat session: {e}"
            )  # Log the exception
            return jsonify({"error": "Database error deleting session."}), 500

    # Update session.  (Used for switching personalities)
    elif action == "update":
        session_id = data.get("session_id")
        if not session_id:
            return jsonify({"error": "Missing session_id"}), 400
        session = ChatSession.query.get(session_id)

        if not session:
            return jsonify({"error": "Session not found"}), 404
        if session.user_id != current_user.id:
            return jsonify({"error": "Unauthorized"}), 403

        if "personality" in data:
            session.personality = data["personality"]
        try:
            db.session.commit()
            return jsonify({"success": True})
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(f"Database error updating chat session: {e}")
            return jsonify({"error": "Database error updating session"}), 500

    return jsonify({"error": "Invalid action"}), 400


@bp.route("/api/chat/sessions/<int:session_id>/messages", methods=["GET"])
@login_required
def get_chat_messages(session_id):
    session = ChatSession.query.get_or_404(session_id)
    if session.user_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403

    messages = (
        ChatMessage.query.filter_by(session_id=session.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    message_data = [
        {
            "content": msg.content,
            "user": msg.is_user,
            "timestamp": msg.created_at.isoformat(),
        }
        for msg in messages
    ]
    return jsonify({"messages": message_data})


@bp.route("/ai/get_analysis_data", methods=["POST"])
@login_required
def get_analysis_data():
    start_date, end_date = get_date_range("month")
    expenses = Expense.query.filter_by(user_id=current_user.id).all()
    expense_data = [
        {
            "amount": e.amount,
            "category": e.category,
            "date": e.date.isoformat(),
            "description": e.description,
        }
        for e in expenses
        if start_date <= e.date <= end_date
    ]
    analysis_data = current_app.expense_analyzer.get_analysis_data(expense_data)
    return jsonify(analysis_data)


@bp.route("/ai/get_recommendations", methods=["POST"])
@login_required
def get_recommendations():
    start_date, end_date = get_date_range("month")
    expenses = Expense.query.filter_by(user_id=current_user.id).all()
    expense_data = [
        {
            "amount": e.amount,
            "category": e.category,
            "date": e.date.isoformat(),
            "description": e.description,
        }
        for e in expenses
        if start_date <= e.date <= end_date
    ]
    recommendations = current_app.expense_analyzer.get_recommendations(expense_data)
    return jsonify({"recommendations": recommendations})


@bp.route("/export_data")
@login_required
def export_data():
    expenses = Expense.query.filter_by(user_id=current_user.id).all()

    data = []
    for expense in expenses:
        data.append(
            {
                "Ngày": expense.date,
                "Danh mục": expense.category,
                "Mô tả": expense.description,
                "Số tiền": expense.amount,
            }
        )

    df = pd.DataFrame(data)
    output = BytesIO()

    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        df.to_excel(writer, sheet_name="Chi tiêu", index=False)
        workbook = writer.book
        worksheet = writer.sheets["Chi tiêu"]

        money_fmt = workbook.add_format({"num_format": "#,##0 ₫"})
        date_fmt = workbook.add_format({"num_format": "dd/mm/yyyy hh:mm"})
        worksheet.set_column("A:A", 18, date_fmt)
        worksheet.set_column("D:D", 15, money_fmt)

    output.seek(0)
    return send_file(
        output,
        download_name=f'chi-tieu-{datetime.now().strftime("%Y%m%d")}.xlsx',
        as_attachment=True,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@bp.route("/import_data", methods=["POST"])
@login_required
def import_data():
    if "file" not in request.files:
        return jsonify({"error": "Không tìm thấy file"}), 400

    file = request.files["file"]
    if not file.filename.endswith(".xlsx"):
        return jsonify({"error": "Chỉ hỗ trợ file Excel (.xlsx)"}), 400

    try:
        df = pd.read_excel(file)
        for _, row in df.iterrows():
            expense = Expense(
                date=row["Ngày"],
                category=row["Danh mục"],
                description=row["Mô tả"],
                amount=row["Số tiền"],
                user_id=current_user.id,
            )
            db.session.add(expense)
        db.session.commit()
        return jsonify({"success": "Dữ liệu đã được nhập thành công"})
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error importing data: {e}")  # Log full traceback
        return jsonify({"error": str(e)}), 400


@bp.route("/ai/analyze_patterns", methods=["POST"])
@login_required
def analyze_patterns():

    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    try:
        expenses = (
            Expense.query.filter_by(user_id=current_user.id)
            .order_by(Expense.date.desc())
            .limit(30)
            .all()
        )

        if not expenses:
            return jsonify(
                {
                    "analysis": {
                        "pattern": "insufficient_data",
                        "message": "Chưa có dữ liệu chi tiêu để phân tích",
                    },
                    "recommendations": ["Hãy bắt đầu ghi lại chi tiêu của bạn"],
                }
            )

        expense_data = [
            {
                "amount": e.amount,
                "category": e.category,
                "date": e.date.isoformat(),
                "description": e.description,
            }
            for e in expenses
        ]

        analysis = current_app.expense_analyzer.analyze_patterns(expense_data)
        recommendations = current_app.expense_analyzer.get_recommendations(analysis)

        return jsonify({"analysis": analysis, "recommendations": recommendations})
    except Exception as e:
        logger.exception("Error during AI analysis")
        return (
            jsonify({"error": "Không thể phân tích chi tiêu", "message": str(e)}),
            500,
        )


@bp.route("/ai/suggest_category", methods=["POST"])
@login_required
def suggest_category():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    description = request.json.get("description", "")
    if not description:
        return (
            jsonify({"error": "Description is required"}),
            400,
        )  # Check for empty description
    category = current_app.expense_categorizer.predict_category(description)
    return jsonify({"category": category})


@bp.route("/notifications")
@login_required
def notifications():
    page = request.args.get("page", 1, type=int)
    notifications = (
        Notification.query.filter_by(user_id=current_user.id)
        .order_by(Notification.created_at.desc())
        .paginate(page=page, per_page=10, error_out=False)
    )
    return render_template("main/notifications.html", notifications=notifications)


@bp.route("/notifications/mark_read/<int:id>", methods=["POST"])
@login_required
def mark_notification_read(id):
    try:
        NotificationManager.mark_as_read(id, current_user.id)
        return jsonify({"success": True})
    except Exception as e:
        logger.exception(
            f"Error marking notification as read: {e}"
        )  # Log with traceback
        return jsonify({"success": False, "message": "Failed to mark as read."}), 500


@bp.route("/check_budget_alerts")
@login_required
def check_budget_alerts():
    alerts = NotificationManager.check_budget_alerts(current_user.id)
    return jsonify({"alerts": alerts})


@bp.route("/settings", methods=["GET", "POST"])
@login_required
def settings():
    from app.main.forms import ChangePasswordForm

    form_password = ChangePasswordForm()

    if form_password.validate_on_submit():
        if current_user.check_password(form_password.current_password.data):
            current_user.set_password(form_password.new_password.data)
            db.session.commit()
            flash("Mật khẩu đã được thay đổi thành công!", "success")
            return redirect(url_for("main.settings"))
        flash("Mật khẩu hiện tại không đúng!", "error")

    return render_template(
        "main/settings.html", title="Cài đặt", form_password=form_password
    )


@bp.route("/install-ios")
@login_required
def install_ios_app():
    icon_path = Path(current_app.root_path) / "static" / "img" / "app-icon.png"
    with open(icon_path, "rb") as f:
        icon_data = base64.b64encode(f.read()).decode()

    profile_uuid = str(uuid.uuid4())
    payload_uuid = str(uuid.uuid4())

    app_url = request.host_url.rstrip("/")
    if app_url.startswith("http://"):
        app_url = "https://" + app_url[7:]

    profile_path = (
        Path(current_app.root_path) / "static" / "profiles" / "webclip.mobileconfig"
    )
    with open(profile_path) as f:
        profile_content = f.read()

    profile_content = profile_content.replace("{{ icon_data }}", icon_data)
    profile_content = profile_content.replace("{{ user_id }}", str(current_user.id))
    profile_content = profile_content.replace("{{ uuid }}", payload_uuid)
    profile_content = profile_content.replace("{{ profile_uuid }}", profile_uuid)
    profile_content = profile_content.replace("{{ app_url }}", app_url)
    response = current_app.make_response(profile_content)
    response.headers["Content-Type"] = "application/x-apple-aspen-config"
    response.headers["Content-Disposition"] = (
        "attachment; filename=moneykeeper.mobileconfig"
    )

    return response


@bp.route("/wallets")
@login_required
def wallets():
    wallets = current_user.wallets.all()
    form = WalletForm()
    return render_template(
        "main/wallets.html", wallets=wallets, form=form, title="Quản lý ví"
    )


@bp.route("/wallet/add", methods=["POST"])
@login_required
def add_wallet():
    form = WalletForm()
    if form.validate_on_submit():
        if form.is_default.data:
            current_user.wallets.filter_by(is_default=True).update(
                {"is_default": False}
            )
        try:
            wallet = Wallet(
                name=form.name.data,
                balance=form.balance.data,
                description=form.description.data,
                is_default=form.is_default.data,
                user_id=current_user.id,
            )
            db.session.add(wallet)
            db.session.commit()
            flash("Đã thêm ví mới thành công!")
            return redirect(url_for("main.wallets"))
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(f"Database error adding wallet: {e}")
            flash(
                "Lỗi cơ sở dữ liệu khi thêm ví.", "error"
            )  # More specific error message
            return render_template(
                "main/wallets.html", form=form, title="Quản Lý Ví"
            )  # Stay on the same page

    return render_template("main/wallets.html", form=form, title="Quản Lý Ví")


@bp.route("/wallet/<int:id>/edit", methods=["GET", "POST"])
@login_required
def edit_wallet(id):
    wallet = Wallet.query.get_or_404(id)
    if wallet.user_id != current_user.id:
        flash("Không có quyền chỉnh sửa ví này!")
        return redirect(url_for("main.wallets"))

    form = WalletForm(obj=wallet)
    if form.validate_on_submit():
        if form.is_default.data and not wallet.is_default:
            current_user.wallets.filter_by(is_default=True).update(
                {"is_default": False}
            )

        wallet.name = form.name.data
        wallet.balance = form.balance.data
        wallet.description = form.description.data
        wallet.is_default = form.is_default.data
        try:
            db.session.commit()
            flash("Đã cập nhật ví thành công!")
            return redirect(url_for("main.wallets"))
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(f"Error updating wallet: {e}")  # Log the traceback
            flash("Lỗi cơ sở dữ liệu khi cập nhật ví.", "error")
            return render_template(
                "main/edit_wallet.html", wallet=wallet, form=form, title="Chỉnh sửa ví"
            )  # Stay on the edit page

    return render_template(
        "main/edit_wallet.html", wallet=wallet, form=form, title="Chỉnh sửa ví"
    )


@bp.route("/wallet/<int:id>/delete", methods=["POST"])
@login_required
def delete_wallet(id):
    wallet = Wallet.query.get_or_404(id)
    if wallet.user_id != current_user.id:
        flash("Không có quyền xóa ví này!")
        return jsonify({"success": False, "message": "Không có quyền xóa ví này!"}), 403

    if wallet.is_default:
        flash("Không thể xóa ví mặc định!")
        return (
            jsonify({"success": False, "message": "Không thể xóa ví mặc định!"}),
            400,
        )

    if wallet.expenses.count() > 0:
        flash("Không thể xóa ví đã có giao dịch!")
        return (
            jsonify({"success": False, "message": "Không thể xóa ví đã có giao dịch!"}),
            400,
        )

    try:
        db.session.delete(wallet)
        db.session.commit()
        flash("Đã xóa ví thành công!")
        return jsonify({"success": True, "message": "Đã xóa ví thành công!"})
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Error deleting wallet: {e}")  # Log the full traceback
        return (
            jsonify({"success": False, "message": "Lỗi cơ sở dữ liệu khi xóa ví."}),
            500,
        )
