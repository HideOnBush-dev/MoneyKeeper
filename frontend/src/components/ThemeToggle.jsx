import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

const ThemeToggle = ({ size = 'default', className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  const sizeClasses = {
    small: 'p-2 h-8 w-8',
    default: 'p-3 h-12 w-12',
  };

  const iconSizes = {
    small: 'h-4 w-4',
    default: 'h-5 w-5',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className={cn(
        'relative rounded-xl bg-gradient-to-br transition-all duration-300 shadow-lg hover:shadow-xl',
        isDark
          ? 'from-slate-700 to-slate-800 text-yellow-400 hover:from-slate-600 hover:to-slate-700'
          : 'from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700',
        sizeClasses[size],
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        initial={false}
        animate={{
          rotate: isDark ? 0 : 180,
          scale: isDark ? 1 : 0.8,
        }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
        }}
        className="flex items-center justify-center"
      >
        {isDark ? (
          <Moon className={iconSizes[size]} />
        ) : (
          <Sun className={iconSizes[size]} />
        )}
      </motion.div>
    </motion.button>
  );
};

export default ThemeToggle;