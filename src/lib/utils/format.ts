// Formatting utilities

/**
 * Format a number with specified decimal places
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (isNaN(value) || !isFinite(value)) return '—';
  return value.toFixed(decimals);
}

/**
 * Format a number with thousands separator
 */
export function formatThousands(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0';
  return value.toLocaleString();
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

/**
 * Format a date to locale string
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString();
}

/**
 * Format a date to locale time string
 */
export function formatTime(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleTimeString();
}

/**
 * Format a date to locale date time string
 */
export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleString();
}

/**
 * Format relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return formatDate(d);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  if (isNaN(value) || !isFinite(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format throughput
 */
export function formatThroughput(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

/**
 * Format hex value
 */
export function formatHex(value: number, padding: number = 4): string {
  return '0x' + value.toString(16).toUpperCase().padStart(padding, '0');
}

/**
 * Format binary value
 */
export function formatBinary(value: number, padding: number = 16): string {
  return '0b' + value.toString(2).padStart(padding, '0');
}

/**
 * Format IP address
 */
export function formatIP(octets: number[]): string {
  return octets.join('.');
}

/**
 * Format MAC address
 */
export function formatMAC(octets: number[]): string {
  return octets.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(':');
}

/**
 * Truncate string
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length - 3) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert snake_case to Title Case
 */
export function snakeToTitle(str: string): string {
  return str.split('_').map(capitalize).join(' ');
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  return formatBytes(bytes);
}

/**
 * Format frequency
 */
export function formatFrequency(hz: number): string {
  if (hz >= 1000000) return `${(hz / 1000000).toFixed(1)} MHz`;
  if (hz >= 1000) return `${(hz / 1000).toFixed(1)} kHz`;
  return `${hz.toFixed(0)} Hz`;
}

/**
 * Format temperature
 */
export function formatTemperature(celsius: number, unit: 'C' | 'F' | 'K' = 'C'): string {
  switch (unit) {
    case 'F': return `${((celsius * 9/5) + 32).toFixed(1)}°F`;
    case 'K': return `${(celsius + 273.15).toFixed(1)}K`;
    default: return `${celsius.toFixed(1)}°C`;
  }
}

/**
 * Format pressure
 */
export function formatPressure(bar: number, unit: 'bar' | 'psi' | 'kPa' = 'bar'): string {
  switch (unit) {
    case 'psi': return `${(bar * 14.5038).toFixed(2)} psi`;
    case 'kPa': return `${(bar * 100).toFixed(1)} kPa`;
    default: return `${bar.toFixed(2)} bar`;
  }
}

/**
 * Format flow rate
 */
export function formatFlowRate(m3h: number, unit: 'm3/h' | 'l/min' | 'gpm' = 'm3/h'): string {
  switch (unit) {
    case 'l/min': return `${(m3h * 1000 / 60).toFixed(1)} l/min`;
    case 'gpm': return `${(m3h * 4.403).toFixed(1)} gpm`;
    default: return `${m3h.toFixed(1)} m³/h`;
  }
}
