import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Ref-counted realtime channel manager.
 *
 * Multiple components can call subscribe() for the same channel name.
 * The Supabase channel is created only on the first subscriber and
 * removed only when the last subscriber unsubscribes.
 *
 * Usage inside a store's subscribeRealtime():
 *
 *   subscribeRealtime() {
 *     return refChannel('erp_foo_rt', (ch) =>
 *       ch.on('postgres_changes', { event: '*', schema: 'public', table: 'erp_foo' }, handler)
 *     )
 *   }
 */

interface ChannelEntry {
  channel: RealtimeChannel
  count: number
}

const registry = new Map<string, ChannelEntry>()

export function refChannel(
  name: string,
  setup: (ch: RealtimeChannel) => RealtimeChannel,
): () => void {
  const existing = registry.get(name)

  if (existing) {
    existing.count++
  } else {
    const ch = setup(supabase.channel(name)).subscribe()
    registry.set(name, { channel: ch, count: 1 })
  }

  return () => {
    const entry = registry.get(name)
    if (!entry) return
    entry.count--
    if (entry.count === 0) {
      void supabase.removeChannel(entry.channel)
      registry.delete(name)
    }
  }
}
