"""
API endpoints for bill reminders management
"""

from datetime import datetime, date, timedelta

from flask import jsonify, request, abort
from flask_login import login_required, current_user
from sqlalchemy.exc import SQLAlchemyError

from app.api import bp
from app import db
from app.models import Bill, BillPayment, Wallet, RecurringTransaction
from app.security import (
    validate_amount,
    sanitize_string,
    validate_date,
)
from app.middleware import validate_json

import logging

logger = logging.getLogger(__name__)


def _bill_to_dict(bill):
    return {
        "id": bill.id,
        "name": bill.name,
        "amount": float(bill.amount),
        "category": bill.category,
        "due_date": bill.due_date.isoformat() if bill.due_date else None,
        "reminder_days": bill.reminder_days,
        "is_paid": bill.is_paid,
        "paid_date": bill.paid_date.isoformat() if bill.paid_date else None,
        "wallet_id": bill.wallet_id,
        "description": bill.description,
        "recurring_id": bill.recurring_id,
        "color": bill.color,
        "last_reminded_at": bill.last_reminded_at.isoformat() if bill.last_reminded_at else None,
        "created_at": bill.created_at.isoformat() if bill.created_at else None,
        "updated_at": bill.updated_at.isoformat() if bill.updated_at else None,
        "days_until_due": (bill.due_date - date.today()).days if bill.due_date else None,
    }


@bp.route("/bills", methods=["GET"])
@login_required
def get_bills():
    try:
        status = request.args.get("status")
        query = Bill.query.filter_by(user_id=current_user.id)
        if status == "paid":
            query = query.filter_by(is_paid=True)
        elif status == "unpaid":
            query = query.filter_by(is_paid=False)
        bills = query.order_by(Bill.due_date.asc()).all()
        return jsonify({"bills": [_bill_to_dict(b) for b in bills]}), 200
    except SQLAlchemyError as e:
        logger.exception("Database error fetching bills: %s", e)
        abort(500, description="Failed to fetch bills")


@bp.route("/bills", methods=["POST"])
@login_required
@validate_json
def create_bill():
    data = request.get_json()
    if not data.get("name"):
        abort(400, description="Name is required")
    if not data.get("amount"):
        abort(400, description="Amount is required")
    if not data.get("due_date"):
        abort(400, description="Due date is required")

    name = sanitize_string(data["name"], max_length=120)
    amount = validate_amount(data["amount"])
    due_date = validate_date(data["due_date"])
    if not amount or float(amount) <= 0:
        abort(400, description="Amount must be greater than 0")
    if not due_date:
        abort(400, description="Invalid due date")

    reminder_days = data.get("reminder_days", 3)
    if reminder_days is not None:
        try:
            reminder_days = int(reminder_days)
            reminder_days = max(0, min(reminder_days, 30))
        except ValueError:
            reminder_days = 3

    bill = Bill(
        user_id=current_user.id,
        name=name,
        amount=amount,
        category=sanitize_string(data.get("category", ""), max_length=50) or None,
        due_date=due_date,
        reminder_days=reminder_days,
        description=sanitize_string(data.get("description", ""), max_length=500) or None,
        wallet_id=data.get("wallet_id"),
        recurring_id=data.get("recurring_id"),
        color=data.get("color", "indigo"),
    )

    if bill.wallet_id:
        wallet = Wallet.query.filter_by(id=bill.wallet_id, user_id=current_user.id).first()
        if not wallet:
            abort(404, description="Wallet not found")

    if bill.recurring_id:
        recurring = RecurringTransaction.query.filter_by(id=bill.recurring_id, user_id=current_user.id).first()
        if not recurring:
            abort(404, description="Recurring transaction not found")

    try:
        db.session.add(bill)
        db.session.commit()
        return jsonify({"message": "Bill created", "bill": _bill_to_dict(bill)}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception("Database error creating bill: %s", e)
        abort(500, description="Failed to create bill")


@bp.route("/bills/<int:bill_id>", methods=["GET"])
@login_required
def get_bill(bill_id):
    bill = Bill.query.filter_by(id=bill_id, user_id=current_user.id).first()
    if not bill:
        abort(404, description="Bill not found")
    return jsonify({"bill": _bill_to_dict(bill)}), 200


@bp.route("/bills/<int:bill_id>", methods=["PUT"])
@login_required
@validate_json
def update_bill(bill_id):
    bill = Bill.query.filter_by(id=bill_id, user_id=current_user.id).first()
    if not bill:
        abort(404, description="Bill not found")

    data = request.get_json()

    if "name" in data:
        bill.name = sanitize_string(data["name"], max_length=120)
    if "amount" in data:
        amount = validate_amount(data["amount"])
        if not amount or float(amount) <= 0:
            abort(400, description="Amount must be greater than 0")
        bill.amount = amount
    if "category" in data:
        bill.category = sanitize_string(data["category"], max_length=50) or None
    if "due_date" in data:
        bill.due_date = validate_date(data["due_date"])
    if "reminder_days" in data:
        try:
            bill.reminder_days = max(0, min(int(data["reminder_days"]), 30))
        except ValueError:
            pass
    if "description" in data:
        bill.description = sanitize_string(data["description"], max_length=500) or None
    if "wallet_id" in data:
        if data["wallet_id"]:
            wallet = Wallet.query.filter_by(id=data["wallet_id"], user_id=current_user.id).first()
            if not wallet:
                abort(404, description="Wallet not found")
            bill.wallet_id = wallet.id
        else:
            bill.wallet_id = None
    if "recurring_id" in data:
        if data["recurring_id"]:
            recurring = RecurringTransaction.query.filter_by(id=data["recurring_id"], user_id=current_user.id).first()
            if not recurring:
                abort(404, description="Recurring transaction not found")
            bill.recurring_id = recurring.id
        else:
            bill.recurring_id = None
    if "color" in data:
        bill.color = sanitize_string(data["color"], max_length=30)

    try:
        bill.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"message": "Bill updated", "bill": _bill_to_dict(bill)}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception("Database error updating bill: %s", e)
        abort(500, description="Failed to update bill")


