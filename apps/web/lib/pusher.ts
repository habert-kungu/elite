import Pusher from 'pusher'

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || 'your-app-id',
  key: process.env.PUSHER_KEY || 'your-key',
  secret: process.env.PUSHER_SECRET || 'your-secret',
  cluster: process.env.PUSHER_CLUSTER || 'us2',
  useTLS: true,
})

export const CHANNELS = {
  USER: (userId: string) => `user-${userId}`,
  ADMIN: 'admin-notifications',
}

export const EVENTS = {
  INVESTMENT_CREATED: 'investment:created',
  INVESTMENT_APPROVED: 'investment:approved',
  INVESTMENT_REJECTED: 'investment:rejected',
  INVESTMENT_UPDATED: 'investment:updated',
  CYCLE_COMPLETED: 'cycle:completed',
  WITHDRAWAL_REQUESTED: 'withdrawal:requested',
  WITHDRAWAL_PROCESSED: 'withdrawal:processed',
}

export async function triggerNotification(channel: string, event: string, data: any) {
  try {
    await pusherServer.trigger(channel, event, data)
    return true
  } catch (error) {
    console.error('Pusher trigger error:', error)
    return false
  }
}