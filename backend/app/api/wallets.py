"""
API endpoints for wallet management
"""

from flask import jsonify, request, abort, redirect
from flask_login import login_required, current_user
from app.api import bp
from app.models import Wallet, Expense, SharedWallet, User, Notification
from app import db
from app.security import (
    validate_amount, sanitize_string,
    validate_positive_integer
)
from app.middleware import validate_json, log_slow_requests
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func
from datetime import datetime, timedelta
import secrets
import json
import base64
import logging

logger = logging.getLogger(__name__)


@bp.route('/wallets', methods=['POST'])
@login_required
@validate_json
@log_slow_requests(threshold=2.0)
def create_wallet():
    """Create a new wallet"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            abort(400, description="Wallet name is required")
        
        # Validate and sanitize inputs
        name = sanitize_string(data['name'], max_length=100)
        balance = validate_amount(data.get('balance', 0))
        description = sanitize_string(data.get('description', ''), max_length=500)
        currency = sanitize_string(data.get('currency', 'VND'), max_length=3)
        is_default = bool(data.get('is_default', False))
        
        # If setting as default, unset other defaults
        if is_default:
            Wallet.query.filter_by(
                user_id=current_user.id,
                is_default=True
            ).update({'is_default': False})
        
        # Create wallet
        wallet = Wallet(
            name=name,
            balance=float(balance),
            description=description,
            currency=currency,
            is_default=is_default,
            user_id=current_user.id
        )
        
        db.session.add(wallet)
        db.session.commit()
        
        logger.info(f"User {current_user.id} created wallet {wallet.id}")
        
        return jsonify({
            'message': 'Wallet created successfully',
            'wallet': {
                'id': wallet.id,
                'name': wallet.name,
                'balance': float(wallet.balance),
                'currency': wallet.currency,
                'description': wallet.description,
                'is_default': wallet.is_default,
                'created_at': wallet.created_at.isoformat()
            }
        }), 201
        
    except ValueError as e:
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error creating wallet: {e}")
        abort(500, description="Failed to create wallet")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error creating wallet: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/<int:wallet_id>', methods=['GET'])
@login_required
def get_wallet(wallet_id):
    """Get a specific wallet with statistics"""
    try:
        wallet = Wallet.query.filter_by(
            id=wallet_id,
            user_id=current_user.id
        ).first()
        
        if not wallet:
            abort(404, description="Wallet not found")
        
        # Calculate statistics
        expenses = Expense.query.filter_by(wallet_id=wallet_id, is_expense=True)
        income = Expense.query.filter_by(wallet_id=wallet_id, is_expense=False)
        
        total_expenses = db.session.query(func.sum(Expense.amount)).filter(
            Expense.wallet_id == wallet_id,
            Expense.is_expense == True
        ).scalar() or 0
        
        total_income = db.session.query(func.sum(Expense.amount)).filter(
            Expense.wallet_id == wallet_id,
            Expense.is_expense == False
        ).scalar() or 0
        
        transaction_count = Expense.query.filter_by(wallet_id=wallet_id).count()
        
        return jsonify({
            'wallet': {
                'id': wallet.id,
                'name': wallet.name,
                'balance': float(wallet.balance),
                'currency': wallet.currency,
                'description': wallet.description,
                'is_default': wallet.is_default,
                'created_at': wallet.created_at.isoformat(),
                'statistics': {
                    'total_expenses': float(total_expenses),
                    'total_income': float(total_income),
                    'transaction_count': transaction_count
                }
            }
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching wallet: {e}")
        abort(500, description="Failed to fetch wallet")
    except Exception as e:
        logger.exception(f"Error fetching wallet: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/<int:wallet_id>', methods=['PUT', 'PATCH'])
@login_required
@validate_json
def update_wallet(wallet_id):
    """Update an existing wallet"""
    try:
        wallet = Wallet.query.filter_by(
            id=wallet_id,
            user_id=current_user.id
        ).first()
        
        if not wallet:
            abort(404, description="Wallet not found")
        
        data = request.get_json()
        
        # Update fields if provided
        if 'name' in data:
            wallet.name = sanitize_string(data['name'], max_length=100)
        
        if 'balance' in data:
            new_balance = validate_amount(data['balance'])
            wallet.balance = float(new_balance)
        
        if 'description' in data:
            wallet.description = sanitize_string(data['description'], max_length=500)
        
        if 'currency' in data:
            wallet.currency = sanitize_string(data['currency'], max_length=3)
        
        if 'is_default' in data:
            is_default = bool(data['is_default'])
            if is_default and not wallet.is_default:
                # Unset other defaults
                other_defaults = Wallet.query.filter_by(
                    user_id=current_user.id,
                    is_default=True
                ).all()
                for other_wallet in other_defaults:
                    other_wallet.is_default = False
            wallet.is_default = is_default
        
        db.session.add(wallet)
        db.session.commit()
        
        logger.info(f"User {current_user.id} updated wallet {wallet_id}")
        
        return jsonify({
            'message': 'Wallet updated successfully',
            'wallet': {
                'id': wallet.id,
                'name': wallet.name,
                'balance': float(wallet.balance),
                'currency': wallet.currency,
                'description': wallet.description,
                'is_default': wallet.is_default
            }
        }), 200
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error updating wallet: {e}")
        abort(500, description="Failed to update wallet")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error updating wallet: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/<int:wallet_id>', methods=['DELETE'])
@login_required
def delete_wallet(wallet_id):
    """Delete a wallet"""
    try:
        wallet = Wallet.query.filter_by(
            id=wallet_id,
            user_id=current_user.id
        ).first()
        
        if not wallet:
            return jsonify({
                'error': 'Wallet not found',
                'message': 'Wallet not found'
            }), 404
        
        # Check if it's the default wallet
        if wallet.is_default:
            return jsonify({
                'error': 'Cannot delete default wallet',
                'message': 'Cannot delete default wallet. Please set another wallet as default first.'
            }), 400
        
        # Check if wallet has transactions
        try:
            transaction_count = Expense.query.filter_by(wallet_id=wallet_id).count()
            if transaction_count > 0:
                return jsonify({
                    'error': 'Cannot delete wallet with transactions',
                    'message': f'Cannot delete wallet with {transaction_count} existing transaction(s). Please delete or move the transactions first.'
                }), 400
        except Exception as e:
            logger.exception(f"Error checking transactions: {e}")
            # Continue with deletion if we can't check transactions
        
        db.session.delete(wallet)
        db.session.commit()
        
        logger.info(f"User {current_user.id} deleted wallet {wallet_id}")
        
        return jsonify({
            'message': 'Wallet deleted successfully'
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error deleting wallet: {e}")
        return jsonify({
            'error': 'Database error',
            'message': 'Failed to delete wallet due to database error'
        }), 500
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error deleting wallet: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred while deleting the wallet'
        }), 500


@bp.route('/wallets/<int:wallet_id>/transactions', methods=['GET'])
@login_required
def get_wallet_transactions(wallet_id):
    """Get all transactions for a specific wallet"""
    try:
        # Verify wallet ownership
        wallet = Wallet.query.filter_by(
            id=wallet_id,
            user_id=current_user.id
        ).first()
        
        if not wallet:
            abort(404, description="Wallet not found")
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        
        # Query transactions
        pagination = Expense.query.filter_by(
            wallet_id=wallet_id
        ).order_by(Expense.date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'transactions': [{
                'id': e.id,
                'amount': float(e.amount),
                'category': e.category,
                'description': sanitize_string(e.description, max_length=500),
                'date': e.date.isoformat() if e.date else None,
                'is_expense': e.is_expense
            } for e in pagination.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching wallet transactions: {e}")
        abort(500, description="Failed to fetch transactions")
    except Exception as e:
        logger.exception(f"Error fetching wallet transactions: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/transfer', methods=['POST'])
@login_required
@validate_json
def transfer_between_wallets():
    """Transfer money between wallets"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('from_wallet_id'):
            abort(400, description="Source wallet ID is required")
        
        if not data.get('to_wallet_id'):
            abort(400, description="Destination wallet ID is required")
        
        if not data.get('amount'):
            abort(400, description="Amount is required")
        
        # Validate inputs
        from_wallet_id = validate_positive_integer(data['from_wallet_id'])
        to_wallet_id = validate_positive_integer(data['to_wallet_id'])
        amount = validate_amount(data['amount'])
        description = sanitize_string(
            data.get('description', 'Transfer between wallets'),
            max_length=500
        )
        
        # Check if wallets are different
        if from_wallet_id == to_wallet_id:
            abort(400, description="Cannot transfer to the same wallet")
        
        # Verify wallet ownership
        from_wallet = Wallet.query.filter_by(
            id=from_wallet_id,
            user_id=current_user.id
        ).first()
        
        to_wallet = Wallet.query.filter_by(
            id=to_wallet_id,
            user_id=current_user.id
        ).first()
        
        if not from_wallet:
            abort(404, description="Source wallet not found")
        
        if not to_wallet:
            abort(404, description="Destination wallet not found")
        
        # Check sufficient balance
        if from_wallet.balance < float(amount):
            return jsonify({
                'error': 'Insufficient balance',
                'wallet_balance': float(from_wallet.balance),
                'required_amount': float(amount)
            }), 400
        
        # Create transfer transactions
        # Debit from source wallet
        expense_out = Expense(
            amount=float(amount),
            category='transfer',
            description=f"{description} (to {to_wallet.name})",
            date=datetime.utcnow(),
            user_id=current_user.id,
            wallet_id=from_wallet_id,
            is_expense=True
        )
        
        # Credit to destination wallet
        expense_in = Expense(
            amount=float(amount),
            category='transfer',
            description=f"{description} (from {from_wallet.name})",
            date=datetime.utcnow(),
            user_id=current_user.id,
            wallet_id=to_wallet_id,
            is_expense=False
        )
        
        db.session.add(expense_out)
        db.session.add(expense_in)
        
        # Update wallet balances
        from_wallet.update_balance(float(amount), is_expense=True)
        to_wallet.update_balance(float(amount), is_expense=False)
        
        db.session.commit()
        
        logger.info(f"User {current_user.id} transferred {amount} from wallet {from_wallet_id} to {to_wallet_id}")
        
        return jsonify({
            'message': 'Transfer completed successfully',
            'transfer': {
                'from_wallet': {
                    'id': from_wallet.id,
                    'name': from_wallet.name,
                    'new_balance': float(from_wallet.balance)
                },
                'to_wallet': {
                    'id': to_wallet.id,
                    'name': to_wallet.name,
                    'new_balance': float(to_wallet.balance)
                },
                'amount': float(amount),
                'description': description
            }
        }), 201
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error transferring between wallets: {e}")
        abort(500, description="Failed to complete transfer")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error transferring between wallets: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/<int:wallet_id>/share', methods=['POST'])
