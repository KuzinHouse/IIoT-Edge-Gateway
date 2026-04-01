import { useState, useEffect, useCallback, useRef } from 'react';

interface Alarm {
  id: string;
  name: string;
  source: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

interface AlarmRule {
  id: string;
  name: string;
  tagId: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
}

export function useAlarms() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [rules, setRules] = useState<AlarmRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);

  const fetchAlarms = useCallback(async () => {
    try {
      const response = await fetch('/api/alarms');
      const data = await response.json();
      const alarmList = Array.isArray(data) ? data : [];
      setAlarms(alarmList);
      setActiveCount(alarmList.filter((a: Alarm) => !a.acknowledged).length);
    } catch (error) {
      console.error('Failed to fetch alarms:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      const response = await fetch('/api/alarms/rules');
      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error('Failed to fetch alarm rules:', error);
    }
  }, []);

  const acknowledgeAlarm = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/alarms/${id}/acknowledge`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setAlarms(prev => prev.map(a => 
          a.id === id ? { ...a, acknowledged: true, acknowledgedAt: new Date() } : a
        ));
        setActiveCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to acknowledge alarm:', error);
    }
  }, []);

  const acknowledgeAll = useCallback(async () => {
    const activeAlarms = alarms.filter(a => !a.acknowledged);
    await Promise.all(activeAlarms.map(a => acknowledgeAlarm(a.id)));
  }, [alarms, acknowledgeAlarm]);

  const createRule = useCallback(async (rule: Partial<AlarmRule>) => {
    try {
      const response = await fetch('/api/alarms/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      
      if (response.ok) {
        await fetchRules();
      }
    } catch (error) {
      console.error('Failed to create alarm rule:', error);
    }
  }, [fetchRules]);

  const deleteRule = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/alarms/rules/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setRules(prev => prev.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete alarm rule:', error);
    }
  }, []);

  useEffect(() => {
    fetchAlarms();
    fetchRules();
  }, [fetchAlarms, fetchRules]);

  // Auto refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchAlarms, 10000);
    return () => clearInterval(interval);
  }, [fetchAlarms]);

  return {
    alarms,
    rules,
    loading,
    activeCount,
    acknowledgeAlarm,
    acknowledgeAll,
    createRule,
    deleteRule,
    refresh: fetchAlarms,
    refreshRules: fetchRules,
  };
}
