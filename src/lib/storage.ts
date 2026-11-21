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
export const ORPHAN_GRACE_MS = 2 * 60 * 1000; // closed with its window: wait, then delete
export const RESTORE_WINDOW_MS = 3 * 60 * 1000; // time restored tabs have to claim a note

export interface Note {
  text: string;
  url: string;
  title: string;
  updatedAt: number;
  /** When the note was last saved to a file. */
  exportedAt?: number;
  /** When the note's tab disappeared together with its window. */
  orphanedAt?: number;
}

export interface StoredNote extends Note {
  tabId: number;
}

export interface NoteMeta {
  url?: string;
  title?: string;
}

interface Pending {
  until: number;
  items: Note[];
}

/** The slice of chrome.storage.StorageArea we use (and what tests fake). */
export interface StorageAreaLike {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

// A note is unsaved while it has changed since it was last saved to a file.
export function isUnsaved(note: Note | null | undefined): boolean {
  return !!note && note.updatedAt > (note.exportedAt ?? 0);
}

export function tabIdFromKey(key: string): number | null {
  return key.startsWith(PREFIX) ? Number(key.slice(PREFIX.length)) : null;
}

export type NoteStore = ReturnType<typeof createNoteStore>;

export function createNoteStore(area: StorageAreaLike = chrome.storage.local) {
  async function readNote(tabId: number): Promise<Note | null> {
    const k = PREFIX + tabId;
    return ((await area.get(k))[k] as Note | undefined) ?? null;
  }

  async function readPending(): Promise<Pending | undefined> {
    return (await area.get(PENDING))[PENDING] as Pending | undefined;
  }

  const store = {
    get: readNote,

    // Blank text removes the note. Unchanged text keeps its timestamps.
    async save(
      tabId: number,
      text: string,
      meta: NoteMeta = {},
      now: number = Date.now(),
    ): Promise<Note | null> {
      if (text.trim() === "") {
        await store.remove(tabId);
        return null;
      }
      const existing = await readNote(tabId);
      const clipped = text.slice(0, MAX_NOTE_CHARS);
      const note: Note = {
        ...existing,
        text: clipped,
        url: meta.url ?? existing?.url ?? "",
        title: meta.title ?? existing?.title ?? "",
        updatedAt: existing && existing.text === clipped ? existing.updatedAt : now,
      };
      delete note.orphanedAt;
      await area.set({ [PREFIX + tabId]: note });
      return note;
    },

    // Update url/title of an existing note (never creates one).
    async setMeta(tabId: number, meta: NoteMeta): Promise<Note | null> {
      const existing = await readNote(tabId);
      if (!existing) return null;
      const note = { ...existing };
      if (meta.url !== undefined) note.url = meta.url;
      if (meta.title !== undefined) note.title = meta.title;
      await area.set({ [PREFIX + tabId]: note });
      return note;
    },

    async markExported(tabId: number, now: number = Date.now()): Promise<Note | null> {
      const existing = await readNote(tabId);
      if (!existing) return null;
      const note = { ...existing, exportedAt: Math.max(now, existing.updatedAt) };
      await area.set({ [PREFIX + tabId]: note });
      return note;
    },

    async remove(tabId: number): Promise<void> {
      await area.remove(PREFIX + tabId);
    },

    // Newest first.
    async list(): Promise<StoredNote[]> {
      const all = await area.get(null);
      return Object.entries(all)
        .filter(([k]) => k.startsWith(PREFIX))
        .map(([k, v]) => ({ tabId: Number(k.slice(PREFIX.length)), ...(v as Note) }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },

    // A tab closed together with its window: keep the note briefly in case the
    // browser is quitting (it may be restored), otherwise sweep() deletes it.
    async orphan(tabId: number, now: number = Date.now()): Promise<void> {
      const existing = await readNote(tabId);
      if (!existing) return;
      await area.set({ [PREFIX + tabId]: { ...existing, orphanedAt: now } });
    },

    // Delete notes whose tab is gone for longer than the grace period.
    async sweep(openTabIds: number[], now: number = Date.now()): Promise<number> {
      const open = new Set(openTabIds);
      const toDelete: string[] = [];
      const toMark: Record<string, Note> = {};
      for (const { tabId, ...note } of await store.list()) {
        if (open.has(tabId)) continue;
        if (note.orphanedAt === undefined) toMark[PREFIX + tabId] = { ...note, orphanedAt: now };
        else if (now - note.orphanedAt > ORPHAN_GRACE_MS) toDelete.push(PREFIX + tabId);
      }
      if (Object.keys(toMark).length) await area.set(toMark);
      if (toDelete.length) await area.remove(toDelete);
      return toDelete.length;
    },

    /* ----- session restore ----- */

    // Browser just started: every stored note waits for its tab to come back.
    async beginRestore(now: number = Date.now()): Promise<number> {
      const notes = await store.list();
      if (!notes.length) return 0;
      const prior = await readPending();
      const items = notes.map(({ tabId: _tabId, orphanedAt: _orphanedAt, ...rest }) => rest);
      await area.set({
        [PENDING]: { until: now + RESTORE_WINDOW_MS, items: [...(prior?.items ?? []), ...items] },
      });
      await area.remove(notes.map((n) => PREFIX + n.tabId));
      return items.length;
    },

    async hasPending(now: number = Date.now()): Promise<boolean> {
      const p = await readPending();
      return !!p && p.until > now && p.items.length > 0;
    },

    // A tab at `url` appeared: give it the pending note for that URL, if any.
    async adopt(
      tabId: number,
      url: string | undefined,
      now: number = Date.now(),
    ): Promise<Note | null> {
      if (!url) return null;
      const p = await readPending();
      if (!p || p.until <= now) return null;
      if (await readNote(tabId)) return null;
      const i = p.items.findIndex((it) => it.url === url);
      if (i === -1) return null;
      const item = p.items.splice(i, 1)[0];
      if (!item) return null;
      await area.set({ [PREFIX + tabId]: item });
      if (p.items.length) await area.set({ [PENDING]: p });
      else await area.remove(PENDING);
      return item;
    },

    // Drop pending notes nobody claimed in time.
    async expirePending(now: number = Date.now()): Promise<number> {
      const p = await readPending();
      if (p && p.until <= now) {
        await area.remove(PENDING);
        return p.items.length;
      }
      return 0;
    },

    // A tab was swapped for another (e.g. prerender): carry its note across.
    async move(fromTabId: number, toTabId: number): Promise<void> {
      const existing = await readNote(fromTabId);
      if (!existing) return;
      await area.set({ [PREFIX + toTabId]: existing });
      await area.remove(PREFIX + fromTabId);
    },
  };
  return store;
}
