import Twilio from 'twilio'
import type { Alert } from '@prisma/client'

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER

let client: Twilio.Twilio | null = null

function getClient(): Twilio.Twilio | null {
  if (client) return client
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    console.warn('[Twilio] Credentials not configured, skipping SMS')
    return null
  }
  client = Twilio(ACCOUNT_SID, AUTH_TOKEN)
  return client
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  try {
    const twilioClient = getClient()
    if (!twilioClient || !FROM_NUMBER) return false

    await twilioClient.messages.create({
      to,
      from: FROM_NUMBER,
      body,
    })
    return true
  } catch (error) {
    console.error('[Twilio] Failed to send SMS:', error)
    return false
  }
}

export async function sendAlertSms(
  alert: Pick<Alert, 'type' | 'severity' | 'title' | 'message'>,
  phoneNumber: string
): Promise<boolean> {
  const body = `[FleetCommand ${alert.severity}] ${alert.title}\n${alert.message}`.slice(0, 1600)
  return sendSms(phoneNumber, body)
}
