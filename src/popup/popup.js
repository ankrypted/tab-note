import { displayUrl } from "../lib/url.js";
import { createNoteStore, MAX_NOTE_CHARS, isUnsaved } from "../lib/storage.js";
import { noteFilename, noteFileContents, noteDataUrl } from "../lib/export.js";

const SAVE_DELAY_MS = 600;
const store = createNoteStore();
const $ = (id) => document.getElementById(id);

// The same page runs as the toolbar popup and as the side panel.
const inPanel = new URLSearchParams(location.search).get("mode") === "panel";
if (inPanel) document.documentElement.classList.add("panel");

const els = {
  noteView: $("note-view"), listView: $("list-view"),
  favicon: $("favicon"), title: $("page-title"), url: $("page-url"),
  status: $("status"), statusText: $("status-text"), expand: $("expand"), collapse: $("collapse"),
  note: $("note"), unsupported: $("unsupported"), hint: $("hint"),
  footer: document.querySelector(".footer"),
  openList: $("open-list"), listLabel: $("list-label"), count: $("count"),
  saveFile: $("save-file"),
  del: $("delete"), confirm: $("confirm"), yes: $("confirm-yes"), no: $("confirm-no"),
  back: $("back"), list: $("list"), listEmpty: $("list-empty"), listCount: $("list-count"),
};

let tab = null;          // the tab whose note is shown
let windowId = null;     // the browser window this popup / panel belongs to
let saveTimer = null;
let dirty = false;
let unsaved = false;     // note changed since it was last saved to a file

init();

async function init() {
  windowId = (await chrome.windows.getCurrent()).id;
  els.note.maxLength = MAX_NOTE_CHARS;

  // Keep "Tab notes (n)" and the list right when a note appears or a tab closes,
  // including changes made from another tab or by the background script.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && Object.keys(changes).some((k) => k.startsWith("note:"))) refreshViews();
  });
  chrome.tabs.onRemoved.addListener(() => refreshViews());

  if (inPanel) {
    els.collapse.hidden = false;
    // The panel stays open while you switch tabs, so follow the active tab.
    chrome.tabs.onActivated.addListener(async ({ tabId, windowId: w }) => {
      if (w !== windowId) return;
      await flush();
      loadTab(await chrome.tabs.get(tabId).catch(() => null));
    });
    chrome.tabs.onUpdated.addListener((tabId, info, t) => {
      if (tab && tabId === tab.id && (info.title || info.url)) showHeader(t);
    });
  } else if (chrome.sidePanel?.open) {
    els.expand.hidden = false;
  }

  const [active] = await chrome.tabs.query({ active: true, windowId });
  await loadTab(active ?? null);
  refreshListLabel();
}

async function loadTab(t) {
  tab = t;
  clearTimeout(saveTimer);
  dirty = false;
  closeConfirm(false);

  if (!tab || tab.id == null) {
    els.title.textContent = "No tab";
    els.url.textContent = "";
    els.favicon.textContent = "–";
    els.note.hidden = true;
    els.unsupported.hidden = false;
    els.del.hidden = true;
    els.saveFile.disabled = true;
    setStatus("hidden");
    updateHint();
    return;
  }

  els.note.hidden = false;
  els.unsupported.hidden = true;
  showHeader(tab);
  const existing = await store.get(tab.id);
  els.note.value = existing?.text ?? "";
  unsaved = isUnsaved(existing);
  setStatus("hidden");
  syncControls(!!existing);
  if (!inPanel) {
    els.note.focus();
    els.note.setSelectionRange(els.note.value.length, els.note.value.length);
  }
}

function showHeader(t) {
  tab = { ...tab, ...t };
  const title = t.title || displayUrl(t.url) || "This tab";
  els.title.textContent = title;
  els.url.textContent = displayUrl(t.url);
  els.favicon.textContent = (title.trim()[0] || "•").toUpperCase();
  updateHint();
}

function syncControls(hasNote) {
  els.del.hidden = !hasNote;
  els.saveFile.disabled = !hasNote;
  updateCount();
  updateHint();
}

// Tells the user, in plain words, what happens to the note.
function updateHint() {
  const hasText = els.note.value.trim() !== "";
  const web = !!tab?.url && /^https?:/.test(tab.url);
  els.hint.classList.remove("warn");
  if (!tab || !hasText) {
    els.hint.textContent = "Deleted when this tab closes. Save to file keeps a copy.";
  } else if (!unsaved) {
    els.hint.textContent = "Saved to a file. The note is still deleted when this tab closes.";
  } else if (web) {
    els.hint.textContent = "Not saved to a file yet. Closing this tab will ask first.";
    els.hint.classList.add("warn");
  } else {
    els.hint.textContent = "Not saved to a file. This page can't ask before closing, so save first.";
    els.hint.classList.add("warn");
  }
}

/* ---------- Auto-save (the note lives only while the tab is open) ---------- */

els.note.addEventListener("input", () => {
  dirty = true;
  unsaved = els.note.value.trim() !== "";
  updateCount();
  updateHint();
  els.saveFile.disabled = els.note.value.trim() === "";
  setStatus("saving");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, SAVE_DELAY_MS);
});

async function flush() {
  clearTimeout(saveTimer);
  if (!tab || !dirty) return;
  dirty = false;
  const saved = await store.save(tab.id, els.note.value, { url: tab.url, title: tab.title });
  unsaved = isUnsaved(saved);
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

/* ---------- Expand to the side panel ---------- */

els.expand.addEventListener("click", async () => {
  try {
    // Call open() first: it needs the click's user gesture.
    const opened = chrome.sidePanel.open({ windowId });
    await flush();
    await opened;
    window.close();
  } catch {
    setStatus("saved", "Side panel not available here");
  }
});

/* ---------- Back from the side panel to the popup ---------- */

els.collapse.addEventListener("click", async () => {
  await flush();
  try {
    await chrome.action.openPopup({ windowId });   // needs a recent browser
  } catch {
    // Can't open the popup from here: closing the panel is still enough,
    // the toolbar icon opens the popup.
  }
  if (chrome.sidePanel?.close) {
    try { await chrome.sidePanel.close({ windowId }); return; } catch { /* fall through */ }
  }
  window.close();
});

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
    await store.markExported(tab.id);
    unsaved = false;
    updateHint();
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

els.no.addEventListener("click", () => closeConfirm());

els.yes.addEventListener("click", async () => {
  clearTimeout(saveTimer);
  dirty = false;
  await store.remove(tab.id);
  els.note.value = "";
  unsaved = false;
  syncControls(false);
  setStatus("hidden");
  closeConfirm();
  refreshListLabel();
  els.note.focus();
});

function closeConfirm(focus = true) {
  els.footer.classList.remove("confirming");
  els.confirm.hidden = true;
  if (focus) els.del.hidden ? els.note.focus() : els.del.focus();
}

/* ---------- Tabs that have notes ---------- */

// Notes whose tab is still open (a note can linger briefly after its window closed).
async function liveNotes() {
  const open = new Map((await chrome.tabs.query({})).map((t) => [t.id, t]));
  return (await store.list())
    .filter((n) => open.has(n.tabId))
    .map((n) => ({ note: n, tab: open.get(n.tabId) }));
}

async function refreshListLabel() {
  els.listLabel.textContent = `Tab notes (${(await liveNotes()).length})`;
}

async function refreshViews() {
  await refreshListLabel();
  if (!els.listView.hidden) await renderList();
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
  const rows = await liveNotes();

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
  if (!inPanel) window.close();
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