@login_required
@validate_json
def share_wallet(wallet_id):
    """Share a wallet with another user"""
    try:
        data = request.get_json()
        shared_with_username = data.get('username') or data.get('email')
        
        if not shared_with_username:
            abort(400, description="Username or email is required")
        
        # Get wallet and verify ownership
        wallet = Wallet.query.filter_by(
            id=wallet_id,
            user_id=current_user.id
        ).first()
        
        if not wallet:
            abort(404, description="Wallet not found")
        
        # Find user to share with
        shared_with_user = User.query.filter(
            (User.username == shared_with_username) | (User.email == shared_with_username)
        ).first()
        
        if not shared_with_user:
            abort(404, description="User not found")
        
        if shared_with_user.id == current_user.id:
            abort(400, description="Cannot share wallet with yourself")
        
        # Check if already shared
        existing_share = SharedWallet.query.filter_by(
            wallet_id=wallet_id,
            shared_with_user_id=shared_with_user.id
        ).first()
        
        if existing_share:
            abort(400, description="Wallet is already shared with this user")
        
        # Create share
        shared_wallet = SharedWallet(
            wallet_id=wallet_id,
            shared_with_user_id=shared_with_user.id,
            shared_by_user_id=current_user.id,
            can_edit=data.get('can_edit', True)
        )
        db.session.add(shared_wallet)
        
        # Create notification for shared user
        notification = Notification(
            user_id=shared_with_user.id,
            type='wallet_shared',
            message=f'{current_user.username} đã chia sẻ ví "{wallet.name}" với bạn'
        )
        db.session.add(notification)
        
        db.session.commit()
        
        logger.info(f"User {current_user.id} shared wallet {wallet_id} with user {shared_with_user.id}")
        
        return jsonify({
            'message': 'Wallet shared successfully',
            'shared_wallet': {
                'id': shared_wallet.id,
                'wallet_id': wallet_id,
                'wallet_name': wallet.name,
                'shared_with_user': {
                    'id': shared_with_user.id,
                    'username': shared_with_user.username,
                    'email': shared_with_user.email
                },
                'can_edit': shared_wallet.can_edit
            }
        }), 201
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error sharing wallet: {e}")
        abort(500, description="Failed to share wallet")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error sharing wallet: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/<int:wallet_id>/share/<int:user_id>', methods=['DELETE'])
