import { describe, expect, it } from "vitest";
import {
  MAX_NOTE_CHARS,
  ORPHAN_GRACE_MS,
  RESTORE_WINDOW_MS,
  createNoteStore,
  isUnsaved,
  tabIdFromKey,
  type StorageAreaLike,
} from "../src/lib/storage";

// Minimal in-memory stand-in for chrome.storage.local.
function fakeArea(): StorageAreaLike {
  const data: Record<string, unknown> = {};
  return {
    async get(keys) {
      if (keys === null) return structuredClone(data);
      const list = Array.isArray(keys) ? keys : [keys];
      return structuredClone(
        Object.fromEntries(list.filter((k) => k in data).map((k) => [k, data[k]])),
      );
    },
    async set(obj) {
      Object.assign(data, structuredClone(obj));
    },
    async remove(keys) {
      for (const k of ([] as string[]).concat(keys)) delete data[k];
    },
  };
}

const T0 = 1_000_000;
const ids = async (s: ReturnType<typeof createNoteStore>) => (await s.list()).map((n) => n.tabId);

describe("saving and reading", () => {
  it("keeps a note per tab, with url and title", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(7, "hello", { url: "https://a.com", title: "A" }, T0);
    const n = await s.get(7);
    expect(n?.text).toBe("hello");
    expect(n?.url).toBe("https://a.com");
    expect(await s.get(8)).toBeNull();
  });

  it("removes the note when the text is blank", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(7, "hello", {}, T0);
    expect(await s.save(7, "  \n ")).toBeNull();
    expect(await s.get(7)).toBeNull();
  });

  it("caps note length", async () => {
    const s = createNoteStore(fakeArea());
    const saved = await s.save(1, "x".repeat(MAX_NOTE_CHARS + 50), {}, T0);
    expect(saved?.text.length).toBe(MAX_NOTE_CHARS);
  });

  it("lists newest first", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(1, "old", {}, T0);
    await s.save(2, "new", {}, T0 + 10);
    expect(await ids(s)).toEqual([2, 1]);
  });

  it("remove deletes only that tab's note", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(1, "a", {}, T0);
    await s.save(2, "b", {}, T0);
    await s.remove(1);
    expect(await ids(s)).toEqual([2]);
  });

  it("uses the current time when none is given", async () => {
    const s = createNoteStore(fakeArea());
    const before = Date.now();
    const n = await s.save(1, "a");
    expect(n?.updatedAt).toBeGreaterThanOrEqual(before);
  });
});

describe("unsaved-to-file flag", () => {
  it("new text is unsaved, exporting clears it, editing sets it again", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(1, "draft", {}, T0);
    expect(isUnsaved(await s.get(1))).toBe(true);
    await s.markExported(1, T0 + 10);
    expect(isUnsaved(await s.get(1))).toBe(false);
    await s.save(1, "draft v2", {}, T0 + 20);
    expect(isUnsaved(await s.get(1))).toBe(true);
  });

  it("saving identical text does not make an exported note unsaved", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(1, "same", {}, T0);
    await s.markExported(1, T0 + 10);
    await s.save(1, "same", { title: "New title" }, T0 + 50);
    expect(isUnsaved(await s.get(1))).toBe(false);
    expect((await s.get(1))?.title).toBe("New title");
  });

  it("handles missing notes and the default clock", async () => {
    const s = createNoteStore(fakeArea());
    expect(isUnsaved(null)).toBe(false);
    expect(isUnsaved(undefined)).toBe(false);
    expect(await s.markExported(99)).toBeNull();
    await s.save(1, "a", {}, T0);
    expect((await s.markExported(1))?.exportedAt).toBeGreaterThanOrEqual(T0);
  });
});

describe("setMeta", () => {
  it("updates an existing note and never creates one", async () => {
    const s = createNoteStore(fakeArea());
    expect(await s.setMeta(1, { url: "x" })).toBeNull();
    await s.save(1, "a", { url: "https://a.com", title: "A" }, T0);
    await s.setMeta(1, { url: "https://b.com" });
    await s.setMeta(1, { title: "B" });
    const n = await s.get(1);
    expect(n?.url).toBe("https://b.com");
    expect(n?.title).toBe("B");
  });
});

