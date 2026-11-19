import { displayUrl } from "../lib/url.js";
import { createNoteStore, MAX_NOTE_CHARS } from "../lib/storage.js";
import { noteFilename, noteFileContents, noteDataUrl } from "../lib/export.js";

const SAVE_DELAY_MS = 600;
const store = createNoteStore();
const $ = (id) => document.getElementById(id);

const els = {
  noteView: $("note-view"), listView: $("list-view"),
  favicon: $("favicon"), title: $("page-title"), url: $("page-url"),
  status: $("status"), statusText: $("status-text"),
  note: $("note"), unsupported: $("unsupported"),
  footer: document.querySelector(".footer"),
  openList: $("open-list"), listLabel: $("list-label"), count: $("count"),
  saveFile: $("save-file"),
  del: $("delete"), confirm: $("confirm"), yes: $("confirm-yes"), no: $("confirm-no"),
  back: $("back"), list: $("list"), listEmpty: $("list-empty"), listCount: $("list-count"),
};

let tab = null;        // the active tab this popup belongs to
let saveTimer = null;
let dirty = false;

init();

async function init() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || tab.id == null) {
    els.title.textContent = "No tab";
    els.favicon.textContent = "–";
    els.note.hidden = true;
    els.unsupported.hidden = false;
    els.del.hidden = true;
    els.saveFile.disabled = true;
    return;
  }

  const title = tab.title || displayUrl(tab.url) || "This tab";
  els.title.textContent = title;
  els.url.textContent = displayUrl(tab.url);
  els.favicon.textContent = (title.trim()[0] || "•").toUpperCase();

  els.note.maxLength = MAX_NOTE_CHARS;
  const existing = await store.get(tab.id);
  els.note.value = existing?.text ?? "";
  syncControls(!!existing);
  els.note.focus();
  els.note.setSelectionRange(els.note.value.length, els.note.value.length);
  refreshListLabel();
}

function syncControls(hasNote) {
  els.del.hidden = !hasNote;
  els.saveFile.disabled = !hasNote;
  updateCount();
}

/* ---------- Auto-save (the note lives only while the tab is open) ---------- */

els.note.addEventListener("input", () => {
  dirty = true;
  updateCount();
  els.saveFile.disabled = els.note.value.trim() === "";
  setStatus("saving");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, SAVE_DELAY_MS);
});

async function flush() {
  clearTimeout(saveTimer);
  if (!tab || !dirty) return;
  dirty = false;
  const saved = await store.save(tab.id, els.note.value);
  syncControls(!!saved);
  setStatus(saved ? "saved" : "hidden");
  refreshListLabel();
}

// Don't lose the last keystrokes when the popup closes.
window.addEventListener("pagehide", flush);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush();
});

function setStatus(state, text) {
  els.status.hidden = state === "hidden";
  els.status.classList.toggle("saving", state === "saving");
  els.statusText.textContent = text ?? (state === "saving" ? "Saving…" : "Saved");
}

function updateCount() {
  const n = els.note.value.length;
  els.count.textContent = n ? `${n.toLocaleString()} char${n === 1 ? "" : "s"}` : "Alt+N to open";
}

/* ---------- Save to a file ---------- */

els.saveFile.addEventListener("click", async () => {
  await flush();
  const text = els.note.value;
  if (!tab || text.trim() === "") return;

  const current = await chrome.tabs.get(tab.id).catch(() => tab);
  const info = { title: current.title, url: current.url, text };
  try {
    // The browser shows its Save dialog, so the user can pick the Desktop.
    await chrome.downloads.download({
      url: noteDataUrl(noteFileContents(info)),
      filename: noteFilename(info.title),
      saveAs: true,
    });
    setStatus("saved", "Saved to file");
  } catch {
    // Dialog cancelled, or the download was blocked: leave the note as it is.
  }
});

/* ---------- Delete by hand ---------- */

els.del.addEventListener("click", () => {
  els.footer.classList.add("confirming");
  els.confirm.hidden = false;
  els.yes.focus();
});

els.no.addEventListener("click", closeConfirm);

els.yes.addEventListener("click", async () => {
  clearTimeout(saveTimer);
  dirty = false;
  await store.remove(tab.id);
  els.note.value = "";
  syncControls(false);
  setStatus("hidden");
  closeConfirm();
  refreshListLabel();
  els.note.focus();
});

function closeConfirm() {
  els.footer.classList.remove("confirming");
  els.confirm.hidden = true;
  els.del.hidden ? els.note.focus() : els.del.focus();
}

/* ---------- Tabs that have notes ---------- */

async function refreshListLabel() {
  const notes = await store.list();
  els.listLabel.textContent = `Tab notes (${notes.length})`;
}

els.openList.addEventListener("click", async () => {
  await flush();
  await renderList();
  els.noteView.hidden = true;
  els.listView.hidden = false;
  els.back.focus();
});

els.back.addEventListener("click", () => {
  els.listView.hidden = true;
  els.noteView.hidden = false;
  els.openList.focus();
});

async function renderList() {
  const notes = await store.list();
  const rows = [];
  for (const n of notes) {
    const t = await chrome.tabs.get(n.tabId).catch(() => null);
    if (!t) {
      store.remove(n.tabId);   // orphan: its tab is gone
      continue;
    }
    rows.push({ note: n, tab: t });
  }

  els.list.replaceChildren();
  els.listEmpty.hidden = rows.length > 0;
  els.listCount.textContent = `${rows.length} tab${rows.length === 1 ? "" : "s"}`;

  for (const { note, tab: t } of rows) {
    const isThis = t.id === tab?.id;
    const li = document.createElement("li");
    if (isThis) li.className = "current";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "item";
    btn.append(
      row("item-top",
        span("item-title", t.title || displayUrl(t.url) || "Untitled"),
        span("item-when", isThis ? "This tab" : ago(note.updatedAt))),
      span("item-url", displayUrl(t.url), "div"),
      span("item-snippet", firstLine(note.text), "div"),
    );
    btn.addEventListener("click", () => goToTab(t, isThis));
    li.append(btn);
    els.list.append(li);
  }
}

async function goToTab(t, isThis) {
  if (isThis) {
    els.back.click();
    return;
  }
  await chrome.tabs.update(t.id, { active: true });
  await chrome.windows.update(t.windowId, { focused: true });
  window.close();
}

/* ---------- helpers (textContent only: notes are never parsed as HTML) ---------- */

function span(cls, text, tag = "span") {
  const el = document.createElement(tag);
  el.className = cls;
  el.textContent = text;
  return el;
}

function row(cls, ...children) {
  const el = document.createElement("div");
  el.className = cls;
  el.append(...children);
  return el;
}

function firstLine(text) {
  return text.split("\n").find((l) => l.trim()) ?? "";
}

function ago(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
