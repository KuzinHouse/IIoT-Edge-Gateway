/**
 * Notification Service - Handles browser notifications, toasts, and alerts
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationOptions {
  title: string;
  body?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  icon?: string;
  badge?: string;
  tag?: string;
  renotify?: boolean;
  silent?: boolean;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: unknown;
  onClick?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

export interface NotificationResult {
  granted: boolean;
  permission: NotificationPermission;
}

export interface QueuedNotification {
  id: string;
  options: NotificationOptions;
  timestamp: Date;
  shown: boolean;
}

class NotificationService {
  private enabled = true;
  private queue: QueuedNotification[] = [];
  private maxQueueSize = 100;
  private notificationCounter = 0;

  constructor() {
    // Request permission on first interaction
    if (typeof window !== 'undefined') {
      document.addEventListener('click', this.requestPermissionOnce, { once: true });
    }
  }

  // Request permission once
  private requestPermissionOnce = async (): Promise<void> => {
    await this.requestPermission();
  };

  // Request notification permission
  async requestPermission(): Promise<NotificationResult> {
    if (!this.isSupported()) {
      return { granted: false, permission: 'denied' };
    }

    const permission = await Notification.requestPermission();
    return {
      granted: permission === 'granted',
      permission,
    };
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  // Check if permission is granted
  hasPermission(): boolean {
    return this.isSupported() && Notification.permission === 'granted';
  }

  // Enable/disable notifications
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  // Show notification
  async show(options: NotificationOptions): Promise<Notification | null> {
    if (!this.enabled) {
      return null;
    }

    // Queue notification if permission not granted
    if (!this.hasPermission()) {
      const result = await this.requestPermission();
      if (!result.granted) {
        this.queueNotification(options);
        return null;
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        badge: options.badge,
        tag: options.tag,
        renotify: options.renotify,
        silent: options.silent,
        requireInteraction: options.requireInteraction,
        data: options.data,
      });

      notification.onclick = () => {
        options.onClick?.();
        notification.close();
        window.focus();
      };

      notification.onclose = () => {
        options.onClose?.();
      };

      notification.onerror = (error) => {
        options.onError?.(error as Error);
      };

      return notification;
    } catch (error) {
      console.error('[NotificationService] Error showing notification:', error);
      return null;
    }
  }

  // Queue notification for later
  private queueNotification(options: NotificationOptions): void {
    const queued: QueuedNotification = {
      id: this.generateId(),
      options,
      timestamp: new Date(),
      shown: false,
    };

    this.queue.push(queued);

    // Trim queue if too large
    if (this.queue.length > this.maxQueueSize) {
      this.queue = this.queue.slice(-this.maxQueueSize);
    }
  }

  // Show queued notifications
  async showQueued(): Promise<void> {
    if (!this.hasPermission()) return;

    const pending = this.queue.filter(n => !n.shown);
    
    for (const notification of pending) {
      await this.show(notification.options);
      notification.shown = true;
    }

    // Clean up shown notifications older than 1 hour
    const oneHourAgo = new Date(Date.now() - 3600000);
    this.queue = this.queue.filter(n => !n.shown || n.timestamp > oneHourAgo);
  }

  // Clear queue
  clearQueue(): void {
    this.queue = [];
  }

  // Generate unique ID
  private generateId(): string {
    return `notification-${Date.now()}-${++this.notificationCounter}`;
  }

  // Convenience methods
  async info(title: string, body?: string, options?: Partial<NotificationOptions>): Promise<Notification | null> {
    return this.show({
      title,
      body,
      type: 'info',
      priority: 'normal',
      ...options,
    });
  }

  async success(title: string, body?: string, options?: Partial<NotificationOptions>): Promise<Notification | null> {
    return this.show({
      title,
      body,
      type: 'success',
      priority: 'normal',
      ...options,
    });
  }

  async warning(title: string, body?: string, options?: Partial<NotificationOptions>): Promise<Notification | null> {
    return this.show({
      title,
      body,
      type: 'warning',
      priority: 'high',
      ...options,
    });
  }

  async error(title: string, body?: string, options?: Partial<NotificationOptions>): Promise<Notification | null> {
    return this.show({
      title,
      body,
      type: 'error',
      priority: 'urgent',
      requireInteraction: true,
      ...options,
    });
  }

  // Alarm notification (for critical alerts)
  async alarm(deviceName: string, message: string, options?: Partial<NotificationOptions>): Promise<Notification | null> {
    return this.show({
      title: `⚠️ Alarm: ${deviceName}`,
      body: message,
      type: 'error',
      priority: 'urgent',
      requireInteraction: true,
      tag: `alarm-${deviceName}`,
      renotify: true,
      ...options,
    });
  }

  // Device status notification
  async deviceStatus(
    deviceName: string,
    status: 'online' | 'offline' | 'error',
    options?: Partial<NotificationOptions>
  ): Promise<Notification | null> {
    const statusMessages = {
      online: 'Device is now online',
      offline: 'Device went offline',
      error: 'Device encountered an error',
    };

    const icons = {
      online: '✅',
      offline: '🔴',
      error: '⚠️',
    };

    return this.show({
      title: `${icons[status]} ${deviceName}`,
      body: statusMessages[status],
      type: status === 'online' ? 'success' : status === 'offline' ? 'warning' : 'error',
      priority: status === 'error' ? 'urgent' : 'normal',
      tag: `device-${deviceName}`,
      ...options,
    });
  }

  // Get queue stats
  getQueueStats(): {
    total: number;
    pending: number;
    shown: number;
  } {
    return {
      total: this.queue.length,
      pending: this.queue.filter(n => !n.shown).length,
      shown: this.queue.filter(n => n.shown).length,
    };
  }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Convenience exports
export const notifications = {
  show: (options: NotificationOptions) => notificationService.show(options),
  info: (title: string, body?: string) => notificationService.info(title, body),
  success: (title: string, body?: string) => notificationService.success(title, body),
  warning: (title: string, body?: string) => notificationService.warning(title, body),
  error: (title: string, body?: string) => notificationService.error(title, body),
  alarm: (deviceName: string, message: string) => notificationService.alarm(deviceName, message),
  deviceStatus: (deviceName: string, status: 'online' | 'offline' | 'error') =>
    notificationService.deviceStatus(deviceName, status),
  requestPermission: () => notificationService.requestPermission(),
  hasPermission: () => notificationService.hasPermission(),
  setEnabled: (enabled: boolean) => notificationService.setEnabled(enabled),
};

export default notificationService;
