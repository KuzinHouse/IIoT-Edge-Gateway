/**
 * useLocale Hook
 * Custom hook for accessing and managing locale state
 */

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { locales, defaultLocale, localeNames, localeFlags, type Locale } from './config';
import { useTranslation } from './context';

export interface UseLocaleReturn {
  // Current locale
  locale: Locale;
  localeName: string;
  localeFlag: string;
  
  // Available locales
  availableLocales: Array<{
    code: Locale;
    name: string;
    flag: string;
    isCurrent: boolean;
  }>;
  
  // Actions
  setLocale: (locale: Locale) => void;
  switchLocale: (locale: Locale) => void;
  
  // Translation shortcut
  t: (key: string, params?: Record<string, string | number>) => string;
  
  // Formatting
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: Date | string | number) => string;
  formatTime: (value: Date | string | number) => string;
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string;
  
  // Helpers
  isLocale: (locale: string) => boolean;
  getDirection: () => 'ltr' | 'rtl';
}

export function useLocale(): UseLocaleReturn {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, setLocale, t, formatNumber, formatDate, formatRelativeTime } = useTranslation();

  const availableLocales = useMemo(() => {
    return locales.map((code) => ({
      code,
      name: localeNames[code],
      flag: localeFlags[code],
      isCurrent: code === locale,
    }));
  }, [locale]);

  const switchLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    
    // Optionally update URL path with locale prefix
    // This is useful for SEO and bookmarkable URLs
    const currentPath = pathname;
    const pathWithoutLocale = currentPath.replace(/^\/(ru|en)(\/|$)/, '/');
    const newPath = newLocale === defaultLocale 
      ? pathWithoutLocale 
      : `/${newLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
    
    router.push(newPath || '/');
  }, [setLocale, pathname, router]);

  const formatDateTime = useCallback((value: Date | string | number): string => {
    const date = value instanceof Date ? value : new Date(value);
    return formatDate(date, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: locale !== 'ru',
    });
  }, [formatDate, locale]);

  const formatTime = useCallback((value: Date | string | number): string => {
    const date = value instanceof Date ? value : new Date(value);
    return formatDate(date, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: locale !== 'ru',
    });
  }, [formatDate, locale]);

  const isLocale = useCallback((testLocale: string): boolean => {
    return locales.includes(testLocale as Locale);
  }, []);

  const getDirection = useCallback((): 'ltr' | 'rtl' => {
    // All supported locales are LTR
    return 'ltr';
  }, []);

  return {
    locale,
    localeName: localeNames[locale],
    localeFlag: localeFlags[locale],
    availableLocales,
    setLocale,
    switchLocale,
    t,
    formatNumber,
    formatDate,
    formatDateTime,
    formatTime,
    formatRelativeTime,
    isLocale,
    getDirection,
  };
}

// Hook for getting translated error messages
export function useErrorMessages() {
  const { t } = useTranslation();
  
  return {
    getErrorMessage: (errorKey: string, params?: Record<string, string | number>) => {
      return t(`errors.${errorKey}`, params);
    },
    getSuccessMessage: (successKey: string, params?: Record<string, string | number>) => {
      return t(`notifications.success.${successKey}`, params);
    },
    getWarningMessage: (warningKey: string, params?: Record<string, string | number>) => {
      return t(`notifications.warning.${warningKey}`, params);
    },
  };
}

// Hook for getting translated status labels
export function useStatusLabels() {
  const { t } = useTranslation();
  
  return {
    getConnectionStatus: (status: string) => t(`common.status.${status}`),
    getDeviceStatus: (status: string) => t(`devices.status.${status}`),
    getTagQuality: (quality: string) => t(`tags.quality.${quality}`),
    getAlarmSeverity: (severity: string) => t(`alarms.severity.${severity}`),
    getLicenseStatus: (status: string) => t(`license.status.${status}`),
  };
}

export default useLocale;
