import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ variant = 'default', size = 'default' }) => {
  const { isDark, toggleTheme } = useTheme();

  const sizeClasses = {
    small: 'h-8 w-8',
    default: 'h-10 w-10',
    large: 'h-12 w-12'
  };

  const iconSizes = {
    small: 'h-4 w-4',
    default: 'h-5 w-5',
    large: 'h-6 w-6'
  };

  if (variant === 'switch') {
    return (
      <button
        onClick={toggleTheme}
        className={`relative inline-flex items-center ${sizeClasses[size]} rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
          isDark 
            ? 'bg-blue-600 hover:bg-blue-700' 
            : 'bg-gray-200 hover:bg-gray-300'
        }`}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <span
          className={`inline-block ${iconSizes[size]} transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
            isDark ? 'translate-x-5' : 'translate-x-1'
          }`}
        >
          {isDark ? (
            <Moon className={`${iconSizes[size]} text-gray-600 p-0.5`} />
          ) : (
            <Sun className={`${iconSizes[size]} text-yellow-500 p-0.5`} />
          )}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`${sizeClasses[size]} rounded-full transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
        isDark
          ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400 hover:text-yellow-300'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-700'
      }`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className={`${iconSizes[size]} transition-all duration-300 hover:scale-110`} />
      ) : (
        <Moon className={`${iconSizes[size]} transition-all duration-300 hover:scale-110`} />
      )}
    </button>
  );
};

export default ThemeToggle;