describe("cleanup of notes whose tab is gone", () => {
  it("sweep marks a note, then deletes it after the grace period", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(1, "a", {}, T0);
    await s.save(2, "b", {}, T0);
    expect(await s.sweep([2], T0)).toBe(0); // marks note 1
    expect(await s.sweep([2], T0 + ORPHAN_GRACE_MS - 1)).toBe(0); // still in grace
    expect(await s.sweep([2], T0 + ORPHAN_GRACE_MS + 1)).toBe(1); // deleted
    expect(await ids(s)).toEqual([2]);
  });

  it("sweep leaves notes of open tabs alone", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(1, "a", {}, T0);
    expect(await s.sweep([1], T0 + ORPHAN_GRACE_MS * 10)).toBe(0);
    expect(await ids(s)).toEqual([1]);
  });

  it("sweep uses the current time by default", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(1, "a", {}, T0);
    expect(await s.sweep([])).toBe(0);
    expect((await s.get(1))?.orphanedAt).toBeGreaterThan(T0);
  });

  it("orphan() starts the grace period; editing the note cancels it", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(1, "a", {}, T0);
    await s.orphan(1, T0);
    expect((await s.get(1))?.orphanedAt).toBe(T0);
    await s.save(1, "a edited", {}, T0 + 5);
    expect((await s.get(1))?.orphanedAt).toBeUndefined();
  });

  it("orphan() on a missing note does nothing", async () => {
    const s = createNoteStore(fakeArea());
    await s.orphan(5, T0);
    expect(await ids(s)).toEqual([]);
  });
});

describe("session restore", () => {
  it("gives notes back to tabs with the same URL", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(11, "note for A", { url: "https://a.com/x", title: "A" }, T0);
    await s.save(12, "note for B", { url: "https://b.com", title: "B" }, T0);

    // Browser restarts: tab ids are new and may even collide with old ones.
    expect(await s.beginRestore(T0 + 100)).toBe(2);
    expect(await s.list()).toEqual([]);
    expect(await s.hasPending(T0 + 100)).toBe(true);

    const a = await s.adopt(12, "https://a.com/x", T0 + 200); // id 12 now shows page A
    expect(a?.text).toBe("note for A");
    expect((await s.get(12))?.text).toBe("note for A");

    expect(await s.adopt(30, "https://nowhere.com", T0 + 300)).toBeNull();
    expect((await s.adopt(31, "https://b.com", T0 + 300))?.text).toBe("note for B");
    expect(await s.hasPending(T0 + 300)).toBe(false);
  });

  it("gives two tabs on the same URL one note each", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(1, "first", { url: "https://a.com" }, T0);
    await s.save(2, "second", { url: "https://a.com" }, T0 + 1);
    await s.beginRestore(T0 + 100);
    const one = await s.adopt(50, "https://a.com", T0 + 200);
    const two = await s.adopt(51, "https://a.com", T0 + 200);
    expect(one?.text).not.toBe(two?.text);
    expect(await s.adopt(52, "https://a.com", T0 + 200)).toBeNull();
  });

  it("deletes unclaimed notes after the window and gives late tabs nothing", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(1, "a", { url: "https://a.com" }, T0);
    await s.beginRestore(T0);
    const late = T0 + RESTORE_WINDOW_MS + 1;
    expect(await s.adopt(9, "https://a.com", late)).toBeNull();
    expect(await s.hasPending(late)).toBe(false);
    expect(await s.expirePending(late)).toBe(1);
    expect(await s.expirePending(late)).toBe(0);
  });

  it("does nothing when there is nothing to restore", async () => {
    const s = createNoteStore(fakeArea());
    expect(await s.beginRestore(T0)).toBe(0);
    expect(await s.hasPending(T0)).toBe(false);
    expect(await s.adopt(1, "https://a.com", T0)).toBeNull();
    expect(await s.adopt(1, undefined, T0)).toBeNull();
    expect(await s.expirePending(T0)).toBe(0);
  });

  it("does not let a tab that already has a note adopt another", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(1, "old", { url: "https://a.com" }, T0);
    await s.beginRestore(T0);
    await s.save(9, "typed already", { url: "https://a.com" }, T0 + 5);
    expect(await s.adopt(9, "https://a.com", T0 + 10)).toBeNull();
  });

  it("keeps earlier pending notes if a second restore begins", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(1, "first", { url: "https://a.com" }, T0);
    await s.beginRestore(T0);
    await s.save(2, "second", { url: "https://b.com" }, T0 + 5);
    await s.beginRestore(T0 + 10);
    expect((await s.adopt(7, "https://a.com", T0 + 20))?.text).toBe("first");
    expect((await s.adopt(8, "https://b.com", T0 + 20))?.text).toBe("second");
  });

  it("uses the current time by default", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(1, "a", { url: "https://a.com" });
    expect(await s.beginRestore()).toBe(1);
    expect(await s.hasPending()).toBe(true);
    expect((await s.adopt(5, "https://a.com"))?.text).toBe("a");
  });
});

describe("move", () => {
  it("carries a note to a replacement tab", async () => {
    const s = createNoteStore(fakeArea());
    await s.save(1, "a", {}, T0);
    await s.move(1, 2);
    expect(await s.get(1)).toBeNull();
    expect((await s.get(2))?.text).toBe("a");
  });

  it("does nothing for a tab without a note", async () => {
    const s = createNoteStore(fakeArea());
    await s.move(1, 2);
    expect(await ids(s)).toEqual([]);
  });
});

describe("tabIdFromKey", () => {
  it("reads note keys and ignores everything else", () => {
    expect(tabIdFromKey("note:42")).toBe(42);
    expect(tabIdFromKey("pending")).toBeNull();
  });
});
