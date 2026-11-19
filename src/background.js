// Keeps notes tidy and the toolbar honest:
//  - a note is deleted when its tab closes
//  - after a browser restart, restored tabs get their notes back (matched by URL)
//  - the toolbar shows a dot on tabs that have a note
//  - tabs with a note not yet saved to a file ask before closing (see content.js)
import { createNoteStore, NOTE_PREFIX, tabIdFromKey, isUnsaved } from "./lib/storage.js";

const store = createNoteStore();

/* ---------- badge and close guard ---------- */

async function setBadge(tabId, hasNote) {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#0F766E" });
    await chrome.action.setBadgeText({ tabId, text: hasNote ? "●" : "" });
  } catch {
    // Tab closed before we could update it.
  }
}

async function pushGuard(tabId, note) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "guard", on: isUnsaved(note) });
  } catch {
    // No content script on this page (brave:// pages, new tab), or tab gone.
  }
}

async function refreshTab(tabId) {
  const note = await store.get(tabId);
  await setBadge(tabId, !!note);
  await pushGuard(tabId, note);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "guard-state" || sender.tab?.id == null) return false;
  store.get(sender.tab.id).then((note) => sendResponse({ on: isUnsaved(note) }));
  return true; // async reply
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  for (const [key, change] of Object.entries(changes)) {
    if (!key.startsWith(NOTE_PREFIX)) continue;
    const tabId = tabIdFromKey(key);
    setBadge(tabId, !!change.newValue);
    pushGuard(tabId, change.newValue ?? null);
  }
});

/* ---------- tab lifecycle ---------- */

chrome.tabs.onRemoved.addListener(async (tabId, { isWindowClosing }) => {
  // A window closing may be the browser quitting, so keep its notes for a
  // moment (they can be restored); closing a single tab deletes the note now.
  if (isWindowClosing) await store.orphan(tabId);
  else await store.remove(tabId);
});

chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => store.move(removedTabId, addedTabId));

chrome.tabs.onCreated.addListener((tab) => tryAdopt(tab));

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title) {
    await store.setMeta(tabId, { url: tab.url, title: tab.title });
  }
  // Chrome resets a tab's badge on navigation, so set it again.
  if (changeInfo.url || changeInfo.status === "loading" || changeInfo.status === "complete") {
    await tryAdopt(tab);
    await refreshTab(tabId);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => refreshTab(tabId));

/* ---------- session restore ---------- */

async function tryAdopt(tab) {
  if (tab.id == null || !(await store.hasPending())) return;
  const url = tab.url || tab.pendingUrl;
  if (await store.adopt(tab.id, url)) await refreshTab(tab.id);
}

async function adoptAll() {
  const tabs = await chrome.tabs.query({});
  tabs.sort((a, b) => a.windowId - b.windowId || a.index - b.index);
  for (const tab of tabs) await tryAdopt(tab);
}

chrome.runtime.onStartup.addListener(async () => {
  await store.beginRestore();
  await adoptAll();
});

/* ---------- housekeeping ---------- */

chrome.alarms.create("housekeeping", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "housekeeping") return;
  const tabs = await chrome.tabs.query({});
  await store.sweep(tabs.map((t) => t.id));
  await store.expirePending();
});

// The popup can be opened as a side panel; point the panel at the same page.
chrome.sidePanel
  ?.setOptions({ path: "popup/popup.html?mode=panel", enabled: true })
  .catch(() => {});
