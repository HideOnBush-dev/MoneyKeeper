# app/utils/email.py
from flask import current_app
from flask_mail import Message
from threading import Thread
from flask import render_template
import logging

logger = logging.getLogger(__name__)


def send_async_email(app, msg):
    with app.app_context():
        try:
            mail = app.extensions.get("mail")
            if mail:
                mail.send(msg)
            else:
                logger.error("Mail extension not initialized")  # Use logger
        except Exception as e:
            logger.exception(f"Error sending email: {e}")  # Use logger with traceback


def send_email(subject, recipient, template, **kwargs):
    try:
        app = current_app._get_current_object()
        msg = Message(
            subject=f"Money Keeper - {subject}",
            recipients=[recipient],
            sender=app.config["MAIL_DEFAULT_SENDER"],
        )
        msg.html = render_template(f"email/{template}.html", **kwargs)

        Thread(target=send_async_email, args=(app, msg)).start()
        return True
    except Exception as e:
        logger.exception(f"Error preparing email: {e}")  # Use logger, include traceback
        return False
