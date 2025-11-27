"""
Tests for expenses API endpoints
"""

import pytest
from datetime import datetime


class TestExpensesAPI:
    """Test expense CRUD operations"""
    
    def test_create_expense_success(self, auth_client, test_user):
        """Test creating a new expense"""
        response = auth_client.post('/api/expenses', json={
            'amount': 50000,
            'category': 'food',
            'description': 'Lunch at restaurant',
            'wallet_id': test_user.wallets.first().id,
            'is_expense': True,
            'date': datetime.now().isoformat()
        })
        
        assert response.status_code == 201
        data = response.get_json()
        assert 'expense' in data
        assert data['expense']['amount'] == 50000
        assert data['expense']['category'] == 'food'
    
    def test_create_expense_missing_amount(self, auth_client, test_user):
        """Test creating expense without amount fails"""
        response = auth_client.post('/api/expenses', json={
            'category': 'food',
            'wallet_id': test_user.wallets.first().id
        })
        
        assert response.status_code == 400
    
    def test_create_expense_invalid_wallet(self, auth_client):
        """Test creating expense with invalid wallet fails"""
        response = auth_client.post('/api/expenses', json={
            'amount': 50000,
            'category': 'food',
            'wallet_id': 99999,
            'is_expense': True
        })
        
        assert response.status_code == 404
    
    def test_get_expenses_list(self, auth_client, test_user):
        """Test getting list of expenses"""
        # Create test expense first
        wallet = test_user.wallets.first()
        auth_client.post('/api/expenses', json={
            'amount': 50000,
            'category': 'food',
            'wallet_id': wallet.id,
            'is_expense': True
        })
        
        response = auth_client.get('/api/expenses')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'expenses' in data
        assert len(data['expenses']) > 0
    
    def test_get_expenses_with_filters(self, auth_client, test_user):
        """Test getting expenses with category filter"""
        wallet = test_user.wallets.first()
        
        # Create expenses
        auth_client.post('/api/expenses', json={
            'amount': 50000,
            'category': 'food',
            'wallet_id': wallet.id,
            'is_expense': True
        })
        
        auth_client.post('/api/expenses', json={
            'amount': 100000,
            'category': 'transport',
            'wallet_id': wallet.id,
            'is_expense': True
        })
        
        # Filter by category
        response = auth_client.get('/api/expenses/search?category=food')
        
        assert response.status_code == 200
        data = response.get_json()
        assert all(e['category'] == 'food' for e in data['expenses'])
    
    def test_update_expense(self, auth_client, test_user):
        """Test updating an expense"""
        wallet = test_user.wallets.first()
        
        # Create expense
        create_response = auth_client.post('/api/expenses', json={
            'amount': 50000,
            'category': 'food',
            'wallet_id': wallet.id,
            'is_expense': True
        })
        
        expense_id = create_response.get_json()['expense']['id']
        
        # Update expense
        update_response = auth_client.put(f'/api/expenses/{expense_id}', json={
            'amount': 75000,
            'description': 'Updated lunch'
        })
        
        assert update_response.status_code == 200
        data = update_response.get_json()
        assert data['expense']['amount'] == 75000
        assert data['expense']['description'] == 'Updated lunch'
    
    def test_delete_expense(self, auth_client, test_user):
        """Test deleting an expense"""
        wallet = test_user.wallets.first()
        
        # Create expense
        create_response = auth_client.post('/api/expenses', json={
            'amount': 50000,
            'category': 'food',
            'wallet_id': wallet.id,
            'is_expense': True
        })
        
        expense_id = create_response.get_json()['expense']['id']
        
        # Delete expense
        delete_response = auth_client.delete(f'/api/expenses/{expense_id}')
        
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        get_response = auth_client.get(f'/api/expenses/{expense_id}')
        assert get_response.status_code == 404
    
    def test_unauthorized_access(self, client):
        """Test that unauthenticated requests are rejected"""
        response = client.get('/api/expenses')
        assert response.status_code == 401

