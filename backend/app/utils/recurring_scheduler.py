"""
Background scheduler for recurring transactions
Uses APScheduler to automatically create expenses from recurring transactions
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import date
import logging
from app import db
from app.models import RecurringTransaction

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def process_recurring_transactions():
    """Process all due recurring transactions and create expenses"""
    from flask import current_app
    try:
        with current_app.app_context():
            # Get all active recurring transactions that are due
            today = date.today()
            due_transactions = RecurringTransaction.query.filter(
                RecurringTransaction.is_active == True,
                RecurringTransaction.auto_create == True,
                RecurringTransaction.next_due_date <= today
            ).all()
            
            executed_count = 0
            skipped_count = 0
            
            for transaction in due_transactions:
                try:
                    if transaction.can_execute():
                        expense = transaction.execute()
                        if expense:
                            executed_count += 1
                            logger.info(f"Executed recurring transaction {transaction.id} ({transaction.name}), created expense {expense.id}")
                        else:
                            skipped_count += 1
                            logger.warning(f"Failed to execute recurring transaction {transaction.id}")
                    else:
                        skipped_count += 1
                        logger.info(f"Skipped recurring transaction {transaction.id} (inactive or past end date)")
                except Exception as e:
                    logger.exception(f"Error executing recurring transaction {transaction.id}: {e}")
                    skipped_count += 1
            
            if executed_count > 0 or skipped_count > 0:
                logger.info(f"Processed recurring transactions: {executed_count} executed, {skipped_count} skipped")
            
    except Exception as e:
        logger.exception(f"Error in process_recurring_transactions: {e}")


def start_scheduler(app):
    """Start the scheduler with the Flask app context"""
    try:
        # Schedule job to run daily at 2 AM
        scheduler.add_job(
            func=process_recurring_transactions,
            trigger=CronTrigger(hour=2, minute=0),
            id='process_recurring_transactions',
            name='Process recurring transactions',
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("Recurring transactions scheduler started (runs daily at 2 AM)")
    except Exception as e:
        logger.exception(f"Error starting scheduler: {e}")


def stop_scheduler():
    """Stop the scheduler"""
    try:
        if scheduler.running:
            scheduler.shutdown()
            logger.info("Recurring transactions scheduler stopped")
    except Exception as e:
        logger.exception(f"Error stopping scheduler: {e}")

