import { useCallback } from 'react';

// Lightweight offline queue backed by localStorage.
// Any Supabase write goes through queueOrRun(): if it fails (network drop
// mid-set), the payload is stashed and retried automatically on reconnect.
const QUEUE_KEY = 'gym-tracker-pending-writes';

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function useLocalCache() {
  const enqueue = useCallback((table, payload) => {
    const queue = readQueue();
    queue.push({ table, payload, ts: Date.now() });
    writeQueue(queue);
  }, []);

  const flushQueue = useCallback(async (supabase) => {
    const queue = readQueue();
    if (!queue.length) return;
    const remaining = [];
    for (const item of queue) {
      const { error } = await supabase.from(item.table).upsert(item.payload);
      if (error) remaining.push(item);
    }
    writeQueue(remaining);
  }, []);

  // Cache last-known state per key so the UI can render instantly offline
  const cacheSet = useCallback((key, value) => {
    try {
      localStorage.setItem(`gym-tracker-cache:${key}`, JSON.stringify(value));
    } catch {
      /* storage full or unavailable — non-fatal */
    }
  }, []);

  const cacheGet = useCallback((key) => {
    try {
      const raw = localStorage.getItem(`gym-tracker-cache:${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  return { enqueue, flushQueue, cacheSet, cacheGet };
}
