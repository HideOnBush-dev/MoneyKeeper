from flask_wtf import FlaskForm
from wtforms import PasswordField, SubmitField
from wtforms.validators import DataRequired, EqualTo, Length


class ChangePasswordForm(FlaskForm):
    current_password = PasswordField("Mật khẩu hiện tại", validators=[DataRequired()])
    new_password = PasswordField(
        "Mật khẩu mới",
        validators=[
            DataRequired(),
            Length(min=6, message="Mật khẩu phải có ít nhất 6 ký tự"),
        ],
    )
    confirm_new_password = PasswordField(
        "Xác nhận mật khẩu mới",
        validators=[
            DataRequired(),
            EqualTo("new_password", message="Mật khẩu xác nhận không khớp"),
        ],
    )
    submit = SubmitField("Đổi mật khẩu")
