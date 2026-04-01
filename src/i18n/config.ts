/**
 * i18n Configuration for Modbus Scanner
 * Supports Russian (default) and English languages
 */

export type Locale = 'ru' | 'en';

export const locales: Locale[] = ['ru', 'en'];

export const defaultLocale: Locale = 'ru';

export const localeNames: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
};

export const localeFlags: Record<Locale, string> = {
  ru: '🇷🇺',
  en: '🇬🇧',
};

export const localeDirections: Record<Locale, 'ltr' | 'rtl'> = {
  ru: 'ltr',
  en: 'ltr',
};

export const dateTimeFormats: Record<Locale, Intl.DateTimeFormatOptions> = {
  ru: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  },
  en: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  },
};

export const numberFormats: Record<Locale, Intl.NumberFormatOptions> = {
  ru: {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
  en: {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
};

export const currencyFormats: Record<Locale, Intl.NumberFormatOptions> = {
  ru: {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
  },
  en: {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  },
};

export function getLocaleConfig(locale: Locale) {
  return {
    locale,
    name: localeNames[locale],
    flag: localeFlags[locale],
    direction: localeDirections[locale],
    dateTimeFormat: dateTimeFormats[locale],
    numberFormat: numberFormats[locale],
    currencyFormat: currencyFormats[locale],
  };
}

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function parseAcceptLanguage(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  
  const languages = acceptLanguage.split(',').map(lang => {
    const [code] = lang.trim().split(';');
    return code.split('-')[0].toLowerCase();
  });
  
  for (const lang of languages) {
    if (isValidLocale(lang)) {
      return lang;
    }
  }
  
  return defaultLocale;
}
