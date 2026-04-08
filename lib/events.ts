export type SSEEventType =
  | 'starter:created'
  | 'starter:updated'
  | 'starter:deleted'
  | 'task:created'
  | 'task:updated'
  | 'task:completed'
  | 'notification:new'

export interface SSEEvent {
  type: SSEEventType
  entityId: string
  payload?: Record<string, unknown>
}

type ClientCallback = (event: SSEEvent) => void

interface Client {
  id: string
  entityIds: Set<string>
  callback: ClientCallback
}

class EventBus {
  private clients = new Map<string, Client>()
  private clientCounter = 0

  subscribe(entityIds: string[], callback: ClientCallback): string {
    const id = `sse-${++this.clientCounter}-${Date.now()}`
    this.clients.set(id, {
      id,
      entityIds: new Set(entityIds),
      callback,
    })
    return id
  }

  unsubscribe(clientId: string): void {
    this.clients.delete(clientId)
  }

  emit(event: SSEEvent): void {
    for (const client of this.clients.values()) {
      if (client.entityIds.has(event.entityId) || client.entityIds.has('*')) {
        try {
          client.callback(event)
        } catch {
          this.clients.delete(client.id)
        }
      }
    }
  }

  get connectionCount(): number {
    return this.clients.size
  }
}

const globalForEvents = globalThis as unknown as { eventBus: EventBus }
export const eventBus = globalForEvents.eventBus ?? new EventBus()
if (process.env.NODE_ENV !== 'production') globalForEvents.eventBus = eventBus
