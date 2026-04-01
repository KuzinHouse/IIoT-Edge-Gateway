'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  BarChart3, ArrowDownToLine, ArrowUpFromLine, Layers,
  AlertCircle, Settings, Server, Sun, Moon, Globe, Menu, X,
  ChevronRight, Activity, GitBranch, Wrench, Search, Cpu, Link2,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CommandPalette } from '@/components/CommandPalette';

import { DashboardView } from '@/components/views/DashboardView';
import { SouthDevicesView } from '@/components/views/SouthDevicesView';
import { NorthAppsView } from '@/components/views/NorthAppsView';
import { TagsView } from '@/components/views/TagsView';
import { AlarmsView } from '@/components/views/AlarmsView';
import { PipelineView } from '@/components/views/PipelineView';
import { MonitoringView } from '@/components/views/MonitoringView';
import { DiagnosticsView } from '@/components/views/DiagnosticsView';
import { DriversView } from '@/components/views/DriversView';
import { SettingsView } from '@/components/views/SettingsView';
import { OPCUAView } from '@/components/views/OPCUAView';

// ==================== Types ====================
type Section = 'dashboard' | 'south' | 'north' | 'tags' | 'alarms' | 'pipeline' | 'monitoring' | 'diagnostics' | 'drivers' | 'opcua' | 'settings';

