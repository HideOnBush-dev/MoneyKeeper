from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, BooleanField
from wtforms.validators import DataRequired, Email, EqualTo, ValidationError, Length
from app.models import User


class LoginForm(FlaskForm):
    username = StringField("Tên đăng nhập", validators=[DataRequired()])
    password = PasswordField("Mật khẩu", validators=[DataRequired()])
    remember_me = BooleanField("Ghi nhớ đăng nhập")  # Add remember me field
    submit = SubmitField("Đăng nhập")


class RegistrationForm(FlaskForm):
    username = StringField(
        "Tên đăng nhập", validators=[DataRequired(), Length(min=3, max=64)]
    )
    email = StringField("Email", validators=[DataRequired(), Email(), Length(max=120)])
    password = PasswordField("Mật khẩu", validators=[DataRequired(), Length(min=6)])
    password2 = PasswordField(
        "Xác nhận mật khẩu", validators=[DataRequired(), EqualTo("password")]
    )
    submit = SubmitField("Đăng ký")

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError("Tên đăng nhập đã tồn tại.")

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError("Email đã được sử dụng.")
