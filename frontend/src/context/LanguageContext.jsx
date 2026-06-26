import { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import en from '../i18n/en.json';
import hi from '../i18n/hi.json';

const LanguageContext = createContext(null);

const translations = { en, hi };

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState(localStorage.getItem('rq_lang') || 'en');

    useEffect(() => {
        localStorage.setItem('rq_lang', lang);
        document.documentElement.lang = lang;
    }, [lang]);

    const t = useCallback((path) => {
        const keys = path.split('.');
        let result = translations[lang];
        for (const key of keys) {
            if (result[key]) {
                result = result[key];
            } else {
                return path; // Fallback to key name
            }
        }
        return result;
    }, [lang]);

    const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within LanguageProvider');
    return context;
};