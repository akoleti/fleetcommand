/**
 * Socket.io Server Configuration
 * Owner: GPS-01
 * 
 * Real-time WebSocket server for GPS location broadcasts, alerts, and notifications
 * Uses Upstash Redis adapter for multi-instance support
 */

import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

let io: SocketIOServer | null = null

/**
 * Initialize Socket.io server
 */
export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    console.log('⚠️  Socket.io server already initialized')
    return io
  }

  // Create Socket.io server
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  })

  // Set up Redis adapter for multi-instance broadcasting
  setupRedisAdapter(io)

  // Set up event handlers
  setupEventHandlers(io)

  console.log('✅ Socket.io server initialized')

  return io
}

/**
 * Set up Redis adapter for multi-instance Socket.io
 */
async function setupRedisAdapter(io: SocketIOServer): Promise<void> {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL

  if (!redisUrl) {
    console.warn('⚠️  Redis not configured. Socket.io will run in single-instance mode.')
    return
  }

  try {
    const pubClient = createClient({ url: redisUrl })
    const subClient = pubClient.duplicate()

    await Promise.all([pubClient.connect(), subClient.connect()])

    io.adapter(createAdapter(pubClient, subClient))

    console.log('✅ Socket.io Redis adapter configured')
  } catch (error) {
    console.error('❌ Failed to set up Redis adapter:', error)
  }
}

/**
 * Set up Socket.io event handlers
 */
function setupEventHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`)

    // Join fleet room (all trucks)
    socket.on('join:fleet', () => {
      socket.join('fleet')
      console.log(`[Socket.io] ${socket.id} joined fleet room`)
      socket.emit('joined:fleet', { success: true })
    })

    // Join specific truck room
    socket.on('join:truck', (truckId: string) => {
      if (!truckId || typeof truckId !== 'string') {
        socket.emit('error', { message: 'Invalid truckId' })
        return
      }

      socket.join(`truck:${truckId}`)
      console.log(`[Socket.io] ${socket.id} joined truck:${truckId} room`)
      socket.emit('joined:truck', { truckId, success: true })
    })

    // Leave truck room
    socket.on('leave:truck', (truckId: string) => {
      if (!truckId || typeof truckId !== 'string') {
        return
      }

      socket.leave(`truck:${truckId}`)
      console.log(`[Socket.io] ${socket.id} left truck:${truckId} room`)
    })

    // Leave fleet room
    socket.on('leave:fleet', () => {
      socket.leave('fleet')
      console.log(`[Socket.io] ${socket.id} left fleet room`)
    })

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Client disconnected: ${socket.id} (${reason})`)
    })

    // Ping/pong for connection testing
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() })
    })
  })

  console.log('✅ Socket.io event handlers configured')
}

/**
 * Get Socket.io server instance
 */
export function getSocketServer(): SocketIOServer | null {
  return io
}

/**
 * Broadcast truck location update to all fleet viewers
 */
export function broadcastTruckLocation(data: {
  truckId: string
  lat: number
  lng: number
  speed: number
  heading: number
  fuelLevel: number
  ignitionOn: boolean
  movementStatus: string
  timestamp: string
}): void {
  if (!io) {
    console.warn('⚠️  Socket.io not initialized. Cannot broadcast truck location.')
    return
  }

  // Broadcast to fleet room (all viewers)
  io.to('fleet').emit('truck:location', data)

  // Broadcast to specific truck room
  io.to(`truck:${data.truckId}`).emit('truck:location', data)

  console.log(`[Socket.io] Broadcast truck:location for ${data.truckId}`)
}

/**
 * Broadcast truck status change
 */
export function broadcastTruckStatus(data: {
  truckId: string
  status: string
  previousStatus?: string
  timestamp: string
}): void {
  if (!io) {
    console.warn('⚠️  Socket.io not initialized. Cannot broadcast truck status.')
    return
  }

  io.to('fleet').emit('truck:status', data)
  io.to(`truck:${data.truckId}`).emit('truck:status', data)

  console.log(`[Socket.io] Broadcast truck:status for ${data.truckId}`)
}

/**
 * Broadcast new alert
 */
