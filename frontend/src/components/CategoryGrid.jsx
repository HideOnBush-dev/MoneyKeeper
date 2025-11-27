const CategoryGrid = ({ 
  categories, 
  value, 
  onChange, 
  columns = 4 
}) => {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-${columns} gap-2`}>
      {categories.map((cat) => {
        const active = value === cat.value;
        return (
          <button
            key={cat.value}
            type="button"
            onClick={() => onChange(cat.value)}
            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
              active
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            <span className="text-2xl">{cat.emoji}</span>
            <span className="text-xs font-semibold">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryGrid;

