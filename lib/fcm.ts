import * as admin from 'firebase-admin'
import type { Alert } from '@prisma/client'

let app: admin.app.App | null = null

function initFirebase(): admin.app.App | null {
  if (app) return app

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!serviceAccountJson) {
    console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT not configured, skipping push')
    return null
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson)
    app = admin.apps.length > 0
      ? admin.apps[0]!
      : admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        })
    return app
  } catch (error) {
    console.error('[FCM] Failed to initialize Firebase:', error)
    return null
  }
}

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const firebaseApp = initFirebase()
    if (!firebaseApp) return false

    await admin.messaging(firebaseApp).send({
      token: fcmToken,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: { channelId: 'fleet_alerts' },
      },
      apns: {
        payload: {
          aps: { sound: 'default', badge: 1 },
        },
      },
    })
    return true
  } catch (error: any) {
    // Token may be stale/unregistered — log but don't propagate
    if (error?.code === 'messaging/registration-token-not-registered') {
      console.warn(`[FCM] Stale token detected: ${fcmToken.slice(0, 12)}...`)
    } else {
      console.error('[FCM] Failed to send push notification:', error)
    }
    return false
  }
}

export async function sendAlertPush(
  alert: Pick<Alert, 'id' | 'type' | 'severity' | 'title' | 'message'>,
  fcmToken: string
): Promise<boolean> {
  return sendPushNotification(fcmToken, alert.title, alert.message, {
    alertId: alert.id,
    type: alert.type,
    severity: alert.severity,
  })
}