interface NavItem {
  id: Section;
  label: string;
  labelShort: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

// ==================== Navigation ====================
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Панель управления', labelShort: 'Панель', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'south', label: 'Южные устройства', labelShort: 'South', icon: <ArrowDownToLine className="h-4 w-4" /> },
  { id: 'north', label: 'Северные приложения', labelShort: 'North', icon: <ArrowUpFromLine className="h-4 w-4" /> },
  { id: 'tags', label: 'Теги данных', labelShort: 'Теги', icon: <Layers className="h-4 w-4" /> },
  { id: 'pipeline', label: 'Пайплайны', labelShort: 'Пайплайны', icon: <GitBranch className="h-4 w-4" />, badge: 'NEW', badgeColor: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30' },
  { id: 'alarms', label: 'Аварии', labelShort: 'Аварии', icon: <AlertCircle className="h-4 w-4" /> },
  { id: 'monitoring', label: 'Мониторинг', labelShort: 'Live', icon: <Activity className="h-4 w-4" />, badge: 'LIVE', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  { id: 'diagnostics', label: 'Диагностика', labelShort: 'Диагн.', icon: <Wrench className="h-4 w-4" />, badge: 'NEW', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { id: 'drivers', label: 'Драйверы OPA-S', labelShort: 'Драйверы', icon: <Cpu className="h-4 w-4" />, badge: 'NEW', badgeColor: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30' },
  { id: 'opcua', label: 'OPC UA Клиент', labelShort: 'OPC UA', icon: <Link2 className="h-4 w-4" />, badge: 'NEW', badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  { id: 'settings', label: 'Настройки', labelShort: 'Настр.', icon: <Settings className="h-4 w-4" /> },
];

// ==================== Main Page ====================
export default function Home() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- needed for hydration-safe theme rendering
  useEffect(() => { setMounted(true); }, []);



  // Close mobile menu on section change
  const handleSectionChange = useCallback((section: Section) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  }, []);

  const handleNavigate = useCallback((section: string) => {
    handleSectionChange(section as Section);
  }, [handleSectionChange]);

  // Global keyboard shortcut: Ctrl+K for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardView onNavigate={handleNavigate} />;
      case 'south': return <SouthDevicesView />;
      case 'north': return <NorthAppsView />;
      case 'tags': return <TagsView />;
      case 'pipeline': return <PipelineView />;
      case 'alarms': return <AlarmsView />;
      case 'monitoring': return <MonitoringView />;
      case 'diagnostics': return <DiagnosticsView />;
      case 'drivers': return <DriversView />;
      case 'opcua': return <OPCUAView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView onNavigate={handleNavigate} />;
    }
  };

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-border px-3 shrink-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Server className="h-5 w-5 text-primary" />
        </div>
        {sidebarOpen && (
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold leading-tight truncate">IoT Edge Gateway</h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] text-muted-foreground">Онлайн · v2.1.0</span>
            </div>
          </div>
        )}
        {/* Desktop collapse button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 hidden md:flex"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <ChevronRight className="h-4 w-4 rotate-180" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Command Palette Trigger */}
      {sidebarOpen && (
        <div className="px-3 pt-3 pb-1">
          <button
            className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Поиск...</span>
            <kbd className="rounded border bg-background px-1 font-mono text-[10px]">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Nav Items */}
      <ScrollArea className="flex-1 py-1">
        <nav className="space-y-0.5 px-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                activeSection === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                sidebarOpen ? 'px-3 py-2' : 'justify-center px-2 py-2'
              )}
              onClick={() => handleSectionChange(item.id)}
            >
              {item.icon}
              {sidebarOpen && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', item.badgeColor)}>
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-1 shrink-0">
        <Button
          variant="ghost"
          size={sidebarOpen ? 'sm' : 'icon'}
          className={cn('w-full', sidebarOpen ? 'justify-start gap-2 px-3' : 'justify-center')}
          onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
        >
          <Globe className="h-4 w-4 shrink-0" />
          {sidebarOpen && <span className="text-xs">{lang.toUpperCase()}</span>}
        </Button>
        <Button
          variant="ghost"
          size={sidebarOpen ? 'sm' : 'icon'}
          className={cn('w-full', sidebarOpen ? 'justify-start gap-2 px-3' : 'justify-center')}
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {mounted ? (
            resolvedTheme === 'dark'
              ? <Sun className="h-4 w-4 shrink-0" />
              : <Moon className="h-4 w-4 shrink-0" />
          ) : (
            <Sun className="h-4 w-4 shrink-0" />
          )}
          {sidebarOpen && <span className="text-xs">{mounted && resolvedTheme === 'dark' ? 'Светлая' : 'Тёмная'}</span>}
        </Button>
        {sidebarOpen && (
          <div className="mt-2 mx-1 rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-xs">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-muted-foreground">Система</span>
              <Badge className="ml-auto bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">Норма</Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
              <span>CPU: 34%</span>
              <span>RAM: 62%</span>
              <span>Disk: 45%</span>
              <span>3 службы</span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-border bg-card/80 backdrop-blur-sm transition-all duration-300 shrink-0',
          sidebarOpen ? 'w-[260px]' : 'w-[64px]'
        )}
      >
        {navContent}
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Mobile Sidebar */}
          <aside className="fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col border-r border-border bg-card shadow-xl md:hidden animate-in slide-in-from-left duration-200">
            {navContent}
          </aside>
        </>
      )}

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 items-center gap-3 border-b border-border px-4 lg:px-6 bg-card/50 backdrop-blur-sm shrink-0">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop expand button (when sidebar collapsed) */}
          {!sidebarOpen && (
            <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:flex" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
          )}

          {/* Section title */}
          <h2 className="text-sm font-semibold truncate">
            {NAV_ITEMS.find(n => n.id === activeSection)?.label || 'Панель управления'}
          </h2>

          {/* Command palette trigger in header (when sidebar collapsed or mobile) */}
          {!sidebarOpen && (
            <button
              className="hidden md:flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground hover:bg-accent ml-2"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <Search className="h-3 w-3" />
              <span>Поиск...</span>
              <kbd className="rounded border bg-background px-1 font-mono text-[10px]">⌘K</kbd>
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Status badge */}
            <Badge variant="outline" className="hidden sm:flex text-[10px] gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Все системы
            </Badge>

            {/* Mobile theme toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:hidden"
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                >
                  {mounted ? (
                    resolvedTheme === 'dark'
                      ? <Sun className="h-4 w-4" />
                      : <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{mounted && resolvedTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] p-3 sm:p-4 lg:p-6">
            {renderSection()}
          </div>
        </div>
      </main>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
