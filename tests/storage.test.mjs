import test from "node:test";
import assert from "node:assert/strict";
import {
  createNoteStore, isUnsaved, tabIdFromKey,
  MAX_NOTE_CHARS, ORPHAN_GRACE_MS, RESTORE_WINDOW_MS,
} from "../src/lib/storage.js";

// Minimal in-memory stand-in for chrome.storage.local.
function fakeArea() {
  const data = {};
  return {
    data,
    async get(keys) {
      if (keys === null) return structuredClone(data);
      const list = Array.isArray(keys) ? keys : [keys];
      return structuredClone(Object.fromEntries(list.filter((k) => k in data).map((k) => [k, data[k]])));
    },
    async set(obj) { Object.assign(data, structuredClone(obj)); },
    async remove(keys) { for (const k of [].concat(keys)) delete data[k]; },
  };
}

const T0 = 1_000_000;

test("saves and reads a note per tab, with url and title", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(7, "hello", { url: "https://a.com", title: "A" }, T0);
  const n = await s.get(7);
  assert.equal(n.text, "hello");
  assert.equal(n.url, "https://a.com");
  assert.equal(await s.get(8), null);
});

test("blank text removes the note", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(7, "hello", {}, T0);
  assert.equal(await s.save(7, "  \n "), null);
  assert.equal(await s.get(7), null);
});

test("remove deletes only that tab's note", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(1, "a", {}, T0);
  await s.save(2, "b", {}, T0);
  await s.remove(1);
  assert.deepEqual((await s.list()).map((n) => n.tabId), [2]);
});

test("notes are capped in length", async () => {
  const s = createNoteStore(fakeArea());
  const saved = await s.save(1, "x".repeat(MAX_NOTE_CHARS + 50), {}, T0);
  assert.equal(saved.text.length, MAX_NOTE_CHARS);
});

test("unsaved flag: new text is unsaved, exporting clears it, editing sets it again", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(1, "draft", {}, T0);
  assert.equal(isUnsaved(await s.get(1)), true);
  await s.markExported(1, T0 + 10);
  assert.equal(isUnsaved(await s.get(1)), false);
  await s.save(1, "draft v2", {}, T0 + 20);
  assert.equal(isUnsaved(await s.get(1)), true);
});

test("saving identical text does not make an exported note unsaved", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(1, "same", {}, T0);
  await s.markExported(1, T0 + 10);
  await s.save(1, "same", { title: "New title" }, T0 + 50);
  assert.equal(isUnsaved(await s.get(1)), false);
  assert.equal((await s.get(1)).title, "New title");
});

test("setMeta updates an existing note and never creates one", async () => {
  const s = createNoteStore(fakeArea());
  assert.equal(await s.setMeta(1, { url: "x" }), null);
  await s.save(1, "a", { url: "https://a.com" }, T0);
  await s.setMeta(1, { url: "https://b.com" });
  assert.equal((await s.get(1)).url, "https://b.com");
});

test("sweep: a note whose tab is gone is marked, then deleted after the grace period", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(1, "a", {}, T0);
  await s.save(2, "b", {}, T0);
  assert.equal(await s.sweep([2], T0), 0);                         // marks note 1
  assert.equal(await s.sweep([2], T0 + ORPHAN_GRACE_MS - 1), 0);   // still in grace
  assert.equal(await s.sweep([2], T0 + ORPHAN_GRACE_MS + 1), 1);   // deleted
  assert.deepEqual((await s.list()).map((n) => n.tabId), [2]);
});

test("orphan() starts the grace period; editing the note cancels it", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(1, "a", {}, T0);
  await s.orphan(1, T0);
  assert.equal((await s.get(1)).orphanedAt, T0);
  await s.save(1, "a edited", {}, T0 + 5);
  assert.equal((await s.get(1)).orphanedAt, undefined);
});

test("session restore: notes come back to tabs with the same URL", async () => {
  const area = fakeArea();
  const s = createNoteStore(area);
  await s.save(11, "note for A", { url: "https://a.com/x", title: "A" }, T0);
  await s.save(12, "note for B", { url: "https://b.com", title: "B" }, T0);

  // Browser restarts: tab ids are new and may even collide with old ones.
  assert.equal(await s.beginRestore(T0 + 100), 2);
  assert.deepEqual(await s.list(), []);
  assert.equal(await s.hasPending(T0 + 100), true);

  const a = await s.adopt(12, "https://a.com/x", T0 + 200);   // id 12 now belongs to page A
  assert.equal(a.text, "note for A");
  assert.equal((await s.get(12)).text, "note for A");

  assert.equal(await s.adopt(30, "https://nowhere.com", T0 + 300), null);
  assert.equal((await s.adopt(31, "https://b.com", T0 + 300)).text, "note for B");
  assert.equal(await s.hasPending(T0 + 300), false);
});

test("session restore: two tabs on the same URL each get one note", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(1, "first", { url: "https://a.com" }, T0);
  await s.save(2, "second", { url: "https://a.com" }, T0 + 1);
  await s.beginRestore(T0 + 100);
  const one = await s.adopt(50, "https://a.com", T0 + 200);
  const two = await s.adopt(51, "https://a.com", T0 + 200);
  assert.notEqual(one.text, two.text);
  assert.equal(await s.adopt(52, "https://a.com", T0 + 200), null);
});

test("session restore: unclaimed notes are deleted after the window; late tabs get nothing", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(1, "a", { url: "https://a.com" }, T0);
  await s.beginRestore(T0);
  const late = T0 + RESTORE_WINDOW_MS + 1;
  assert.equal(await s.adopt(9, "https://a.com", late), null);
  assert.equal(await s.expirePending(late), 1);
  assert.equal(await s.hasPending(late), false);
});

test("a tab that already has a note does not adopt another", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(1, "old", { url: "https://a.com" }, T0);
  await s.beginRestore(T0);
  await s.save(9, "typed already", { url: "https://a.com" }, T0 + 5);
  assert.equal(await s.adopt(9, "https://a.com", T0 + 10), null);
});

test("move carries a note to a replacement tab", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(1, "a", {}, T0);
  await s.move(1, 2);
  assert.equal(await s.get(1), null);
  assert.equal((await s.get(2)).text, "a");
});

test("tabIdFromKey ignores unrelated keys", () => {
  assert.equal(tabIdFromKey("note:42"), 42);
  assert.equal(tabIdFromKey("pending"), null);
});
