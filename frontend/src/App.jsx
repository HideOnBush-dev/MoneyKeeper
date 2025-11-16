import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import AddExpense from './pages/AddExpense';
import Wallets from './pages/Wallets';
import Budgets from './pages/Budgets';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Goals from './pages/Goals';
import Recurring from './pages/Recurring';
import AddRecurring from './pages/AddRecurring';
import Landing from './pages/Landing';

// Loading Screen Component (simplified animations)
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen gradient-bg">
    <div className="text-center">
      <div className="inline-flex p-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl shadow-2xl mb-4">
        <Wallet className="h-12 w-12 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gradient">
        Money Keeper
      </h2>
      <p className="text-gray-600 mt-2">
        Đang tải...
      </p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return user ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return !user ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ToastProvider>
          <Router>
            <Routes>
          {/* Public Routes */}
            <Route
            path="/"
            element={
              <PublicRoute>
                <Landing />
              </PublicRoute>
            }
          />
            <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
            <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
            <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
            <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <Layout>
                  <Expenses />
                </Layout>
              </ProtectedRoute>
            }
          />
            <Route
            path="/expenses/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <AddExpense />
                </Layout>
              </ProtectedRoute>
            }
          />
            <Route
            path="/wallets"
            element={
              <ProtectedRoute>
                <Layout>
                  <Wallets />
                </Layout>
              </ProtectedRoute>
            }
          />
            <Route
            path="/budgets"
            element={
              <ProtectedRoute>
                <Layout>
                  <Budgets />
                </Layout>
              </ProtectedRoute>
            }
          />
            <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Layout>
                  <Chat />
                </Layout>
              </ProtectedRoute>
            }
          />
            <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
            <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Layout>
                  <Notifications />
                </Layout>
              </ProtectedRoute>
            }
          />
            <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <Layout>
                  <Goals />
                </Layout>
              </ProtectedRoute>
            }
          />
            <Route
            path="/recurring"
            element={
              <ProtectedRoute>
                <Layout>
                  <Recurring />
                </Layout>
              </ProtectedRoute>
            }
          />
            <Route
            path="/recurring/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <AddRecurring />
                </Layout>
              </ProtectedRoute>
            }
          />
            <Route
            path="/recurring/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <AddRecurring />
                </Layout>
              </ProtectedRoute>
            }
          />
            </Routes>
          </Router>
        </ToastProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
