"""
API endpoints for custom category management
"""

from flask import jsonify, request, abort
from flask_login import login_required, current_user
from app.api import bp
from app.models import Category
from app import db
from app.security import sanitize_string
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
import logging
import re

logger = logging.getLogger(__name__)

# Default categories to seed for new users
DEFAULT_CATEGORIES = [
    {'name': 'Ăn uống', 'slug': 'food', 'icon': '🍔', 'color': 'from-orange-400 to-red-500'},
    {'name': 'Di chuyển', 'slug': 'transport', 'icon': '🚗', 'color': 'from-blue-400 to-cyan-500'},
    {'name': 'Mua sắm', 'slug': 'shopping', 'icon': '🛍️', 'color': 'from-pink-400 to-rose-500'},
    {'name': 'Giải trí', 'slug': 'entertainment', 'icon': '🎮', 'color': 'from-purple-400 to-indigo-500'},
    {'name': 'Sức khỏe', 'slug': 'health', 'icon': '💊', 'color': 'from-green-400 to-emerald-500'},
    {'name': 'Giáo dục', 'slug': 'education', 'icon': '📚', 'color': 'from-yellow-400 to-amber-500'},
    {'name': 'Tiện ích', 'slug': 'utilities', 'icon': '💡', 'color': 'from-teal-400 to-cyan-500'},
    {'name': 'Khác', 'slug': 'other', 'icon': '📦', 'color': 'from-gray-400 to-slate-500'},
]


def init_default_categories(user_id):
    """Initialize default categories for a new user"""
    try:
        for cat_data in DEFAULT_CATEGORIES:
            category = Category(
                user_id=user_id,
                name=cat_data['name'],
                slug=cat_data['slug'],
                icon=cat_data['icon'],
                color=cat_data['color'],
                is_default=True
            )
            db.session.add(category)
        db.session.commit()
        logger.info(f"Initialized default categories for user {user_id}")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error initializing default categories: {e}")


@bp.route('/categories', methods=['GET'])
@login_required
def get_categories():
    """Get all categories for current user"""
    try:
        # Check if user has categories, if not, initialize defaults
        if current_user.categories.count() == 0:
            init_default_categories(current_user.id)
        
        categories = Category.query.filter_by(user_id=current_user.id).order_by(Category.created_at).all()
        
        return jsonify({
            'categories': [{
                'id': cat.id,
                'name': cat.name,
                'slug': cat.slug,
                'icon': cat.icon,
                'color': cat.color,
                'is_default': cat.is_default,
                'created_at': cat.created_at.isoformat() if cat.created_at else None
            } for cat in categories]
        }), 200
    except SQLAlchemyError as e:
        logger.exception(f"Database error fetching categories: {e}")
        abort(500, description="Failed to fetch categories")


@bp.route('/categories', methods=['POST'])
@login_required
def create_category():
    """Create a new custom category"""
    try:
        data = request.get_json()
        
        if not data.get('name'):
            abort(400, description="Category name is required")
        
        if not data.get('slug'):
            abort(400, description="Category slug is required")
        
        # Validate and sanitize inputs
        name = sanitize_string(data['name'], max_length=50)
        slug = sanitize_string(data['slug'], max_length=50).lower()
        icon = data.get('icon', '📦')
        color = sanitize_string(data.get('color', 'gray'), max_length=50)
        
        # Validate slug format (alphanumeric and hyphens only)
        if not re.match(r'^[a-z0-9\-_]+$', slug):
            abort(400, description="Slug must contain only lowercase letters, numbers, hyphens, and underscores")
        
        # Check if category with this slug already exists for user
        existing = Category.query.filter_by(user_id=current_user.id, slug=slug).first()
        if existing:
            abort(400, description="Category with this slug already exists")
        
        # Create category
        category = Category(
            user_id=current_user.id,
            name=name,
            slug=slug,
            icon=icon,
            color=color,
            is_default=False
        )
        
        db.session.add(category)
        db.session.commit()
        
        logger.info(f"Created category {slug} for user {current_user.id}")
        
        return jsonify({
            'category': {
                'id': category.id,
                'name': category.name,
                'slug': category.slug,
                'icon': category.icon,
                'color': category.color,
                'is_default': category.is_default
            }
        }), 201
    except IntegrityError:
        db.session.rollback()
        abort(400, description="Category with this slug already exists")
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error creating category: {e}")
        abort(500, description="Failed to create category")


@bp.route('/categories/<int:category_id>', methods=['PUT'])
@login_required
def update_category(category_id):
    """Update a category"""
    try:
        category = Category.query.filter_by(id=category_id, user_id=current_user.id).first()
        
        if not category:
            abort(404, description="Category not found")
        
        data = request.get_json()
        
        # Update fields if provided
        if 'name' in data:
            category.name = sanitize_string(data['name'], max_length=50)
        
        if 'icon' in data:
            category.icon = data['icon']
        
        if 'color' in data:
            category.color = sanitize_string(data['color'], max_length=50)
        
        # Don't allow updating slug or is_default after creation
        
        db.session.commit()
        
        logger.info(f"Updated category {category.slug} for user {current_user.id}")
        
        return jsonify({
            'category': {
                'id': category.id,
                'name': category.name,
                'slug': category.slug,
                'icon': category.icon,
                'color': category.color,
                'is_default': category.is_default
            }
        }), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error updating category: {e}")
        abort(500, description="Failed to update category")


@bp.route('/categories/<int:category_id>', methods=['DELETE'])
@login_required
def delete_category(category_id):
    """Delete a category (only non-default categories)"""
    try:
        category = Category.query.filter_by(id=category_id, user_id=current_user.id).first()
        
        if not category:
            abort(404, description="Category not found")
        
        # Don't allow deleting default categories
        if category.is_default:
            abort(400, description="Cannot delete default categories")
        
        # TODO: Optionally migrate existing expenses to 'other' category
        # For now, we'll just delete the category
        db.session.delete(category)
        db.session.commit()
        
        logger.info(f"Deleted category {category.slug} for user {current_user.id}")
        
        return jsonify({'success': True}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception(f"Database error deleting category: {e}")
        abort(500, description="Failed to delete category")

