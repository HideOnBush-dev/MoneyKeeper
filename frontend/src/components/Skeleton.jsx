//import { motion } from 'framer-motion';

const Skeleton = ({ className = '', width, height, circle = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className={`bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] ${
        circle ? 'rounded-full' : 'rounded-lg'
      } ${className}`}
      style={{ width, height }}
    />
  );
};

export const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton width="120px" height="24px" />
      <Skeleton circle width="48px" height="48px" />
    </div>
    <Skeleton width="100%" height="16px" />
    <Skeleton width="80%" height="16px" />
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="space-y-3">
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <Skeleton circle width="40px" height="40px" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height="16px" />
          <Skeleton width="40%" height="14px" />
        </div>
        <Skeleton width="80px" height="20px" />
      </div>
    ))}
  </div>
);

export default Skeleton;
