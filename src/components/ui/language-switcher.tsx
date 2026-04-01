/**
 * Language Switcher Component
 * Toggle between available locales
 */

'use client';

import * as React from 'react';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/use-locale';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'minimal';
  showFlag?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function LanguageSwitcher({
  variant = 'default',
  showFlag = true,
  showLabel = true,
  className,
}: LanguageSwitcherProps) {
  const { locale, setLocale, availableLocales, t } = useLocale();

  const handleLocaleChange = (newLocale: typeof locale) => {
    setLocale(newLocale);
  };

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {availableLocales.map((loc) => (
          <button
            key={loc.code}
            onClick={() => handleLocaleChange(loc.code)}
            className={cn(
              'px-2 py-1 text-sm rounded transition-colors',
              loc.isCurrent
                ? 'bg-primary text-primary-foreground font-medium'
                : 'hover:bg-muted'
            )}
            aria-label={`Switch to ${loc.name}`}
          >
            {showFlag ? loc.flag : loc.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 px-2', className)}
            aria-label={t('common.settings')}
          >
            {showFlag && (
              <span className="mr-1">
                {availableLocales.find((l) => l.isCurrent)?.flag}
              </span>
            )}
            <span className="text-xs uppercase">
              {locale}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {availableLocales.map((loc) => (
            <DropdownMenuItem
              key={loc.code}
              onClick={() => handleLocaleChange(loc.code)}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {showFlag && <span>{loc.flag}</span>}
                {showLabel && <span>{loc.name}</span>}
              </span>
              {loc.isCurrent && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="default"
          className={cn('gap-2', className)}
          aria-label={t('common.settings')}
        >
          <Globe className="h-4 w-4" />
          {showFlag && (
            <span>
              {availableLocales.find((l) => l.isCurrent)?.flag}
            </span>
          )}
          {showLabel && (
            <span>
              {availableLocales.find((l) => l.isCurrent)?.name}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableLocales.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => handleLocaleChange(loc.code)}
            className={cn(
              'flex items-center justify-between cursor-pointer',
              loc.isCurrent && 'bg-accent'
            )}
          >
            <span className="flex items-center gap-2">
              {showFlag && <span className="text-lg">{loc.flag}</span>}
              <span>{loc.name}</span>
            </span>
            {loc.isCurrent && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact inline switcher for headers/toolbars
export function LanguageSwitcherInline({ className }: { className?: string }) {
  const { locale, setLocale, availableLocales } = useLocale();

  return (
    <div className={cn('flex items-center border rounded-md', className)}>
      {availableLocales.map((loc) => (
        <button
          key={loc.code}
          onClick={() => setLocale(loc.code)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium transition-colors',
            loc.isCurrent
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          )}
          aria-label={`Switch to ${loc.name}`}
          aria-pressed={loc.isCurrent}
        >
          {loc.flag} {loc.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// Icon-only switcher for minimal UI
export function LanguageSwitcherIcon({ className }: { className?: string }) {
  const { setLocale, availableLocales, locale } = useLocale();

  const nextLocale = availableLocales.find((l) => l.code !== locale);

  return (
    <button
      onClick={() => nextLocale && setLocale(nextLocale.code)}
      className={cn(
        'inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-muted transition-colors',
        className
      )}
      title={nextLocale ? `Switch to ${nextLocale.name}` : 'Switch language'}
      aria-label="Switch language"
    >
      <span className="text-lg">
        {availableLocales.find((l) => l.isCurrent)?.flag}
      </span>
    </button>
  );
}

export default LanguageSwitcher;
