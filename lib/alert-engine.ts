import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { sendAlertEmail } from '@/lib/sendgrid'
import { sendAlertSms } from '@/lib/twilio'
import { sendAlertPush } from '@/lib/fcm'
import { AlertSeverity, AlertType, type Alert } from '@prisma/client'

interface CreateAlertParams {
  organizationId: string
  truckId?: string
  userId?: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  data?: Record<string, unknown>
}

export async function createAlert(params: CreateAlertParams): Promise<Alert> {
  const alert = await prisma.alert.create({
    data: {
      organizationId: params.organizationId,
      truckId: params.truckId,
      userId: params.userId,
      type: params.type,
      severity: params.severity,
      title: params.title,
      message: params.message,
      data: (params.data ?? {}) as Prisma.InputJsonValue,
    },
  })

  // Fire-and-forget — don't block the caller
  dispatchNotifications(alert).catch((err) =>
    console.error('[AlertEngine] Notification dispatch failed:', err)
  )

  return alert
}

/**
 * INFO  → email only
 * WARNING → email + push
 * CRITICAL → email + push + SMS
 */
export async function dispatchNotifications(alert: Alert): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      organizationId: alert.organizationId,
      isActive: true,
      role: { in: ['OWNER', 'MANAGER'] },
    },
    select: { email: true, phone: true, fcmToken: true },
  })

  const promises: Promise<boolean>[] = []

  for (const user of users) {
    promises.push(sendAlertEmail(alert, user.email))

    if (alert.severity !== AlertSeverity.INFO && user.fcmToken) {
      promises.push(sendAlertPush(alert, user.fcmToken))
    }

    if (alert.severity === AlertSeverity.CRITICAL && user.phone) {
      promises.push(sendAlertSms(alert, user.phone))
    }
  }

  await Promise.allSettled(promises)
}

// ---------------------------------------------------------------------------
// Periodic checks
// ---------------------------------------------------------------------------

const IDLE_THRESHOLD_MS = 4 * 60 * 60 * 1000 // 4 hours

export async function checkIdleTrucks(organizationId: string): Promise<Alert[]> {
  const threshold = new Date(Date.now() - IDLE_THRESHOLD_MS)

  const idleTrucks = await prisma.truck.findMany({
    where: {
      organizationId,
      status: 'IDLE',
      truckStatus: {
        lastPingAt: { lt: threshold },
        ignitionOn: false,
      },
    },
    include: {
      truckStatus: { select: { lastPingAt: true } },
    },
  })

  // Avoid duplicate alerts: skip trucks that already have an unacknowledged idle alert
  const existingAlertTruckIds = new Set(
    (
      await prisma.alert.findMany({
        where: {
          organizationId,
          type: AlertType.IDLE_ALERT,
          acknowledged: false,
          truckId: { in: idleTrucks.map((t) => t.id) },
        },
        select: { truckId: true },
      })
    ).map((a) => a.truckId)
  )

  const alerts: Alert[] = []

  for (const truck of idleTrucks) {
    if (existingAlertTruckIds.has(truck.id)) continue

    const idleHours = Math.round(
      (Date.now() - (truck.truckStatus?.lastPingAt?.getTime() ?? Date.now())) / 3600000
    )

    const alert = await createAlert({
      organizationId,
      truckId: truck.id,
      type: AlertType.IDLE_ALERT,
      severity: AlertSeverity.WARNING,
      title: `Truck ${truck.licensePlate} idle for ${idleHours}h`,
      message: `${truck.make} ${truck.model} (${truck.licensePlate}) has been idle for over ${idleHours} hours.`,
      data: { truckId: truck.id, idleHours },
    })
    alerts.push(alert)
  }

  return alerts
}

