import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
//import { useTheme } from '../contexts/ThemeContext';
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
} from 'lucide-react';
import { cn } from '../lib/utils';
import { notificationsAPI } from '../services/api';
// import ThemeToggle from './ThemeToggle';

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
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
 //const { isDark } = useTheme();
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
    <div className="flex flex-col min-h-screen pb-16 md:pb-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
      {/* Desktop Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-sm md:block hidden sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center space-x-2 group">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Money Keeper</span>
            </Link>

            <div className="ml-6 flex items-center space-x-4">
              <NavLink to="/dashboard" icon={Home} label="Trang chủ" isActive={isActive('/dashboard')} />
              <NavLink to="/expenses" icon={DollarSign} label="Chi tiêu" isActive={isActive('/expenses')} />
              <NavLink to="/wallets" icon={Wallet} label="Ví" isActive={isActive('/wallets')} />
              <NavLink to="/budgets" icon={PieChart} label="Ngân sách" isActive={isActive('/budgets')} />
              <NavLink to="/chat" icon={MessageSquare} label="AI Chat" isActive={isActive('/chat')} />

              {/* Theme Toggle */}
              {/* <ThemeToggle size="small" /> */}

              {/* User Menu */}
              <div className="relative">
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
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-2xl shadow-xl py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg ring-1 ring-black/5 dark:ring-white/10 z-50"
                  >
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>

                    <Link
                      to="/notifications"
                      className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors rounded-lg mx-2"
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
                      className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors rounded-lg mx-2"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Cài đặt</span>
                    </Link>

                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

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
        className="fixed bottom-0 left-0 w-full z-50 md:hidden px-2 pb-2"
      >
        <nav className="glass backdrop-blur-2xl bg-white/90 dark:bg-gray-800/90 rounded-[1.5rem] shadow-2xl border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="grid grid-cols-5 h-16">
            {/* Dashboard */}
            <Link
              to="/dashboard"
              className="flex flex-col items-center justify-center transition-all relative"
            >
              {isActive('/dashboard') ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                    <Home className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Trang chủ</span>
                </motion.div>
              ) : (
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <Home className="h-5 w-5 text-gray-400 dark:text-gray-500" strokeWidth={2} />
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Trang chủ</span>
                </motion.div>
              )}
            </Link>

            {/* Expenses */}
            <Link
              to="/expenses"
              className="flex flex-col items-center justify-center transition-all relative"
            >
              {isActive('/expenses') ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <div className="p-2 bg-gradient-to-br from-pink-600 to-rose-600 rounded-xl shadow-lg">
                    <DollarSign className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">Chi tiêu</span>
                </motion.div>
              ) : (
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <DollarSign className="h-5 w-5 text-gray-400 dark:text-gray-500" strokeWidth={2} />
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Chi tiêu</span>
                </motion.div>
              )}
            </Link>

            {/* Wallets - Center FAB */}
            <Link
              to="/wallets"
              className="flex flex-col items-center justify-center transition-all relative -mt-2"
            >
              {isActive('/wallets') ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="p-3 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 rounded-[1.25rem] shadow-2xl border-2 border-white">
                    <Wallet className="h-6 w-6 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] mt-1 font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Ví</span>
                </motion.div>
              ) : (
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <div className="p-3 bg-white dark:bg-gray-700 rounded-[1.25rem] shadow-xl border-2 border-gray-100 dark:border-gray-600 text-gray-400 dark:text-gray-500">
                    <Wallet className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] mt-1 font-medium text-gray-500 dark:text-gray-400">Ví</span>
                </motion.div>
              )}
            </Link>

            {/* Budgets */}
            <Link
              to="/budgets"
              className="flex flex-col items-center justify-center transition-all relative"
            >
              {isActive('/budgets') ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg">
                    <PieChart className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Ngân sách</span>
                </motion.div>
              ) : (
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <PieChart className="h-5 w-5 text-gray-400 dark:text-gray-500" strokeWidth={2} />
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Ngân sách</span>
                </motion.div>
              )}
            </Link>

            {/* Menu */}
            <div className="flex flex-col items-center justify-center relative">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="flex flex-col items-center justify-center relative w-full h-full"
              >
                {showMobileMenu ? (
                  <motion.div
                    initial={{ scale: 0.8, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div className="p-2 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl shadow-lg">
                      <X className="h-5 w-5 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Đóng</span>
                  </motion.div>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 rounded-xl border border-gray-300 dark:border-gray-500 shadow-sm hover:shadow-md transition-all">
                      <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Menu</span>
                  </motion.div>
                )}
              </button>
            </div>
          </div>
        </nav>
      </motion.div>

      {/* Overlay & Menu Popup */}
      {showMobileMenu && (
        <>
          <div
            className="fixed left-0 right-0 top-0 bottom-16 bg-black/40 dark:bg-black/60 z-[99]"
            onClick={() => setShowMobileMenu(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-0 right-0 bottom-20 mx-auto w-[90vw] max-w-xs z-[101] rounded-3xl glass backdrop-blur-2xl bg-white/95 dark:bg-gray-800/95 shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Info */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{user?.username}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="py-2">
              <Link
                to="/chat"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all mx-2 rounded-2xl group"
              >
                <div className="p-2 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium">Trò chuyện AI</span>
              </Link>
              
              <Link
                to="/notifications"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 transition-all mx-2 rounded-2xl group"
              >
                <div className="p-2 bg-yellow-100 rounded-xl group-hover:bg-yellow-200 transition-colors relative">
                  <Bell className="h-4 w-4 text-yellow-600" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </div>
                <span className="font-medium">Thông báo</span>
              </Link>
              
              <Link
                to="/settings"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 transition-all mx-2 rounded-2xl group"
              >
                <div className="p-2 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-colors">
                  <Settings className="h-4 w-4 text-gray-600" />
                </div>
                <span className="font-medium">Cài đặt</span>
              </Link>
              
              <div className="border-t border-gray-200 my-2 mx-4"></div>
              
              <button
                onClick={() => {
                  logout();
                  setShowMobileMenu(false);
                }}
                className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all mx-2 rounded-2xl group"
              >
                <div className="p-2 bg-red-100 rounded-xl group-hover:bg-red-200 transition-colors">
                  <LogOut className="h-4 w-4 text-red-600" />
                </div>
                <span className="font-medium">Đăng xuất</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Layout;
