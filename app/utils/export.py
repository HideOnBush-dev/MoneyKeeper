import pandas as pd
from io import BytesIO
from datetime import datetime


def export_expenses_to_excel(expenses):
    output = BytesIO()

    # Convert expenses to DataFrame
    data = [
        {
            "Ngày": expense.date,
            "Danh mục": expense.category,
            "Mô tả": expense.description,
            "Số tiền": expense.amount,
            "Ví": expense.wallet.name,  # Include wallet name
        }
        for expense in expenses
    ]

    df = pd.DataFrame(data)

    # Create Excel writer
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        df.to_excel(writer, sheet_name="Chi tiêu", index=False)

        # Get workbook and worksheet
        workbook = writer.book
        worksheet = writer.sheets["Chi tiêu"]

        # Add formats
        money_format = workbook.add_format({"num_format": "#,##0 ₫"})
        date_format = workbook.add_format({"num_format": "dd/mm/yyyy hh:mm"})

        # Set column formats and widths
        worksheet.set_column("A:A", 18, date_format)  # Date
        worksheet.set_column("B:B", 15)  # Category
        worksheet.set_column("C:C", 30)  # Description
        worksheet.set_column("D:D", 15, money_format)  # Amount
        worksheet.set_column("E:E", 15)  # Wallet

    output.seek(0)
    return output