export async function checkInsuranceExpiry(organizationId: string): Promise<Alert[]> {
  const now = new Date()
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const expiringPolicies = await prisma.insurancePolicy.findMany({
    where: {
      organizationId,
      isActive: true,
      expiryDate: { lte: in30Days, gte: now },
    },
    include: {
      truck: { select: { id: true, licensePlate: true, make: true, model: true } },
    },
  })

  const existingAlertKeys = new Set(
    (
      await prisma.alert.findMany({
        where: {
          organizationId,
          type: { in: [AlertType.INSURANCE_EXPIRY_WARNING, AlertType.INSURANCE_EXPIRY_CRITICAL] },
          acknowledged: false,
        },
        select: { data: true },
      })
    ).map((a) => (a.data as any)?.policyId as string | undefined)
  )

  const alerts: Alert[] = []

  for (const policy of expiringPolicies) {
    if (existingAlertKeys.has(policy.id)) continue

    const daysRemaining = Math.ceil(
      (policy.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    )
    const isCritical = policy.expiryDate <= in7Days
    const truckLabel = `${policy.truck.make} ${policy.truck.model} (${policy.truck.licensePlate})`

    const alert = await createAlert({
      organizationId,
      truckId: policy.truck.id,
      type: isCritical ? AlertType.INSURANCE_EXPIRY_CRITICAL : AlertType.INSURANCE_EXPIRY_WARNING,
      severity: isCritical ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
      title: `Insurance expiring in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} — ${truckLabel}`,
      message: `Policy ${policy.policyNumber} (${policy.coverageType}) for ${truckLabel} expires on ${policy.expiryDate.toLocaleDateString()}.`,
      data: { policyId: policy.id, truckId: policy.truck.id, daysRemaining },
    })
    alerts.push(alert)
  }

  return alerts
}

export async function checkLicenseExpiry(organizationId: string): Promise<Alert[]> {
  const now = new Date()
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const expiringDrivers = await prisma.driver.findMany({
    where: {
      organizationId,
      licenseExpiry: { lte: in30Days, gte: now },
    },
  })

  const existingAlertKeys = new Set(
    (
      await prisma.alert.findMany({
        where: {
          organizationId,
          type: AlertType.LICENSE_EXPIRY,
          acknowledged: false,
        },
        select: { data: true },
      })
    ).map((a) => (a.data as any)?.driverId as string | undefined)
  )

  const alerts: Alert[] = []

  for (const driver of expiringDrivers) {
    if (existingAlertKeys.has(driver.id)) continue

    const daysRemaining = Math.ceil(
      (driver.licenseExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    )

    const alert = await createAlert({
      organizationId,
      type: AlertType.LICENSE_EXPIRY,
      severity: daysRemaining <= 7 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
      title: `License expiring in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} — ${driver.name}`,
      message: `Driver ${driver.name} (license ${driver.licenseNumber}) expires on ${driver.licenseExpiry.toLocaleDateString()}.`,
      data: { driverId: driver.id, daysRemaining },
    })
    alerts.push(alert)
  }

  return alerts
}

export async function checkMaintenanceDue(organizationId: string): Promise<Alert[]> {
  const now = new Date()

  const overdue = await prisma.maintenance.findMany({
    where: {
      truck: { organizationId },
      status: 'SCHEDULED',
      scheduledDate: { lt: now },
    },
    include: {
      truck: { select: { id: true, licensePlate: true, make: true, model: true, organizationId: true } },
    },
  })

  const existingAlertKeys = new Set(
    (
      await prisma.alert.findMany({
        where: {
          organizationId,
          type: AlertType.MAINTENANCE_DUE,
          acknowledged: false,
        },
        select: { data: true },
      })
    ).map((a) => (a.data as any)?.maintenanceId as string | undefined)
  )

  const alerts: Alert[] = []

  for (const record of overdue) {
    if (existingAlertKeys.has(record.id)) continue

    const truckLabel = `${record.truck.make} ${record.truck.model} (${record.truck.licensePlate})`
    const daysPast = Math.ceil(
      (now.getTime() - record.scheduledDate.getTime()) / (24 * 60 * 60 * 1000)
    )

    const alert = await createAlert({
      organizationId,
      truckId: record.truck.id,
      type: AlertType.MAINTENANCE_DUE,
      severity: daysPast > 14 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
      title: `Overdue maintenance — ${truckLabel}`,
      message: `${record.type.replace(/_/g, ' ')} for ${truckLabel} was due ${daysPast} day${daysPast === 1 ? '' : 's'} ago (${record.scheduledDate.toLocaleDateString()}).`,
      data: { maintenanceId: record.id, truckId: record.truck.id, daysPast },
    })
    alerts.push(alert)
  }

  return alerts
}

export interface AlertCheckSummary {
  idle: number
  insurance: number
  license: number
  maintenance: number
  total: number
}

export async function runAllChecks(organizationId: string): Promise<AlertCheckSummary> {
  const [idle, insurance, license, maintenance] = await Promise.all([
    checkIdleTrucks(organizationId),
    checkInsuranceExpiry(organizationId),
    checkLicenseExpiry(organizationId),
    checkMaintenanceDue(organizationId),
  ])

  return {
    idle: idle.length,
    insurance: insurance.length,
    license: license.length,
    maintenance: maintenance.length,
    total: idle.length + insurance.length + license.length + maintenance.length,
  }
}