@bp.route("/bills/<int:bill_id>", methods=["DELETE"])
@login_required
def delete_bill(bill_id):
    bill = Bill.query.filter_by(id=bill_id, user_id=current_user.id).first()
    if not bill:
        abort(404, description="Bill not found")
    try:
        db.session.delete(bill)
        db.session.commit()
        return jsonify({"message": "Bill deleted"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception("Database error deleting bill: %s", e)
        abort(500, description="Failed to delete bill")


@bp.route("/bills/<int:bill_id>/mark-paid", methods=["POST"])
@login_required
def mark_bill_paid(bill_id):
    bill = Bill.query.filter_by(id=bill_id, user_id=current_user.id).first()
    if not bill:
        abort(404, description="Bill not found")
    if bill.is_paid:
        return jsonify({"message": "Bill already paid", "bill": _bill_to_dict(bill)}), 200

    paid_date = request.json.get("paid_date")
    paid_date = validate_date(paid_date) if paid_date else date.today()
    bill.mark_paid(True, paid_date)
    return jsonify({"message": "Bill marked as paid", "bill": _bill_to_dict(bill)}), 200


@bp.route("/bills/<int:bill_id>/payments", methods=["GET"])
@login_required
def get_bill_payments(bill_id):
    bill = Bill.query.filter_by(id=bill_id, user_id=current_user.id).first()
    if not bill:
        abort(404, description="Bill not found")
    payments = BillPayment.query.filter_by(bill_id=bill.id).order_by(BillPayment.payment_date.desc()).all()
    return jsonify({
        "bill": _bill_to_dict(bill),
        "payments": [
            {
                "id": p.id,
                "amount": float(p.amount),
                "payment_date": p.payment_date.isoformat(),
                "notes": p.notes,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in payments
        ]
    }), 200


@bp.route("/bills/<int:bill_id>/payments", methods=["POST"])
@login_required
@validate_json
def add_bill_payment(bill_id):
    bill = Bill.query.filter_by(id=bill_id, user_id=current_user.id).first()
    if not bill:
        abort(404, description="Bill not found")

    data = request.get_json()
    if not data.get("amount"):
        abort(400, description="Amount is required")

    amount = validate_amount(data["amount"])
    if not amount or float(amount) <= 0:
        abort(400, description="Amount must be greater than 0")

    payment = BillPayment(
        bill_id=bill.id,
        amount=amount,
        payment_date=validate_date(data.get("payment_date")) or date.today(),
        notes=sanitize_string(data.get("notes", ""), max_length=300) or None,
    )

    try:
        db.session.add(payment)
        bill.is_paid = True
        bill.paid_date = payment.payment_date
        bill.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"message": "Payment recorded", "payment": {
            "id": payment.id,
            "amount": float(payment.amount),
            "payment_date": payment.payment_date.isoformat(),
            "notes": payment.notes,
        }}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception("Database error recording bill payment: %s", e)
        abort(500, description="Failed to record payment")


@bp.route("/bills/upcoming", methods=["GET"])
@login_required
def get_upcoming_bills():
    days = request.args.get("days", 7, type=int)
    days = max(1, min(days, 60))
    today = date.today()
    end_date = today + timedelta(days=days)

    bills = Bill.query.filter(
        Bill.user_id == current_user.id,
        Bill.is_paid == False,  # noqa
        Bill.due_date <= end_date,
    ).order_by(Bill.due_date.asc()).all()

    return jsonify({
        "bills": [_bill_to_dict(b) for b in bills],
        "count": len(bills),
    }), 200

