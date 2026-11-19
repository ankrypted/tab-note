import test from "node:test";
import assert from "node:assert/strict";
import { createNoteStore, MAX_NOTE_CHARS, tabIdFromKey } from "../src/lib/storage.js";

// Minimal in-memory stand-in for chrome.storage.session.
function fakeArea() {
  const data = {};
  return {
    async get(keys) {
      if (keys === null) return { ...data };
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter((k) => k in data).map((k) => [k, data[k]]));
    },
    async set(obj) { Object.assign(data, obj); },
    async remove(keys) { for (const k of [].concat(keys)) delete data[k]; },
  };
}

test("saves and reads a note per tab", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(7, "hello");
  assert.equal((await s.get(7)).text, "hello");
  assert.equal(await s.get(8), null);
});

test("blank text removes the note", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(7, "hello");
  assert.equal(await s.save(7, "  \n "), null);
  assert.equal(await s.get(7), null);
});

test("remove deletes only that tab's note", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(1, "a");
  await s.save(2, "b");
  await s.remove(1);
  assert.deepEqual((await s.list()).map((n) => n.tabId), [2]);
});

test("prune drops notes whose tab is gone", async () => {
  const s = createNoteStore(fakeArea());
  await s.save(1, "a");
  await s.save(2, "b");
  await s.save(3, "c");
  assert.equal(await s.prune([2]), 2);
  assert.deepEqual((await s.list()).map((n) => n.tabId), [2]);
});

test("notes are capped in length", async () => {
  const s = createNoteStore(fakeArea());
  const saved = await s.save(1, "x".repeat(MAX_NOTE_CHARS + 50));
  assert.equal(saved.text.length, MAX_NOTE_CHARS);
});

test("tabIdFromKey ignores unrelated keys", () => {
  assert.equal(tabIdFromKey("note:42"), 42);
  assert.equal(tabIdFromKey("other:42"), null);
});
