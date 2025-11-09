import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0">
      {/* Desktop Navigation */}
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-md md:block hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center">
              <span className="text-xl font-bold text-white tracking-tight">Money Keeper</span>
            </Link>

            <div className="ml-6 flex items-center space-x-6">
              <Link
                to="/dashboard"
                className="text-gray-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Trang chủ
              </Link>
              <Link
                to="/expenses"
                className="text-gray-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Chi tiêu
              </Link>
              <Link
                to="/wallets"
                className="text-gray-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Ví
              </Link>
              <Link
                to="/budgets"
                className="text-gray-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Ngân sách
              </Link>
              <Link
                to="/chat"
                className="text-gray-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Trò chuyện
              </Link>

              {/* User Menu */}
              <div className="ml-3 relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center max-w-xs rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>

                    <Link
                      to="/notifications"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Thông báo
                      {unreadNotifications > 0 && (
                        <span className="ml-auto bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                          {unreadNotifications}
                        </span>
                      )}
                    </Link>

                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Cài đặt
                    </Link>

                    <div className="border-t border-gray-100"></div>

                    <button
                      onClick={logout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full py-10 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50 md:hidden">
        <div className="grid grid-cols-5 h-16">
          <Link
            to="/dashboard"
            className={`flex flex-col items-center justify-center ${
              isActive('/dashboard') ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-xs mt-1 font-medium">Trang chủ</span>
          </Link>

          <Link
            to="/expenses"
            className={`flex flex-col items-center justify-center ${
              isActive('/expenses') ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs mt-1 font-medium">Chi tiêu</span>
          </Link>

          <Link
            to="/wallets"
            className={`flex flex-col items-center justify-center ${
              isActive('/wallets') ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 6H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2z"
              />
            </svg>
            <span className="text-xs mt-1 font-medium">Ví</span>
          </Link>

          <Link
            to="/budgets"
            className={`flex flex-col items-center justify-center ${
              isActive('/budgets') ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="text-xs mt-1 font-medium">Ngân sách</span>
          </Link>

          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="flex flex-col items-center justify-center relative text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <span className="text-xs mt-1 font-medium">Thêm</span>

            {showMobileMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="py-1">
                  <Link
                    to="/chat"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Trò chuyện AI
                  </Link>
                  <Link
                    to="/notifications"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Thông báo
                    {unreadNotifications > 0 && (
                      <span className="ml-auto bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                        {unreadNotifications}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Cài đặt
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={logout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
