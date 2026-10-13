// In-process pub/sub shared between Next route handlers and the WebSocket server.
export type MessageDto = {
  id: number;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: number;
  file: { id: string; name: string; size: number; image: boolean } | null;
};

export type HubEvent = { type: "message"; message: MessageDto };
type Listener = (e: HubEvent) => void;

const g = globalThis as unknown as { __hubSubs?: Map<string, Set<Listener>> };
const subs: Map<string, Set<Listener>> = (g.__hubSubs ??= new Map());

/** key = a conversation id, or "*" for the admin (sees every conversation). */
export function subscribe(key: string, fn: Listener) {
  let set = subs.get(key);
  if (!set) subs.set(key, (set = new Set()));
  set.add(fn);
  return () => {
    set.delete(fn);
  };
}

export function publish(conversationId: string, e: HubEvent) {
  for (const key of [conversationId, "*"]) subs.get(key)?.forEach((fn) => fn(e));
}
