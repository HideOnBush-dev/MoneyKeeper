from flask import jsonify, request, abort
from flask_login import login_required, current_user
from app.api import bp
from app.models import Notification
from app import db
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)


@bp.route("/notifications", methods=["GET"])
@login_required
def get_notifications():
    """Return current user's notifications as JSON with pagination"""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = min(request.args.get("per_page", 10, type=int), 50)

        if page < 1 or per_page < 1:
            abort(400, description="Invalid pagination parameters")

        pagination = (
            Notification.query.filter_by(user_id=current_user.id)
            .order_by(Notification.created_at.desc())
            .paginate(page=page, per_page=per_page, error_out=False)
        )

        items = [
            {
                "id": n.id,
                "type": n.type,
                "message": n.message,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in pagination.items
        ]

        return (
            jsonify(
                {
                    "notifications": items,
                    "pagination": {
                        "page": page,
                        "per_page": per_page,
                        "total": pagination.total,
                        "pages": pagination.pages,
                    },
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching notifications: {e}")
        abort(500, description="Failed to fetch notifications")
    except Exception as e:
        logger.exception(f"Error fetching notifications: {e}")
        abort(500, description="An error occurred")


@bp.route("/notifications/unread_count", methods=["GET"])
@login_required
def get_unread_notifications_count():
    """Return unread notifications count for current user"""
    try:
        count = (
            Notification.query.filter_by(user_id=current_user.id, is_read=False).count()
        )
        return jsonify({"unread": count}), 200
    except SQLAlchemyError as e:
        logger.exception(f"Database error counting notifications: {e}")
        abort(500, description="Failed to count notifications")


@bp.route("/notifications/mark_read/<int:notification_id>", methods=["POST"])
@login_required
def mark_notification_read_api(notification_id: int):
    """Mark a notification as read (JSON API)"""
    try:
        notification = Notification.query.filter_by(
            id=notification_id, user_id=current_user.id
        ).first()
        if not notification:
            abort(404, description="Notification not found")

        notification.is_read = True
        db.session.commit()
        return jsonify({"success": True}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error marking notification read: {e}")
        abort(500, description="Failed to mark notification as read")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error marking notification read: {e}")
        abort(500, description="An error occurred")


