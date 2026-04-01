import { locales, defaultLocale, type Locale } from './config';
import ruMessages from './messages/ru.json';
import enMessages from './messages/en.json';

export const messages: Record<Locale, Record<string, string>> = {
  ru: ruMessages,
  en: enMessages,
};

export type Messages = typeof ruMessages;

export function getMessages(locale: Locale): Record<string, string> {
  return messages[locale] || messages[defaultLocale];
}

export { locales, defaultLocale, type Locale };
export { useTranslation, TranslationProvider } from './context';
export { useLocale } from './use-locale';
