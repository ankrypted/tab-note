// Runs on web pages. While this tab has a note that has not been saved to a
// file, closing the tab shows the browser's own "Leave page?" confirmation.
// Bundled as a classic script (content scripts cannot be ES modules).

interface GuardMessage {
  type: "guard";
  on: boolean;
}

let on = false;

function handler(e: BeforeUnloadEvent): string {
  e.preventDefault();
  e.returnValue = "";
  return "";
}

function set(next: boolean): void {
  if (next === on) return;
  on = next;
  if (on) window.addEventListener("beforeunload", handler);
  else window.removeEventListener("beforeunload", handler);
}

chrome.runtime.onMessage.addListener((msg: Partial<GuardMessage> | undefined) => {
  if (msg && msg.type === "guard") set(!!msg.on);
});

// Ask for the initial state: this page may have loaded after the note was written.
chrome.runtime
  .sendMessage({ type: "guard-state" })
  .then((reply: { on?: boolean } | undefined) => set(!!reply?.on))
  .catch(() => {});
