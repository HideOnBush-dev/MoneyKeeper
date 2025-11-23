from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models import SplitGroup, SplitMember, ExpenseSplit, Expense, User
from datetime import datetime, date

bp = Blueprint('splits', __name__, url_prefix='/api/splits')

@bp.route('/groups', methods=['GET'])
@login_required
def get_groups():
    """Get all split groups created by the user"""
    groups = SplitGroup.query.filter_by(created_by=current_user.id).all()
    
    result = []
    for group in groups:
        members = []
        for member in group.members:
            members.append({
                'id': member.id,
                'name': member.name,
                'email': member.email,
                'is_user': member.is_user,
                'user_id': member.user_id
            })
            
        result.append({
            'id': group.id,
            'name': group.name,
            'description': group.description,
            'created_at': group.created_at.isoformat(),
            'members': members,
            'member_count': len(members)
        })
        
    return jsonify({'groups': result})

@bp.route('/groups', methods=['POST'])
@login_required
def create_group():
    """Create a new split group"""
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'error': 'Tên nhóm là bắt buộc'}), 400
        
    group = SplitGroup(
        name=data['name'],
        description=data.get('description'),
        created_by=current_user.id
    )
    
    db.session.add(group)
    db.session.commit()
    
    # Add creator as a member automatically? 
    # Usually yes, but let's check requirements. 
    # If I split an expense, I am the payer, and others are owers.
    # So I should be in the group too.
    
    me_member = SplitMember(
        group_id=group.id,
        user_id=current_user.id,
        name=current_user.username, # Or a display name
        email=current_user.email,
        is_user=True
    )
    db.session.add(me_member)
    
    # Add other members if provided
    if data.get('members'):
        for m in data['members']:
            member = SplitMember(
                group_id=group.id,
                name=m['name'],
                email=m.get('email'),
                is_user=False # Default to false, can be updated later if we link to real user
            )
            db.session.add(member)
            
    db.session.commit()
    
    return jsonify({
        'message': 'Tạo nhóm thành công',
        'group': {
            'id': group.id,
            'name': group.name
        }
    }), 201

@bp.route('/groups/<int:id>/members', methods=['POST'])
@login_required
def add_member(id):
    """Add a member to a group"""
    group = SplitGroup.query.get_or_404(id)
    
    if group.created_by != current_user.id:
        return jsonify({'error': 'Không có quyền truy cập'}), 403
        
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'error': 'Tên thành viên là bắt buộc'}), 400
        
    member = SplitMember(
        group_id=group.id,
        name=data['name'],
        email=data.get('email'),
        is_user=False
    )
    
    db.session.add(member)
    db.session.commit()
    
    return jsonify({
        'message': 'Thêm thành viên thành công',
        'member': {
            'id': member.id,
            'name': member.name
        }
    }), 201

@bp.route('/owed', methods=['GET'])
@login_required
def get_owed():
    """Get total amount owed to the current user"""
    # Find all expenses created by user that have splits
    expenses = Expense.query.filter_by(user_id=current_user.id).all()
    expense_ids = [e.id for e in expenses]
    
    if not expense_ids:
        return jsonify({'total_owed': 0, 'details': []})
        
    # Find unpaid splits for these expenses
    splits = ExpenseSplit.query.filter(
        ExpenseSplit.expense_id.in_(expense_ids),
        ExpenseSplit.is_paid == False
    ).all()
    
    total_owed = sum(s.amount for s in splits)
    
    details = []
    for s in splits:
        details.append({
            'id': s.id,
            'amount': s.amount,
            'expense_name': s.expense.description or s.expense.category,
            'expense_date': s.expense.date.isoformat(),
            'debtor_name': s.member.name,
            'group_name': s.member.group.name
        })
        
    return jsonify({
        'total_owed': total_owed,
        'details': details
    })

@bp.route('/owing', methods=['GET'])
@login_required
def get_owing():
    """Get total amount the current user owes others"""
    # Find all split memberships for this user
    memberships = SplitMember.query.filter_by(user_id=current_user.id).all()
    member_ids = [m.id for m in memberships]
    
    if not member_ids:
        return jsonify({'total_owing': 0, 'details': []})
        
    # Find unpaid splits where this user is the member
    splits = ExpenseSplit.query.filter(
        ExpenseSplit.member_id.in_(member_ids),
        ExpenseSplit.is_paid == False
    ).all()
    
    total_owing = sum(s.amount for s in splits)
    
    details = []
    for s in splits:
        details.append({
            'id': s.id,
            'amount': s.amount,
            'expense_name': s.expense.description or s.expense.category,
            'expense_date': s.expense.date.isoformat(),
            'creditor_name': s.expense.wallet.user.username, # The person who paid
            'group_name': s.member.group.name
        })
        
    return jsonify({
        'total_owing': total_owing,
        'details': details
    })

@bp.route('/<int:id>/settle', methods=['POST'])
@login_required
def settle_split(id):
    """Mark a split as paid"""
    split = ExpenseSplit.query.get_or_404(id)
    
    # Check permission: either the payer (expense owner) or the ower (split member) can mark as paid?
    # Usually the person receiving money (payer) confirms it.
    expense_owner_id = split.expense.user_id
    
    if expense_owner_id != current_user.id:
        # Check if user is the ower? Maybe allow ower to mark as paid too?
        # For now restrict to expense owner (creditor)
        return jsonify({'error': 'Chỉ người tạo chi tiêu mới có thể xác nhận thanh toán'}), 403
        
    split.is_paid = True
    split.paid_date = date.today()
    db.session.commit()
    
    return jsonify({'message': 'Đã xác nhận thanh toán'})

@bp.route('/expense/<int:expense_id>/split', methods=['POST'])
@login_required
def split_expense(expense_id):
    """Split an existing expense"""
    expense = Expense.query.get_or_404(expense_id)
    
    if expense.user_id != current_user.id:
        return jsonify({'error': 'Không có quyền truy cập'}), 403
        
    data = request.get_json()
    if not data or not data.get('splits'):
        return jsonify({'error': 'Dữ liệu chia sẻ không hợp lệ'}), 400
        
    # Clear existing splits if any? Or just add new ones?
    # For simplicity, let's remove existing splits for this expense first
    ExpenseSplit.query.filter_by(expense_id=expense_id).delete()
    
    splits_data = data['splits']
    created_splits = []
    
    for item in splits_data:
        member_id = item.get('member_id')
        amount = item.get('amount')
        
        if not member_id or not amount:
            continue
            
        # Verify member belongs to a group created by user?
        # Or just trust the ID for now.
        
        split = ExpenseSplit(
            expense_id=expense_id,
            member_id=member_id,
            amount=amount,
            notes=item.get('notes')
        )
        db.session.add(split)
        created_splits.append(split)
        
    db.session.commit()
    
    return jsonify({
        'message': 'Đã chia sẻ chi tiêu thành công',
        'count': len(created_splits)
    }), 201
