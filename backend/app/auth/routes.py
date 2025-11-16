from flask import jsonify, render_template, redirect, url_for, flash, request
from flask_login import login_required, login_user, logout_user, current_user
from app import db
from werkzeug.security import generate_password_hash
from app.auth import bp
from app.auth.forms import LoginForm, RegistrationForm
from app.models import User
from sqlalchemy.exc import OperationalError
import time
import logging

logger = logging.getLogger(__name__)


@bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        # Handle JSON requests from React
        if request.is_json or request.headers.get("Content-Type") == "application/json":
            return jsonify({"message": "Already authenticated", "user": {
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email
            }})
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return jsonify({"redirect": url_for("main.index")})
        return redirect(url_for("main.index"))

    # Handle JSON requests from React
    if request.is_json:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({"message": "Thiếu tên đăng nhập hoặc mật khẩu"}), 400
        
        user = User.query.filter_by(username=username).first()
        if user is None or not user.check_password(password):
            return jsonify({"message": "Tên đăng nhập hoặc mật khẩu không đúng"}), 401
        
        remember = data.get('remember', True)  # Default to True for better UX
        login_user(user, remember=remember)
        
        # Ensure session is marked as permanent if remember is True
        from flask import session
        if remember:
            session.permanent = True
        
        return jsonify({
            "message": "Đăng nhập thành công",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
            }
        })

    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user is None or not user.check_password(form.password.data):
            flash("Tên đăng nhập hoặc mật khẩu không đúng", "error")
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return render_template(
                    "auth/_login_content.html", form=form
                )  # Return form + error for AJAX
            return redirect(url_for("auth.login"))

        login_user(user, remember=form.remember_me.data)  # Use remember_me
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return jsonify({"redirect": url_for("main.index")})
        return redirect(url_for("main.index"))

    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return jsonify({"redirect": "/login"})

    return redirect("/login")


@bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        if request.is_json:
            return jsonify({"message": "Already authenticated", "user": {
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email
            }})
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return jsonify({"redirect": url_for("main.index")})
        return redirect(url_for("main.index"))

    # Handle JSON requests from React
    if request.is_json:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return jsonify({"message": "Thiếu thông tin bắt buộc"}), 400
        
        # Check if username already exists
        if User.query.filter_by(username=username).first():
            return jsonify({"message": "Tên đăng nhập đã tồn tại"}), 400
        
        # Check if email already exists
        if User.query.filter_by(email=email).first():
            return jsonify({"message": "Email đã được sử dụng"}), 400
        
        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        
        try:
            db.session.commit()
            login_user(user)
            return jsonify({
                "message": "Đăng ký thành công",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email
                }
            })
        except Exception as e:
            db.session.rollback()
            logger.error(f"Registration error: {e}")
            return jsonify({"message": "Đăng ký thất bại. Vui lòng thử lại."}), 500

    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data, email=form.email.data)
        user.set_password(form.password.data)
        db.session.add(user)

        max_retries = 3
        retry_delay = 1

        for attempt in range(max_retries):
            try:
                db.session.commit()
                login_user(user)
                flash("Đăng ký thành công!", "success")
                if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                    return jsonify({"redirect": url_for("main.index")})
                return redirect(url_for("main.index"))
            except OperationalError as e:
                if "database is locked" in str(e) and attempt < max_retries - 1:
                    logger.warning(
                        f"Database locked, retrying in {retry_delay} seconds..."
                    )  # Log retries
                    db.session.rollback()
                    time.sleep(retry_delay)
                    continue
                # Log other operational errors
                logger.exception(f"OperationalError during registration: {e}")
                flash("Lỗi hệ thống, vui lòng thử lại sau.", "error")
                if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                    return render_template(
                        "auth/_register_content.html", form=form
                    )  # Invalid form for AJAX
                return redirect(url_for("auth.register"))
            except Exception as e:
                db.session.rollback()
                logger.exception(
                    f"Error during registration: {e}"
                )  # More specific exception logging
                flash("Lỗi đăng ký: " + str(e), "error")
                if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                    return render_template(
                        "auth/_register_content.html", form=form
                    )  # Invalid form for AJAX
                return redirect(url_for("auth.register"))
    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return jsonify({"redirect": "/register"})
    return redirect("/register")


@bp.route("/logout")
@login_required
def logout():
    logout_user()
    
    # Handle JSON requests from React
    if request.is_json or request.headers.get("Content-Type") == "application/json":
        return jsonify({"message": "Đăng xuất thành công"})
    
    flash("Bạn đã đăng xuất.", "success")
    return redirect(url_for("auth.login"))
