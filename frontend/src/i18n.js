import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import translationEN from './locales/en/translation.json';
import translationVI from './locales/vi/translation.json';

const resources = {
    en: {
        translation: translationEN
    },
    vi: {
        translation: translationVI
    }
};

i18n
    // Detect user language
    .use(LanguageDetector)
    // Pass the i18n instance to react-i18next
    .use(initReactI18next)
    // Init i18next
    .init({
        resources,
        fallbackLng: 'vi', // Default language is Vietnamese
        debug: false,

        interpolation: {
            escapeValue: false // React already safes from xss
        },

        detection: {
            // Order and from where user language should be detected
            order: ['localStorage', 'navigator'],

            // Keys or params to lookup language from
            lookupLocalStorage: 'i18nextLng',

            // Cache user language on
            caches: ['localStorage'],
        }
    });

export default i18n;
