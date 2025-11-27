//import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  icon: Icon,
  loading = false,
  ...props 
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl dark:from-blue-500 dark:to-indigo-500',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
    danger: 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:shadow-xl dark:from-red-500 dark:to-pink-500',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-xl dark:from-green-500 dark:to-emerald-500',
    outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'inline-flex items-center justify-center space-x-2 rounded-xl font-medium transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {Icon && <Icon className="h-5 w-5" />}
          <span>{children}</span>
        </>
      )}
    </motion.button>
  );
};

export default Button;
