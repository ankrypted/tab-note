// Keeps the toolbar badge in sync: a dot on pages that have a note.
import { normalizeUrl } from "./lib/url.js";
import { createNoteStore, NOTE_PREFIX } from "./lib/storage.js";

const store = createNoteStore();

async function updateBadge(tabId, url) {
  const key = url ? normalizeUrl(url) : null;
  const note = key ? await store.get(key) : null;
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#0F766E" });
  await chrome.action.setBadgeText({ tabId, text: note ? "●" : "" });
}

async function refreshTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    await updateBadge(tabId, tab.url);
  } catch {
    // Tab closed before we could read it.
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === "complete") refreshTab(tabId);
});

chrome.tabs.onActivated.addListener(({ tabId }) => refreshTab(tabId));

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local") return;
  if (!Object.keys(changes).some((k) => k.startsWith(NOTE_PREFIX))) return;
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) if (tab.id != null) updateBadge(tab.id, tab.url);
});
