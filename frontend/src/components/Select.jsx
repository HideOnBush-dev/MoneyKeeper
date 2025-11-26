import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Select = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder,
  className = "",
  disabled = false,
  icon: Icon = null,
}) => {
  const { t } = useTranslation();
  const defaultPlaceholder = placeholder || t('common.select');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-gray-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          {Icon && (
            <div className="flex-shrink-0">
              <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
          )}
          {selectedOption ? (
            <span className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              {selectedOption.icon && <span className="text-lg">{selectedOption.icon}</span>}
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">{defaultPlaceholder}</span>
          )}
        </div>
        <ChevronDown 
          className={`h-5 w-5 text-gray-400 dark:text-gray-500 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-64 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                value === option.value ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                {option.icon && <span className="text-lg">{option.icon}</span>}
                <span className={`font-medium ${
                  value === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {option.label}
                </span>
              </span>
              {value === option.value && (
                <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Select;

