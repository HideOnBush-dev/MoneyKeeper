import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useState, useEffect, createContext, useContext } from 'react';
import { setNotifier } from '../services/notify';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const counterRef = useState({ current: 0 })[0];

  const toast = ({ message, type = 'info', duration = 3000 }) => {
    const id = `${Date.now()}-${counterRef.current++}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  useEffect(() => {
    // Bridge for non-React callers (e.g., axios interceptors)
    setNotifier(toast);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const Toast = ({ id, message, type, onClose }) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: 'from-green-500 to-emerald-500',
    error: 'from-red-500 to-pink-500',
    warning: 'from-yellow-500 to-orange-500',
    info: 'from-blue-500 to-indigo-500',
  };

  const Icon = icons[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 50 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="pointer-events-auto"
    >
      <div className={`flex items-center space-x-3 bg-gradient-to-r ${colors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl min-w-[320px]`}>
        <Icon className="h-6 w-6 flex-shrink-0" />
        <p className="flex-1 font-medium">{message}</p>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default Toast;
