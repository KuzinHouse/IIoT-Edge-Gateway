'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface OPCUANode {
  nodeId: string;
  browseName: string;
  displayName: string;
  nodeClass: 'Object' | 'Variable' | 'Method' | 'ReferenceType' | 'ObjectType' | 'DataType' | 'View';
  value?: unknown;
  dataType?: string;
  description?: string;
  children?: OPCUANode[];
}

export interface OPCUAConnection {
  id: string;
  name: string;
  endpointUrl: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy: string;
  lastConnected?: Date;
}

export interface OPCUASubscription {
  id: string;
  nodeId: string;
  enabled: boolean;
  samplingInterval: number;
  lastValue?: unknown;
  lastTimestamp?: Date;
}

export interface OPCUAConfig {
  endpointUrl: string;
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy: string;
  username?: string;
  password?: string;
  connectionTimeout: number;
  requestTimeout: number;
}

export interface UseOPCUAOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface UseOPCUAReturn {
  connection: OPCUAConnection | null;
  nodes: OPCUANode[];
  subscriptions: OPCUASubscription[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (config: OPCUAConfig) => Promise<boolean>;
  disconnect: () => Promise<void>;
  browse: (nodeId: string) => Promise<OPCUANode[]>;
  readNode: (nodeId: string) => Promise<unknown>;
  writeNode: (nodeId: string, value: unknown) => Promise<boolean>;
  subscribe: (nodeId: string, samplingInterval?: number) => Promise<string | null>;
  unsubscribe: (subscriptionId: string) => Promise<void>;
  createSubscription: (nodeIds: string[], samplingInterval?: number) => Promise<OPCUASubscription[]>;
  refresh: () => Promise<void>;
}

// Mock implementation for development
const mockOPCUAServer = {
  nodes: [
    {
      nodeId: 'ns=2;s=Device1',
      browseName: 'Device1',
      displayName: 'Device 1',
      nodeClass: 'Object' as const,
      children: [
        {
          nodeId: 'ns=2;s=Device1.Temperature',
          browseName: 'Temperature',
          displayName: 'Temperature',
          nodeClass: 'Variable' as const,
          value: 23.5,
          dataType: 'Double',
          description: 'Current temperature in Celsius',
        },
        {
          nodeId: 'ns=2;s=Device1.Pressure',
          browseName: 'Pressure',
          displayName: 'Pressure',
          nodeClass: 'Variable' as const,
          value: 101.3,
          dataType: 'Double',
          description: 'Current pressure in kPa',
        },
      ],
    },
  ],
};

export function useOPCUA(options: UseOPCUAOptions = {}): UseOPCUAReturn {
  const { autoConnect = false, reconnectInterval = 5000, maxReconnectAttempts = 5 } = options;

  const [connection, setConnection] = useState<OPCUAConnection | null>(null);
  const [nodes, setNodes] = useState<OPCUANode[]>([]);
  const [subscriptions, setSubscriptions] = useState<OPCUASubscription[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(async (config: OPCUAConfig): Promise<boolean> => {
    try {
      setIsConnecting(true);
      setError(null);

      // Simulate connection
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newConnection: OPCUAConnection = {
        id: `conn-${Date.now()}`,
        name: config.endpointUrl,
        endpointUrl: config.endpointUrl,
        status: 'connected',
        securityMode: config.securityMode,
        securityPolicy: config.securityPolicy,
        lastConnected: new Date(),
      };

      setConnection(newConnection);
      setIsConnected(true);
      setIsConnecting(false);
      reconnectAttemptsRef.current = 0;

      // Load initial nodes
      setNodes(mockOPCUAServer.nodes);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      setIsConnecting(false);
      setIsConnected(false);
      return false;
    }
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setConnection(prev => prev ? { ...prev, status: 'disconnected' } : null);
    setIsConnected(false);
    setSubscriptions([]);
  }, []);

  const browse = useCallback(async (nodeId: string): Promise<OPCUANode[]> => {
    if (!isConnected) {
      throw new Error('Not connected to OPC UA server');
    }

    // Simulate browsing
    await new Promise(resolve => setTimeout(resolve, 200));

    const node = mockOPCUAServer.nodes.find(n => n.nodeId === nodeId);
    return node?.children || [];
  }, [isConnected]);

  const readNode = useCallback(async (nodeId: string): Promise<unknown> => {
    if (!isConnected) {
      throw new Error('Not connected to OPC UA server');
    }

    // Simulate read
    await new Promise(resolve => setTimeout(resolve, 100));

    // Find node in mock data
    for (const node of mockOPCUAServer.nodes) {
      const child = node.children?.find(c => c.nodeId === nodeId);
      if (child) {
        return child.value;
      }
    }

    throw new Error(`Node not found: ${nodeId}`);
  }, [isConnected]);

  const writeNode = useCallback(async (nodeId: string, value: unknown): Promise<boolean> => {
    if (!isConnected) {
      throw new Error('Not connected to OPC UA server');
    }

    // Simulate write
    await new Promise(resolve => setTimeout(resolve, 150));

    // Update mock data
    for (const node of mockOPCUAServer.nodes) {
      const child = node.children?.find(c => c.nodeId === nodeId);
      if (child) {
        child.value = value;
        return true;
      }
    }

    return false;
  }, [isConnected]);

  const subscribe = useCallback(async (nodeId: string, samplingInterval = 1000): Promise<string | null> => {
    if (!isConnected) {
      return null;
    }

    const subscription: OPCUASubscription = {
      id: `sub-${Date.now()}`,
      nodeId,
      enabled: true,
      samplingInterval,
      lastValue: undefined,
      lastTimestamp: undefined,
    };

    setSubscriptions(prev => [...prev, subscription]);

    // Simulate subscription updates
    const updateInterval = setInterval(async () => {
      try {
        const value = await readNode(nodeId);
        setSubscriptions(prev => prev.map(s =>
          s.id === subscription.id
            ? { ...s, lastValue: value, lastTimestamp: new Date() }
            : s
        ));
      } catch {
        // Handle error silently for subscription updates
      }
    }, samplingInterval);

    // Store interval for cleanup
    return subscription.id;
  }, [isConnected, readNode]);

  const unsubscribe = useCallback(async (subscriptionId: string): Promise<void> => {
    setSubscriptions(prev => prev.filter(s => s.id !== subscriptionId));
  }, []);

  const createSubscription = useCallback(async (
    nodeIds: string[],
    samplingInterval = 1000
  ): Promise<OPCUASubscription[]> => {
    const newSubscriptions: OPCUASubscription[] = [];

    for (const nodeId of nodeIds) {
      const subId = await subscribe(nodeId, samplingInterval);
      if (subId) {
        const sub = subscriptions.find(s => s.id === subId);
        if (sub) {
          newSubscriptions.push(sub);
        }
      }
    }

    return newSubscriptions;
  }, [subscribe, subscriptions]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!isConnected) return;

    // Refresh all subscription values
    for (const sub of subscriptions) {
      try {
        const value = await readNode(sub.nodeId);
        setSubscriptions(prev => prev.map(s =>
          s.id === sub.id
            ? { ...s, lastValue: value, lastTimestamp: new Date() }
            : s
        ));
      } catch {
        // Handle error silently
      }
    }
  }, [isConnected, subscriptions, readNode]);

  // Auto-reconnect logic
  useEffect(() => {
    if (connection?.status === 'error' && reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current++;
        // Attempt reconnection with previous config
      }, reconnectInterval);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connection?.status, reconnectInterval, maxReconnectAttempts]);

  return {
    connection,
    nodes,
    subscriptions,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    browse,
    readNode,
    writeNode,
    subscribe,
    unsubscribe,
    createSubscription,
    refresh,
  };
}

export default useOPCUA;
