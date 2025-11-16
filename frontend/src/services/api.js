import axios from 'axios';
import { notify } from './notify';

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Global error interceptor -> toast
api.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const status = error?.response?.status;
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Đã xảy ra lỗi. Vui lòng thử lại.';
      // Avoid spamming for 401 on /auth/me initial check; still notify for others
      const url = error?.config?.url || '';
      const skip = status === 401 && url.includes('/auth/me');
      if (!skip) {
        notify({ type: 'error', message: msg });
      }
    } catch {
      // noop
    }
    return Promise.reject(error);
  }
);

// Wallet API
export const walletAPI = {
  // Get all wallets
  getAll: () => api.get('/wallets'),

  // Get wallet by ID with statistics
  getById: (id) => api.get(`/wallets/${id}`),

  // Create new wallet
  create: (data) => api.post('/wallets', data),

  // Update wallet
  update: (id, data) => api.put(`/wallets/${id}`, data),

  // Delete wallet
  delete: (id) => api.delete(`/wallets/${id}`),

  // Get wallet transactions
  getTransactions: (id, params) => api.get(`/wallets/${id}/transactions`, { params }),

  // Transfer between wallets
  transfer: (data) => api.post('/wallets/transfer', data),
};

// Budget API
export const budgetAPI = {
  // Get all budgets
  getAll: () => api.get('/budgets'),

  // Get current month budgets
  getCurrent: (params) => api.get('/budgets/current', { params }),

  // Get budget by ID
  getById: (id) => api.get(`/budgets/${id}`),

  // Create new budget
  create: (data) => api.post('/budgets', data),

  // Update budget
  update: (id, data) => api.put(`/budgets/${id}`, data),

  // Delete budget
  delete: (id) => api.delete(`/budgets/${id}`),

  // Get budget alerts
  getAlerts: (params) => api.get('/budgets/alerts', { params }),

  // Get budget statistics
  getStatistics: (params) => api.get('/budgets/statistics', { params }),
};

// Expense API
export const expenseAPI = {
  // Get all expenses
  getAll: (params) => api.get('/expenses', { params }),

  // Search expenses
  search: (params) => api.get('/expenses/search', { params }),

  // Get expense by ID
  getById: (id) => api.get(`/expenses/${id}`),

  // Create new expense
  create: (data) => api.post('/expenses', data),

  // Update expense
  update: (id, data) => api.put(`/expenses/${id}`, data),

  // Delete expense
  delete: (id) => api.delete(`/expenses/${id}`),

  // Bulk delete expenses
  bulkDelete: (ids) => api.post('/expenses/bulk-delete', { expense_ids: ids }),

  // Get expense statistics
  getStatistics: (params) => api.get('/expenses/statistics', { params }),

  // Get expense trends
  getTrends: (params) => api.get('/expenses/trends', { params }),

  // Export expenses CSV
  exportCSV: (params) => api.get('/expenses/export', { params, responseType: 'blob' }),

  // Import expenses CSV
  importCSV: (formData) => api.post('/expenses/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Report API
export const reportAPI = {
  // Get monthly report
  getMonthly: (params) => api.get('/reports/monthly', { params }),

  // Get yearly report
  getYearly: (params) => api.get('/reports/yearly', { params }),

  // Get comparison report
  getComparison: (params) => api.get('/reports/comparison', { params }),

  // Get category report
  getCategory: (category, params) => api.get(`/reports/category/${category}`, { params }),
};

// Dashboard API
export const dashboardAPI = {
  getDashboard: () => api.get('/dashboard'),
};

// Auth API
export const authAPI = {
  me: () => api.get('/auth/me'),
};

// Chat API
export const chatAPI = {
  // Get chat sessions
  getSessions: () => api.get('/chat/sessions'),
  
  // Create new session
  createSession: (personality = 'friendly') => 
    api.post('/chat/sessions', { action: 'new', personality }),
  
  // Clear chat history
  // (Not supported in backend; use deleteSession per session)
  
  // Get chat history
  getHistory: (sessionId) => 
    api.get(`/chat/sessions/${sessionId}/messages`),
  
  // Delete a session
  deleteSession: (sessionId) =>
    api.post('/chat/sessions', { action: 'delete', session_id: sessionId }),

  // Update a session (e.g., personality or touch updated_at)
  updateSession: (sessionId, payload = {}) =>
    api.post('/chat/sessions', { action: 'update', session_id: sessionId, ...payload }),
};

// Notifications API
export const notificationsAPI = {
  // List notifications
  list: (params) => api.get('/notifications', { params }),
  // Unread count
  unreadCount: () => api.get('/notifications/unread_count'),
  // Mark as read
  markRead: (id) => api.post(`/notifications/mark_read/${id}`),
};

// Categories API
export const categoriesAPI = {
  // Get all categories
  getAll: () => api.get('/categories'),
  // Create new category
  create: (data) => api.post('/categories', data),
  // Update category
  update: (id, data) => api.put(`/categories/${id}`, data),
  // Delete category
  delete: (id) => api.delete(`/categories/${id}`),
};

// Goals API
export const goalsAPI = {
  // Get all goals
  getAll: () => api.get('/goals'),
  
  // Get active goals (not achieved)
  getActive: () => api.get('/goals/active'),
  
  // Get goal by ID
  getById: (id) => api.get(`/goals/${id}`),
  
  // Create new goal
  create: (data) => api.post('/goals', data),
  
  // Update goal
  update: (id, data) => api.put(`/goals/${id}`, data),
  
  // Delete goal
  delete: (id) => api.delete(`/goals/${id}`),
  
  // Add amount to goal
  addAmount: (id, amount) => api.post(`/goals/${id}/add`, { amount }),
  
  // Get goal progress
  getProgress: (id) => api.get(`/goals/${id}/progress`),
};

// Recurring Transactions API
export const recurringAPI = {
  // Get all recurring transactions
  getAll: () => api.get('/recurring'),
  
  // Get upcoming recurring (next 7 days)
  getUpcoming: () => api.get('/recurring/upcoming'),
  
  // Get by ID
  getById: (id) => api.get(`/recurring/${id}`),
  
  // Create new recurring transaction
  create: (data) => api.post('/recurring', data),
  
  // Update recurring transaction
  update: (id, data) => api.put(`/recurring/${id}`, data),
  
  // Delete recurring transaction
  delete: (id) => api.delete(`/recurring/${id}`),
  
  // Skip current due date
  skip: (id) => api.post(`/recurring/${id}/skip`),
  
  // Execute immediately
  execute: (id) => api.post(`/recurring/${id}/execute`),
};

export default api;