export function broadcastAlert(data: {
  alertId: string
  truckId?: string
  type: string
  severity: string
  title: string
  message: string
  timestamp: string
}): void {
  if (!io) {
    console.warn('⚠️  Socket.io not initialized. Cannot broadcast alert.')
    return
  }

  // Broadcast to all fleet viewers
  io.to('fleet').emit('alert:new', data)

  // If alert is truck-specific, broadcast to truck room
  if (data.truckId) {
    io.to(`truck:${data.truckId}`).emit('alert:new', data)
  }

  console.log(`[Socket.io] Broadcast alert:new - ${data.type}`)
}

/**
 * Broadcast alert resolution
 */
export function broadcastAlertResolved(data: {
  alertId: string
  truckId?: string
  acknowledgedBy: string
  timestamp: string
}): void {
  if (!io) {
    console.warn('⚠️  Socket.io not initialized. Cannot broadcast alert resolution.')
    return
  }

  io.to('fleet').emit('alert:resolved', data)

  if (data.truckId) {
    io.to(`truck:${data.truckId}`).emit('alert:resolved', data)
  }

  console.log(`[Socket.io] Broadcast alert:resolved - ${data.alertId}`)
}

/**
 * Broadcast fuel update
 */
export function broadcastFuelUpdate(data: {
  truckId: string
  fuelLevel: number
  previousFuelLevel: number
  timestamp: string
}): void {
  if (!io) {
    return
  }

  io.to('fleet').emit('fuel:update', data)
  io.to(`truck:${data.truckId}`).emit('fuel:update', data)
}

/**
 * Broadcast maintenance update
 */
export function broadcastMaintenanceUpdate(data: {
  truckId: string
  maintenanceId: string
  type: string
  status: string
  timestamp: string
}): void {
  if (!io) {
    return
  }

  io.to('fleet').emit('maintenance:update', data)
  io.to(`truck:${data.truckId}`).emit('maintenance:update', data)
}

/**
 * Send direct message to specific client
 */
export function sendToClient(socketId: string, event: string, data: any): void {
  if (!io) {
    return
  }

  io.to(socketId).emit(event, data)
}

/**
 * Get connected client count
 */
export function getConnectedClientCount(): number {
  if (!io) {
    return 0
  }

  return io.engine.clientsCount
}

/**
 * Get clients in a specific room
 */
export async function getClientsInRoom(room: string): Promise<string[]> {
  if (!io) {
    return []
  }

  const sockets = await io.in(room).fetchSockets()
  return sockets.map(s => s.id)
}

/**
 * Gracefully close Socket.io server
 */
export async function closeSocketServer(): Promise<void> {
  if (io) {
    await io.close()
    io = null
    console.log('✅ Socket.io server closed')
  }
}

/**
 * Socket.io event types (for type safety)
 */
export type SocketEvents = {
  // Client -> Server
  'join:fleet': () => void
  'join:truck': (truckId: string) => void
  'leave:fleet': () => void
  'leave:truck': (truckId: string) => void
  ping: () => void

  // Server -> Client
  'joined:fleet': (data: { success: boolean }) => void
  'joined:truck': (data: { truckId: string; success: boolean }) => void
  'truck:location': (data: {
    truckId: string
    lat: number
    lng: number
    speed: number
    heading: number
    fuelLevel: number
    ignitionOn: boolean
    movementStatus: string
    timestamp: string
  }) => void
  'truck:status': (data: {
    truckId: string
    status: string
    previousStatus?: string
    timestamp: string
  }) => void
  'alert:new': (data: {
    alertId: string
    truckId?: string
    type: string
    severity: string
    title: string
    message: string
    timestamp: string
  }) => void
  'alert:resolved': (data: {
    alertId: string
    truckId?: string
    acknowledgedBy: string
    timestamp: string
  }) => void
  'fuel:update': (data: {
    truckId: string
    fuelLevel: number
    previousFuelLevel: number
    timestamp: string
  }) => void
  'maintenance:update': (data: {
    truckId: string
    maintenanceId: string
    type: string
    status: string
    timestamp: string
  }) => void
  pong: (data: { timestamp: string }) => void
  error: (data: { message: string }) => void
}
