/**
 * Database Client and Helpers for Modbus Scanner Commercial Product
 * 
 * This module provides:
 * - Singleton Prisma client for optimal performance
 * - Transaction helpers
 * - Soft delete utilities
 * - Query helpers for common operations
 * - Type-safe model helpers
 */

import { Prisma, PrismaClient } from '@prisma/client'

// ============================================================================
// PRISMA CLIENT SINGLETON
// ============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Database client instance
 * Uses singleton pattern to prevent multiple connections in development
 */
export const db = globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    errorFormat: 'pretty',
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// ============================================================================
// SOFT DELETE UTILITIES
// ============================================================================

/**
 * Models that support soft delete
 */
export type SoftDeletableModel = 
  | 'User'
  | 'Role'
  | 'Device'
  | 'Connection'
  | 'Tag'
  | 'Alarm'
  | 'Flow'
  | 'EdgePipeline'
  | 'Driver'
  | 'UNSTopic'
  | 'NotificationChannel'
  | 'ScheduledTask'

/**
 * Soft delete a record by setting deletedAt timestamp
 */
export async function softDelete<T extends SoftDeletableModel>(
  model: T,
  id: string
): Promise<void> {
  const modelDelegate = db[model as keyof typeof db] as {
    update: (args: { where: { id: string }; data: { deletedAt: Date } }) => Promise<unknown>
  }
  
  await modelDelegate.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

/**
 * Restore a soft-deleted record
 */
export async function restoreDeleted<T extends SoftDeletableModel>(
  model: T,
  id: string
): Promise<void> {
  const modelDelegate = db[model as keyof typeof db] as {
    update: (args: { where: { id: string }; data: { deletedAt: null } }) => Promise<unknown>
  }
  
  await modelDelegate.update({
    where: { id },
    data: { deletedAt: null },
  })
}

/**
 * Hard delete a record (use with caution)
 */
export async function hardDelete<T extends SoftDeletableModel>(
  model: T,
  id: string
): Promise<void> {
  const modelDelegate = db[model as keyof typeof db] as {
    delete: (args: { where: { id: string } }) => Promise<unknown>
  }
  
  await modelDelegate.delete({
    where: { id },
  })
}

// ============================================================================
// TRANSACTION HELPERS
// ============================================================================

/**
 * Execute a callback within a database transaction
 */
export async function withTransaction<T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return db.$transaction(callback as (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>)
}

/**
 * Execute multiple operations in a batch transaction
 */
export async function batchOperation<T>(
  operations: Promise<T>[]
): Promise<T[]> {
  return db.$transaction(operations)
}

// ============================================================================
// USER HELPERS
// ============================================================================

/**
 * Get user with roles and permissions
 */
export async function getUserWithPermissions(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  })
}

/**
 * Check if user has specific permission
 */
export async function userHasPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const user = await getUserWithPermissions(userId)
  if (!user) return false

  return user.roles.some(userRole => 
    userRole.role.permissions.some(rp => 
      rp.permission.resource === resource && rp.permission.action === action
    )
  )
}

/**
 * Check if user has any of the specified roles
 */
export async function userHasRole(
  userId: string,
  roleNames: string[]
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: { role: true },
      },
    },
  })
  
  if (!user) return false
  
  return user.roles.some(ur => roleNames.includes(ur.role.name))
}

// ============================================================================
// DEVICE & CONNECTION HELPERS
// ============================================================================

/**
 * Get all active devices with their connections
 */
export async function getActiveDevicesWithConnections() {
  return db.device.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    include: {
      connections: {
        where: {
          isActive: true,
          deletedAt: null,
        },
      },
    },
  })
}

/**
 * Get device with all tags
 */
export async function getDeviceWithTags(deviceId: string) {
  return db.device.findUnique({
    where: { id: deviceId },
    include: {
      tags: {
        where: { deletedAt: null },
        include: {
          connection: true,
        },
      },
    },
  })
}

/**
 * Get connection with tags
 */
export async function getConnectionWithTags(connectionId: string) {
  return db.connection.findUnique({
    where: { id: connectionId },
    include: {
      tags: {
        where: {
          isActive: true,
          deletedAt: null,
        },
      },
    },
  })
}

/**
 * Get all active connections for polling
 */
export async function getActiveConnections() {
  return db.connection.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    include: {
      device: true,
      tags: {
        where: {
          isActive: true,
          deletedAt: null,
        },
      },
    },
  })
}

// ============================================================================
// TAG VALUE HELPERS
// ============================================================================

/**
 * Record a new tag value
 */
export async function recordTagValue(
  tagId: string,
  value: string,
  options: {
    rawValue?: string
    quality?: string
    qualityCode?: number
    source?: string
    notes?: string
  } = {}
) {
  return db.tagValue.create({
    data: {
      tagId,
      value,
      rawValue: options.rawValue,
      quality: options.quality ?? 'good',
      qualityCode: options.qualityCode ?? 192,
      source: options.source ?? 'poll',
      notes: options.notes,
    },
  })
}

