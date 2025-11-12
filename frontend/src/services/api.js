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
  getSessions: () => api.get('/api/chat/sessions'),
  
  // Create new session
  createSession: (personality = 'friendly') => 
    api.post('/api/chat/sessions', { action: 'create', personality }),
  
  // Clear chat history
  clearHistory: () => 
    api.post('/api/chat/sessions', { action: 'clear' }),
  
  // Get chat history
  getHistory: (sessionId) => 
    api.get(`/api/chat/sessions/${sessionId}/messages`),
};

export default api;