@login_required
def unshare_wallet(wallet_id, user_id):
    """Unshare a wallet with a user"""
    try:
        # Get wallet and verify ownership
        wallet = Wallet.query.filter_by(
            id=wallet_id,
            user_id=current_user.id
        ).first()
        
        if not wallet:
            abort(404, description="Wallet not found")
        
        # Find shared wallet record
        shared_wallet = SharedWallet.query.filter_by(
            wallet_id=wallet_id,
            shared_with_user_id=user_id
        ).first()
        
        if not shared_wallet:
            abort(404, description="Wallet is not shared with this user")
        
        # Create notification for unshared user
        unshared_user = User.query.get(user_id)
        if unshared_user:
            notification = Notification(
                user_id=user_id,
                type='wallet_unshared',
                message=f'{current_user.username} đã ngừng chia sẻ ví "{wallet.name}" với bạn'
            )
            db.session.add(notification)
        
        db.session.delete(shared_wallet)
        db.session.commit()
        
        logger.info(f"User {current_user.id} unshared wallet {wallet_id} with user {user_id}")
        
        return jsonify({'message': 'Wallet unshared successfully'}), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error unsharing wallet: {e}")
        abort(500, description="Failed to unshare wallet")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error unsharing wallet: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/shared', methods=['GET'])
