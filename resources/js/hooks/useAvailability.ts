import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'

interface AvailabilityUpdate {
  eventId:    string
  categoryId: string
  available:  number
}

export function useAvailability(
  wsBaseUrl: string | null,
  onUpdate: (eventId: string, categoryId: string, available: number) => void
) {
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

  useEffect(() => {
    if (!wsBaseUrl) return

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${wsBaseUrl}/hubs/notifications`, {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('CategoryAvailabilityUpdate', (payload: AvailabilityUpdate) => {
      onUpdateRef.current(payload.eventId, payload.categoryId, payload.available)
    })

    conn.start().catch(err => console.warn('Availability WS connect failed:', err))

    return () => { conn.stop() }
  }, [wsBaseUrl])
}
