import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export const Card = ({ children, className, hover = true, ...props }) => (
  <motion.div
    whileHover={hover ? { y: -4, shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' } : {}}
    className={cn(
      'bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden',
      className
    )}
    {...props}
  >
    {children}
  </motion.div>
);

export const CardHeader = ({ children, className }) => (
  <div className={cn('px-6 py-4 border-b border-gray-100', className)}>
    {children}
  </div>
);

export const CardContent = ({ children, className }) => (
  <div className={cn('px-6 py-4', className)}>{children}</div>
);

export const CardTitle = ({ children, className }) => (
  <h3 className={cn('text-lg font-bold text-gray-900', className)}>{children}</h3>
);

export const CardDescription = ({ children, className }) => (
  <p className={cn('text-sm text-gray-600 mt-1', className)}>{children}</p>
);
