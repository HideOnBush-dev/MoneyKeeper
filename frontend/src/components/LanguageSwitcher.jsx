import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const LanguageSwitcher = ({ compact = false }) => {
    const { i18n, t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
        { code: 'en', name: 'English', flag: '🇬🇧' }
    ];

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    const changeLanguage = (langCode) => {
        i18n.changeLanguage(langCode);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 ${compact ? 'gap-2' : 'gap-3'}`}
            >
                <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <span className="text-lg">{currentLanguage.flag}</span>
                        {/* {currentLanguage.code.toUpperCase()} */}
                    </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 mt-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-50 overflow-hidden">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => changeLanguage(lang.code)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${i18n.language === lang.code
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className="text-lg">{lang.flag}</span>
                            <div>
                                <p className="text-sm font-semibold">{lang.name}</p>
                                {/* <p className="text-xs text-gray-500 dark:text-gray-400">{lang.code.toUpperCase()}</p> */}
                            </div>
                            {i18n.language === lang.code && (
                                <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;