@login_required
def get_shared_wallets():
    """Get wallets shared with current user"""
    try:
        shared_wallets = SharedWallet.query.filter_by(
            shared_with_user_id=current_user.id
        ).all()
        
        wallets_data = []
        for shared in shared_wallets:
            wallet = Wallet.query.get(shared.wallet_id)
            if wallet:
                owner = User.query.get(shared.shared_by_user_id)
                wallets_data.append({
                    'id': wallet.id,
                    'name': wallet.name,
                    'balance': float(wallet.balance),
                    'currency': wallet.currency,
                    'description': wallet.description,
                    'is_default': wallet.is_default,
                    'created_at': wallet.created_at.isoformat() if wallet.created_at else None,
                    'is_shared': True,
                    'can_edit': shared.can_edit,
                    'owner': {
                        'id': owner.id if owner else None,
                        'username': owner.username if owner else None,
                        'email': owner.email if owner else None
                    },
                    'shared_at': shared.created_at.isoformat() if shared.created_at else None
                })
        
        return jsonify({
            'wallets': wallets_data,
            'count': len(wallets_data)
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching shared wallets: {e}")
        abort(500, description="Failed to fetch shared wallets")
    except Exception as e:
        logger.exception(f"Error fetching shared wallets: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/<int:wallet_id>/shared-users', methods=['GET'])
@login_required
def get_wallet_shared_users(wallet_id):
    """Get list of users a wallet is shared with"""
    try:
        # Verify wallet ownership
        wallet = Wallet.query.filter_by(
            id=wallet_id,
            user_id=current_user.id
        ).first()
        
        if not wallet:
            abort(404, description="Wallet not found")
        
        shared_records = SharedWallet.query.filter_by(wallet_id=wallet_id).all()
        
        shared_users = []
        for record in shared_records:
            user = User.query.get(record.shared_with_user_id)
            if user:
                shared_users.append({
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'can_edit': record.can_edit,
                    'shared_at': record.created_at.isoformat() if record.created_at else None
                })
        
        return jsonify({
            'shared_users': shared_users,
            'count': len(shared_users)
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching shared users: {e}")
        abort(500, description="Failed to fetch shared users")
    except Exception as e:
        logger.exception(f"Error fetching shared users: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/<int:wallet_id>/share/qr', methods=['GET'])
@login_required
def get_wallet_share_qr(wallet_id):
    """Generate QR code data for sharing wallet"""
    try:
        # Verify wallet ownership
        wallet = Wallet.query.filter_by(
            id=wallet_id,
            user_id=current_user.id
        ).first()
        
        if not wallet:
            abort(404, description="Wallet not found")
        
        # Create share token (valid for 24 hours)
        share_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        # Create QR code data (JSON format)
        qr_data = {
            'type': 'wallet_share',
            'wallet_id': wallet_id,
            'wallet_name': wallet.name,
            'owner_id': current_user.id,
            'owner_username': current_user.username,
            'token': share_token,
            'expires_at': expires_at.isoformat(),
            'app_url': request.host_url.rstrip('/')  # Base URL of the app
        }
        
        # Encode as base64 for QR code
        qr_json = json.dumps(qr_data)
        qr_encoded = base64.b64encode(qr_json.encode('utf-8')).decode('utf-8')
        
        logger.info(f"User {current_user.id} generated QR code for wallet {wallet_id}")
        
        return jsonify({
            'qr_data': qr_encoded,
            'share_url': f"{request.host_url.rstrip('/')}/wallets/share?token={share_token}&wallet_id={wallet_id}",
            'expires_at': expires_at.isoformat(),
            'wallet': {
                'id': wallet.id,
                'name': wallet.name,
                'balance': float(wallet.balance),
                'currency': wallet.currency
            }
        }), 200
        
    except SQLAlchemyError as e:
        logger.exception(f"Database error generating QR code: {e}")
        abort(500, description="Failed to generate QR code")
    except Exception as e:
        logger.exception(f"Error generating QR code: {e}")
        abort(500, description="An error occurred")


@bp.route('/wallets/share', methods=['GET'])
def wallet_share_page():
    """Handle wallet share URL - auto accept if logged in, else redirect to frontend"""
    token = request.args.get('token')
    wallet_id = request.args.get('wallet_id')
    
    if not token or not wallet_id:
        abort(400, description="Token and wallet_id are required")
    
    # Verify wallet exists
    wallet = Wallet.query.get(wallet_id)
    if not wallet:
        abort(404, description="Wallet not found")
    
    # If user is logged in, auto-accept the share
    if current_user.is_authenticated:
        try:
            # Check if already shared
            existing_share = SharedWallet.query.filter_by(
                wallet_id=wallet_id,
                shared_with_user_id=current_user.id
            ).first()
            
            if existing_share:
                # Already shared, just redirect
                frontend_url = request.host_url.rstrip('/').replace(':8000', ':3000')
                return redirect(f"{frontend_url}/wallets?share_accepted=already")
            
            # Create share
            if wallet.user_id == current_user.id:
                frontend_url = request.host_url.rstrip('/').replace(':8000', ':3000')
                return redirect(f"{frontend_url}/wallets?share_error=cannot_share_with_self")
            
            shared_wallet = SharedWallet(
                wallet_id=wallet_id,
                shared_with_user_id=current_user.id,
                shared_by_user_id=wallet.user_id,
                can_edit=True
            )
            db.session.add(shared_wallet)
            db.session.commit()
            
            logger.info(f"User {current_user.id} accepted wallet share for wallet {wallet_id}")
            
            # Redirect to frontend with success message
            frontend_url = request.host_url.rstrip('/').replace(':8000', ':3000')
            return redirect(f"{frontend_url}/wallets?share_accepted=success&wallet_name={wallet.name}")
            
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Error auto-accepting wallet share: {e}")
            frontend_url = request.host_url.rstrip('/').replace(':8000', ':3000')
            return redirect(f"{frontend_url}/wallets?share_error=accept_failed")
    
    # Not logged in, redirect to frontend with token for manual accept
    frontend_url = request.host_url.rstrip('/').replace(':8000', ':3000')
    redirect_url = f"{frontend_url}/wallets?share_token={token}&wallet_id={wallet_id}"
    
    return redirect(redirect_url)


@bp.route('/wallets/share/accept', methods=['POST'])
@login_required
@validate_json
def accept_wallet_share():
    """Accept wallet share from QR code"""
    try:
        data = request.get_json()
        qr_data_encoded = data.get('qr_data')
        share_token = data.get('token')
        wallet_id_param = data.get('wallet_id')
        can_edit = data.get('can_edit', True)
        
        wallet_id = None
        owner_id = None
        expires_at_str = None
        
        # Handle URL-based share (from share_url)
        if share_token and wallet_id_param:
            wallet_id = int(wallet_id_param)
            wallet = Wallet.query.get(wallet_id)
            if not wallet:
                abort(404, description="Wallet not found")
            owner_id = wallet.user_id
            # Token-based shares don't expire (or have longer expiration)
            # For now, we'll allow them
        elif qr_data_encoded:
            # Decode QR code data (base64 encoded JSON)
            try:
                qr_json = base64.b64decode(qr_data_encoded.encode('utf-8')).decode('utf-8')
                qr_data = json.loads(qr_json)
            except Exception as e:
                abort(400, description="Invalid QR code data")
            
            # Validate QR code data
            if qr_data.get('type') != 'wallet_share':
                abort(400, description="Invalid QR code type")
            
            wallet_id = qr_data.get('wallet_id')
            owner_id = qr_data.get('owner_id')
            expires_at_str = qr_data.get('expires_at')
            
            if not wallet_id or not owner_id:
                abort(400, description="Invalid QR code data")
            
            # Check expiration
            if expires_at_str:
                expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
                if datetime.utcnow() > expires_at:
                    abort(400, description="QR code has expired")
        else:
            abort(400, description="QR code data or token is required")
        
        # Check if user is trying to share with themselves
        if owner_id == current_user.id:
            abort(400, description="Cannot share wallet with yourself")
        
        # Get wallet
        wallet = Wallet.query.get(wallet_id)
        if not wallet:
            abort(404, description="Wallet not found")
        
        # Verify wallet ownership
        if wallet.user_id != owner_id:
            abort(403, description="Wallet ownership mismatch")
        
        # Check if already shared
        existing_share = SharedWallet.query.filter_by(
            wallet_id=wallet_id,
            shared_with_user_id=current_user.id
        ).first()
        
        if existing_share:
            # Update permissions if different
            if existing_share.can_edit != can_edit:
                existing_share.can_edit = can_edit
                db.session.commit()
            return jsonify({
                'message': 'Wallet is already shared with you',
                'wallet': {
                    'id': wallet.id,
                    'name': wallet.name,
                    'balance': float(wallet.balance),
                    'currency': wallet.currency
                }
            }), 200
        
        # Create share
        shared_wallet = SharedWallet(
            wallet_id=wallet_id,
            shared_with_user_id=current_user.id,
            shared_by_user_id=owner_id,
            can_edit=can_edit
        )
        db.session.add(shared_wallet)
        
        # Create notification for owner
        owner = User.query.get(owner_id)
        if owner:
            notification = Notification(
                user_id=owner_id,
                type='wallet_share_accepted',
                message=f'{current_user.username} đã chấp nhận chia sẻ ví "{wallet.name}"'
            )
            db.session.add(notification)
        
        # Create notification for current user
        notification = Notification(
            user_id=current_user.id,
            type='wallet_shared',
            message=f'Bạn đã chấp nhận chia sẻ ví "{wallet.name}" từ {owner.username if owner else "người dùng"}'
        )
        db.session.add(notification)
        
        db.session.commit()
        
        logger.info(f"User {current_user.id} accepted share for wallet {wallet_id} from user {owner_id}")
        
        return jsonify({
            'message': 'Wallet share accepted successfully',
            'wallet': {
                'id': wallet.id,
                'name': wallet.name,
                'balance': float(wallet.balance),
                'currency': wallet.currency,
                'is_shared': True,
                'can_edit': can_edit,
                'owner': {
                    'id': owner.id if owner else None,
                    'username': owner.username if owner else None
                }
            }
        }), 201
        
    except ValueError as e:
        db.session.rollback()
        abort(400, description=str(e))
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error accepting wallet share: {e}")
        abort(500, description="Failed to accept wallet share")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error accepting wallet share: {e}")
        abort(500, description="An error occurred")
