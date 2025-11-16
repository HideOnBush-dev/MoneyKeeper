import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const Input = ({ 
  label, 
  error, 
  icon: Icon, 
  className, 
  containerClassName,
  ...props 
}) => {
  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {props.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <Icon className="h-5 w-5" />
          </div>
        )}
        
        <motion.input
          whileFocus={{ scale: 1.01 }}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed',
            error ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-slate-700',
            Icon && 'pl-12',
            className
          )}
          {...props}
        />
      </div>
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

export const Textarea = ({ 
  label, 
  error, 
  className, 
  containerClassName,
  ...props 
}) => {
  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {props.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <motion.textarea
        whileFocus={{ scale: 1.01 }}
        className={cn(
          'w-full px-4 py-3 rounded-xl border-2 transition-all resize-none bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed',
          error ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-slate-700',
          className
        )}
        {...props}
      />
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

export const Select = ({ 
  label, 
  error, 
  icon: Icon, 
  options = [],
  className, 
  containerClassName,
  ...props 
}) => {
  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {props.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10">
            <Icon className="h-5 w-5" />
          </div>
        )}
        
        <select
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 transition-all appearance-none bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed cursor-pointer',
            error ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-slate-700',
            Icon && 'pl-12',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-white dark:bg-slate-800">
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom Arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

export default Input;