/**
 * Get latest values for multiple tags
 */
export async function getLatestTagValues(tagIds: string[]) {
  const values = await db.tagValue.findMany({
    where: {
      tagId: { in: tagIds },
    },
    orderBy: {
      timestamp: 'desc',
    },
    distinct: ['tagId'],
  })
  
  return values.reduce((acc, value) => {
    acc[value.tagId] = value
    return acc
  }, {} as Record<string, typeof values[0]>)
}

/**
 * Get tag value history
 */
export async function getTagValueHistory(
  tagId: string,
  options: {
    startTime?: Date
    endTime?: Date
    limit?: number
  } = {}
) {
  const { startTime, endTime, limit = 1000 } = options
  
  return db.tagValue.findMany({
    where: {
      tagId,
      timestamp: {
        ...(startTime && { gte: startTime }),
        ...(endTime && { lte: endTime }),
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  })
}

// ============================================================================
// ALARM HELPERS
// ============================================================================

/**
 * Get active alarms
 */
export async function getActiveAlarms() {
  return db.alarm.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    include: {
      device: true,
      rules: {
        include: {
          tag: true,
        },
      },
    },
  })
}

/**
 * Trigger an alarm
 */
export async function triggerAlarm(
  alarmId: string,
  triggerValue: string,
  message?: string
) {
  const now = new Date()
  
  return db.$transaction([
    db.alarm.update({
      where: { id: alarmId },
      data: {
        state: 'active',
        isActive: true,
        isAcknowledged: false,
        triggeredAt: now,
        triggerValue,
        triggerMessage: message,
      },
    }),
    db.alarmHistory.create({
      data: {
        alarmId,
        eventType: 'triggered',
        oldState: 'normal',
        newState: 'active',
        value: triggerValue,
        message,
      },
    }),
  ])
}

/**
 * Acknowledge an alarm
 */
export async function acknowledgeAlarm(
  alarmId: string,
  userId: string,
  notes?: string
) {
  const now = new Date()
  
  return db.$transaction([
    db.alarm.update({
      where: { id: alarmId },
      data: {
        isAcknowledged: true,
        acknowledgedAt: now,
        acknowledgedBy: userId,
        state: 'acknowledged',
      },
    }),
    db.alarmHistory.create({
      data: {
        alarmId,
        eventType: 'acknowledged',
        oldState: 'active',
        newState: 'acknowledged',
        userId,
        notes,
      },
    }),
  ])
}

/**
 * Clear an alarm
 */
export async function clearAlarm(alarmId: string, notes?: string) {
  const now = new Date()
  
  return db.$transaction([
    db.alarm.update({
      where: { id: alarmId },
      data: {
        state: 'normal',
        isActive: false,
        isAcknowledged: false,
        clearedAt: now,
      },
    }),
    db.alarmHistory.create({
      data: {
        alarmId,
        eventType: 'cleared',
        oldState: 'acknowledged',
        newState: 'normal',
        notes,
      },
    }),
  ])
}

// ============================================================================
// AUDIT LOG HELPERS
// ============================================================================

/**
 * Log an audit event
 */
export async function logAuditEvent(options: {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  description?: string
  status?: 'success' | 'failure'
  errorMessage?: string
}) {
  return db.auditLog.create({
    data: {
      userId: options.userId,
      action: options.action,
      resource: options.resource,
      resourceId: options.resourceId,
      oldValues: options.oldValues ? JSON.stringify(options.oldValues) : null,
      newValues: options.newValues ? JSON.stringify(options.newValues) : null,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      description: options.description,
      status: options.status ?? 'success',
      errorMessage: options.errorMessage,
    },
  })
}

/**
 * Get audit log for a resource
 */
