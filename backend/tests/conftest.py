"""
Pytest configuration and fixtures
"""

import pytest
from app import create_app, db
from app.models import User, Wallet, Category
from app.api.categories import DEFAULT_CATEGORIES


@pytest.fixture(scope='session')
def app():
    """Create application for testing"""
    app = create_app()
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'WTF_CSRF_ENABLED': False,
        'SECRET_KEY': 'test-secret-key'
    })
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture(scope='function')
def db_session(app):
    """Create database session for test"""
    with app.app_context():
        db.session.begin_nested()
        yield db.session
        db.session.rollback()
        db.session.close()


@pytest.fixture
def test_user(app):
    """Create a test user"""
    with app.app_context():
        user = User(username='testuser', email='test@example.com')
        user.set_password('TestPass123')
        db.session.add(user)
        db.session.commit()
        
        # Create default wallet
        wallet = Wallet(
            name='Test Wallet',
            balance=1000000,
            user_id=user.id,
            is_default=True
        )
        db.session.add(wallet)
        
        # Create default categories
        for cat_data in DEFAULT_CATEGORIES:
            category = Category(
                user_id=user.id,
                name=cat_data['name'],
                slug=cat_data['slug'],
                icon=cat_data['icon'],
                color=cat_data['color'],
                is_default=True
            )
            db.session.add(category)
        
        db.session.commit()
        
        yield user
        
        # Cleanup
        db.session.delete(user)
        db.session.commit()


@pytest.fixture
def auth_client(client, test_user):
    """Create authenticated test client"""
    with client:
        client.post('/auth/login', data={
            'username': test_user.username,
            'password': 'TestPass123'
        })
        yield client

