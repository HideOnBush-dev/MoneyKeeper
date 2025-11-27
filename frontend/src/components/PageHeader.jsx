const PageHeader = ({ 
  icon: Icon, 
  title, 
  subtitle, 
  actions = null,
  iconColor = "from-blue-500 to-indigo-600",
  className = "" 
}) => {
  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className={`p-2 rounded-lg bg-gradient-to-br ${iconColor}`}>
              <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
        </div>
        {actions}
      </div>
    </div>
  );
};

export default PageHeader;

