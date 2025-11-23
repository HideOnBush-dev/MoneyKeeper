import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Wallet,
  TrendingUp,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  DollarSign,
  PieChart,
  Target,
  Repeat,
  CreditCard,
  Users,
  ChevronDown,
  Plus,
  Scan,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { notificationsAPI } from '../services/api';

// NavLink component with icon
const NavLink = ({ to, icon: Icon, label, isActive }) => (
  <Link to={to}>
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all',
        isActive
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm">{label}</span>
    </motion.div>
  </Link>
);

const Layout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    let active = true;
    const loadCount = async () => {
      try {
        const { data } = await notificationsAPI.unreadCount();
        if (active) setUnreadNotifications(data?.unread || 0);
      } catch {
        // ignore
      }
    };
    loadCount();
    const id = setInterval(loadCount, 60000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Desktop Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-slate-700 shadow-sm md:block hidden sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center space-x-2 group">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Money Keeper</span>
            </Link>

            <div className="ml-6 flex items-center space-x-2">
              <NavLink to="/dashboard" icon={Home} label="Trang chủ" isActive={isActive('/dashboard')} />
              <NavLink to="/expenses" icon={DollarSign} label="Chi tiêu" isActive={isActive('/expenses')} />
              <NavLink to="/wallets" icon={Wallet} label="Ví" isActive={isActive('/wallets')} />
              <NavLink to="/budgets" icon={PieChart} label="Ngân sách" isActive={isActive('/budgets')} />

              {/* Utilities Dropdown */}
              <div className="relative group">
                <button className="flex items-center space-x-1 px-4 py-2 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
                  <span className="text-sm">Tiện ích</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                <div className="absolute left-0 mt-2 w-48 rounded-2xl shadow-xl py-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg ring-1 ring-black dark:ring-slate-700 ring-opacity-5 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all transform origin-top-left z-50">
                  <Link to="/goals" className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors rounded-lg mx-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span>Mục tiêu</span>
                  </Link>
                  <Link to="/recurring" className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors rounded-lg mx-2">
                    <Repeat className="h-4 w-4 text-purple-600" />
                    <span>Định kỳ</span>
                  </Link>
                  <Link to="/bills" className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors rounded-lg mx-2">
                    <Bell className="h-4 w-4 text-indigo-600" />
                    <span>Hóa đơn</span>
                  </Link>
                  <Link to="/debts" className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-slate-700 transition-colors rounded-lg mx-2">
                    <CreditCard className="h-4 w-4 text-red-600" />
                    <span>Quản lý nợ</span>
                  </Link>
                  <Link to="/splits" className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-slate-700 transition-colors rounded-lg mx-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <span>Chia tiền</span>
                  </Link>
                  <Link to="/scan" className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors rounded-lg mx-2">
                    <Scan className="h-4 w-4 text-purple-600" />
                    <span>Quét QR</span>
                  </Link>
                </div>
              </div>

              <NavLink to="/chat" icon={MessageSquare} label="AI Chat" isActive={isActive('/chat')} />

              {/* User Menu */}
              <div className="ml-6 relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg transition-all"
                >
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium hidden lg:block">{user?.username}</span>
                </motion.button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="origin-top-right absolute right-0 mt-2 w-56 rounded-2xl shadow-xl py-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg ring-1 ring-black dark:ring-slate-700 ring-opacity-5 z-50"
                    >
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                      </div>

                      <Link
                        to="/notifications"
                        className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors rounded-lg mx-2"
                      >
                        <Bell className="h-4 w-4" />
                        <span>Thông báo</span>
                        {unreadNotifications > 0 && (
                          <span className="ml-auto bg-red-500 text-white py-0.5 px-2 rounded-full text-xs font-medium">
                            {unreadNotifications}
                          </span>
                        )}
                      </Link>

                      <Link
                        to="/settings"
                        className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors rounded-lg mx-2"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Cài đặt</span>
                      </Link>

                      <div className="border-t border-gray-200 dark:border-slate-700 my-2"></div>

                      <button
                        onClick={logout}
                        className="flex items-center space-x-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-lg mx-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 mx-auto w-full py-10 px-4 sm:px-6 lg:px-8"
      >
        {children}
      </motion.main>

      {/* Mobile Bottom Navigation */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:hidden"
      >
        <nav className="glass backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-2xl border border-white/30 dark:border-slate-700/30 px-2">
          <div className="grid grid-cols-5 h-16 items-center">
            {/* Dashboard */}
            <Link
              to="/dashboard"
              className="flex flex-col items-center justify-center transition-all relative h-full group"
            >
              <div className="relative flex flex-col items-center justify-center">
                <Home
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    isActive('/dashboard')
                      ? "text-blue-600 dark:text-blue-400 scale-110"
                      : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                  )}
                  strokeWidth={isActive('/dashboard') ? 2.5 : 2}
                />
                {isActive('/dashboard') && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-3 w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full shadow-lg shadow-blue-600/50"
                  />
                )}
              </div>
            </Link>

            {/* Expenses */}
            <Link
              to="/expenses"
              className="flex flex-col items-center justify-center transition-all relative h-full group"
            >
              <div className="relative flex flex-col items-center justify-center">
                <DollarSign
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    isActive('/expenses')
                      ? "text-pink-600 dark:text-pink-400 scale-110"
                      : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                  )}
                  strokeWidth={isActive('/expenses') ? 2.5 : 2}
                />
                {isActive('/expenses') && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-3 w-1.5 h-1.5 bg-pink-600 dark:bg-pink-400 rounded-full shadow-lg shadow-pink-600/50"
                  />
                )}
              </div>
            </Link>

            {/* Add Transaction - Center FAB */}
            <Link
              to="/expenses/new"
              className="flex flex-col items-center justify-center transition-all relative -mt-8"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center justify-center h-16 w-16 rounded-full shadow-2xl border-[6px] border-slate-50 dark:border-slate-900 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600"
              >
                <Plus
                  className="h-8 w-8 text-white"
                  strokeWidth={3}
                />
              </motion.div>
            </Link>

            {/* Wallets */}
            <Link
              to="/wallets"
              className="flex flex-col items-center justify-center transition-all relative h-full group"
            >
              <div className="relative flex flex-col items-center justify-center">
                <Wallet
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    isActive('/wallets')
                      ? "text-cyan-600 dark:text-cyan-400 scale-110"
                      : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                  )}
                  strokeWidth={isActive('/wallets') ? 2.5 : 2}
                />
                {isActive('/wallets') && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-3 w-1.5 h-1.5 bg-cyan-600 dark:bg-cyan-400 rounded-full shadow-lg shadow-cyan-600/50"
                  />
                )}
              </div>
            </Link>

            {/* Menu */}
            <div className="flex flex-col items-center justify-center relative h-full">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="flex flex-col items-center justify-center relative w-full h-full group"
              >
                <div className="relative flex flex-col items-center justify-center">
                  {showMobileMenu ? (
                    <X className="h-6 w-6 text-gray-800 dark:text-gray-200" strokeWidth={2.5} />
                  ) : (
                    <Menu className="h-6 w-6 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300" strokeWidth={2} />
                  )}
                </div>
              </button>
            </div>
          </div>
        </nav>
      </motion.div>

      {/* Overlay & Menu Popup */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[99]"
              onClick={() => setShowMobileMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-4 right-4 bottom-24 mx-auto max-w-sm z-[101] rounded-3xl glass backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 shadow-2xl border border-white/20 dark:border-slate-700/20 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle */}
              <div className="w-full flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
              </div>

              {/* User Info */}
              <div className="p-4 flex flex-col items-center text-center border-b border-gray-100 dark:border-slate-800">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-3">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{user?.username}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>

              {/* Grid Menu */}
              <div className="p-4 grid grid-cols-3 gap-4">
                <Link
                  to="/budgets"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                    <PieChart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Ngân sách</span>
                </Link>

                <Link
                  to="/goals"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                    <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Mục tiêu</span>
                </Link>

                <Link
                  to="/recurring"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                    <Repeat className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Định kỳ</span>
                </Link>

                <Link
                  to="/bills"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                    <Bell className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Hóa đơn</span>
                </Link>

                <Link
                  to="/debts"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                    <CreditCard className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Quản lý nợ</span>
                </Link>

                <Link
                  to="/splits"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                    <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Chia tiền</span>
                </Link>

                <Link
                  to="/scan"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                    <Scan className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Quét QR</span>
                </Link>

                <Link
                  to="/chat"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                    <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">AI Chat</span>
                </Link>

                <Link
                  to="/notifications"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl group-hover:bg-yellow-100 dark:group-hover:bg-yellow-900/30 transition-colors relative">
                    <Bell className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">
                        {unreadNotifications}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Thông báo</span>
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl group-hover:bg-gray-100 dark:group-hover:bg-slate-700 transition-colors">
                    <Settings className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Cài đặt</span>
                </Link>

                <button
                  onClick={() => {
                    logout();
                    setShowMobileMenu(false);
                  }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                    <LogOut className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">Đăng xuất</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div >
  );
};

export default Layout;
