// Keeps notes tidy and the badge honest:
//  - a note is deleted the moment its tab closes
//  - stale notes are pruned at startup
//  - the toolbar shows a dot on tabs that have a note
import { createNoteStore, NOTE_PREFIX, tabIdFromKey } from "./lib/storage.js";

const store = createNoteStore();

async function setBadge(tabId, hasNote) {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#0F766E" });
    await chrome.action.setBadgeText({ tabId, text: hasNote ? "●" : "" });
  } catch {
    // Tab closed before we could update it.
  }
}

async function refreshBadge(tabId) {
  await setBadge(tabId, !!(await store.get(tabId)));
}

async function prune() {
  const tabs = await chrome.tabs.query({});
  await store.prune(tabs.map((t) => t.id));
}

chrome.runtime.onInstalled.addListener(prune);
chrome.runtime.onStartup.addListener(prune);

chrome.tabs.onRemoved.addListener((tabId) => store.remove(tabId));

// Chrome resets a tab's badge on navigation, so set it again.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === "loading" || changeInfo.status === "complete") {
    refreshBadge(tabId);
  }
});
chrome.tabs.onActivated.addListener(({ tabId }) => refreshBadge(tabId));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "session") return;
  for (const [key, change] of Object.entries(changes)) {
    if (!key.startsWith(NOTE_PREFIX)) continue;
    setBadge(tabIdFromKey(key), !!change.newValue);
  }
});
