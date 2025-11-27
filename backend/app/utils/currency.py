def convert_vietnamese_currency(amount_str: str, unit: str = None) -> int:
    """Convert Vietnamese currency string to integer value."""
    try:
        amount_str = amount_str.strip().replace(",", "").replace(".", "")
        amount = float(amount_str)

        if not unit:
            return int(amount)

        unit = unit.lower().strip()

        if unit in ["k", "nghìn", "ngàn"]:
            return int(amount * 1000)

        if unit in ["tr", "triệu"]:
            return int(amount * 1000000)

        if unit in ["tỷ", "ty"]:
            return int(amount * 1000000000)

        if unit in ["đ", "d", "đồng", "vnd", "vnđ"]:
            return int(amount)

        return int(amount)

    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid currency format: {amount_str} {unit}") from e