export async function getResourceAuditLog(
  resource: string,
  resourceId: string,
  options: { limit?: number } = {}
) {
  return db.auditLog.findMany({
    where: {
      resource,
      resourceId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: options.limit ?? 100,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })
}

// ============================================================================
// LICENSE HELPERS
// ============================================================================

/**
 * Get active license
 */
export async function getActiveLicense() {
  return db.license.findFirst({
    where: {
      isActive: true,
      isExpired: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  })
}

/**
 * Check if license allows feature
 */
export async function checkLicenseLimit(
  feature: 'devices' | 'tags' | 'connections' | 'users',
  currentCount: number
): Promise<{ allowed: boolean; limit: number }> {
  const license = await getActiveLicense()
  
  if (!license) {
    return { allowed: false, limit: 0 }
  }
  
  const limits = {
    devices: license.maxDevices,
    tags: license.maxTags,
    connections: license.maxConnections,
    users: license.maxUsers,
  }
  
  const limit = limits[feature]
  
  return {
    allowed: currentCount < limit,
    limit,
  }
}

// ============================================================================
// PERFORMANCE METRIC HELPERS
// ============================================================================

/**
 * Record a performance metric
 */
export async function recordMetric(options: {
  metricType: string
  metricName: string
  value: number
  unit?: string
  source?: string
  metadata?: Record<string, unknown>
}) {
  return db.performanceMetric.create({
    data: {
      metricType: options.metricType,
      metricName: options.metricName,
      value: options.value,
      unit: options.unit,
      source: options.source,
      metadata: options.metadata ? JSON.stringify(options.metadata) : null,
    },
  })
}

/**
 * Get metrics for a time range
 */
export async function getMetrics(options: {
  metricType?: string
  metricName?: string
  source?: string
  startTime: Date
  endTime: Date
  aggregation?: 'avg' | 'min' | 'max' | 'sum'
}) {
  const where = {
    timestamp: {
      gte: options.startTime,
      lte: options.endTime,
    },
    ...(options.metricType && { metricType: options.metricType }),
    ...(options.metricName && { metricName: options.metricName }),
    ...(options.source && { source: options.source }),
  }
  
  if (options.aggregation) {
    const result = await db.performanceMetric.aggregate({
      where,
      _avg: { value: true },
      _min: { value: true },
      _max: { value: true },
      _sum: { value: true },
      _count: true,
    })
    
    return {
      aggregation: options.aggregation,
      value: result[`_${options.aggregation}`]?.value ?? 0,
      count: result._count,
    }
  }
  
  return db.performanceMetric.findMany({
    where,
    orderBy: { timestamp: 'asc' },
  })
}

// ============================================================================
// SYSTEM CONFIG HELPERS
// ============================================================================

/**
 * Get system configuration value
 */
export async function getConfig<T = string>(
  key: string,
  defaultValue?: T
): Promise<T | undefined> {
  const config = await db.systemConfig.findUnique({
    where: { key },
  })
  
  if (!config) return defaultValue
  
  switch (config.valueType) {
    case 'number':
      return (config.value ? Number(config.value) : defaultValue) as T
    case 'boolean':
      return (config.value === 'true') as T
    case 'json':
      return (config.value ? JSON.parse(config.value) : defaultValue) as T
    default:
      return (config.value ?? defaultValue) as T
  }
}

/**
 * Set system configuration value
 */
export async function setConfig(
  key: string,
  value: unknown,
  valueType: 'string' | 'number' | 'boolean' | 'json' = 'string',
  options: { description?: string; isPublic?: boolean } = {}
) {
  const stringValue = valueType === 'json' 
    ? JSON.stringify(value)
    : String(value)
  
  return db.systemConfig.upsert({
    where: { key },
    update: {
      value: stringValue,
      valueType,
      description: options.description,
      isPublic: options.isPublic,
    },
    create: {
      key,
      value: stringValue,
      valueType,
      description: options.description,
      isPublic: options.isPublic,
    },
  })
}

// ============================================================================
// FLOW HELPERS
// ============================================================================

/**
 * Get published flows with nodes and edges
 */
export async function getPublishedFlows() {
  return db.flow.findMany({
    where: {
      isPublished: true,
      isActive: true,
      deletedAt: null,
    },
    include: {
      nodes: true,
      edges: true,
    },
  })
}

/**
 * Get flow with full configuration
 */
export async function getFlowWithConfig(flowId: string) {
  return db.flow.findUnique({
    where: { id: flowId },
    include: {
      nodes: {
        orderBy: { executionOrder: 'asc' },
      },
      edges: true,
    },
  })
}

// ============================================================================
// UNS HELPERS
// ============================================================================

/**
 * Get UNS topic tree
 */
export async function getUNSTopicTree() {
  const topics = await db.uNSTopic.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: { path: 'asc' },
  })
  
  return topics
}

/**
 * Get topic with tags for MQTT publishing
 */
export async function getTopicWithTags(topicId: string) {
  return db.uNSTopic.findUnique({
    where: { id: topicId },
    include: {
      tags: {
        where: { publishEnabled: true },
        include: { tag: true },
      },
    },
  })
}

// ============================================================================
// CLEANUP HELPERS
// ============================================================================

/**
 * Clean up old tag values (data retention)
 */
export async function cleanupOldTagValues(olderThanDays: number) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
  
  const result = await db.tagValue.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  })
  
  return result.count
}

/**
 * Clean up old performance metrics
 */
export async function cleanupOldMetrics(olderThanDays: number) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
  
  const result = await db.performanceMetric.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  })
  
  return result.count
}

/**
 * Clean up old audit logs
 */
export async function cleanupOldAuditLogs(olderThanDays: number) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
  
  const result = await db.auditLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  })
  
  return result.count
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy'
  latency: number
  error?: string
}> {
  const start = Date.now()
  
  try {
    await db.$queryRaw`SELECT 1`
    
    return {
      status: 'healthy',
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { Prisma }
export default db
