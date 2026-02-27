import sgMail from '@sendgrid/mail'
import type { Alert, AlertSeverity, AlertType } from '@prisma/client'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@fleetcommand.com'

let initialized = false

function init() {
  if (initialized || !SENDGRID_API_KEY) return
  sgMail.setApiKey(SENDGRID_API_KEY)
  initialized = true
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    init()
    if (!SENDGRID_API_KEY) {
      console.warn('[SendGrid] API key not configured, skipping email')
      return false
    }

    await sgMail.send({ to, from: FROM_EMAIL, subject, html })
    return true
  } catch (error) {
    console.error('[SendGrid] Failed to send email:', error)
    return false
  }
}

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  INFO: '#3b82f6',
  WARNING: '#f59e0b',
  CRITICAL: '#ef4444',
}

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  INFO: 'Information',
  WARNING: 'Warning',
  CRITICAL: 'Critical Alert',
}

function alertEmailTemplate(alert: Pick<Alert, 'type' | 'severity' | 'title' | 'message' | 'createdAt'>): string {
  const color = SEVERITY_COLORS[alert.severity]
  const label = SEVERITY_LABELS[alert.severity]

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:${color};padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600;">${label}</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">${alert.title}</h2>
      <p style="margin:0 0 24px;color:#71717a;font-size:14px;">${new Date(alert.createdAt).toLocaleString()}</p>
      <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.6;">${alert.message}</p>
      <div style="background:#f4f4f5;border-radius:8px;padding:12px 16px;font-size:13px;color:#52525b;">
        <strong>Type:</strong> ${alert.type.replace(/_/g, ' ')} &nbsp;&bull;&nbsp; <strong>Severity:</strong> ${alert.severity}
      </div>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e4e4e7;text-align:center;">
      <p style="margin:0;font-size:12px;color:#a1a1aa;">FleetCommand &mdash; Fleet Management Platform</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendAlertEmail(
  alert: Pick<Alert, 'type' | 'severity' | 'title' | 'message' | 'createdAt'>,
  recipientEmail: string
): Promise<boolean> {
  const subject = `[FleetCommand ${alert.severity}] ${alert.title}`
  const html = alertEmailTemplate(alert)
  return sendEmail(recipientEmail, subject, html)
}

export async function sendInsuranceExpiryEmail(
  recipientEmail: string,
  truckInfo: string,
  policyNumber: string,
  expiryDate: Date,
  daysRemaining: number
): Promise<boolean> {
  const isCritical = daysRemaining <= 7
  const severity: AlertSeverity = isCritical ? 'CRITICAL' : 'WARNING'
  const subject = `[FleetCommand] Insurance ${isCritical ? 'Expiring Soon' : 'Expiry Notice'} — ${truckInfo}`

  const html = alertEmailTemplate({
    type: isCritical ? 'INSURANCE_EXPIRY_CRITICAL' : 'INSURANCE_EXPIRY_WARNING' as AlertType,
    severity,
    title: `Insurance Policy Expiring — ${truckInfo}`,
    message: `Policy <strong>${policyNumber}</strong> for <strong>${truckInfo}</strong> expires on <strong>${expiryDate.toLocaleDateString()}</strong> (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining). Please renew immediately to avoid coverage gaps.`,
    createdAt: new Date(),
  })

  return sendEmail(recipientEmail, subject, html)
}

export async function sendMaintenanceDueEmail(
  recipientEmail: string,
  truckInfo: string,
  maintenanceType: string,
  dueDate: Date
): Promise<boolean> {
  const subject = `[FleetCommand] Maintenance Due — ${truckInfo}`

  const html = alertEmailTemplate({
    type: 'MAINTENANCE_DUE' as AlertType,
    severity: 'WARNING',
    title: `Maintenance Due — ${truckInfo}`,
    message: `<strong>${maintenanceType}</strong> maintenance for <strong>${truckInfo}</strong> was due on <strong>${dueDate.toLocaleDateString()}</strong>. Please schedule service as soon as possible.`,
    createdAt: new Date(),
  })

  return sendEmail(recipientEmail, subject, html)
}
