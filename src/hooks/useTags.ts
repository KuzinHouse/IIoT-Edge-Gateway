'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import type { Tag, WriteRegisterRequest, WriteCoilRequest } from '@/types/modbus';

export interface UseTagsOptions {
  deviceId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseTagsReturn {
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  writeRegister: (address: number, value: number) => Promise<boolean>;
  writeCoil: (address: number, value: boolean) => Promise<boolean>;
  getTag: (id: string) => Tag | undefined;
  getTagByAddress: (address: string) => Tag | undefined;
  filterByQuality: (quality: 'good' | 'bad' | 'uncertain') => Tag[];
  goodTags: Tag[];
  badTags: Tag[];
  uncertainTags: Tag[];
}

export function useTags(options: UseTagsOptions = {}): UseTagsReturn {
  const { deviceId, autoRefresh = false, refreshInterval = 3000 } = options;

  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    if (!deviceId) {
      setTags([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getDeviceTags(deviceId);
      setTags(response.tags || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tags';
      setError(errorMessage);
      console.error('[useTags] Error fetching tags:', err);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  const writeRegister = useCallback(async (address: number, value: number): Promise<boolean> => {
    if (!deviceId) return false;

    try {
      setError(null);
      const request: WriteRegisterRequest = { address, value };
      await api.writeRegister(deviceId, request);
      // Refresh tags after write
      await fetchTags();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to write register';
      setError(errorMessage);
      console.error('[useTags] Error writing register:', err);
      return false;
    }
  }, [deviceId, fetchTags]);

  const writeCoil = useCallback(async (address: number, value: boolean): Promise<boolean> => {
    if (!deviceId) return false;

    try {
      setError(null);
      const request: WriteCoilRequest = { address, value };
      // Note: API might need a separate endpoint for coils
      await api.writeRegister(deviceId, { address, value: value ? 1 : 0 });
      await fetchTags();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to write coil';
      setError(errorMessage);
      console.error('[useTags] Error writing coil:', err);
      return false;
    }
  }, [deviceId, fetchTags]);

  const getTag = useCallback((id: string): Tag | undefined => {
    return tags.find(t => t.id === id);
  }, [tags]);

  const getTagByAddress = useCallback((address: string): Tag | undefined => {
    return tags.find(t => t.address === address);
  }, [tags]);

  const filterByQuality = useCallback((quality: 'good' | 'bad' | 'uncertain'): Tag[] => {
    return tags.filter(t => t.quality === quality);
  }, [tags]);

  // Initial fetch
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !deviceId || refreshInterval <= 0) return;

    const interval = setInterval(fetchTags, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, deviceId, refreshInterval, fetchTags]);

  // Computed values
  const goodTags = tags.filter(t => t.quality === 'good');
  const badTags = tags.filter(t => t.quality === 'bad');
  const uncertainTags = tags.filter(t => t.quality === 'uncertain');

  return {
    tags,
    isLoading,
    error,
    refresh: fetchTags,
    writeRegister,
    writeCoil,
    getTag,
    getTagByAddress,
    filterByQuality,
    goodTags,
    badTags,
    uncertainTags,
  };
}

export default useTags;
