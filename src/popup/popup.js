import { normalizeUrl, displayUrl, isNotable } from "../lib/url.js";
import { createNoteStore } from "../lib/storage.js";

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
  del: $("delete"), confirm: $("confirm"), yes: $("confirm-yes"), no: $("confirm-no"),
  back: $("back"), list: $("list"), listEmpty: $("list-empty"), listCount: $("list-count"),
};

let page = null;       // { key, url, title }
let saveTimer = null;
let dirty = false;

init();

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const key = tab?.url ? normalizeUrl(tab.url) : null;

  if (!key) {
    els.title.textContent = tab?.title || "This page";
    els.url.textContent = "Notes aren't available here";
    els.favicon.textContent = "–";
    els.note.hidden = true;
    els.unsupported.hidden = false;
    els.del.hidden = true;
  } else {
    page = { key, url: tab.url, title: tab.title || displayUrl(tab.url) };
    els.title.textContent = page.title;
    els.url.textContent = displayUrl(page.url);
    els.favicon.textContent = (page.title.trim()[0] || "•").toUpperCase();
    const existing = await store.get(key);
    els.note.value = existing?.text ?? "";
    updateCount();
    els.del.hidden = !existing;
    els.note.focus();
    els.note.setSelectionRange(els.note.value.length, els.note.value.length);
  }
  refreshListLabel();
}

/* ---------- Saving ---------- */

els.note.addEventListener("input", () => {
  dirty = true;
  updateCount();
  setStatus("saving");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, SAVE_DELAY_MS);
});

async function flush() {
  clearTimeout(saveTimer);
  if (!page || !dirty) return;
  dirty = false;
  const saved = await store.save(page.key, {
    url: page.url, title: page.title, text: els.note.value,
  });
  els.del.hidden = !saved;
  setStatus(saved ? "saved" : "hidden");
  refreshListLabel();
}

// Don't lose the last keystrokes when the popup closes (NFR-5).
window.addEventListener("pagehide", flush);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush();
});

function setStatus(state) {
  els.status.hidden = state === "hidden";
  els.status.classList.toggle("saving", state === "saving");
  els.statusText.textContent = state === "saving" ? "Saving…" : "Saved";
}

function updateCount() {
  const n = els.note.value.length;
  els.count.textContent = n ? `${n} char${n === 1 ? "" : "s"}` : "Alt+N to open";
}

/* ---------- Delete ---------- */

els.del.addEventListener("click", () => {
  els.footer.classList.add("confirming");
  els.confirm.hidden = false;
  els.yes.focus();
});

els.no.addEventListener("click", closeConfirm);

els.yes.addEventListener("click", async () => {
  clearTimeout(saveTimer);
  dirty = false;
  await store.remove(page.key);
  els.note.value = "";
  els.del.hidden = true;
  setStatus("hidden");
  updateCount();
  closeConfirm();
  refreshListLabel();
  els.note.focus();
});

function closeConfirm() {
  els.footer.classList.remove("confirming");
  els.confirm.hidden = true;
  els.del.focus();
}

/* ---------- All notes ---------- */

async function refreshListLabel() {
  const notes = await store.list();
  els.listLabel.textContent = `All notes (${notes.length})`;
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
  els.list.replaceChildren();
  els.listEmpty.hidden = notes.length > 0;
  els.listCount.textContent = `${notes.length} page${notes.length === 1 ? "" : "s"}`;

  for (const n of notes) {
    const li = document.createElement("li");
    if (page && n.key === page.key) li.className = "current";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "item";
    btn.append(
      row("item-top", span("item-title", n.title || displayUrl(n.url)),
          span("item-when", page && n.key === page.key ? "This page" : ago(n.updatedAt))),
      span("item-url", displayUrl(n.url), "div"),
      span("item-snippet", firstLine(n.text), "div"),
    );
    btn.addEventListener("click", () => openPage(n));
    li.append(btn);
    els.list.append(li);
  }
}

async function openPage(n) {
  if (page && n.key === page.key) {
    els.back.click();
    return;
  }
  const tabs = await chrome.tabs.query({});
  const match = tabs.find((t) => t.url && isNotable(t.url) && normalizeUrl(t.url) === n.key);
  if (match) {
    await chrome.tabs.update(match.id, { active: true });
    await chrome.windows.update(match.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: n.url });
  }
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
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
