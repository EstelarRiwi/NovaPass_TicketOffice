import { useState, useEffect, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'

export interface PosNotif {
  id: string
  title: string
  desc: string
  type: string
}

export function useNotifications(wsBaseUrl: string | null, userId: string | null) {
  const [toasts, setToasts] = useState<PosNotif[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(n => n.id !== id))
  }, [])

  useEffect(() => {
    if (!wsBaseUrl || !userId) return

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${wsBaseUrl}/hubs/notifications`, {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('ReceiveNotification', (payload: { id?: string; title: string; desc: string; type: string }) => {
      const notif: PosNotif = {
        id: payload.id ?? crypto.randomUUID(),
        title: payload.title,
        desc: payload.desc,
        type: payload.type,
      }
      setToasts(prev => [notif, ...prev].slice(0, 5))
      setTimeout(() => {
        setToasts(cur => cur.filter(n => n.id !== notif.id))
      }, 5000)
    })

    conn.start().catch(err => console.warn('Notifications WS connect failed:', err))
    return () => { conn.stop() }
  }, [wsBaseUrl, userId])

  return { toasts, dismiss }
}
