import React, { createContext, useContext, useState, useEffect } from 'react';
import { dictionaries, SUPPORTED_LANGUAGES } from '../locales';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('app_language') || 'en';
  });

  const setLanguage = (langCode) => {
    if (dictionaries[langCode]) {
      setLanguageState(langCode);
      localStorage.setItem('app_language', langCode);
    }
  };

  const t = (keyPath, params = {}) => {
    const keys = keyPath.split('.');
    let dict = dictionaries[language] || dictionaries.en;
    let value = keys.reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : null), dict);

    // Fallback to English dictionary if key is missing in active locale
    if (!value && language !== 'en') {
      value = keys.reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : null), dictionaries.en);
    }

    if (typeof value !== 'string') {
      return keyPath;
    }

    // Replace parameters e.g. {count}
    Object.keys(params).forEach((paramKey) => {
      value = value.replace(new RegExp(`{${paramKey}}`, 'g'), params[paramKey]);
    });

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
