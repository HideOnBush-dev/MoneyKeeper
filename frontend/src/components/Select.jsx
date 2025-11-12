import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const Select = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Chọn...",
  className = "",
  disabled = false,
  icon: Icon = null,
}) => {
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
        className={`w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          {Icon && (
            <div className="flex-shrink-0">
              <Icon className="h-5 w-5 text-gray-400" />
            </div>
          )}
          {selectedOption ? (
            <span className="font-medium text-gray-900 flex items-center gap-2">
              {selectedOption.icon && <span className="text-lg">{selectedOption.icon}</span>}
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown 
          className={`h-5 w-5 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                value === option.value ? 'bg-blue-50' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                {option.icon && <span className="text-lg">{option.icon}</span>}
                <span className={`font-medium ${
                  value === option.value ? 'text-blue-600' : 'text-gray-700'
                }`}>
                  {option.label}
                </span>
              </span>
              {value === option.value && (
                <Check className="h-5 w-5 text-blue-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Select;

