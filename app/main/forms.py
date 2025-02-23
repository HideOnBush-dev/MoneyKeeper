from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import (
    FloatField,
    StringField,
    SubmitField,
    SelectField,
    TextAreaField,
    PasswordField,
)
from wtforms.validators import (
    DataRequired,
    Length,
    NumberRange,
    Optional,
    EqualTo,
    ValidationError,
)
from app.constants import EXPENSE_CATEGORIES
from flask_login import current_user
import re


def is_valid_amount_format(form, field):
    """Custom validator to check for valid VND amount format (with dots)."""
    if field.data is not None:  # Allow None for optional fields
        amount_str = str(field.data)
        if not re.match(r"^\d+(\.\d{3})*$", amount_str):
            raise ValidationError(
                "Định dạng số tiền không hợp lệ. Sử dụng dấu chấm (.) để phân tách hàng nghìn."
            )


class WalletForm(FlaskForm):
    name = StringField(
        "Tên ví",
        validators=[DataRequired(message="Vui lòng nhập tên ví"), Length(max=64)],
    )
    balance = FloatField(
        "Số dư",
        validators=[
            DataRequired(message="Vui lòng nhập số dư"),
            NumberRange(min=0, message="Số dư phải lớn hơn hoặc bằng 0"),
        ],
    )
    description = TextAreaField("Mô tả", validators=[Length(max=200)])
    is_default = SelectField(
        "Đặt làm ví mặc định", choices=[(False, "Không"), (True, "Có")], coerce=bool
    )
    submit = SubmitField("Lưu ví")


class ExpenseForm(FlaskForm):
    receipt = FileField(
        "Hình ảnh hóa đơn",
        validators=[FileAllowed(["jpg", "jpeg", "png"], "Chỉ chấp nhận file ảnh!")],
    )
    amount = FloatField(
        "Số tiền",
        validators=[
            DataRequired(message="Vui lòng nhập số tiền"),
            NumberRange(min=0, message="Số tiền phải lớn hơn 0"),
        ],
    )
    category = SelectField(
        "Danh mục", choices=EXPENSE_CATEGORIES, validators=[DataRequired()]
    )
    description = TextAreaField("Mô tả", validators=[Length(max=200)])
    wallet_id = SelectField("Ví", coerce=int)
    is_expense = SelectField(
        "Loại", choices=[(True, "Chi tiêu"), (False, "Thu nhập")], coerce=bool
    )
    submit = SubmitField("Lưu chi tiêu")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if current_user.is_authenticated:
            self.wallet_id.choices = [(w.id, w.name) for w in current_user.wallets]


class ExpenseFilterForm(FlaskForm):
    category = SelectField(
        "Danh mục",
        choices=[
            ("", "Tất cả"),
            ("food", "Ăn uống"),
            ("transport", "Di chuyển"),
            ("utilities", "Tiện ích"),
            ("shopping", "Mua sắm"),
            ("entertainment", "Giải trí"),
            ("health", "Sức khỏe"),
            ("education", "Giáo dục"),
            ("other", "Khác"),
        ],
        validators=[Optional()],
    )
    submit = SubmitField("Lọc")


class ExpenseEditForm(FlaskForm):
    amount = FloatField("Số tiền", validators=[DataRequired(), NumberRange(min=0)])
    category = SelectField(
        "Danh mục", choices=EXPENSE_CATEGORIES, validators=[DataRequired()]
    )
    description = TextAreaField("Mô tả", validators=[Length(max=200)])
    is_expense = SelectField(
        "Loại", choices=[(True, "Chi tiêu"), (False, "Thu nhập")], coerce=bool
    )
    submit = SubmitField("Cập nhật")


class BudgetForm(FlaskForm):
    category = SelectField(
        "Danh mục", choices=EXPENSE_CATEGORIES, validators=[DataRequired()]
    )
    amount = FloatField("Ngân sách", validators=[DataRequired(), NumberRange(min=0)])
    month = SelectField(
        "Tháng", choices=[(i, str(i)) for i in range(1, 13)], coerce=int
    )
    year = SelectField(
        "Năm", choices=[(i, str(i)) for i in range(2024, 2030)], coerce=int
    )
    submit = SubmitField("Thiết lập ngân sách")


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
