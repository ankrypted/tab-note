// Notes belong to a tab. They are kept in chrome.storage.local so they can come
// back when the browser restores its session, but they are deleted when their
// tab closes. The small interface keeps persistence swappable (NFR-11).
//
// Tab ids change across a browser restart, so restoring works like this:
//  1. At startup every stored note moves to a "pending" list with a deadline.
//  2. Each restored tab adopts the pending note with the same URL.
//  3. Notes nobody adopts before the deadline are deleted.

const PREFIX = "note:";
const PENDING = "pending";

export const NOTE_PREFIX = PREFIX;
export const MAX_NOTE_CHARS = 100_000;
export const ORPHAN_GRACE_MS = 2 * 60 * 1000;     // closed with its window: wait, then delete
export const RESTORE_WINDOW_MS = 3 * 60 * 1000;   // time restored tabs have to claim a note

// A note is unsaved while it has changed since it was last saved to a file.
export function isUnsaved(note) {
  return !!note && note.updatedAt > (note.exportedAt ?? 0);
}

export function tabIdFromKey(key) {
  return key.startsWith(PREFIX) ? Number(key.slice(PREFIX.length)) : null;
}

export function createNoteStore(area = chrome.storage.local) {
  const store = {
    async get(tabId) {
      const k = PREFIX + tabId;
      return (await area.get(k))[k] ?? null;
    },

    // Blank text removes the note. Unchanged text keeps its timestamps.
    async save(tabId, text, meta = {}, now = Date.now()) {
      if (text.trim() === "") {
        await store.remove(tabId);
        return null;
      }
      const k = PREFIX + tabId;
      const existing = (await area.get(k))[k];
      const clipped = text.slice(0, MAX_NOTE_CHARS);
      const note = {
        ...existing,
        text: clipped,
        url: meta.url ?? existing?.url ?? "",
        title: meta.title ?? existing?.title ?? "",
        updatedAt: existing && existing.text === clipped ? existing.updatedAt : now,
      };
      delete note.orphanedAt;
      await area.set({ [k]: note });
      return note;
    },

    // Update url/title of an existing note (never creates one).
    async setMeta(tabId, meta) {
      const existing = await store.get(tabId);
      if (!existing) return null;
      const note = { ...existing };
      if (meta.url !== undefined) note.url = meta.url;
      if (meta.title !== undefined) note.title = meta.title;
      await area.set({ [PREFIX + tabId]: note });
      return note;
    },

    async markExported(tabId, now = Date.now()) {
      const existing = await store.get(tabId);
      if (!existing) return null;
      const note = { ...existing, exportedAt: Math.max(now, existing.updatedAt) };
      await area.set({ [PREFIX + tabId]: note });
      return note;
    },

    async remove(tabId) {
      await area.remove(PREFIX + tabId);
    },

    // Newest first.
    async list() {
      const all = await area.get(null);
      return Object.entries(all)
        .filter(([k]) => k.startsWith(PREFIX))
        .map(([k, v]) => ({ tabId: Number(k.slice(PREFIX.length)), ...v }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },

    // A tab closed together with its window: keep the note briefly in case the
    // browser is quitting (it may be restored), otherwise sweep() deletes it.
    async orphan(tabId, now = Date.now()) {
      const existing = await store.get(tabId);
      if (!existing) return;
      await area.set({ [PREFIX + tabId]: { ...existing, orphanedAt: now } });
    },

    // Delete notes whose tab is gone for longer than the grace period.
    async sweep(openTabIds, now = Date.now()) {
      const open = new Set(openTabIds);
      const toDelete = [];
      const toMark = {};
      for (const n of await store.list()) {
        if (open.has(n.tabId)) continue;
        const { tabId, ...rest } = n;
        if (n.orphanedAt === undefined) toMark[PREFIX + tabId] = { ...rest, orphanedAt: now };
        else if (now - n.orphanedAt > ORPHAN_GRACE_MS) toDelete.push(PREFIX + tabId);
      }
      if (Object.keys(toMark).length) await area.set(toMark);
      if (toDelete.length) await area.remove(toDelete);
      return toDelete.length;
    },

    /* ----- session restore ----- */

    // Browser just started: every stored note waits for its tab to come back.
    async beginRestore(now = Date.now()) {
      const notes = await store.list();
      if (!notes.length) return 0;
      const { [PENDING]: prior } = await area.get(PENDING);
      const items = notes.map(({ tabId, orphanedAt, ...rest }) => rest);
      await area.set({
        [PENDING]: { until: now + RESTORE_WINDOW_MS, items: [...(prior?.items ?? []), ...items] },
      });
      await area.remove(notes.map((n) => PREFIX + n.tabId));
      return items.length;
    },

    async hasPending(now = Date.now()) {
      const { [PENDING]: p } = await area.get(PENDING);
      return !!p && p.until > now && p.items.length > 0;
    },

    // A tab at `url` appeared: give it the pending note for that URL, if any.
    async adopt(tabId, url, now = Date.now()) {
      if (!url) return null;
      const { [PENDING]: p } = await area.get(PENDING);
      if (!p || p.until <= now) return null;
      if (await store.get(tabId)) return null;
      const i = p.items.findIndex((it) => it.url === url);
      if (i === -1) return null;
      const [item] = p.items.splice(i, 1);
      await area.set({ [PREFIX + tabId]: item });
      if (p.items.length) await area.set({ [PENDING]: p });
      else await area.remove(PENDING);
      return item;
    },

    // Drop pending notes nobody claimed in time.
    async expirePending(now = Date.now()) {
      const { [PENDING]: p } = await area.get(PENDING);
      if (p && p.until <= now) {
        await area.remove(PENDING);
        return p.items.length;
      }
      return 0;
    },

    // A tab was swapped for another (e.g. prerender): carry its note across.
    async move(fromTabId, toTabId) {
      const existing = await store.get(fromTabId);
      if (!existing) return;
      await area.set({ [PREFIX + toTabId]: existing });
      await area.remove(PREFIX + fromTabId);
    },
  };
  return store;
}
