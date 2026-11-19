// Notes belong to a tab and live in session memory only (chrome.storage.session):
// nothing is written to disk, and everything is gone when the browser closes.
// The small interface keeps persistence swappable later (NFR-11).

const PREFIX = "note:";
export const NOTE_PREFIX = PREFIX;
export const MAX_NOTE_CHARS = 100_000;

export function createNoteStore(area = chrome.storage.session) {
  return {
    async get(tabId) {
      const k = PREFIX + tabId;
      const data = await area.get(k);
      return data[k] ?? null;
    },

    // Blank text removes the note. Returns the saved note, or null.
    async save(tabId, text) {
      const k = PREFIX + tabId;
      if (text.trim() === "") {
        await area.remove(k);
        return null;
      }
      const note = { text: text.slice(0, MAX_NOTE_CHARS), updatedAt: Date.now() };
      await area.set({ [k]: note });
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

    // Drop notes whose tab no longer exists.
    async prune(openTabIds) {
      const open = new Set(openTabIds);
      const stale = (await this.list()).filter((n) => !open.has(n.tabId));
      if (stale.length) await area.remove(stale.map((n) => PREFIX + n.tabId));
      return stale.length;
    },
  };
}

export function tabIdFromKey(key) {
  return key.startsWith(PREFIX) ? Number(key.slice(PREFIX.length)) : null;
}
