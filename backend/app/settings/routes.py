from flask import render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from app import db
from app.settings import bp
from app.settings.forms import ChangePasswordForm


@bp.route("/account", methods=["GET", "POST"])
@login_required
def settings():
    form_password = ChangePasswordForm()

    if form_password.validate_on_submit():
        if current_user.check_password(form_password.current_password.data):
            current_user.set_password(form_password.new_password.data)
            db.session.commit()
            flash("Mật khẩu đã được thay đổi thành công!", "success")
            return redirect(url_for("settings.settings"))
        else:
            flash("Mật khẩu hiện tại không đúng.", "error")

    return render_template(
        "settings/account.html", title="Cài đặt tài khoản", form_password=form_password
    )


@bp.route("/change_password", methods=["POST"])
@login_required
def change_password():
    form_password = ChangePasswordForm()
    if form_password.validate_on_submit():
        if current_user.check_password(form_password.current_password.data):
            current_user.set_password(form_password.new_password.data)
            db.session.commit()
            flash("Mật khẩu đã được thay đổi thành công!", "success")
        else:
            flash("Mật khẩu hiện tại không đúng.", "error")
    return redirect(url_for("settings.settings"))
