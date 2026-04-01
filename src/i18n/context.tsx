/**
 * Translation Context Provider
 * React context for managing translations and locale state
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import { locales, defaultLocale, type Locale, getLocaleConfig } from './config';
import { getMessages, type Messages } from './index';

interface TranslationContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  messages: Record<string, string>;
  localeConfig: ReturnType<typeof getLocaleConfig>;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

const STORAGE_KEY = 'modbus-scanner-locale';

// Flatten nested messages for easy access - moved outside component to avoid hoisting issues
function flattenMessages(obj: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, flattenMessages(value, newKey));
      } else {
        result[newKey] = String(value);
      }
    }
  }
  
  return result;
}

// Get initial locale from storage (used in lazy initialization)
function getInitialLocale(defaultValue: Locale): Locale {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && locales.includes(stored as Locale)) {
      return stored as Locale;
    }
  }
  return defaultValue;
}

interface TranslationProviderProps {
  children: ReactNode;
  defaultLocaleProp?: Locale;
}

export function TranslationProvider({
  children,
  defaultLocaleProp = defaultLocale,
}: TranslationProviderProps) {
  // Use lazy initialization for locale from localStorage
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale(defaultLocaleProp));

  // Use useMemo for derived messages instead of useEffect + state
  const flatMessages = useMemo(() => {
    const msgs = getMessages(locale);
    return flattenMessages(msgs);
  }, [locale]);

  // Update document lang when locale changes
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  // Translation function with parameter interpolation
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let message = flatMessages[key] || key;
    
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        message = message.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      }
    }
    
    return message;
  }, [flatMessages]);

  const formatNumber = useCallback((
    value: number,
    options?: Intl.NumberFormatOptions
  ): string => {
    return new Intl.NumberFormat(locale, options).format(value);
  }, [locale]);

  const formatDate = useCallback((
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(locale, options).format(date);
  }, [locale]);

  const formatRelativeTime = useCallback((
    value: number,
    unit: Intl.RelativeTimeFormatUnit
  ): string => {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit);
  }, [locale]);

  const value: TranslationContextValue = {
    locale,
    setLocale,
    t,
    messages: flatMessages,
    localeConfig: getLocaleConfig(locale),
    formatNumber,
    formatDate,
    formatRelativeTime,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation(): TranslationContextValue {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}

export { TranslationContext };
