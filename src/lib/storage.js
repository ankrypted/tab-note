// Storage sits behind this small interface (NFR-11) so sync or another
// backend can replace chrome.storage.local later.

const PREFIX = "note:";

export function createNoteStore(area = chrome.storage.local) {
  return {
    async get(key) {
      const k = PREFIX + key;
      const data = await area.get(k);
      return data[k] ?? null;
    },

    async save(key, { url, title, text }) {
      const k = PREFIX + key;
      if (text.trim() === "") {
        await area.remove(k);
        return null;
      }
      const note = { url, title, text, updatedAt: Date.now() };
      await area.set({ [k]: note });
      return note;
    },

    async remove(key) {
      await area.remove(PREFIX + key);
    },

    // Newest first.
    async list() {
      const all = await area.get(null);
      return Object.entries(all)
        .filter(([k]) => k.startsWith(PREFIX))
        .map(([k, v]) => ({ key: k.slice(PREFIX.length), ...v }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },
  };
}

export const NOTE_PREFIX = PREFIX;
